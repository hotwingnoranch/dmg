-- Auto top-up: saved Stripe payment method + threshold-based recharge.
-- Webhook writes use the InsForge service-role api_key which bypasses RLS,
-- so no additional policies are needed here.

alter table public.pros
  add column if not exists default_payment_method_id text,
  add column if not exists auto_topup_enabled boolean not null default false,
  add column if not exists auto_topup_pack_slug text,
  add column if not exists auto_topup_threshold int not null default 10;
