-- Vanguard affiliate / referral program.
--
-- One referral row per user (lazy-created). Every visit through /r/<code>
-- writes a referral_clicks row. When that visitor signs up, we attribute
-- them via referral_attributions. Every successful Stripe payment by an
-- attributed user earns commission via referral_conversions.

-- ============================================================
-- 1. referrals (1:1 with users — created on first /affiliate visit)
-- ============================================================
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  kind text not null check (kind in ('pro', 'buyer')),
  total_clicks int not null default 0,
  total_signups int not null default 0,
  total_commission_cents int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.referrals enable row level security;

create policy "referrals_self_read"
  on public.referrals for select
  using (auth.uid() = owner_user_id);

create policy "referrals_self_insert"
  on public.referrals for insert
  with check (auth.uid() = owner_user_id);

create policy "referrals_self_update"
  on public.referrals for update
  using (auth.uid() = owner_user_id);

create index idx_referrals_owner on public.referrals(owner_user_id);

-- ============================================================
-- 2. referral_clicks
-- ============================================================
create table public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  ua text,
  path text,
  created_at timestamptz not null default now()
);

alter table public.referral_clicks enable row level security;

-- Owner can see their own clicks; writes go through admin client.
create policy "referral_clicks_owner_read"
  on public.referral_clicks for select
  using (
    exists (
      select 1 from public.referrals r
      where r.id = referral_clicks.referral_id
        and r.owner_user_id = auth.uid()
    )
  );

create index idx_referral_clicks_ref on public.referral_clicks(referral_id);
create index idx_referral_clicks_created on public.referral_clicks(created_at);

-- ============================================================
-- 3. referral_attributions (one per referred user, set on signup)
-- ============================================================
create table public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  attributed_at timestamptz not null default now()
);

alter table public.referral_attributions enable row level security;

create policy "referral_attributions_owner_read"
  on public.referral_attributions for select
  using (
    exists (
      select 1 from public.referrals r
      where r.id = referral_attributions.referral_id
        and r.owner_user_id = auth.uid()
    )
  );

create index idx_referral_attrib_ref on public.referral_attributions(referral_id);

-- ============================================================
-- 4. referral_conversions (commission events on a payment)
-- ============================================================
create type referral_conversion_status as enum ('pending', 'paid', 'reversed');

create table public.referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  payment_kind text not null check (payment_kind in ('credits', 'subscription')),
  amount_cents int not null,
  commission_cents int not null,
  rate_bps int not null,
  status referral_conversion_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.referral_conversions enable row level security;

create policy "referral_conversions_owner_read"
  on public.referral_conversions for select
  using (
    exists (
      select 1 from public.referrals r
      where r.id = referral_conversions.referral_id
        and r.owner_user_id = auth.uid()
    )
  );

-- Idempotency: at most one commission per payment.
create unique index uniq_conversion_payment
  on public.referral_conversions(payment_id)
  where payment_id is not null;

create index idx_conversion_referral on public.referral_conversions(referral_id);
create index idx_conversion_status on public.referral_conversions(status);
