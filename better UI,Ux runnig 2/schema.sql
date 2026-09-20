-- ============================================================
-- ILLDOOR — Polytechnic Book Exchange
-- Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  student_roll   TEXT NOT NULL,
  institute      TEXT NOT NULL DEFAULT 'Dhaka Polytechnic Institute',
  department     TEXT NOT NULL,
  semester       TEXT NOT NULL,
  phone          TEXT,
  avatar_url     TEXT,
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  rating         NUMERIC(3, 2) NOT NULL DEFAULT 0,
  total_sales    INT NOT NULL DEFAULT 0,
  total_purchases INT NOT NULL DEFAULT 0,
  is_admin       BOOLEAN NOT NULL DEFAULT FALSE,
  student_reg_no TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. PICKUP POINTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pickup_points (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  campus           TEXT NOT NULL,
  location_detail  TEXT NOT NULL,
  operating_hours  TEXT NOT NULL,
  contact_person   TEXT NOT NULL,
  phone            TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. BOOKS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.books (
  id                TEXT PRIMARY KEY DEFAULT 'book-' || gen_random_uuid()::TEXT,
  seller_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  author            TEXT NOT NULL DEFAULT 'Unknown',
  edition           TEXT,
  subject_code      TEXT NOT NULL,
  subject_name      TEXT NOT NULL,
  department        TEXT NOT NULL,
  semester          TEXT NOT NULL,
  condition         TEXT NOT NULL CHECK (condition IN ('Like New', 'Good', 'Used', 'Heavily Used')),
  condition_details TEXT NOT NULL DEFAULT '',
  original_price    INT NOT NULL DEFAULT 0,
  selling_price     INT NOT NULL,
  savings           INT NOT NULL GENERATED ALWAYS AS (GREATEST(0, original_price - selling_price)) STORED,
  availability      TEXT NOT NULL DEFAULT 'Available' CHECK (availability IN ('Available', 'Reserved', 'Sold', 'Inactive')),
  pickup_point_id   TEXT NOT NULL REFERENCES public.pickup_points(id),
  pickup_point_name TEXT NOT NULL,
  views_count       INT NOT NULL DEFAULT 0,
  isbn              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. BOOK IMAGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.book_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. ORDERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT NOT NULL UNIQUE,
  book_id          TEXT NOT NULL REFERENCES public.books(id),
  buyer_id         UUID NOT NULL REFERENCES public.profiles(id),
  seller_id        UUID NOT NULL REFERENCES public.profiles(id),
  price            INT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'placed' CHECK (
    status IN ('placed','confirmed','dropped_off','ready_for_pickup','picked_up','completed','cancelled','disputed')
  ),
  pickup_point_id  TEXT NOT NULL REFERENCES public.pickup_points(id),
  payment_state    TEXT NOT NULL DEFAULT 'Pending' CHECK (
    payment_state IN ('Pending', 'Paid (Escrow)', 'Released to Seller', 'Refunded')
  ),
  verification_pin TEXT NOT NULL,
  cancel_reason    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. WISHLIST ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id    TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id)
);

-- ── 7. NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'system' CHECK (
    type IN ('order', 'pickup', 'verification', 'system', 'dispute')
  ),
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  link_route TEXT,
  link_id    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. DISPUTES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disputes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES public.orders(id),
  order_number TEXT NOT NULL,
  book_title   TEXT NOT NULL,
  reported_by  UUID NOT NULL REFERENCES public.profiles(id),
  reason       TEXT NOT NULL,
  details      TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Under Review', 'Resolved')),
  priority     TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. REVIEWS ─────────────────────────────────────────────
-- One review per participant per order. A review is only accepted for a
-- completed order and always targets the other participant, which is what
-- makes the "Transaction Verified" badge meaningful.
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

-- ── 10. VERIFICATION REQUESTS ───────────────────────────────
-- A student submits their BTEB roll + registration number and a photo of
-- their ID card; an admin approves or rejects it. Approval is what actually
-- flips profiles.is_verified, so the badge cannot be self-granted.
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

-- ============================================================
-- MIGRATIONS FOR EXISTING DATABASES
-- ------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS does not add new columns to tables that
-- already exist, so upgrades are applied explicitly here. Safe to re-run.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_reg_no TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
-- Every policy is dropped before it is created so the whole file
-- can safely be re-run against an existing database.
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ADMIN HELPER
-- ------------------------------------------------------------
-- SECURITY DEFINER so the lookup bypasses RLS on profiles and can
-- therefore be used inside policies on profiles itself.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
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
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id AND is_admin = FALSE AND is_verified = FALSE);
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE USING (public.is_admin());

