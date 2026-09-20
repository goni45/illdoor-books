-- ILLDOOR BTEB 2022 — STEP 1/2: structure only
-- Run this entire file once. It uses dynamic DDL so Supabase can execute it as one DO block.
DO $migration$
BEGIN
  EXECUTE $ddl$ALTER TABLE public.books ADD COLUMN IF NOT EXISTS regulation TEXT NOT NULL DEFAULT '2022'$ddl$;

  EXECUTE $ddl$
    CREATE TABLE IF NOT EXISTS public.curriculum_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
      regulation TEXT NOT NULL,
      technology_code TEXT NOT NULL,
      department TEXT NOT NULL,
      semester TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT curriculum_entries_semester_check CHECK (semester ~ '^[1-8](st|nd|rd|th) Semester$'),
      CONSTRAINT curriculum_entries_unique_mapping UNIQUE (book_id, regulation, technology_code, semester)
    )
  $ddl$;

  EXECUTE $ddl$
    CREATE TABLE IF NOT EXISTS public.book_curriculum_seed_conflicts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      regulation TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      existing_book_id TEXT REFERENCES public.books(id) ON DELETE CASCADE,
      existing_title TEXT NOT NULL,
      seed_title TEXT NOT NULL,
      detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT book_curriculum_seed_conflicts_unique UNIQUE (regulation, subject_code, existing_book_id, seed_title)
    )
  $ddl$;

  IF EXISTS (
    SELECT 1 FROM public.books
    WHERE btrim(coalesce(subject_code,'')) <> ''
    GROUP BY regulation, lower(regexp_replace(btrim(subject_code),'[^a-zA-Z0-9]','','g'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existing duplicate Book Models found. Resolve them before applying the curriculum seed.';
  END IF;

  EXECUTE $ddl$
    CREATE UNIQUE INDEX IF NOT EXISTS books_regulation_normalized_subject_code_uidx
    ON public.books (regulation, lower(regexp_replace(btrim(subject_code),'[^a-zA-Z0-9]','','g')))
    WHERE btrim(coalesce(subject_code,'')) <> ''
  $ddl$;

  EXECUTE $ddl$CREATE INDEX IF NOT EXISTS curriculum_entries_filter_idx ON public.curriculum_entries(regulation,technology_code,semester,book_id)$ddl$;
  EXECUTE $ddl$ALTER TABLE public.curriculum_entries ENABLE ROW LEVEL SECURITY$ddl$;
  EXECUTE $ddl$ALTER TABLE public.book_curriculum_seed_conflicts ENABLE ROW LEVEL SECURITY$ddl$;

  EXECUTE $ddl$DROP POLICY IF EXISTS curriculum_entries_select_all ON public.curriculum_entries$ddl$;
  EXECUTE $ddl$DROP POLICY IF EXISTS curriculum_entries_admin_all ON public.curriculum_entries$ddl$;
  EXECUTE $ddl$CREATE POLICY curriculum_entries_select_all ON public.curriculum_entries FOR SELECT USING (true)$ddl$;
  EXECUTE $ddl$CREATE POLICY curriculum_entries_admin_all ON public.curriculum_entries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())$ddl$;
  EXECUTE $ddl$DROP POLICY IF EXISTS curriculum_conflicts_admin_only ON public.book_curriculum_seed_conflicts$ddl$;
  EXECUTE $ddl$CREATE POLICY curriculum_conflicts_admin_only ON public.book_curriculum_seed_conflicts FOR SELECT USING (public.is_admin())$ddl$;

  EXECUTE $ddl$REVOKE INSERT,UPDATE,DELETE ON public.curriculum_entries FROM anon,authenticated$ddl$;
  EXECUTE $ddl$REVOKE ALL ON public.book_curriculum_seed_conflicts FROM anon,authenticated$ddl$;
  EXECUTE $ddl$GRANT SELECT ON public.curriculum_entries TO anon,authenticated$ddl$;
  EXECUTE $ddl$GRANT SELECT ON public.book_curriculum_seed_conflicts TO authenticated$ddl$;

  EXECUTE $ddl$DROP POLICY IF EXISTS listings_select_all ON public.seller_listings$ddl$;
  EXECUTE $ddl$DROP POLICY IF EXISTS listings_select_scoped ON public.seller_listings$ddl$;
  EXECUTE $ddl$
    CREATE POLICY listings_select_scoped ON public.seller_listings FOR SELECT USING (
      public.is_admin()
      OR seller_id=auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        JOIN public.profiles seller ON seller.id=seller_listings.seller_id
        WHERE me.id=auth.uid() AND me.institute=seller.institute
      )
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.seller_listing_id=seller_listings.id
          AND (o.buyer_id=auth.uid() OR o.seller_id=auth.uid())
      )
    )
  $ddl$;

  EXECUTE $ddl$
    CREATE OR REPLACE VIEW public.book_marketplace_stock
    WITH (security_invoker=true) AS
    SELECT b.id AS book_id,
      count(l.id) FILTER (WHERE l.availability='Available')::INT AS available_stock,
      count(DISTINCT l.seller_id) FILTER (WHERE l.availability='Available')::INT AS seller_count,
      min(l.selling_price) FILTER (WHERE l.availability='Available') AS lowest_price
    FROM public.books b
    LEFT JOIN public.seller_listings l ON l.book_id=b.id
    GROUP BY b.id
  $ddl$;
  EXECUTE $ddl$GRANT SELECT ON public.book_marketplace_stock TO anon,authenticated$ddl$;
END
$migration$;
