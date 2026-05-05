-- Keep pros.rating_avg and pros.review_count in sync with the reviews
-- table via a trigger so every public profile read can rely on those
-- denormalized columns instead of running an aggregate per request.

create or replace function public.refresh_pro_rating(p_pro_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  cnt int;
  avg_val numeric(3,2);
begin
  select coalesce(count(*), 0),
         coalesce(round(avg(rating)::numeric, 2), 0)
    into cnt, avg_val
    from public.reviews
    where pro_id = p_pro_id;

  update public.pros
    set review_count = cnt,
        rating_avg = avg_val,
        updated_at = now()
    where id = p_pro_id;
end;
$$;

create or replace function public.reviews_refresh_trigger()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.refresh_pro_rating(old.pro_id);
    return old;
  end if;
  -- On UPDATE the pro_id may have changed (rare); refresh both sides.
  if (tg_op = 'UPDATE' and old.pro_id <> new.pro_id) then
    perform public.refresh_pro_rating(old.pro_id);
  end if;
  perform public.refresh_pro_rating(new.pro_id);
  return new;
end;
$$;

create trigger reviews_refresh
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_refresh_trigger();

-- Backfill counts for any rows that exist already.
update public.pros p
  set review_count = coalesce(sub.cnt, 0),
      rating_avg = coalesce(sub.avg_val, 0)
  from (
    select pro_id,
           count(*) as cnt,
           round(avg(rating)::numeric, 2) as avg_val
      from public.reviews
      group by pro_id
  ) sub
  where p.id = sub.pro_id;

-- Block self-review at the DB level (the app also checks). RLS already
-- enforces buyer_id = auth.uid(), so we just need to forbid the case
-- where buyer_id == pro_id.
alter table public.reviews
  add constraint reviews_no_self_review
  check (buyer_id <> pro_id);