-- books
DROP POLICY IF EXISTS "books_select_all" ON public.books;
DROP POLICY IF EXISTS "books_insert_own" ON public.books;
DROP POLICY IF EXISTS "books_update_own" ON public.books;
DROP POLICY IF EXISTS "books_delete_own" ON public.books;
DROP POLICY IF EXISTS "books_admin_update" ON public.books;
DROP POLICY IF EXISTS "books_admin_delete" ON public.books;

CREATE POLICY "books_select_all" ON public.books FOR SELECT USING (true);
CREATE POLICY "books_insert_own" ON public.books FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "books_update_own" ON public.books FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "books_delete_own" ON public.books FOR DELETE USING (auth.uid() = seller_id);
CREATE POLICY "books_admin_update" ON public.books FOR UPDATE USING (public.is_admin());
CREATE POLICY "books_admin_delete" ON public.books FOR DELETE USING (public.is_admin());

-- book_images
DROP POLICY IF EXISTS "book_images_select_all" ON public.book_images;
DROP POLICY IF EXISTS "book_images_insert_own" ON public.book_images;
DROP POLICY IF EXISTS "book_images_delete_own" ON public.book_images;

CREATE POLICY "book_images_select_all" ON public.book_images FOR SELECT USING (true);
CREATE POLICY "book_images_insert_own" ON public.book_images FOR INSERT WITH CHECK (
  auth.uid() = (SELECT seller_id FROM public.books WHERE id = book_id)
);
CREATE POLICY "book_images_delete_own" ON public.book_images FOR DELETE USING (
  auth.uid() = (SELECT seller_id FROM public.books WHERE id = book_id)
);

-- pickup_points: public read
DROP POLICY IF EXISTS "pickup_points_select_all" ON public.pickup_points;
CREATE POLICY "pickup_points_select_all" ON public.pickup_points FOR SELECT USING (true);

-- orders
DROP POLICY IF EXISTS "orders_select_participants" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_buyer" ON public.orders;
DROP POLICY IF EXISTS "orders_cancel_participants" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_select" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;

CREATE POLICY "orders_select_participants" ON public.orders FOR SELECT USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);
CREATE POLICY "orders_insert_buyer" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "orders_cancel_participants" ON public.orders
  FOR UPDATE
  USING  (auth.uid() IN (buyer_id, seller_id) AND status IN ('placed', 'confirmed'))
  WITH CHECK (auth.uid() IN (buyer_id, seller_id) AND status = 'cancelled');
CREATE POLICY "orders_admin_select" ON public.orders FOR SELECT USING (public.is_admin());
CREATE POLICY "orders_admin_update" ON public.orders FOR UPDATE USING (public.is_admin());

-- wishlist
DROP POLICY IF EXISTS "wishlist_select_own" ON public.wishlist;
DROP POLICY IF EXISTS "wishlist_insert_own" ON public.wishlist;
DROP POLICY IF EXISTS "wishlist_delete_own" ON public.wishlist;

CREATE POLICY "wishlist_select_own" ON public.wishlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wishlist_insert_own" ON public.wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wishlist_delete_own" ON public.wishlist FOR DELETE USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- disputes
DROP POLICY IF EXISTS "disputes_select_own" ON public.disputes;
DROP POLICY IF EXISTS "disputes_insert_own" ON public.disputes;
DROP POLICY IF EXISTS "disputes_admin_select" ON public.disputes;
DROP POLICY IF EXISTS "disputes_admin_update" ON public.disputes;

CREATE POLICY "disputes_select_own" ON public.disputes FOR SELECT USING (auth.uid() = reported_by);
CREATE POLICY "disputes_insert_own" ON public.disputes FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "disputes_admin_select" ON public.disputes FOR SELECT USING (public.is_admin());
CREATE POLICY "disputes_admin_update" ON public.disputes FOR UPDATE USING (public.is_admin());

-- reviews: publicly readable marketplace trust signals, but a review can only
-- be written by an order participant (validated again by a trigger).
DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_participant" ON public.reviews;

CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_participant" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- verification_requests: a student sees and manages their own request;
-- admins see the whole review queue.
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

