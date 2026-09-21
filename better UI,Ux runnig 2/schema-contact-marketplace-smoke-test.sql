-- Structural and privilege smoke test. Run after schema-contact-marketplace.sql.
do $$
begin
  if to_regclass('public.contact_interests') is null then raise exception 'contact_interests missing'; end if;
  if to_regclass('public.contact_reveal_events') is null then raise exception 'contact_reveal_events missing'; end if;
  if to_regprocedure('public.open_seller_contact(text,text,text,text)') is null then raise exception 'open_seller_contact missing'; end if;
  if to_regprocedure('public.update_my_contact_preferences(boolean,text,text,text)') is null then raise exception 'preference updater missing'; end if;
  if to_regprocedure('public.set_my_marketplace_listing_status(text,text)') is null then raise exception 'listing status RPC missing'; end if;
  if to_regprocedure('public.set_my_semester_bundle_status(text,text)') is null then raise exception 'bundle status RPC missing'; end if;
  if has_column_privilege('authenticated', 'public.profiles', 'phone', 'SELECT') then raise exception 'private phone is directly readable'; end if;
  if has_column_privilege('authenticated', 'public.profiles', 'contact_phone', 'SELECT') then raise exception 'contact phone is directly readable'; end if;
  if has_column_privilege('anon', 'public.profiles', 'whatsapp_phone', 'SELECT') then raise exception 'anonymous WhatsApp access exists'; end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'SELECT') then raise exception 'safe profile fields unavailable'; end if;
  if has_table_privilege('authenticated', 'public.contact_interests', 'INSERT') then raise exception 'direct interest inserts allowed'; end if;
  if has_function_privilege('anon', 'public.open_seller_contact(text,text,text,text)', 'EXECUTE') then raise exception 'anonymous reveal execution allowed'; end if;
  if not has_function_privilege('authenticated', 'public.open_seller_contact(text,text,text,text)', 'EXECUTE') then raise exception 'authenticated reveal execution missing'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.contact_interests'::regclass) then raise exception 'contact interest RLS disabled'; end if;
end $$;
select 'contact marketplace structural smoke test passed' as result;
