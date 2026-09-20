-- ILLDOOR: Book Model + Seller Listing migration
-- Run after schema-p0-upgrade.sql, schema-p1-debug-patch.sql and schema-p1-requests.sql.
-- Existing books rows are preserved as seller_listings. Common metadata is grouped into new books rows.
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.seller_listings') IS NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='books' AND column_name='seller_id') THEN
    ALTER TABLE public.books RENAME TO seller_listings;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.books (
  id TEXT PRIMARY KEY DEFAULT 'model-' || gen_random_uuid()::text,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Unknown',
  edition TEXT,
  subject_code TEXT NOT NULL DEFAULT '',
  subject_name TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL,
  semester TEXT NOT NULL,
  common_image_url TEXT,
  isbn TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden')),
  views_count INT NOT NULL DEFAULT 0,
  migration_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_listings ADD COLUMN IF NOT EXISTS book_id TEXT REFERENCES public.books(id) ON DELETE RESTRICT;
ALTER TABLE public.seller_listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.book_model_migration_report (
  listing_id TEXT PRIMARY KEY REFERENCES public.seller_listings(id) ON DELETE CASCADE,
  proposed_key TEXT NOT NULL,
  book_id TEXT REFERENCES public.books(id),
  match_method TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high','medium','low')),
  needs_manual_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

WITH source AS (
  SELECT l.*,
    CASE WHEN btrim(coalesce(l.subject_code,'')) <> ''
      THEN 'code:' || lower(regexp_replace(btrim(l.subject_code),'[^a-zA-Z0-9]','','g'))
      ELSE 'fallback:' || lower(regexp_replace(btrim(l.title),'[^a-zA-Z0-9]+','','g')) || '|' || lower(btrim(l.department)) || '|' || lower(btrim(l.semester))
    END AS model_key
  FROM public.seller_listings l
), first_listing AS (
  SELECT DISTINCT ON (model_key) * FROM source ORDER BY model_key, created_at, id
)
INSERT INTO public.books (title,author,edition,subject_code,subject_name,department,semester,common_image_url,isbn,migration_key,created_at)
SELECT f.title,f.author,f.edition,f.subject_code,f.subject_name,f.department,f.semester,
       (SELECT bi.url FROM public.book_images bi WHERE bi.book_id=f.id ORDER BY bi.created_at,bi.id LIMIT 1),
       f.isbn,f.model_key,f.created_at
FROM first_listing f
ON CONFLICT (migration_key) DO UPDATE SET
  common_image_url = coalesce(public.books.common_image_url, excluded.common_image_url);

WITH keyed AS (
  SELECT l.id,
    CASE WHEN btrim(coalesce(l.subject_code,'')) <> ''
      THEN 'code:' || lower(regexp_replace(btrim(l.subject_code),'[^a-zA-Z0-9]','','g'))
      ELSE 'fallback:' || lower(regexp_replace(btrim(l.title),'[^a-zA-Z0-9]+','','g')) || '|' || lower(btrim(l.department)) || '|' || lower(btrim(l.semester))
    END AS model_key,
    CASE WHEN btrim(coalesce(l.subject_code,'')) <> '' THEN 'subject_code' ELSE 'title_department_semester' END method
  FROM public.seller_listings l
)
UPDATE public.seller_listings l SET book_id=b.id
FROM keyed k JOIN public.books b ON b.migration_key=k.model_key WHERE l.id=k.id;

INSERT INTO public.book_model_migration_report(listing_id,proposed_key,book_id,match_method,confidence,needs_manual_review)
SELECT l.id,b.migration_key,b.id,
  CASE WHEN b.migration_key LIKE 'code:%' THEN 'exact_subject_code' ELSE 'normalized_title_department_semester' END,
  CASE WHEN b.migration_key LIKE 'code:%' THEN 'high' ELSE 'medium' END,
  b.migration_key NOT LIKE 'code:%'
FROM public.seller_listings l JOIN public.books b ON b.id=l.book_id
ON CONFLICT (listing_id) DO UPDATE SET proposed_key=excluded.proposed_key,book_id=excluded.book_id,match_method=excluded.match_method,confidence=excluded.confidence,needs_manual_review=excluded.needs_manual_review;

ALTER TABLE public.seller_listings ALTER COLUMN book_id SET NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='book_id') THEN
    ALTER TABLE public.orders RENAME COLUMN book_id TO seller_listing_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='book_id') THEN
    ALTER TABLE public.reviews RENAME COLUMN book_id TO seller_listing_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='book_requests' AND column_name='fulfilled_by_book_id') THEN
    ALTER TABLE public.book_requests RENAME COLUMN fulfilled_by_book_id TO fulfilled_by_listing_id;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.wishlist_listing_legacy') IS NULL THEN
    CREATE TABLE public.wishlist_models (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id,book_id)
    );
    INSERT INTO public.wishlist_models(user_id,book_id,created_at)
    SELECT w.user_id,l.book_id,min(w.created_at) FROM public.wishlist w JOIN public.seller_listings l ON l.id=w.book_id GROUP BY w.user_id,l.book_id ON CONFLICT DO NOTHING;
    ALTER TABLE public.wishlist RENAME TO wishlist_listing_legacy;
    ALTER TABLE public.wishlist_models RENAME TO wishlist;
  END IF;