-- ============================================================
-- SEED DATA — Pickup Points
-- ============================================================

INSERT INTO public.pickup_points (id, name, campus, location_detail, operating_hours, contact_person, phone)
VALUES
  ('pk-1', 'Central Library Verification Desk', 'Dhaka Polytechnic Institute',
   'Academic Building 1, Ground Floor counter (Right side)',
   'Sun - Thu: 9:00 AM - 4:30 PM', 'Mr. Rafiqul Islam (Librarian)', '+880 1711-234567'),
  ('pk-2', 'Tech Block BTEB Hub Booth', 'Dhaka Polytechnic Institute',
   'Computer Dept. Corridor, 2nd Floor, Room 204',
   'Sun - Thu: 10:00 AM - 5:00 PM', 'Kazi Mahbub (Lab In-charge)', '+880 1822-890123'),
  ('pk-3', 'Student Union Help Desk', 'Dhaka Polytechnic Institute',
   'Main Gate Complex, Ground Floor Booth #2',
   'Sun - Thu: 8:30 AM - 6:00 PM', 'Rashed Karim (Student Rep)', '+880 1933-456789')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE — Book Images Bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Private bucket: only the owner and admins can read a student ID card.
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-ids', 'student-ids', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "book_covers_select_public" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "student_ids_select_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "student_ids_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "student_ids_delete_own" ON storage.objects;

CREATE POLICY "book_covers_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-covers');

CREATE POLICY "book_covers_insert_auth" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'book-covers' AND auth.role() = 'authenticated');

