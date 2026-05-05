-- Extend pro_photos to support both images and videos so pros can show
-- past-job work on their public profile. The existing "pro_photos" name is
-- kept for backwards compatibility — clients can filter by media_kind.

create type media_kind as enum ('image', 'video');

alter table public.pro_photos
  add column if not exists media_kind media_kind not null default 'image',
  add column if not exists mime text,
  add column if not exists size_bytes bigint,
  add column if not exists thumbnail_url text;

create index if not exists idx_pro_photos_kind on public.pro_photos(media_kind);

-- Avatar storage key column on profiles. The existing avatar_url already
-- exists; storage_key lets us delete the old object cleanly when the
-- user uploads a replacement.
alter table public.profiles
  add column if not exists avatar_storage_key text;