END $$;

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_model_migration_report ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS migration_report_admin_only ON public.book_model_migration_report;
CREATE POLICY migration_report_admin_only ON public.book_model_migration_report FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS books_select_active ON public.books; DROP POLICY IF EXISTS books_admin_all ON public.books;
CREATE POLICY books_select_active ON public.books FOR SELECT USING (status='active' OR public.is_admin());
CREATE POLICY books_admin_all ON public.books FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS listings_select_all ON public.seller_listings; DROP POLICY IF EXISTS listings_insert_own ON public.seller_listings; DROP POLICY IF EXISTS listings_update_own ON public.seller_listings; DROP POLICY IF EXISTS listings_delete_own ON public.seller_listings; DROP POLICY IF EXISTS listings_admin_all ON public.seller_listings;
CREATE POLICY listings_select_all ON public.seller_listings FOR SELECT USING (true);
CREATE POLICY listings_insert_own ON public.seller_listings FOR INSERT WITH CHECK (auth.uid()=seller_id);
CREATE POLICY listings_update_own ON public.seller_listings FOR UPDATE USING (auth.uid()=seller_id) WITH CHECK (auth.uid()=seller_id);
CREATE POLICY listings_delete_own ON public.seller_listings FOR DELETE USING (auth.uid()=seller_id);
CREATE POLICY listings_admin_all ON public.seller_listings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS wishlist_select_own ON public.wishlist; DROP POLICY IF EXISTS wishlist_insert_own ON public.wishlist; DROP POLICY IF EXISTS wishlist_delete_own ON public.wishlist;
CREATE POLICY wishlist_select_own ON public.wishlist FOR SELECT USING(auth.uid()=user_id);
CREATE POLICY wishlist_insert_own ON public.wishlist FOR INSERT WITH CHECK(auth.uid()=user_id);
CREATE POLICY wishlist_delete_own ON public.wishlist FOR DELETE USING(auth.uid()=user_id);

CREATE INDEX IF NOT EXISTS seller_listings_book_status_idx ON public.seller_listings(book_id,availability,selling_price);
CREATE INDEX IF NOT EXISTS seller_listings_seller_idx ON public.seller_listings(seller_id);
CREATE INDEX IF NOT EXISTS books_subject_code_idx ON public.books(lower(subject_code));

