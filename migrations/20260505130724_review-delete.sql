-- Allow buyers to delete their own review.
create policy "reviews_buyer_delete"
  on public.reviews for delete
  using (auth.uid() = buyer_id);
