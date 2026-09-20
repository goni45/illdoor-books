-- Read-only: all failure counts should be 0.
SELECT 'orphan_listings' check_name,count(*) failures FROM public.seller_listings l LEFT JOIN public.books b ON b.id=l.book_id WHERE b.id IS NULL;
SELECT 'invalid_prices' check_name,count(*) failures FROM public.seller_listings WHERE original_price<=0 OR selling_price<=0 OR selling_price>original_price;
SELECT 'orders_without_listing' check_name,count(*) failures FROM public.orders o LEFT JOIN public.seller_listings l ON l.id=o.seller_listing_id WHERE l.id IS NULL;
SELECT 'reviews_without_listing' check_name,count(*) failures FROM public.reviews r LEFT JOIN public.seller_listings l ON l.id=r.seller_listing_id WHERE l.id IS NULL;
SELECT p.proname,p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('place_order','create_seller_listing','set_my_listing_availability','open_order_dispute','verify_pickup_pin') ORDER BY p.proname;
SELECT count(*) migration_rows_needing_review FROM public.book_model_migration_report WHERE needs_manual_review;
