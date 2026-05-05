-- Vanguard payments: credit packs (one-time) + subscription tiers.
-- Stripe is the source of truth; we mirror status here for idempotency
-- and for fast reads from the dashboard.

-- ============================================================
-- pros: subscription + Stripe customer fields
-- ============================================================
alter table public.pros
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_tier text,
  add column if not exists subscription_status text,
  add column if not exists subscription_period_end timestamptz;

create index if not exists idx_pros_stripe_customer on public.pros(stripe_customer_id);

-- ============================================================
-- payments (one row per Stripe Checkout session we create)
-- ============================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros(id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  kind text not null check (kind in ('credits', 'subscription')),
  product_slug text not null,
  credits_granted int not null default 0,
  amount_cents int not null,
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  succeeded_at timestamptz
);

alter table public.payments enable row level security;

create policy "payments_pro_read"
  on public.payments for select
  using (auth.uid() = pro_id);

create policy "payments_pro_insert"
  on public.payments for insert
  with check (auth.uid() = pro_id);

create policy "payments_pro_update"
  on public.payments for update
  using (auth.uid() = pro_id);

create index idx_payments_pro on public.payments(pro_id);
create index idx_payments_status on public.payments(status);
