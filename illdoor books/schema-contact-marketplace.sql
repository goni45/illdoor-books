-- Illdoor contact-first marketplace migration
-- Additive: legacy orders, escrow, PIN, disputes and verified reviews remain intact.
begin;

alter table public.profiles
  add column if not exists contact_enabled boolean not null default false,
  add column if not exists contact_phone text,
  add column if not exists whatsapp_phone text,
  add column if not exists preferred_contact_method text not null default 'both';

alter table public.profiles drop constraint if exists profiles_preferred_contact_method_check;
alter table public.profiles add constraint profiles_preferred_contact_method_check
  check (preferred_contact_method in ('phone', 'whatsapp', 'both'));

-- Existing private phone data becomes the seller's initial preference without becoming public.
update public.profiles
set contact_phone = coalesce(nullif(btrim(contact_phone), ''), nullif(btrim(phone), '')),
    whatsapp_phone = coalesce(nullif(btrim(whatsapp_phone), ''), nullif(btrim(phone), '')),
    contact_enabled = contact_enabled; -- preserve explicit consent; existing numbers stay disabled until the seller opts in

create table if not exists public.contact_interests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  seller_listing_id text,
  semester_bundle_id text,
  book_id text,
  message text,
  status text not null default 'open' check (status in ('open', 'contacted', 'closed', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_interests_one_target check (
    (seller_listing_id is not null and semester_bundle_id is null)
    or (seller_listing_id is null and semester_bundle_id is not null)
  ),
  constraint contact_interests_not_self check (buyer_id <> seller_id),
  constraint contact_interests_message_length check (char_length(coalesce(message, '')) <= 500)
);

-- Mixed-ID compatibility: seller_listings.id is text while other marketplace IDs may be UUID.
alter table public.contact_interests drop constraint if exists contact_interests_seller_listing_id_fkey;
alter table public.contact_interests drop constraint if exists contact_interests_semester_bundle_id_fkey;
alter table public.contact_interests drop constraint if exists contact_interests_book_id_fkey;
alter table public.contact_interests alter column seller_listing_id type text using seller_listing_id::text;
alter table public.contact_interests alter column semester_bundle_id type text using semester_bundle_id::text;
alter table public.contact_interests alter column book_id type text using book_id::text;
drop index if exists public.contact_interests_buyer_listing_uidx;
drop index if exists public.contact_interests_buyer_bundle_book_uidx;
create unique index contact_interests_buyer_listing_uidx
  on public.contact_interests (buyer_id, seller_listing_id)
  where seller_listing_id is not null;
create unique index contact_interests_buyer_bundle_book_uidx
  on public.contact_interests (buyer_id, semester_bundle_id, coalesce(book_id, ''))
  where semester_bundle_id is not null;
create index if not exists contact_interests_seller_created_idx
  on public.contact_interests (seller_id, created_at desc);

create table if not exists public.contact_reveal_events (
  id uuid primary key default gen_random_uuid(),
  interest_id uuid not null references public.contact_interests(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists contact_reveal_events_buyer_created_idx
  on public.contact_reveal_events (buyer_id, created_at desc);

alter table public.contact_interests enable row level security;
alter table public.contact_reveal_events enable row level security;

drop policy if exists contact_interests_participants_select on public.contact_interests;
create policy contact_interests_participants_select on public.contact_interests
  for select to authenticated using (
    auth.uid() in (buyer_id, seller_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists contact_reveal_events_participants_select on public.contact_reveal_events;
create policy contact_reveal_events_participants_select on public.contact_reveal_events
  for select to authenticated using (
    auth.uid() in (buyer_id, seller_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Clients can read only their RLS-visible audit rows; all writes go through secured RPCs.
revoke all on public.contact_interests, public.contact_reveal_events from anon, authenticated;
grant select on public.contact_interests, public.contact_reveal_events to authenticated;

-- RLS cannot hide individual columns. Replace broad profile SELECT with an explicit safe list.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, full_name, avatar_url, is_verified, is_admin, rating, total_sales,
  total_purchases, institute, department, semester, created_at
) on public.profiles to anon, authenticated;

create or replace function public.get_my_contact_preferences()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare p public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into p from public.profiles where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
  return jsonb_build_object(
    'contact_enabled', p.contact_enabled,
    'contact_phone', coalesce(p.contact_phone, ''),
    'whatsapp_phone', coalesce(p.whatsapp_phone, ''),
    'preferred_method', p.preferred_contact_method
  );
end;
$$;

create or replace function public.update_my_contact_preferences(
  p_contact_enabled boolean,
  p_contact_phone text default null,
  p_whatsapp_phone text default null,
  p_preferred_method text default 'both'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  phone_value text := nullif(btrim(coalesce(p_contact_phone, '')), '');
  whatsapp_value text := nullif(btrim(coalesce(p_whatsapp_phone, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_preferred_method not in ('phone', 'whatsapp', 'both') then raise exception 'Invalid contact method'; end if;
  if phone_value is not null and phone_value !~ '^[0-9+() -]{7,32}$' then raise exception 'Invalid phone number'; end if;
  if whatsapp_value is not null and whatsapp_value !~ '^[0-9+() -]{7,32}$' then raise exception 'Invalid WhatsApp number'; end if;
  if coalesce(p_contact_enabled, false) and phone_value is null and whatsapp_value is null then raise exception 'Add at least one contact number'; end if;
  if coalesce(p_contact_enabled, false) and p_preferred_method = 'phone' and phone_value is null then raise exception 'Phone number is required for phone-only contact'; end if;
  if coalesce(p_contact_enabled, false) and p_preferred_method = 'whatsapp' and whatsapp_value is null then raise exception 'WhatsApp number is required for WhatsApp-only contact'; end if;
  update public.profiles
  set contact_enabled = coalesce(p_contact_enabled, false),
      contact_phone = phone_value,
      whatsapp_phone = whatsapp_value,
      preferred_contact_method = p_preferred_method
  where id = auth.uid();
  if not found then raise exception 'Profile not found'; end if;
end;
$$;

-- Remove obsolete UUID overloads from pre-release drafts.
drop function if exists public.open_seller_contact(text, text, text, text);
drop function if exists public.set_my_marketplace_listing_status(text, text);
drop function if exists public.set_my_semester_bundle_status(text, text);

create or replace function public.open_seller_contact(
  p_listing_id text default null,
  p_bundle_id text default null,
  p_book_id text default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  buyer public.profiles%rowtype;
  seller public.profiles%rowtype;
  seller_id_value uuid;
  target_availability text;
  interest_id_value uuid;
  interest_status text;
  target_type_value text;
  is_new_interest boolean := false;
  phone_value text;
  whatsapp_value text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if (p_listing_id is null) = (p_bundle_id is null) then raise exception 'Choose exactly one listing or bundle'; end if;
  if char_length(coalesce(p_message, '')) > 500 then raise exception 'Message is too long'; end if;

  select * into buyer from public.profiles where id = auth.uid();
  if not found then raise exception 'Buyer profile not found'; end if;

  if p_listing_id is not null then
    target_type_value := 'listing';
    select seller_id, availability::text into seller_id_value, target_availability
    from public.seller_listings where id::text = p_listing_id;
  else
    target_type_value := 'bundle';
    select seller_id, availability::text into seller_id_value, target_availability
    from public.semester_bundles where id::text = p_bundle_id;
    if p_book_id is not null and not exists (
      select 1 from public.semester_bundle_items i where i.bundle_id::text = p_bundle_id and i.book_id::text = p_book_id
    ) then raise exception 'The selected book is not part of this bundle'; end if;
  end if;

  if seller_id_value is null then raise exception 'Marketplace item not found'; end if;
  if seller_id_value = auth.uid() then raise exception 'You cannot contact your own listing'; end if;
  if target_availability <> 'Available' then raise exception 'This item is not available for new contact'; end if;

  select * into seller from public.profiles where id = seller_id_value;
  if not found then raise exception 'Seller profile not found'; end if;
  if btrim(coalesce(buyer.institute, '')) = ''
     or lower(btrim(buyer.institute)) <> lower(btrim(coalesce(seller.institute, ''))) then
    raise exception 'Only students from the same institute may reveal seller contact';
  end if;
  if not seller.contact_enabled then raise exception 'Seller has disabled direct contact'; end if;

  phone_value := nullif(btrim(coalesce(seller.contact_phone, '')), '');
  whatsapp_value := nullif(btrim(coalesce(seller.whatsapp_phone, '')), '');
  if seller.preferred_contact_method = 'phone' and phone_value is null then raise exception 'Seller phone is unavailable'; end if;
  if seller.preferred_contact_method = 'whatsapp' and whatsapp_value is null then raise exception 'Seller WhatsApp is unavailable'; end if;
  if phone_value is null and whatsapp_value is null then raise exception 'Seller has not added contact information'; end if;

  -- Serialize repeated reveals for this buyer+target to avoid duplicate interests under concurrency.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || coalesce(p_listing_id, p_bundle_id) || ':' || coalesce(p_book_id, ''), 0));

  if p_listing_id is not null then
    select id, status into interest_id_value, interest_status
    from public.contact_interests where buyer_id = auth.uid() and seller_listing_id = p_listing_id;
  else
    select id, status into interest_id_value, interest_status
    from public.contact_interests where buyer_id = auth.uid() and semester_bundle_id = p_bundle_id and book_id is not distinct from p_book_id;
  end if;

  if interest_status = 'blocked' then raise exception 'Contact access for this seller is blocked'; end if;
  if (select count(*) from public.contact_reveal_events where buyer_id = auth.uid() and created_at > now() - interval '10 minutes') >= 8
     or (select count(*) from public.contact_reveal_events where buyer_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Contact reveal limit reached. Please try again later';
  end if;

  if interest_id_value is null then
    insert into public.contact_interests (buyer_id, seller_id, seller_listing_id, semester_bundle_id, book_id, message)
    values (auth.uid(), seller_id_value, p_listing_id, p_bundle_id, p_book_id, nullif(btrim(coalesce(p_message, '')), ''))
    returning id into interest_id_value;
    is_new_interest := true;
  else
    update public.contact_interests
    set message = coalesce(nullif(btrim(coalesce(p_message, '')), ''), message),
        status = case when status = 'closed' then 'contacted' else status end,
        updated_at = now()
    where id = interest_id_value;
  end if;

  insert into public.contact_reveal_events (interest_id, buyer_id, seller_id)
  values (interest_id_value, auth.uid(), seller_id_value);

  if is_new_interest then
    insert into public.notifications (user_id, title, message, type, link_route, link_id)
    values (
      seller_id_value,
      'একজন শিক্ষার্থী যোগাযোগ করতে চান',
      coalesce(buyer.full_name, 'একজন শিক্ষার্থী') || ' আপনার ' || case when target_type_value = 'listing' then 'বই' else 'সেমিস্টার বান্ডেল' end || ' সম্পর্কে আগ্রহী।',
      'system',
      case when target_type_value = 'listing' then 'profile' else 'semester-bundles' end,
      coalesce(p_listing_id, p_bundle_id)
    );
  end if;

  return jsonb_build_object(
    'interestId', interest_id_value,
    'sellerId', seller.id,
    'sellerName', seller.full_name,
    'sellerVerified', seller.is_verified,
    'contactPhone', case when seller.preferred_contact_method in ('phone', 'both') then coalesce(phone_value, '') else '' end,
    'whatsappPhone', case when seller.preferred_contact_method in ('whatsapp', 'both') then coalesce(whatsapp_value, '') else '' end,
    'preferredMethod', seller.preferred_contact_method,
    'targetType', target_type_value,
    'targetId', coalesce(p_listing_id, p_bundle_id)
  );
end;
$$;

create or replace function public.set_my_marketplace_listing_status(p_listing_id text, p_status text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid; caller_is_admin boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_status not in ('Available', 'Reserved', 'Sold', 'Inactive') then raise exception 'Invalid listing status'; end if;
  select seller_id into owner_id from public.seller_listings where id::text = p_listing_id for update;
  if not found then raise exception 'Listing not found'; end if;
  select coalesce(is_admin, false) into caller_is_admin from public.profiles where id = auth.uid();
  if owner_id <> auth.uid() and not coalesce(caller_is_admin, false) then raise exception 'Not authorized'; end if;
  if not coalesce(caller_is_admin, false) and exists (select 1 from public.orders where seller_listing_id::text = p_listing_id and status not in ('completed', 'cancelled')) then raise exception 'Listing is locked by an active legacy order'; end if;
  update public.seller_listings set availability = p_status where id::text = p_listing_id;
end;
$$;

create or replace function public.set_my_semester_bundle_status(p_bundle_id text, p_status text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid; caller_is_admin boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_status not in ('Available', 'Reserved', 'Sold', 'Inactive') then raise exception 'Invalid bundle status'; end if;
  select seller_id into owner_id from public.semester_bundles where id::text = p_bundle_id for update;
  if not found then raise exception 'Bundle not found'; end if;
  select coalesce(is_admin, false) into caller_is_admin from public.profiles where id = auth.uid();
  if owner_id <> auth.uid() and not coalesce(caller_is_admin, false) then raise exception 'Not authorized'; end if;
  if not coalesce(caller_is_admin, false) and exists (select 1 from public.orders where semester_bundle_id::text = p_bundle_id and status not in ('completed', 'cancelled')) then raise exception 'Bundle is locked by an active legacy order'; end if;
  update public.semester_bundles set availability = p_status where id::text = p_bundle_id;
end;
$$;

revoke all on function public.get_my_contact_preferences() from public, anon, authenticated;
revoke all on function public.update_my_contact_preferences(boolean, text, text, text) from public, anon, authenticated;
revoke all on function public.open_seller_contact(text, text, text, text) from public, anon, authenticated;
revoke all on function public.set_my_marketplace_listing_status(text, text) from public, anon, authenticated;
revoke all on function public.set_my_semester_bundle_status(text, text) from public, anon, authenticated;
grant execute on function public.get_my_contact_preferences() to authenticated;
grant execute on function public.update_my_contact_preferences(boolean, text, text, text) to authenticated;
grant execute on function public.open_seller_contact(text, text, text, text) to authenticated;
grant execute on function public.set_my_marketplace_listing_status(text, text) to authenticated;
grant execute on function public.set_my_semester_bundle_status(text, text) to authenticated;

commit;
