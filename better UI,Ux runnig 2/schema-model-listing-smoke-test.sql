-- Read-only checks after schema-model-listing-migration.sql
SELECT to_regclass('public.books') AS books_models,
       to_regclass('public.seller_listings') AS seller_listings,
       to_regclass('public.book_model_migration_report') AS migration_report;

SELECT count(*) AS models_without_listings
FROM public.books b LEFT JOIN public.seller_listings l ON l.book_id=b.id
WHERE l.id IS NULL;

SELECT b.id,b.title,b.subject_code,count(l.id) AS seller_count,
       min(l.selling_price) FILTER (WHERE l.availability='Available') AS from_price
FROM public.books b LEFT JOIN public.seller_listings l ON l.book_id=b.id
GROUP BY b.id,b.title,b.subject_code ORDER BY b.title;

SELECT * FROM public.book_model_migration_report
ORDER BY needs_manual_review DESC, proposed_key, listing_id;

SELECT o.id,o.order_number,o.seller_listing_id,l.book_id,b.title,o.status
FROM public.orders o
JOIN public.seller_listings l ON l.id=o.seller_listing_id
JOIN public.books b ON b.id=l.book_id
ORDER BY o.created_at DESC LIMIT 20;

SELECT w.user_id,w.book_id,b.title FROM public.wishlist w JOIN public.books b ON b.id=w.book_id LIMIT 20;
