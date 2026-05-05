-- Realtime direct messaging between buyer and pro.
--
-- One conversation per (buyer, pro, response). Messages live in a child
-- table and a trigger publishes new rows to the `conversation:<id>` realtime
-- channel so connected participants see updates instantly.

-- ============================================================
-- 1. conversations
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  pro_id uuid not null references public.pros(id) on delete cascade,
  request_id uuid references public.requests(id) on delete set null,
  response_id uuid references public.responses(id) on delete set null,
  last_message_at timestamptz,
  unread_for_buyer int not null default 0,
  unread_for_pro int not null default 0,
  created_at timestamptz not null default now(),
  unique (buyer_id, pro_id, response_id)
);

alter table public.conversations enable row level security;

create policy "conversations_participant_read"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = pro_id);

create policy "conversations_participant_insert"
  on public.conversations for insert
  with check (auth.uid() = buyer_id or auth.uid() = pro_id);

create policy "conversations_participant_update"
  on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = pro_id);

create index idx_conv_buyer on public.conversations(buyer_id);
create index idx_conv_pro on public.conversations(pro_id);
create index idx_conv_last on public.conversations(last_message_at);

-- ============================================================
-- 2. messages
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_participant_read"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.pro_id)
    )
  );

create policy "messages_participant_insert"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.pro_id)
    )
  );

create index idx_msg_conv on public.messages(conversation_id);
create index idx_msg_unread on public.messages(read_at) where read_at is null;
create index idx_msg_created on public.messages(created_at);

-- ============================================================
-- 3. Trigger: bump conversation counters + publish realtime event
-- ============================================================
create or replace function public.notify_message_inserted()
returns trigger
language plpgsql
security definer
as $$
declare
  conv record;
begin
  select c.buyer_id, c.pro_id into conv
    from public.conversations c
    where c.id = new.conversation_id;

  -- Update last_message_at and bump the unread counter for the recipient.
  update public.conversations
    set last_message_at = new.created_at,
        unread_for_buyer = case
          when new.sender_id = conv.pro_id then unread_for_buyer + 1
          else unread_for_buyer
        end,
        unread_for_pro = case
          when new.sender_id = conv.buyer_id then unread_for_pro + 1
          else unread_for_pro
        end
    where id = new.conversation_id;

  perform realtime.publish(
    'conversation:' || new.conversation_id::text,
    'INSERT_message',
    jsonb_build_object(
      'id', new.id,
      'conversation_id', new.conversation_id,
      'sender_id', new.sender_id,
      'body', new.body,
      'created_at', new.created_at
    )
  );
  return new;
end;
$$;

create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.notify_message_inserted();

-- ============================================================
-- 4. mark_conversation_read RPC — clears unread state for the caller
-- ============================================================
create or replace function public.mark_conversation_read(conv_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  conv record;
  caller uuid;
begin
  caller := auth.uid();
  if caller is null then return; end if;

  select c.buyer_id, c.pro_id into conv
    from public.conversations c
    where c.id = conv_id;
  if not found then return; end if;
  if caller != conv.buyer_id and caller != conv.pro_id then return; end if;

  update public.messages
    set read_at = now()
    where conversation_id = conv_id
      and sender_id != caller
      and read_at is null;

  if caller = conv.buyer_id then
    update public.conversations set unread_for_buyer = 0 where id = conv_id;
  else
    update public.conversations set unread_for_pro = 0 where id = conv_id;
  end if;
end;
$$;

-- ============================================================
-- 5. Realtime channel pattern (idempotent insert)
-- ============================================================
insert into realtime.channels (pattern, description, enabled)
  values ('conversation:%', 'Vanguard direct messages between buyer and pro', true)
  on conflict (pattern) do update set enabled = excluded.enabled;
