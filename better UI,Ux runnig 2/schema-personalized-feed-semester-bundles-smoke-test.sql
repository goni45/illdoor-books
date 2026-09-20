-- Read-only verification after schema-personalized-feed-semester-bundles.sql
SELECT
  to_regclass('public.semester_bundles') IS NOT NULL AS semester_bundles_exists,
  to_regclass('public.semester_bundle_items') IS NOT NULL AS semester_bundle_items_exists,
  to_regclass('public.bundle_single_book_requests') IS NOT NULL AS single_requests_exists;

SELECT
  count(*) FILTER (WHERE item_count = 0) AS empty_bundles,
  count(*) FILTER (WHERE expected_count <> item_count) AS incomplete_full_sets
FROM (
  SELECT b.id,
    (SELECT count(*) FROM public.semester_bundle_items i WHERE i.bundle_id=b.id) AS item_count,
    (SELECT count(DISTINCT ce.book_id)
     FROM public.curriculum_entries ce JOIN public.books model ON model.id=ce.book_id
     WHERE lower(btrim(ce.department))=lower(btrim(b.department))
       AND ce.semester=b.semester AND model.status='active') AS expected_count
  FROM public.semester_bundles b
) checks;

SELECT count(*) AS invalid_order_targets
FROM public.orders
WHERE num_nonnulls(seller_listing_id, semester_bundle_id) <> 1;

SELECT count(*) AS cross_institute_bundle_orders
FROM public.orders o
JOIN public.semester_bundles b ON b.id=o.semester_bundle_id
JOIN public.profiles buyer ON buyer.id=o.buyer_id
JOIN public.profiles seller ON seller.id=o.seller_id
WHERE buyer.institute IS DISTINCT FROM seller.institute OR b.seller_id<>o.seller_id;
