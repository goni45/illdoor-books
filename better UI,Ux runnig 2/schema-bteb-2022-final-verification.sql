-- ILLDOOR: Final verification for BTEB Regulation 2022 catalog
-- Read-only query. Safe to run repeatedly after the structure and seed migrations.

SELECT
  (
    SELECT count(*)
    FROM public.curriculum_entries
    WHERE regulation = '2022'
      AND technology_code IN ('85', '64', '67', '70', '68')
  ) AS curriculum_mappings,

  (
    SELECT count(*)
    FROM (
      SELECT
        regulation,
        lower(regexp_replace(btrim(subject_code), '[^a-zA-Z0-9]', '', 'g')) AS normalized_subject_code
      FROM public.books
      WHERE regulation = '2022'
        AND btrim(coalesce(subject_code, '')) <> ''
      GROUP BY
        regulation,
        lower(regexp_replace(btrim(subject_code), '[^a-zA-Z0-9]', '', 'g'))
      HAVING count(*) > 1
    ) AS duplicates
  ) AS duplicate_models,

  (
    SELECT count(*)
    FROM public.curriculum_entries AS c
    LEFT JOIN public.books AS b ON b.id = c.book_id
    WHERE b.id IS NULL
  ) AS orphan_mappings,

  (
    SELECT count(*)
    FROM public.book_curriculum_seed_conflicts
    WHERE regulation = '2022'
  ) AS title_conflicts;
