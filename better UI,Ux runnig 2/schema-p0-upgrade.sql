-- ============================================================
-- ILLDOOR — P0 UPGRADE PATCH
-- (Admin role + Reviews + Student Verification + Cancel flow)
-- ------------------------------------------------------------
-- Run this in Supabase → SQL Editor on a database that was created
-- with an OLDER version of schema.sql. Every statement is idempotent,
-- so the file is safe to re-run.
--
-- A FRESH install does not need this file — schema.sql already
-- contains all of it.
-- ============================================================

-- ── 1. New columns (older databases are missing these) ───────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_reg_no TEXT;
ALTER TABLE public.orders  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- ── 2. New tables ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  book_id      TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  reviewer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, reviewer_id),
  CHECK (reviewer_id <> reviewee_id)
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_roll   TEXT NOT NULL,
  student_reg_no TEXT NOT NULL DEFAULT '',
  id_card_path   TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note     TEXT NOT NULL DEFAULT '',
  reviewed_by    UUID REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at    TIMESTAMPTZ
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- ── 3. Admin helper (SECURITY DEFINER so it can be used inside
--       policies on the profiles table itself) ──────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── 4. Policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
    AND is_verified IS NOT DISTINCT FROM (SELECT p.is_verified FROM public.profiles p WHERE p.id = auth.uid())
    AND rating IS NOT DISTINCT FROM (SELECT p.rating FROM public.profiles p WHERE p.id = auth.uid())
    AND total_sales IS NOT DISTINCT FROM (SELECT p.total_sales FROM public.profiles p WHERE p.id = auth.uid())
    AND total_purchases IS NOT DISTINCT FROM (SELECT p.total_purchases FROM public.profiles p WHERE p.id = auth.uid())
  );
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "books_admin_update" ON public.books;
DROP POLICY IF EXISTS "books_admin_delete" ON public.books;
CREATE POLICY "books_admin_update" ON public.books FOR UPDATE USING (public.is_admin());
CREATE POLICY "books_admin_delete" ON public.books FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_select" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_select" ON public.orders FOR SELECT USING (public.is_admin());
CREATE POLICY "orders_admin_update" ON public.orders FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "disputes_admin_select" ON public.disputes;
DROP POLICY IF EXISTS "disputes_admin_update" ON public.disputes;
CREATE POLICY "disputes_admin_select" ON public.disputes FOR SELECT USING (public.is_admin());
CREATE POLICY "disputes_admin_update" ON public.disputes FOR UPDATE USING (public.is_admin());

-- Reviews: publicly readable trust signals, written only by a participant
-- (the trigger validates participation again server-side).
DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_participant" ON public.reviews;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_participant" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Verification: student manages their own request, admin decides the outcome.
DROP POLICY IF EXISTS "verification_select_own" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_insert_own" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_update_own" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_admin_select" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_admin_update" ON public.verification_requests;

CREATE POLICY "verification_select_own" ON public.verification_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "verification_insert_own" ON public.verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verification_update_own" ON public.verification_requests FOR UPDATE USING (
  auth.uid() = user_id AND status <> 'approved'
) WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "verification_admin_select" ON public.verification_requests FOR SELECT USING (public.is_admin());
CREATE POLICY "verification_admin_update" ON public.verification_requests FOR UPDATE USING (public.is_admin());

-- ── 5. Order lifecycle (escrow, stats, notifications) ─────────
-- Re-created in full so older databases also get the cancel/refund
-- branch and the completion notifications.
CREATE OR REPLACE FUNCTION public.handle_order_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  v_book_title TEXT;
BEGIN
  SELECT title INTO v_book_title FROM public.books WHERE id = NEW.book_id;
  v_book_title := COALESCE(v_book_title, 'your textbook');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link_route, link_id)
    VALUES (
      NEW.seller_id,
      'New Order Received — #' || NEW.order_number,
      'A student ordered "' || v_book_title || '". Drop it off at the campus pickup desk.',
      'order', 'orders', NEW.id::TEXT
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.profiles SET total_sales = total_sales + 1 WHERE id = NEW.seller_id;
    UPDATE public.profiles SET total_purchases = total_purchases + 1 WHERE id = NEW.buyer_id;

    IF NEW.payment_state <> 'Released to Seller' THEN
      NEW.payment_state := 'Released to Seller';
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, link_route, link_id)
    VALUES
      (NEW.buyer_id,
       'Pickup Verified — Order #' || NEW.order_number,
       'Escrow ৳' || NEW.price || ' has been released to the seller. Enjoy your book!',
       'pickup', 'orders', NEW.id::TEXT),
      (NEW.seller_id,
       'Payout Released — Order #' || NEW.order_number,
       'Your payout of ' || NEW.price || ' BDT for "' || v_book_title || '" has been released to you.',
       'pickup', 'orders', NEW.id::TEXT);

    UPDATE public.books SET availability = 'Sold' WHERE id = NEW.book_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    IF NEW.payment_state = 'Paid (Escrow)' THEN
      NEW.payment_state := 'Refunded';
    END IF;

    UPDATE public.books SET availability = 'Available' WHERE id = NEW.book_id AND availability <> 'Sold';

    INSERT INTO public.notifications (user_id, title, message, type, link_route, link_id)
    VALUES
      (NEW.buyer_id,
       'Order Cancelled — #' || NEW.order_number,
       'Escrow has been refunded in full for "' || v_book_title || '". The listing is active on the marketplace again.',
       'order', 'orders', NEW.id::TEXT),
      (NEW.seller_id,
       'Order Cancelled — #' || NEW.order_number,
       'The order for "' || v_book_title || '" was cancelled. Your listing is active again.',
       'order', 'orders', NEW.id::TEXT);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS orders_lifecycle ON public.orders;
