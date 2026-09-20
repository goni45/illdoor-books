-- ILLDOOR — Haque / Technical Publication support
-- Self-contained final patch. Run once after the BTEB curriculum migration.
BEGIN;

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publication TEXT;
ALTER TABLE public.seller_listings ADD COLUMN IF NOT EXISTS publication TEXT;

UPDATE public.books
SET publication = 'Haque Publication'
WHERE publication IS NULL OR btrim(publication) = '';

UPDATE public.seller_listings l
SET publication = coalesce(nullif(btrim(l.publication), ''), b.publication, 'Haque Publication')
FROM public.books b
WHERE b.id = l.book_id
  AND (l.publication IS NULL OR btrim(l.publication) = '');

ALTER TABLE public.books ALTER COLUMN publication SET DEFAULT 'Haque Publication';
ALTER TABLE public.books ALTER COLUMN publication SET NOT NULL;
ALTER TABLE public.seller_listings ALTER COLUMN publication SET DEFAULT 'Haque Publication';
ALTER TABLE public.seller_listings ALTER COLUMN publication SET NOT NULL;

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_publication_check;
ALTER TABLE public.books ADD CONSTRAINT books_publication_check
  CHECK (publication IN ('Haque Publication', 'Technical Publication')) NOT VALID;
ALTER TABLE public.books VALIDATE CONSTRAINT books_publication_check;

ALTER TABLE public.seller_listings DROP CONSTRAINT IF EXISTS seller_listings_publication_check;
ALTER TABLE public.seller_listings ADD CONSTRAINT seller_listings_publication_check
  CHECK (publication IN ('Haque Publication', 'Technical Publication')) NOT VALID;
ALTER TABLE public.seller_listings VALIDATE CONSTRAINT seller_listings_publication_check;