CREATE OR REPLACE FUNCTION public.increment_book_views(p_book_id TEXT) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$ UPDATE public.books SET views_count=views_count+1 WHERE id=p_book_id $$;
GRANT EXECUTE ON FUNCTION public.increment_book_views(TEXT) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_seller_listing(p_book_id TEXT,p_condition TEXT,p_condition_details TEXT,p_original_price INT,p_selling_price INT,p_pickup_point_id TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id TEXT; v_pickup public.pickup_points%rowtype;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.books WHERE id=p_book_id AND status='active') THEN RAISE EXCEPTION 'Book model not found'; END IF;
 SELECT * INTO v_pickup FROM public.pickup_points WHERE id=p_pickup_point_id AND is_active=true; IF NOT FOUND THEN RAISE EXCEPTION 'Pickup point not found'; END IF;
 INSERT INTO public.seller_listings(book_id,seller_id,title,author,edition,subject_code,subject_name,department,semester,condition,condition_details,original_price,selling_price,availability,pickup_point_id,pickup_point_name)
 SELECT p_book_id,auth.uid(),b.title,b.author,b.edition,b.subject_code,b.subject_name,b.department,b.semester,p_condition,coalesce(p_condition_details,''),p_original_price,p_selling_price,'Available',v_pickup.id,v_pickup.name FROM public.books b WHERE b.id=p_book_id RETURNING id INTO v_id;
 RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.create_seller_listing(TEXT,TEXT,TEXT,INT,INT,TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.place_order(TEXT, TEXT);

CREATE FUNCTION public.place_order(p_seller_listing_id TEXT,p_pickup_point_id TEXT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id UUID; v_listing public.seller_listings%rowtype; v_pin TEXT; v_num TEXT; v_pickup public.pickup_points%rowtype; v_buyer_institute TEXT; v_seller_institute TEXT;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 SELECT * INTO v_listing FROM public.seller_listings WHERE id=p_seller_listing_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF; IF v_listing.availability<>'Available' THEN RAISE EXCEPTION 'This listing is no longer available'; END IF; IF v_listing.seller_id=auth.uid() THEN RAISE EXCEPTION 'You cannot buy your own listing'; END IF;
 SELECT institute INTO v_buyer_institute FROM public.profiles WHERE id=auth.uid(); SELECT institute INTO v_seller_institute FROM public.profiles WHERE id=v_listing.seller_id; IF v_buyer_institute IS DISTINCT FROM v_seller_institute THEN RAISE EXCEPTION 'You can only buy from your institute'; END IF;
 SELECT * INTO v_pickup FROM public.pickup_points WHERE id=p_pickup_point_id AND is_active=true; IF NOT FOUND THEN RAISE EXCEPTION 'Pickup point not found'; END IF;
 v_pin:=lpad((floor(random()*9000)+1000)::text,4,'0'); v_num:='PB-'||lpad((floor(random()*900000)+100000)::text,6,'0');
 INSERT INTO public.orders(order_number,seller_listing_id,buyer_id,seller_id,price,status,pickup_point_id,payment_state,verification_pin) VALUES(v_num,v_listing.id,auth.uid(),v_listing.seller_id,v_listing.selling_price,'placed',v_pickup.id,'Paid (Escrow)',v_pin) RETURNING id INTO v_id;
 UPDATE public.seller_listings SET availability='Reserved' WHERE id=v_listing.id;
 INSERT INTO public.notifications(user_id,title,message,type,link_route,link_id) VALUES(auth.uid(),'Order Placed ('||v_num||')','Your pickup PIN is '||v_pin||' at '||v_pickup.name||'.','order','orders',v_id::text);
 RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.place_order(TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_order_lifecycle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN NEW.payment_state:='Released to Seller'; UPDATE public.seller_listings SET availability='Sold' WHERE id=NEW.seller_listing_id; UPDATE public.profiles SET total_sales=total_sales+1 WHERE id=NEW.seller_id; UPDATE public.profiles SET total_purchases=total_purchases+1 WHERE id=NEW.buyer_id; END IF;
 IF TG_OP='UPDATE' AND NEW.status='cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN IF NEW.payment_state='Paid (Escrow)' THEN NEW.payment_state:='Refunded'; END IF; UPDATE public.seller_listings SET availability='Available' WHERE id=NEW.seller_listing_id AND availability<>'Sold'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.verify_pickup_pin(p_order_id UUID,p_pin TEXT) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order public.orders%rowtype;
BEGIN
 IF NOT public.is_admin() THEN RETURN json_build_object('success',false,'message','Only the campus desk can verify pickup.'); END IF;
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE; IF NOT FOUND THEN RETURN json_build_object('success',false,'message','Order not found.'); END IF;
 IF v_order.status='completed' THEN RETURN json_build_object('success',false,'message','Order already completed.'); END IF;
 IF v_order.verification_pin IS DISTINCT FROM btrim(p_pin) THEN RETURN json_build_object('success',false,'message','Invalid PIN.'); END IF;
 UPDATE public.orders SET status='completed' WHERE id=p_order_id;
 RETURN json_build_object('success',true,'message','Pickup verified and escrow released.');
END $$;
GRANT EXECUTE ON FUNCTION public.verify_pickup_pin(UUID,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_order public.orders%rowtype;
BEGIN
 SELECT * INTO v_order FROM public.orders WHERE id=NEW.order_id;
 IF NOT FOUND OR v_order.status<>'completed' THEN RAISE EXCEPTION 'Only completed transactions can be reviewed'; END IF;
 IF NEW.reviewer_id NOT IN (v_order.buyer_id,v_order.seller_id) THEN RAISE EXCEPTION 'Only order participants can review'; END IF;
 NEW.reviewee_id:=CASE WHEN NEW.reviewer_id=v_order.buyer_id THEN v_order.seller_id ELSE v_order.buyer_id END;
 NEW.seller_listing_id:=v_order.seller_listing_id; RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_matching_book_requests() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r record; v_book public.books%rowtype;
BEGIN
 SELECT * INTO v_book FROM public.books WHERE id=NEW.book_id;
 FOR r IN SELECT DISTINCT requester_id FROM public.book_requests WHERE status='open' AND lower(btrim(subject_code))=lower(btrim(v_book.subject_code)) AND requester_id<>NEW.seller_id LOOP
  INSERT INTO public.notifications(user_id,title,message,type,read,link_route,link_id) VALUES(r.requester_id,'Matching Book Available!','A seller listed '||v_book.title||' for ৳'||NEW.selling_price||'.','system',false,'book-details',v_book.id);
 END LOOP; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_matching_book_requests ON public.seller_listings;
CREATE TRIGGER trg_notify_matching_book_requests AFTER INSERT ON public.seller_listings FOR EACH ROW EXECUTE FUNCTION public.notify_matching_book_requests();

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.books; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_listings; EXCEPTION WHEN duplicate_object THEN NULL; END;
 END IF;
END $$;
ALTER TABLE public.books REPLICA IDENTITY FULL; ALTER TABLE public.seller_listings REPLICA IDENTITY FULL;
COMMIT;

-- De-duplication report:
SELECT * FROM public.book_model_migration_report ORDER BY needs_manual_review DESC, proposed_key, listing_id;