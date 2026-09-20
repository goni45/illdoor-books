-- Read-only verification for schema-publication-editions.sql
SELECT
  to_regclass('public.book_publication_editions') IS NOT NULL AS edition_table_ready,
  to_regprocedure('public.admin_upsert_book_publication_edition(text,text,text,text,text,text,integer,text)') IS NOT NULL AS edition_rpc_ready,
  has_function_privilege('authenticated', 'public.admin_upsert_book_publication_edition(text,text,text,text,text,text,integer,text)', 'EXECUTE') AS authenticated_can_call_rpc;

SELECT
  count(*) AS total_edition_slots,
  count(*) FILTER (WHERE publication = 'Haque Publication') AS haque_slots,
  count(*) FILTER (WHERE publication = 'Technical Publication') AS technical_slots,
  count(*) FILTER (WHERE cover_image_url IS NOT NULL) AS slots_with_covers,
  count(*) FILTER (WHERE publication NOT IN ('Haque Publication','Technical Publication')) AS invalid_publications
FROM public.book_publication_editions;

SELECT count(*) AS models_missing_two_slots
FROM public.books b
WHERE (
  SELECT count(*) FROM public.book_publication_editions e WHERE e.book_id = b.id
) <> 2;
