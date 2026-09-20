-- ILLDOOR — Publication-specific book metadata and cover slots
-- Run once after schema-publication-support.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS public.book_publication_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  publication TEXT NOT NULL CHECK (publication IN ('Haque Publication', 'Technical Publication')),
  author_override TEXT,
  edition_label TEXT,
  cover_image_url TEXT,
  source_url TEXT,
  source_product_id TEXT,
  reference_price INT CHECK (reference_price IS NULL OR reference_price >= 0),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT book_publication_editions_unique UNIQUE (book_id, publication),
  CONSTRAINT book_publication_editions_cover_url_check CHECK (cover_image_url IS NULL OR cover_image_url ~* '^https?://'),
  CONSTRAINT book_publication_editions_source_url_check CHECK (source_url IS NULL OR source_url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS book_publication_editions_lookup_idx
  ON public.book_publication_editions(book_id, publication);

ALTER TABLE public.book_publication_editions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS publication_editions_select_all ON public.book_publication_editions;
DROP POLICY IF EXISTS publication_editions_admin_all ON public.book_publication_editions;
CREATE POLICY publication_editions_select_all ON public.book_publication_editions
  FOR SELECT USING (true);
CREATE POLICY publication_editions_admin_all ON public.book_publication_editions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.book_publication_editions FROM anon, authenticated;
GRANT SELECT ON public.book_publication_editions TO anon, authenticated;

INSERT INTO public.book_publication_editions (
  book_id, publication, author_override, edition_label, cover_image_url
)
SELECT b.id, p.publication,
  CASE WHEN b.publication = p.publication THEN nullif(b.author, 'Unknown') ELSE NULL END,
  CASE WHEN b.publication = p.publication THEN b.edition ELSE NULL END,
  CASE WHEN b.publication = p.publication THEN b.common_image_url ELSE NULL END
FROM public.books b
CROSS JOIN (VALUES ('Haque Publication'), ('Technical Publication')) AS p(publication)
ON CONFLICT (book_id, publication) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_upsert_book_publication_edition(
  p_book_id TEXT,
  p_publication TEXT,
  p_cover_image_url TEXT,
  p_source_url TEXT,
  p_author_override TEXT,
  p_edition_label TEXT,
  p_reference_price INT,
  p_source_product_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_cover TEXT := nullif(btrim(coalesce(p_cover_image_url, '')), '');
  v_source TEXT := nullif(btrim(coalesce(p_source_url, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_publication NOT IN ('Haque Publication', 'Technical Publication') THEN RAISE EXCEPTION 'Invalid publication'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.books WHERE id = p_book_id) THEN RAISE EXCEPTION 'Book model not found'; END IF;
  IF v_cover IS NOT NULL AND v_cover !~* '^https?://' THEN RAISE EXCEPTION 'Invalid cover URL'; END IF;
  IF v_source IS NOT NULL AND v_source !~* '^https?://' THEN RAISE EXCEPTION 'Invalid source URL'; END IF;
  IF p_reference_price IS NOT NULL AND p_reference_price < 0 THEN RAISE EXCEPTION 'Invalid reference price'; END IF;

  INSERT INTO public.book_publication_editions (
    book_id, publication, cover_image_url, source_url, author_override,
    edition_label, reference_price, source_product_id, last_synced_at, updated_at
  ) VALUES (
    p_book_id, p_publication, v_cover, v_source,
    nullif(btrim(coalesce(p_author_override, '')), ''),
    nullif(btrim(coalesce(p_edition_label, '')), ''),
    p_reference_price,
    nullif(btrim(coalesce(p_source_product_id, '')), ''),
    CASE WHEN v_source IS NULL THEN NULL ELSE now() END,
    now()
  )
  ON CONFLICT (book_id, publication) DO UPDATE SET
    cover_image_url = excluded.cover_image_url,
    source_url = excluded.source_url,
    author_override = excluded.author_override,
    edition_label = excluded.edition_label,
    reference_price = excluded.reference_price,
    source_product_id = excluded.source_product_id,
    last_synced_at = excluded.last_synced_at,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_book_publication_edition(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_book_publication_edition(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,INT,TEXT) TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
