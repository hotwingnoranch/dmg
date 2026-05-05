-- DMG Security Marketplace — initial schema
-- Convention: FK to auth.users(id) for ownership; auth.uid() in RLS policies.

-- ============================================================
-- 1. profiles (one row per auth user)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  zip_code text,
  city text,
  state text,
  is_pro boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_public_read"
  on public.profiles for select
  using (true);

create policy "profiles_self_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- 2. service_categories (taxonomy)
-- ============================================================
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.service_categories enable row level security;

create policy "categories_public_read"
  on public.service_categories for select
  using (is_active);

-- ============================================================
-- 3. pros (1:1 extension when user offers services)
-- ============================================================
create table public.pros (
  id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique,
  company_name text not null,
  tagline text,
  bio text,
  website text,
  contact_email text,
  facebook_url text,
  address text,
  years_in_business int,
  staff_size text,
  hires_count int not null default 0,
  response_time_minutes int,
  rating_avg numeric(3,2) not null default 0,
  review_count int not null default 0,
  is_elite boolean not null default false,
  credits int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pros enable row level security;

create policy "pros_public_read"
  on public.pros for select
  using (is_published or auth.uid() = id);

create policy "pros_self_insert"
  on public.pros for insert
  with check (auth.uid() = id);

create policy "pros_self_update"
  on public.pros for update
  using (auth.uid() = id);

create index idx_pros_slug on public.pros(slug);

-- ============================================================
-- 4. pro_services (m:n)
-- ============================================================
create table public.pro_services (
  pro_id uuid not null references public.pros(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete cascade,
  primary key (pro_id, category_id)
);

alter table public.pro_services enable row level security;

create policy "pro_services_public_read"
  on public.pro_services for select
  using (true);

create policy "pro_services_self_write"
  on public.pro_services for all
  using (auth.uid() = pro_id)
  with check (auth.uid() = pro_id);

-- ============================================================
-- 5. service_areas (pro coverage)
-- ============================================================
create table public.service_areas (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros(id) on delete cascade,
  zip_code text not null,
  city text,
  state text,
  radius_miles int not null default 50,
  created_at timestamptz not null default now()
);

alter table public.service_areas enable row level security;

create policy "service_areas_public_read"
  on public.service_areas for select
  using (true);

create policy "service_areas_self_write"
  on public.service_areas for all
  using (auth.uid() = pro_id)
  with check (auth.uid() = pro_id);

create index idx_service_areas_pro on public.service_areas(pro_id);
create index idx_service_areas_zip on public.service_areas(zip_code);

-- ============================================================
-- 6. requests (buyer-submitted leads)
-- ============================================================
create type request_status as enum ('open', 'matched', 'closed', 'cancelled');
create type urgency_level as enum ('flexible', 'soon', 'urgent');

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.service_categories(id),
  zip_code text not null,
  city text,
  state text,
  status request_status not null default 'open',
  urgency urgency_level not null default 'flexible',
  budget_band text,
  start_date date,
  duration_text text,
  details jsonb not null default '{}'::jsonb,
  contact_name text,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.requests enable row level security;

create policy "requests_owner_read"
  on public.requests for select
  using (auth.uid() = buyer_id);

create policy "requests_pro_read_open"
  on public.requests for select
  using (
    status = 'open'
    and exists (
      select 1 from public.pros p where p.id = auth.uid() and p.is_published
    )
  );

create policy "requests_buyer_insert"
  on public.requests for insert
  with check (auth.uid() = buyer_id);

create policy "requests_buyer_update"
  on public.requests for update
  using (auth.uid() = buyer_id);

create index idx_requests_category on public.requests(category_id);
create index idx_requests_status on public.requests(status);
create index idx_requests_zip on public.requests(zip_code);

-- ============================================================
-- 7. responses (pro replying to a request)
-- ============================================================
create type response_status as enum ('pending', 'hired', 'declined', 'expired');

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  pro_id uuid not null references public.pros(id) on delete cascade,
  status response_status not null default 'pending',
  message text,
  estimate_amount numeric(10,2),
  credits_spent int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, pro_id)
);

alter table public.responses enable row level security;

create policy "responses_pro_read"
  on public.responses for select
  using (auth.uid() = pro_id);

