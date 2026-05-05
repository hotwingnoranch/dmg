-- Admin access list. Identity is email-based so seeded admins are
-- recognized the moment they sign up (no user_id linkage required).

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  notes text
);

-- SECURITY DEFINER function so RLS policies on `admins` itself avoid
-- recursion: it reads the table directly under elevated privileges
-- and exposes only a boolean.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to anon;

alter table public.admins enable row level security;

-- Only admins can read or modify the admins table.
create policy "admins_read"
  on public.admins for select
  using (public.is_admin());

create policy "admins_insert"
  on public.admins for insert
  with check (public.is_admin());

create policy "admins_update"
  on public.admins for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins_delete"
  on public.admins for delete
  using (public.is_admin());

-- Seed the initial admins. Lowercased so the function's email match is
-- deterministic regardless of how the user types their email at signup.
insert into public.admins (email) values
  (lower('bmgaccident@gmail.com')),
  (lower('wallieai4@gmail.com')),
  (lower('Tk@dmgsecurityco.com'))
on conflict (email) do nothing;
