-- Migration for Full Semester Book Requests & Book Requests Support
-- 100% Additive, Idempotent, and Backward Compatible

begin;

-- 1. Ensure public.book_requests table exists
create table if not exists public.book_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject_code text not null,
  department text not null,
  semester text not null,
  max_budget numeric,
  description text,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'cancelled')),
  request_type text not null default 'single_book',
  preferred_publication text default 'any',
  expected_book_count integer,
  fulfilled_by_listing_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Add full semester request columns if table already existed without them
alter table public.book_requests
  add column if not exists request_type text not null default 'single_book',
  add column if not exists preferred_publication text default 'any',
  add column if not exists expected_book_count integer,
  add column if not exists fulfilled_by_listing_id text;

-- 3. Add check constraint for request_type if not present
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'book_requests_request_type_check'
  ) then
    alter table public.book_requests
      add constraint book_requests_request_type_check
      check (request_type in ('single_book', 'full_semester'));
  end if;
end $$;

-- 4. Enable Row Level Security (RLS)
alter table public.book_requests enable row level security;

-- 5. Safe, idempotent RLS policies
drop policy if exists "book_requests_select" on public.book_requests;
create policy "book_requests_select" on public.book_requests
  for select to anon, authenticated using (true);

drop policy if exists "book_requests_insert" on public.book_requests;
create policy "book_requests_insert" on public.book_requests
  for insert to authenticated with check (auth.uid() = requester_id);

drop policy if exists "book_requests_update" on public.book_requests;
create policy "book_requests_update" on public.book_requests
  for update to authenticated using (
    auth.uid() = requester_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "book_requests_delete" on public.book_requests;
create policy "book_requests_delete" on public.book_requests
  for delete to authenticated using (
    auth.uid() = requester_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- 6. Permissions
grant select on public.book_requests to anon, authenticated;
grant insert, update, delete on public.book_requests to authenticated;

-- 7. Performance Indexes
create index if not exists book_requests_type_status_idx
  on public.book_requests (request_type, status, created_at desc);

create index if not exists book_requests_requester_idx
  on public.book_requests (requester_id, created_at desc);

-- 8. Secure RPC to reveal requester contact for book requests (campus verified)
create or replace function public.open_requester_contact(p_request_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  req record;
  requester record;
  caller record;
  phone_value text;
  whatsapp_value text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into req from public.book_requests where id::text = p_request_id;
  if not found then
    raise exception 'Book request not found';
  end if;

  select * into requester from public.profiles where id = req.requester_id;
  if not found then
    raise exception 'Requester profile not found';
  end if;

  select * into caller from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Your profile not found';
  end if;

  -- Campus isolation check if institutes are present
  if coalesce(caller.institute, '') <> '' and coalesce(requester.institute, '') <> ''
     and lower(trim(caller.institute)) <> lower(trim(requester.institute)) then
    raise exception 'Only students from the same institute may reveal contact info';
  end if;

  phone_value := nullif(btrim(coalesce(requester.contact_phone, requester.phone, '')), '');
  whatsapp_value := nullif(btrim(coalesce(requester.whatsapp_phone, requester.contact_phone, requester.phone, '')), '');

  -- Send notification to the requester
  insert into public.notifications (user_id, title, message, type, link_route, link_id)
  values (
    req.requester_id,
    'আপনার বইয়ের অনুরোধে সাড়া পেয়েছেন!',
    coalesce(caller.full_name, 'একজন সহপাঠী') || ' আপনার "' || req.title || '" অনুরোধে যোগাযোগ করতে আগ্রহী।',
    'system',
    'requests',
    req.id::text
  );

  return jsonb_build_object(
    'requestId', req.id::text,
    'requesterId', requester.id,
    'requesterName', requester.full_name,
    'requesterInstitute', requester.institute,
    'requesterDepartment', requester.department,
    'contactPhone', coalesce(phone_value, ''),
    'whatsappPhone', coalesce(whatsapp_value, phone_value, ''),
    'preferredMethod', coalesce(requester.preferred_contact_method, 'both')
  );
end;
$$;

-- 9. Function execution permissions
revoke all on function public.open_requester_contact(text) from public, anon;
grant execute on function public.open_requester_contact(text) to authenticated;

commit;
