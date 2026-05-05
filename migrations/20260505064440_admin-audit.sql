-- Audit log for admin-triggered actions. RLS keeps it readable to admins
-- only; writes happen via the InsForge service-role key from server actions.

create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  action text not null,                       -- e.g. 'admin_added', 'admin_removed'
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  target_email text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_admin_audit_created on public.admin_audit(created_at desc);

alter table public.admin_audit enable row level security;

create policy "admin_audit_admin_read"
  on public.admin_audit for select
  using (public.is_admin());