CREATE POLICY "book_covers_delete_own" ON storage.objects
  FOR DELETE USING (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

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

-- ============================================================
-- FUNCTION: Auto-create profile on signup
-- ============================================================

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: Order lifecycle (stats + notifications)
-- ------------------------------------------------------------
-- Runs with SECURITY DEFINER because a buyer must not be able to
-- update the seller's profile row directly (see "profiles_update_own").
-- This keeps total_sales / total_purchases accurate and delivers
-- notifications to BOTH participants of an order.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_order_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  v_book_title TEXT;
BEGIN
  SELECT title INTO v_book_title FROM public.books WHERE id = NEW.book_id;
  v_book_title := COALESCE(v_book_title, 'your textbook');

  -- ─ New order placed → tell the seller to drop the book off ──
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

  -- ── Order completed (PIN verified at the pickup booth) ──
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

  -- ── Order cancelled → refund escrow, free the listing, notify both sides ──
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

-- ============================================================
-- REALTIME — live marketplace updates
-- ------------------------------------------------------------
-- Adds the marketplace tables to the `supabase_realtime`
-- publication so the client can subscribe with postgres_changes.
-- RLS still applies to every change payload.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
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
      ALTER PUBLICATION supabase_realtime ADD TABLE public.book_images;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Full row payloads (UPDATE events include every column, not just changed ones)
ALTER TABLE public.books REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============================================================
-- REVIEWS — validation + reputation
-- ============================================================

-- A review is only trusted when it comes from a completed transaction, so the
-- order reference is re-checked server-side and the counterparty is derived
-- from the order instead of being trusted from the client payload.
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

-- Keeps profiles.rating equal to the average of all received ratings.
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

-- ============================================================
-- ORDER STATUS GUARD
-- ------------------------------------------------------------
-- RLS lets an order participant update their own row, which would
-- otherwise allow a client to jump an order straight to "completed".
-- Only forward movement is accepted; completed/cancelled are final
-- and admins may set any status (dispute resolution).
-- ============================================================

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

  -- Escrow can always be frozen for review
  IF NEW.status = 'disputed' THEN
    RETURN NEW;
  END IF;

  -- A completed or already cancelled order is final
  IF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'A % order can no longer change status', OLD.status;
  END IF;

  -- Cancelling is allowed until the book changes hands
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

-- ============================================================
-- STUDENT ID VERIFICATION — admin decision
-- ------------------------------------------------------------
-- Approving a request is the ONLY way profiles.is_verified becomes
-- true, so the badge can never be self-granted from the client.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_verification_decision()
RETURNS TRIGGER AS $$
BEGIN
  -- A student may (re)submit their own details, but ONLY an admin may decide
  -- the outcome — otherwise the badge could simply be self-granted.
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

-- ============================================================
-- REALTIME — reviews & verification queue
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
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
-- ============================================================
-- P1 DEBUG & PERFORMANCE PATCH (Indexes, RPCs, Security)
-- ============================================================

-- Indexes
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

-- Cafeteria Locker Station pickup point
INSERT INTO public.pickup_points (id, name, campus, location_detail, operating_hours, contact_person, phone)
VALUES ('pk-4', 'Campus Cafeteria Locker Station', 'Dhaka Polytechnic Institute',
        'Cafeteria Block, Locker Row A', 'Sun - Thu: 9:00 AM - 5:00 PM',
        'Cafeteria Manager', '+880 1700-000000')
ON CONFLICT (id) DO NOTHING;

-- View counter RPC
CREATE OR REPLACE FUNCTION public.increment_book_views(p_book_id TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.books SET views_count = views_count + 1 WHERE id = p_book_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_book_views(TEXT) TO anon, authenticated;

-- Atomic Order Placement RPC
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

  INSERT INTO public.notifications (user_id, title, message, type, link_route, link_id)
  VALUES (
    auth.uid(),
    'Order Placed (' || v_num || ')',
    'You ordered "' || v_book.title || '". Pickup PIN: ' || v_pin || ' at ' || v_pickup.name || '.',
    'order',
    'orders',
    v_order_id
  );

  -- Seller notification is emitted once by handle_order_lifecycle().

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(TEXT, TEXT) TO authenticated;

-- Server-side PIN verification RPC
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

-- Scoped storage insert policy
DROP POLICY IF EXISTS "book_covers_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_insert_own" ON storage.objects;

CREATE POLICY "book_covers_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'book-covers'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================================
-- BOOK REQUESTS SYSTEM (PRD §15 & §38)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.book_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  subject_code         TEXT NOT NULL,
  department           TEXT NOT NULL,
  semester             TEXT NOT NULL,
  max_budget           NUMERIC(10,2),
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'cancelled')),
  fulfilled_by_book_id TEXT REFERENCES public.books(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_requests_status_created 
  ON public.book_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_requests_subject_code 
  ON public.book_requests (LOWER(subject_code));

CREATE INDEX IF NOT EXISTS idx_book_requests_department_semester 
  ON public.book_requests (department, semester);

CREATE INDEX IF NOT EXISTS idx_book_requests_requester 
  ON public.book_requests (requester_id);

ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_requests_select" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_insert_own" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_update_own" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_delete_own" ON public.book_requests;

CREATE POLICY "book_requests_select" ON public.book_requests 
  FOR SELECT USING (
    status = 'open' 
    OR auth.uid() = requester_id 
    OR public.is_admin()
  );

CREATE POLICY "book_requests_insert_own" ON public.book_requests 
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "book_requests_update_own" ON public.book_requests 
  FOR UPDATE USING (auth.uid() = requester_id OR public.is_admin());

CREATE POLICY "book_requests_delete_own" ON public.book_requests 
  FOR DELETE USING (auth.uid() = requester_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.notify_matching_book_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r RECORD;
  clean_code TEXT;
BEGIN
  clean_code := LOWER(TRIM(NEW.subject_code));
  
  IF clean_code IS NOT NULL AND clean_code <> '' THEN
    FOR r IN
      SELECT DISTINCT requester_id, title
      FROM public.book_requests
      WHERE status = 'open'
        AND LOWER(TRIM(subject_code)) = clean_code
        AND requester_id <> NEW.seller_id
    LOOP
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        link_route,
        link_id,
        read,
        created_at
      ) VALUES (
        r.requester_id,
        'Matching Book Available! 📚',
        'A book matching your request for ' || NEW.subject_code || ' (' || NEW.title || ') was just listed for ৳' || NEW.selling_price || '.',
        'system',
        'book-details',
        NEW.id,
        false,
        NOW()
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_matching_book_requests ON public.books;
CREATE TRIGGER trg_notify_matching_book_requests
  AFTER INSERT ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matching_book_requests();



-- Realtime updates for the request board.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.book_requests;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.book_requests REPLICA IDENTITY FULL;

-- ============================================================
-- MAKING SOMEBODY AN ADMIN (run once, by hand)
-- ------------------------------------------------------------
-- The app only READS this flag — nothing in the client can set it.
--
--   UPDATE public.profiles SET is_admin = TRUE
--   WHERE email = 'admin@yourdomain.com';
--
-- To hand the console to another account later, run the same
-- statement again with the new email address.
-- ============================================================

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