create policy "responses_buyer_read"
  on public.responses for select
  using (
    exists (select 1 from public.requests r where r.id = request_id and r.buyer_id = auth.uid())
  );

create policy "responses_pro_insert"
  on public.responses for insert
  with check (auth.uid() = pro_id);

create policy "responses_pro_update"
  on public.responses for update
  using (auth.uid() = pro_id);

create policy "responses_buyer_update_status"
  on public.responses for update
  using (
    exists (select 1 from public.requests r where r.id = request_id and r.buyer_id = auth.uid())
  );

create index idx_responses_request on public.responses(request_id);
create index idx_responses_pro on public.responses(pro_id);

-- ============================================================
-- 8. response_activity (timeline events on a response)
-- ============================================================
create type activity_kind as enum ('call_no_answer', 'call_spoke', 'email_sent', 'sms_sent', 'note', 'reminder');

create table public.response_activity (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  kind activity_kind not null,
  body text,
  created_at timestamptz not null default now()
);

alter table public.response_activity enable row level security;

create policy "response_activity_actor_read"
  on public.response_activity for select
  using (auth.uid() = actor_id);

create policy "response_activity_actor_write"
  on public.response_activity for insert
  with check (auth.uid() = actor_id);

create index idx_activity_response on public.response_activity(response_id);

-- ============================================================
-- 9. reviews (buyer review of pro)
-- ============================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.requests(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "reviews_public_read"
  on public.reviews for select
  using (true);

create policy "reviews_buyer_insert"
  on public.reviews for insert
  with check (auth.uid() = buyer_id);

create policy "reviews_buyer_update"
  on public.reviews for update
  using (auth.uid() = buyer_id);

create index idx_reviews_pro on public.reviews(pro_id);

-- ============================================================
-- 10. pro_photos (gallery for the pro profile)
-- ============================================================
create table public.pro_photos (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references public.pros(id) on delete cascade,
  storage_key text not null,
  url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pro_photos enable row level security;

create policy "pro_photos_public_read"
  on public.pro_photos for select
  using (true);

create policy "pro_photos_self_write"
  on public.pro_photos for all
  using (auth.uid() = pro_id)
  with check (auth.uid() = pro_id);

create index idx_pro_photos_pro on public.pro_photos(pro_id);

-- ============================================================
-- Seed: security service categories
-- ============================================================
insert into public.service_categories (slug, name, description, icon, sort_order) values
  ('security-guard', 'Security Guard Services', 'Unarmed uniformed guards for static post and patrol coverage.', 'shield', 10),
  ('armed-security', 'Armed Security', 'Licensed armed officers for high-risk environments and cash-in-transit.', 'crosshair', 20),
  ('bodyguard', 'Bodyguard / Close Protection', 'Personal protection for individuals and families.', 'user-check', 30),
  ('executive-protection', 'Executive Protection', 'Discreet detail teams for executives, VIPs, and dignitaries.', 'briefcase', 40),
  ('event-security', 'Event Security', 'Crowd management, access control, and on-site response for events.', 'ticket', 50),
  ('private-investigation', 'Private Investigation', 'Surveillance, background checks, and investigative services.', 'search', 60),
  ('loss-prevention', 'Loss Prevention', 'Retail and warehouse anti-theft and shrink reduction.', 'package-search', 70),
  ('cctv-surveillance', 'CCTV & Surveillance', 'Camera install, monitoring, and remote video guarding.', 'camera', 80),
  ('alarm-monitoring', 'Alarm Systems & Monitoring', '24/7 alarm response and connected monitoring services.', 'bell-ring', 90),
  ('cybersecurity', 'Cybersecurity Consulting', 'Risk assessments, penetration testing, and incident response.', 'lock-keyhole', 100),
  ('locksmith', 'Locksmith & Access Control', 'Locks, smart access, master-key systems, and emergency lockouts.', 'key-round', 110),
  ('k9-security', 'K9 Security', 'Trained handler and dog teams for detection and patrol.', 'paw-print', 120),
  ('concierge-security', 'Concierge Security', 'Front-of-house security for residential, hotel, and corporate lobbies.', 'door-open', 130),
  ('risk-consulting', 'Security Consulting', 'Threat assessments, training, and program design.', 'scale', 140);
