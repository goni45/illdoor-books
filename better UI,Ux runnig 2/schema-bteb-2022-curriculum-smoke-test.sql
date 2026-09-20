-- Run after schema-bteb-2022-curriculum.sql
SELECT 'curriculum_mapping_count' check_name,count(*)::text result
FROM public.curriculum_entries WHERE regulation='2022' AND technology_code IN ('85','64','67','70','68');

SELECT 'duplicate_book_models' check_name,count(*)::text result FROM (
  SELECT regulation,lower(regexp_replace(btrim(subject_code),'[^a-zA-Z0-9]','','g')) code
  FROM public.books WHERE regulation='2022' AND btrim(coalesce(subject_code,''))<>''
  GROUP BY 1,2 HAVING count(*)>1
) d;

SELECT 'orphan_curriculum_entries' check_name,count(*)::text result
FROM public.curriculum_entries c LEFT JOIN public.books b ON b.id=c.book_id WHERE b.id IS NULL;

SELECT 'seed_title_conflicts' check_name,count(*)::text result
FROM public.book_curriculum_seed_conflicts WHERE regulation='2022';

SELECT technology_code,department,count(*) mapping_count
FROM public.curriculum_entries WHERE regulation='2022' AND technology_code IN ('85','64','67','70','68')
GROUP BY technology_code,department ORDER BY technology_code;

SELECT b.subject_code,b.title,s.available_stock,s.seller_count,s.lowest_price
FROM public.books b JOIN public.book_marketplace_stock s ON s.book_id=b.id
WHERE b.regulation='2022' ORDER BY b.subject_code LIMIT 20;
