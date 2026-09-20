-- Read-only verification for schema-publication-support.sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='books' AND column_name='publication') AS books_publication_ready,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_listings' AND column_name='publication') AS listings_publication_ready,
  to_regprocedure('public.admin_upsert_book_model(text,text,text,text,text,text,text,text,text,text,text,text,text,text)') IS NOT NULL AS admin_model_rpc_ready,
  to_regprocedure('public.create_seller_listing(text,text,text,integer,integer,text,text)') IS NOT NULL AS seller_listing_rpc_ready;

SELECT
  count(*) FILTER (WHERE publication = 'Haque Publication') AS haque_models,
  count(*) FILTER (WHERE publication = 'Technical Publication') AS technical_models,
  count(*) FILTER (WHERE publication NOT IN ('Haque Publication','Technical Publication') OR publication IS NULL) AS invalid_models
FROM public.books;

SELECT
  count(*) FILTER (WHERE publication = 'Haque Publication') AS haque_listings,
  count(*) FILTER (WHERE publication = 'Technical Publication') AS technical_listings,
  count(*) FILTER (WHERE publication NOT IN ('Haque Publication','Technical Publication') OR publication IS NULL) AS invalid_listings
FROM public.seller_listings;