CREATE TRIGGER orders_lifecycle
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_lifecycle();

-- ── 6. Reviews: validation + reputation ───────────────────────
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS TRIGGER AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed transactions can be reviewed';
  END IF;

  IF NEW.reviewer_id <> v_order.buyer_id AND NEW.reviewer_id <> v_order.seller_id THEN
    RAISE EXCEPTION 'Only order participants can review this transaction';
  END IF;

  NEW.reviewee_id := CASE
    WHEN NEW.reviewer_id = v_order.buyer_id THEN v_order.seller_id
    ELSE v_order.buyer_id
  END;
  NEW.book_id := v_order.book_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS reviews_validate ON public.reviews;
CREATE TRIGGER reviews_validate
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review();

CREATE OR REPLACE FUNCTION public.refresh_profile_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_target UUID;
BEGIN
  v_target := COALESCE(NEW.reviewee_id, OLD.reviewee_id);

  UPDATE public.profiles p
  SET rating = COALESCE((
    SELECT ROUND(AVG(r.rating)::NUMERIC, 2)
    FROM public.reviews r
    WHERE r.reviewee_id = v_target
  ), 0)
  WHERE p.id = v_target;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS reviews_refresh_rating ON public.reviews;
CREATE TRIGGER reviews_refresh_rating
  AFTER INSERT OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_profile_rating();

-- ── 7. Order status guard (forward-only transitions) ──────────
CREATE OR REPLACE FUNCTION public.guard_order_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_ranks CONSTANT TEXT[] := ARRAY[
    'placed', 'confirmed', 'dropped_off', 'ready_for_pickup', 'picked_up', 'completed'
  ];
  v_rank_old INT;
  v_rank_new INT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'disputed' THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'A % order can no longer change status', OLD.status;
  END IF;

  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'disputed' THEN
    RAISE EXCEPTION 'A disputed order must be resolved by the campus desk first';
  END IF;

  v_rank_old := array_position(v_ranks, OLD.status);
  v_rank_new := array_position(v_ranks, NEW.status);

  IF v_rank_old IS NULL OR v_rank_new IS NULL OR v_rank_new <= v_rank_old THEN
    RAISE EXCEPTION 'Illegal order transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_guard_transition ON public.orders;
CREATE TRIGGER orders_guard_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_transition();

-- ── 8. Student verification decision (admin only) ─────────────
CREATE OR REPLACE FUNCTION public.handle_verification_decision()
RETURNS TRIGGER AS $$
BEGIN
  -- A student may (re)submit their own details, but ONLY an admin may
  -- decide the outcome — otherwise the badge could be self-granted.
  IF NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
      NEW.admin_note := '';
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    ELSE
      NEW.status := 'pending';
      NEW.admin_note := '';
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, NOW());

    UPDATE public.profiles
    SET is_verified = TRUE,
        student_roll = NEW.student_roll,
        student_reg_no = NEW.student_reg_no
    WHERE id = NEW.user_id;

    INSERT INTO public.notifications (user_id, title, message, type, link_route)
    VALUES (
      NEW.user_id,
      'Student ID Verified',
      'Your BTEB student identity is verified. The Verified Student badge is now active on your profile.',
      'verification', 'profile'
    );
  END IF;

  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, NOW());

    UPDATE public.profiles SET is_verified = FALSE WHERE id = NEW.user_id;

    INSERT INTO public.notifications (user_id, title, message, type, link_route)
    VALUES (
      NEW.user_id,
      'Student ID Verification Rejected',
      COALESCE(
        NULLIF(NEW.admin_note, ''),
        'Your submission could not be verified. Please re-submit a clearer photo of your student ID card.'
      ),
      'verification', 'profile'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS verification_decision ON public.verification_requests;
CREATE TRIGGER verification_decision
  BEFORE INSERT OR UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_verification_decision();

-- ── 9. Storage: private student ID bucket ─────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-ids', 'student-ids', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "student_ids_select_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "student_ids_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "student_ids_delete_own" ON storage.objects;

CREATE POLICY "student_ids_select_own_or_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'student-ids'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

CREATE POLICY "student_ids_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'student-ids' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "student_ids_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'student-ids' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 10. Realtime publication ──────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.book_images;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_requests;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============================================================
-- 11. GRANT ADMIN — the flag nothing in the app can set
-- ------------------------------------------------------------
-- Your account must already exist (sign up once in the app first),
-- then this makes it a campus-desk staff account.
-- ============================================================

UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'gangixyz111@gmail.com';

-- Verify (the row below must show is_admin = t)
SELECT email, is_admin, full_name FROM public.profiles ORDER BY created_at DESC LIMIT 10;
