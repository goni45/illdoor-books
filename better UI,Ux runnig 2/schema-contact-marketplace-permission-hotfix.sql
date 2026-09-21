-- Run this once if schema-contact-marketplace-smoke-test.sql reported:
-- "anonymous reveal execution allowed".
begin;

revoke all on function public.get_my_contact_preferences()
  from public, anon, authenticated;
revoke all on function public.update_my_contact_preferences(boolean, text, text, text)
  from public, anon, authenticated;
revoke all on function public.open_seller_contact(text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.set_my_marketplace_listing_status(text, text)
  from public, anon, authenticated;
revoke all on function public.set_my_semester_bundle_status(text, text)
  from public, anon, authenticated;

grant execute on function public.get_my_contact_preferences()
  to authenticated;
grant execute on function public.update_my_contact_preferences(boolean, text, text, text)
  to authenticated;
grant execute on function public.open_seller_contact(text, text, text, text)
  to authenticated;
grant execute on function public.set_my_marketplace_listing_status(text, text)
  to authenticated;
grant execute on function public.set_my_semester_bundle_status(text, text)
  to authenticated;

commit;

-- Expected: anon_can_reveal = false, authenticated_can_reveal = true
select
  has_function_privilege('anon', 'public.open_seller_contact(text,text,text,text)', 'EXECUTE') as anon_can_reveal,
  has_function_privilege('authenticated', 'public.open_seller_contact(text,text,text,text)', 'EXECUTE') as authenticated_can_reveal;
