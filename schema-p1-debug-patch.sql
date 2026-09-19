-- ============================================================
-- ILLDOOR — P1 DEBUG & PERFORMANCE PATCH
-- Run this in Supabase → SQL Editor to apply the database
-- fixes and RPCs documented in DEBUG_AND_OPTIMIZE.md.
-- All statements are idempotent.
-- ============================================================

-- ── 1. INDEXES (P2-7) ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS books_created_at_idx   ON public.books (created_at DESC);
CREATE INDEX IF NOT EXISTS books_dept_sem_idx     ON public.books (department, semester);
CREATE INDEX IF NOT EXISTS books_availability_idx ON public.books (availability);
CREATE INDEX IF NOT EXISTS books_seller_idx       ON public.books (seller_id);
CREATE INDEX IF NOT EXISTS book_images_book_idx   ON public.book_images (book_id);
CREATE INDEX IF NOT EXISTS orders_buyer_idx       ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_idx      ON public.orders (seller_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS wishlist_user_idx      ON public.wishlist (user_id);
CREATE INDEX IF NOT EXISTS disputes_reporter_idx  ON public.disputes (reported_by);

-- ── 2. SEED MISSING PICKUP POINT (P0-10) ──────────────────────
INSERT INTO public.pickup_points (id, name, campus, location_detail, operating_hours, contact_person, phone)
VALUES ('pk-4', 'Campus Cafeteria Locker Station', 'Dhaka Polytechnic Institute',
        'Cafeteria Block, Locker Row A', 'Sun - Thu: 9:00 AM - 5:00 PM',
        'Cafeteria Manager', '+880 1700-000000')
ON CONFLICT (id) DO NOTHING;

-- ── 3. FIX PROFILE TRIGGER TO PERSIST PHONE (P0-11, P1-2) ──────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, student_roll, institute, department, semester, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',    'Student'),
    COALESCE(NEW.raw_user_meta_data->>'student_roll', ''),
    COALESCE(NEW.raw_user_meta_data->>'institute',    'Dhaka Polytechnic Institute'),
    COALESCE(NEW.raw_user_meta_data->>'department',   'Computer Technology'),
    COALESCE(NEW.raw_user_meta_data->>'semester',     '1st Semester'),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$;

-- ── 4. VIEW COUNTER RPC (P0-4) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_book_views(p_book_id TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.books SET views_count = views_count + 1 WHERE id = p_book_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_book_views(TEXT) TO anon, authenticated;

-- ── 5. ATOMIC ORDER PLACEMENT (P0-3) ──────────────────────────
CREATE OR REPLACE FUNCTION public.place_order(p_book_id TEXT, p_pickup_point_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_book     public.books%ROWTYPE;
  v_pin      TEXT;
  v_num      TEXT;
  v_pickup   public.pickup_points%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Row lock prevents concurrent double-booking races
  SELECT * INTO v_book FROM public.books WHERE id = p_book_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found';
  END IF;
  IF v_book.availability <> 'Available' THEN
    RAISE EXCEPTION 'This book is no longer available';
  END IF;
  IF v_book.seller_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot buy your own listing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.profiles buyer
      JOIN public.profiles seller ON seller.id = v_book.seller_id
     WHERE buyer.id = auth.uid()
       AND buyer.institute = seller.institute
  ) THEN
    RAISE EXCEPTION 'This listing belongs to a different institute marketplace';
  END IF;

  SELECT * INTO v_pickup FROM public.pickup_points WHERE id = p_pickup_point_id;
  IF NOT FOUND THEN
    -- Fallback to central library if invalid pickup point
    SELECT * INTO v_pickup FROM public.pickup_points ORDER BY id LIMIT 1;
  END IF;

  v_pin := lpad((floor(random() * 9000) + 1000)::TEXT, 4, '0');
  v_num := 'PB-' || lpad((floor(random() * 900000) + 100000)::TEXT, 6, '0');

  INSERT INTO public.orders (
    order_number, book_id, buyer_id, seller_id, price,
    status, pickup_point_id, payment_state, verification_pin
  ) VALUES (
    v_num, p_book_id, auth.uid(), v_book.seller_id, v_book.selling_price,
    'placed', v_pickup.id, 'Paid (Escrow)', v_pin
  )
  RETURNING id INTO v_order_id;

  UPDATE public.books SET availability = 'Reserved' WHERE id = p_book_id;

  -- Completion statistics are updated only by handle_order_lifecycle().

  -- Automated buyer notification
  INSERT INTO public.notifications (user_id, title, message, type, link_route, link_id)
  VALUES (
    auth.uid(),
    'Order Placed (' || v_num || ')',
    'You ordered "' || v_book.title || '". Pickup PIN: ' || v_pin || ' at ' || v_pickup.name || '.',
    'order',
    'orders',
    v_order_id
  );

  -- Automated seller notification
  -- Seller notification is emitted once by handle_order_lifecycle().

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(TEXT, TEXT) TO authenticated;

-- ── 6. SERVER-SIDE PIN VERIFICATION & ESCROW RELEASE (P1-1) ───
CREATE OR REPLACE FUNCTION public.verify_pickup_pin(p_order_id UUID, p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found.');
  END IF;

  -- Seller or Admin can confirm physical handover
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Only an authorized campus desk account can confirm handover.');
  END IF;

  IF v_order.status = 'completed' THEN
    RETURN json_build_object('success', false, 'message', 'This order is already completed.');
  END IF;

  IF v_order.verification_pin IS DISTINCT FROM btrim(p_pin) THEN
    RETURN json_build_object('success', false, 'message', 'Invalid PIN.');
  END IF;

  -- The lifecycle trigger atomically marks the book sold, updates both
  -- participant counters, releases escrow, and emits notifications.
  UPDATE public.orders
     SET status = 'completed'
   WHERE id = p_order_id;

  RETURN json_build_object('success', true, 'message', 'PIN verified. Escrow released to seller.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pickup_pin(UUID, TEXT) TO authenticated;

-- ── 7. SCOPE DIRECT ORDER UPDATES TO CANCELLATION (P1-1) ───────
DROP POLICY IF EXISTS "orders_update_participants" ON public.orders;
DROP POLICY IF EXISTS "orders_cancel_participants" ON public.orders;

CREATE POLICY "orders_cancel_participants" ON public.orders
  FOR UPDATE
  USING  (auth.uid() IN (buyer_id, seller_id) AND status IN ('placed', 'confirmed'))
  WITH CHECK (auth.uid() IN (buyer_id, seller_id) AND status = 'cancelled');

-- ── 8. SCOPE STORAGE INSERT POLICY (P1-3) ──────────────────────
DROP POLICY IF EXISTS "book_covers_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_insert_own" ON storage.objects;

CREATE POLICY "book_covers_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'book-covers'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================================
-- TRANSACTION SAFETY PATCH
-- ============================================================

-- Existing databases need the PRD's Inactive state.
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_availability_check;
ALTER TABLE public.books ADD CONSTRAINT books_availability_check
  CHECK (availability IN ('Available', 'Reserved', 'Sold', 'Inactive'));

-- Participants open a dispute atomically; the order is frozen immediately.
CREATE OR REPLACE FUNCTION public.open_order_dispute(
  p_order_id UUID,
  p_reason TEXT,
  p_details TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_book_title TEXT;
  v_dispute_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF auth.uid() NOT IN (v_order.buyer_id, v_order.seller_id) THEN
    RAISE EXCEPTION 'Only order participants can file a dispute';
  END IF;
  IF v_order.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This order can no longer be disputed';
  END IF;

  SELECT title INTO v_book_title FROM public.books WHERE id = v_order.book_id;

  INSERT INTO public.disputes
    (order_id, order_number, book_title, reported_by, reason, details, status, priority)
  VALUES
    (v_order.id, v_order.order_number, COALESCE(v_book_title, 'Textbook'), auth.uid(),
     btrim(p_reason), COALESCE(btrim(p_details), ''), 'Open', 'Medium')
  RETURNING id INTO v_dispute_id;

  UPDATE public.orders SET status = 'disputed' WHERE id = v_order.id;
  RETURN v_dispute_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_order_dispute(UUID, TEXT, TEXT) TO authenticated;

-- Resolving a dispute safely refunds the buyer and returns the listing.
CREATE OR REPLACE FUNCTION public.resolve_order_dispute(
  p_dispute_id UUID,
  p_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('Under Review', 'Resolved') THEN RAISE EXCEPTION 'Invalid dispute status'; END IF;

  UPDATE public.disputes
     SET status = p_status
   WHERE id = p_dispute_id
   RETURNING order_id INTO v_order_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;

  IF p_status = 'Resolved' AND v_order_id IS NOT NULL THEN
    UPDATE public.orders
       SET status = 'cancelled',
           cancel_reason = 'Cancelled after campus desk dispute resolution'
     WHERE id = v_order_id AND status = 'disputed';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_order_dispute(UUID, TEXT) TO authenticated;

-- ============================================================
-- PROFILE PRIVACY
-- ============================================================

-- The application fetches the signed-in student's complete profile through
-- this private RPC. Public table reads are limited to non-sensitive columns.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, full_name, institute, department, semester, avatar_url,
  is_verified, is_admin, rating, total_sales, total_purchases, created_at
) ON public.profiles TO anon, authenticated;
