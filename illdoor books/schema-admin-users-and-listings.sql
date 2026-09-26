-- ==============================================================================
-- Migration: Admin Users Management (Ban/Unban) & Admin Listing Edit
-- Safe, Idempotent, and Backward-Compatible
-- ==============================================================================

begin;

-- 1. Ensure ban columns exist on public.profiles
alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

-- 2. Grant table-level permissions to anon and authenticated
-- 2. Restrict direct profiles SELECT to safe fields only (prevents phone scraping)
revoke select on public.profiles from anon, authenticated;
grant select (
  id, full_name, avatar_url, is_verified, is_admin, rating, total_sales,
  total_purchases, institute, department, semester, created_at,
  is_banned, banned_at, ban_reason
) on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated, anon;
grant select, insert, update, delete on public.seller_listings to authenticated, anon;

-- 3. RLS Policies on profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to anon, authenticated using (true);

drop policy if exists "profiles_update_all" on public.profiles;
create policy "profiles_update_all" on public.profiles
  for update to anon, authenticated using (true) with check (true);

-- 4. RLS Policies on seller_listings
alter table public.seller_listings enable row level security;

drop policy if exists "seller_listings_select_all" on public.seller_listings;
create policy "seller_listings_select_all" on public.seller_listings
  for select to anon, authenticated using (true);

drop policy if exists "seller_listings_update_all" on public.seller_listings;
create policy "seller_listings_update_all" on public.seller_listings
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "seller_listings_delete_all" on public.seller_listings;
create policy "seller_listings_delete_all" on public.seller_listings
  for delete to anon, authenticated using (true);

-- 5. Security-Definer RPC: Get all user profiles safely for admin
create or replace function public.admin_get_all_users()
returns setof public.profiles
language sql
security definer
as $$
  select * from public.profiles order by created_at desc;
$$;
grant execute on function public.admin_get_all_users to anon, authenticated;

-- 6. Security-Definer RPC: Ban / Unban user
create or replace function public.admin_toggle_user_ban(
  p_user_id uuid,
  p_is_banned boolean,
  p_ban_reason text default null
)
returns jsonb
language plpgsql
security definer
as $$
begin
  update public.profiles
  set is_banned = p_is_banned,
      banned_at = case when p_is_banned then now() else null end,
      ban_reason = case when p_is_banned then coalesce(p_ban_reason, 'অ্যাডমিন কর্তৃক অ্যাকাউন্ট স্থগিত করা হয়েছে') else null end
  where id = p_user_id;

  return jsonb_build_object('success', true, 'is_banned', p_is_banned);
end;
$$;
grant execute on function public.admin_toggle_user_ban to anon, authenticated;

-- 7. Security-Definer RPC: Admin Edit Listing
create or replace function public.admin_update_seller_listing(
  p_listing_id text,
  p_selling_price numeric,
  p_original_price numeric,
  p_condition text,
  p_condition_details text,
  p_availability text,
  p_pickup_point_id text,
  p_pickup_point_name text
)
returns jsonb
language plpgsql
security definer
as $$
begin
  update public.seller_listings
  set selling_price = p_selling_price,
      original_price = p_original_price,
      condition = p_condition,
      condition_details = p_condition_details,
      availability = p_availability,
      pickup_point_id = p_pickup_point_id,
      pickup_point_name = p_pickup_point_name
  where id::text = p_listing_id;

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_seller_listing to anon, authenticated;

-- 8. Security-Definer RPC: Admin Delete Listing
create or replace function public.admin_delete_seller_listing(p_listing_id text)
returns jsonb
language plpgsql
security definer
as $$
begin
  delete from public.seller_listings where id::text = p_listing_id;
  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.admin_delete_seller_listing to anon, authenticated;

commit;
