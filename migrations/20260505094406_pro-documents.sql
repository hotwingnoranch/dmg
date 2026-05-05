-- Pro document uploads: license, insurance (COI), certifications, etc.
-- Files live in the private `pro-documents` storage bucket; this table
-- holds the storage key + metadata + verification state.
--
-- Public-facing badges are NOT derived from pro_documents directly (we
-- don't want to leak file metadata). Instead, a trigger keeps two flags
-- on `pros` in sync: license_verified and insurance_verified. The public
-- profile page reads those flags only.

create type document_kind as enum (
  'license',
  'insurance',
  'coi',
  'certification',
  'other'
);

create type document_status as enum ('pending', 'verified', 'rejected');

create table public.pro_documents (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros(id) on delete cascade,
  kind document_kind not null,
  storage_key text not null,
  file_name text not null,
  mime text,
  size_bytes bigint,
  expires_at timestamptz,
  status document_status not null default 'pending',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pro_documents enable row level security;

-- The pro can see and write their own documents.
create policy "pro_documents_self_read"
  on public.pro_documents for select
  using (auth.uid() = pro_id);

create policy "pro_documents_self_insert"
  on public.pro_documents for insert
  with check (auth.uid() = pro_id);

create policy "pro_documents_self_update"
  on public.pro_documents for update
  using (auth.uid() = pro_id);

create policy "pro_documents_self_delete"
  on public.pro_documents for delete
  using (auth.uid() = pro_id);

create index idx_pro_documents_pro on public.pro_documents(pro_id);
create index idx_pro_documents_status on public.pro_documents(status);
create index idx_pro_documents_kind on public.pro_documents(kind);

-- ============================================================
-- Public verification flags on pros, kept in sync via trigger.
-- ============================================================
alter table public.pros
  add column if not exists license_verified boolean not null default false,
  add column if not exists insurance_verified boolean not null default false;

create or replace function public.refresh_pro_verifications(p_pro_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  has_license boolean;
  has_insurance boolean;
begin
  -- A "license" doc is the only kind that backs license_verified.
  -- Both `insurance` and `coi` count toward insurance_verified.
  -- Expired docs (expires_at < now()) don't count, even if verified.
  select exists (
    select 1 from public.pro_documents d
    where d.pro_id = p_pro_id
      and d.status = 'verified'
      and d.kind = 'license'
      and (d.expires_at is null or d.expires_at > now())
  ) into has_license;

  select exists (
    select 1 from public.pro_documents d
    where d.pro_id = p_pro_id
      and d.status = 'verified'
      and d.kind in ('insurance', 'coi')
      and (d.expires_at is null or d.expires_at > now())
  ) into has_insurance;

  update public.pros
    set license_verified = has_license,
        insurance_verified = has_insurance,
        updated_at = now()
    where id = p_pro_id;
end;
$$;

create or replace function public.pro_documents_refresh_trigger()
returns trigger
language plpgsql
security definer
as $$
begin
  -- On INSERT/UPDATE: refresh for the (possibly new) pro_id.
  -- On DELETE: refresh for the (possibly old) pro_id.
  if (tg_op = 'DELETE') then
    perform public.refresh_pro_verifications(old.pro_id);
    return old;
  else
    perform public.refresh_pro_verifications(new.pro_id);
    return new;
  end if;
end;
$$;

create trigger pro_documents_refresh
  after insert or update or delete on public.pro_documents
  for each row execute function public.pro_documents_refresh_trigger();
