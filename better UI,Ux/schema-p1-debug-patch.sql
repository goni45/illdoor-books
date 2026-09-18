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

  -- Server-side buyer counter update
  UPDATE public.profiles SET total_purchases = total_purchases + 1 WHERE id = auth.uid();

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
  INSERT INTO public.notifications (user_id, title, message, type, link_route, link_id)
  VALUES (
    v_book.seller_id,
    'New Order Received (' || v_num || ')',
    'A student ordered "' || v_book.title || '". Please drop it off at ' || v_pickup.name || '.',
    'order',
    'orders',
    v_order_id
  );

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
  IF auth.uid() <> v_order.seller_id AND NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Only the seller or campus desk can confirm handover.');
  END IF;

  IF v_order.status = 'completed' THEN
    RETURN json_build_object('success', false, 'message', 'This order is already completed.');
  END IF;

  IF v_order.verification_pin IS DISTINCT FROM btrim(p_pin) THEN
    RETURN json_build_object('success', false, 'message', 'Invalid PIN.');
  END IF;

  UPDATE public.orders
     SET status = 'completed', payment_state = 'Released to Seller'
   WHERE id = p_order_id;

  UPDATE public.books SET availability = 'Sold' WHERE id = v_order.book_id;
  UPDATE public.profiles SET total_sales = total_sales + 1 WHERE id = v_order.seller_id;

  -- Notifications
  INSERT INTO public.notifications (user_id, title, message, type, link_route, link_id)
  VALUES (
    v_order.seller_id,
    'Pickup Verified — Order #' || v_order.order_number,
    'Handover confirmed! ৳' || v_order.price || ' escrow released to your balance.',
    'pickup',
    'orders',
    p_order_id
  );

  INSERT INTO public.notifications (user_id, title, message, type, link_route, link_id)
  VALUES (
    v_order.buyer_id,
    'Book Collected — Order #' || v_order.order_number,
    'Handover complete. Don''t forget to leave a review for your peer!',
    'pickup',
    'orders',
    p_order_id
  );

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