DROP FUNCTION IF EXISTS public.admin_upsert_book_model(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.admin_upsert_book_model(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);

CREATE FUNCTION public.admin_upsert_book_model(
  p_book_id TEXT,
  p_title TEXT,
  p_author TEXT,
  p_edition TEXT,
  p_subject_code TEXT,
  p_subject_name TEXT,
  p_publication TEXT,
  p_regulation TEXT,
  p_technology_code TEXT,
  p_department TEXT,
  p_semester TEXT,
  p_common_image_url TEXT,
  p_isbn TEXT,
  p_status TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_book_id TEXT;
  v_title TEXT := btrim(coalesce(p_title, ''));
  v_subject_code TEXT := btrim(coalesce(p_subject_code, ''));
  v_subject_name TEXT := btrim(coalesce(p_subject_name, ''));
  v_regulation TEXT := btrim(coalesce(p_regulation, '2022'));
  v_technology_code TEXT := btrim(coalesce(p_technology_code, ''));
  v_department TEXT := btrim(coalesce(p_department, ''));
  v_semester TEXT := btrim(coalesce(p_semester, ''));
  v_image TEXT := nullif(btrim(coalesce(p_common_image_url, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF v_title = '' OR v_subject_code = '' OR v_department = '' OR v_technology_code = '' THEN
    RAISE EXCEPTION 'Title, subject code, technology code and department are required';
  END IF;
  IF p_publication NOT IN ('Haque Publication', 'Technical Publication') THEN RAISE EXCEPTION 'Invalid publication'; END IF;
  IF v_semester !~ '^[1-8](st|nd|rd|th) Semester$' THEN RAISE EXCEPTION 'Invalid semester'; END IF;
  IF p_status NOT IN ('active', 'hidden') THEN RAISE EXCEPTION 'Invalid model status'; END IF;
  IF v_image IS NOT NULL AND v_image !~* '^https?://' THEN RAISE EXCEPTION 'Cover image must be an http(s) URL'; END IF;

  IF nullif(btrim(coalesce(p_book_id, '')), '') IS NULL THEN
    INSERT INTO public.books (
      title, author, edition, subject_code, subject_name, publication, department,
      semester, common_image_url, isbn, status, regulation
    ) VALUES (
      v_title, coalesce(nullif(btrim(coalesce(p_author, '')), ''), 'Unknown'),
      nullif(btrim(coalesce(p_edition, '')), ''), v_subject_code,
      coalesce(nullif(v_subject_name, ''), v_title), p_publication, v_department,
      v_semester, v_image, nullif(btrim(coalesce(p_isbn, '')), ''), p_status, v_regulation
    ) RETURNING id INTO v_book_id;
  ELSE
    UPDATE public.books
    SET title = v_title,
        author = coalesce(nullif(btrim(coalesce(p_author, '')), ''), 'Unknown'),
        edition = nullif(btrim(coalesce(p_edition, '')), ''),
        subject_code = v_subject_code,
        subject_name = coalesce(nullif(v_subject_name, ''), v_title),
        publication = p_publication,
        department = v_department,
        semester = v_semester,
        common_image_url = v_image,
        isbn = nullif(btrim(coalesce(p_isbn, '')), ''),
        status = p_status,
        regulation = v_regulation,
        updated_at = now()
    WHERE id = p_book_id
    RETURNING id INTO v_book_id;
    IF v_book_id IS NULL THEN RAISE EXCEPTION 'Book model not found'; END IF;
  END IF;

  INSERT INTO public.curriculum_entries (book_id, regulation, technology_code, department, semester)
  VALUES (v_book_id, v_regulation, v_technology_code, v_department, v_semester)
  ON CONFLICT (book_id, regulation, technology_code, semester)
  DO UPDATE SET department = excluded.department;

  RETURN v_book_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_book_model_status(p_book_id TEXT, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('active', 'hidden') THEN RAISE EXCEPTION 'Invalid model status'; END IF;
  UPDATE public.books SET status = p_status, updated_at = now() WHERE id = p_book_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Book model not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_book_model(p_book_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_title TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT title INTO v_title FROM public.books WHERE id = p_book_id FOR UPDATE;
  IF v_title IS NULL THEN RAISE EXCEPTION 'Book model not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.seller_listings WHERE book_id = p_book_id) THEN
    RAISE EXCEPTION 'This model has seller listings. Hide it instead of deleting it.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.wishlist WHERE book_id = p_book_id) THEN
    RAISE EXCEPTION 'This model is in a wishlist. Hide it instead of deleting it.';
  END IF;
  DELETE FROM public.books WHERE id = p_book_id;
END;
$$;

DROP FUNCTION IF EXISTS public.create_seller_listing(TEXT,TEXT,TEXT,INT,INT,TEXT);
DROP FUNCTION IF EXISTS public.create_seller_listing(TEXT,TEXT,TEXT,INT,INT,TEXT,TEXT);

CREATE FUNCTION public.create_seller_listing(
  p_book_id TEXT,
  p_condition TEXT,
  p_condition_details TEXT,
  p_original_price INT,
  p_selling_price INT,
  p_pickup_point_id TEXT,
  p_publication TEXT
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id TEXT; p public.pickup_points%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_publication NOT IN ('Haque Publication', 'Technical Publication') THEN RAISE EXCEPTION 'Invalid publication'; END IF;
  IF p_condition NOT IN ('Like New','Good','Used','Heavily Used') THEN RAISE EXCEPTION 'Invalid condition'; END IF;
  IF p_original_price <= 0 OR p_selling_price <= 0 OR p_selling_price > p_original_price THEN RAISE EXCEPTION 'Invalid prices'; END IF;
  IF length(coalesce(p_condition_details,'')) > 500 THEN RAISE EXCEPTION 'Condition notes too long'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.books WHERE id = p_book_id AND status = 'active') THEN RAISE EXCEPTION 'Book model not found'; END IF;
  SELECT * INTO p FROM public.pickup_points WHERE id = p_pickup_point_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pickup point not found'; END IF;

  INSERT INTO public.seller_listings (
    book_id, seller_id, title, author, edition, subject_code, subject_name,
    department, semester, publication, condition, condition_details,
    original_price, selling_price, availability, pickup_point_id, pickup_point_name
  )
  SELECT b.id, auth.uid(), b.title, b.author, b.edition, b.subject_code, b.subject_name,
    b.department, b.semester, p_publication, p_condition,
    btrim(coalesce(p_condition_details,'')), p_original_price, p_selling_price,
    'Available', p.id, p.name
  FROM public.books b WHERE b.id = p_book_id
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_book_model(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_book_model_status(TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_book_model(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_seller_listing(TEXT,TEXT,TEXT,INT,INT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_book_model(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_book_model_status(TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_book_model(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_seller_listing(TEXT,TEXT,TEXT,INT,INT,TEXT,TEXT) TO authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
