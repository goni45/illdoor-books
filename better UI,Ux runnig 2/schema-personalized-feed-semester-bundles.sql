-- ILLDOOR — Personalized department feed + multi-semester full-set bundles
-- Apply after schema-publication-editions.sql. Additive and backward-compatible.
BEGIN;

CREATE TABLE IF NOT EXISTS public.semester_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester ~ '^[1-8](st|nd|rd|th) Semester$'),
  original_price INT NOT NULL CHECK (original_price > 0),
  selling_price INT NOT NULL CHECK (selling_price > 0 AND selling_price <= original_price),
  pickup_point_id TEXT NOT NULL REFERENCES public.pickup_points(id),
  pickup_point_name TEXT NOT NULL,
  availability TEXT NOT NULL DEFAULT 'Available' CHECK (availability IN ('Available','Reserved','Sold','Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.semester_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.semester_bundles(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id),
  publication TEXT NOT NULL CHECK (publication IN ('Haque Publication','Technical Publication')),
  condition TEXT NOT NULL CHECK (condition IN ('Like New','Good','Used','Heavily Used')),
  condition_details TEXT NOT NULL DEFAULT '' CHECK (length(condition_details) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.bundle_single_book_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.semester_bundles(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '' CHECK (length(message) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, book_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS semester_bundles_feed_idx ON public.semester_bundles(department,semester,availability,created_at DESC);
CREATE INDEX IF NOT EXISTS semester_bundles_seller_idx ON public.semester_bundles(seller_id,availability);
CREATE INDEX IF NOT EXISTS semester_bundle_items_bundle_idx ON public.semester_bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS bundle_single_requests_participants_idx ON public.bundle_single_book_requests(buyer_id,seller_id,status);

ALTER TABLE public.semester_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_single_book_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS semester_bundles_scoped_select ON public.semester_bundles;
CREATE POLICY semester_bundles_scoped_select ON public.semester_bundles FOR SELECT USING (
  public.is_admin() OR seller_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles viewer
    JOIN public.profiles seller ON seller.id = semester_bundles.seller_id
    WHERE viewer.id = auth.uid()
      AND viewer.institute = seller.institute
      AND lower(btrim(viewer.department)) = lower(btrim(semester_bundles.department))
  )
);

DROP POLICY IF EXISTS semester_bundle_items_scoped_select ON public.semester_bundle_items;
CREATE POLICY semester_bundle_items_scoped_select ON public.semester_bundle_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.semester_bundles b WHERE b.id = semester_bundle_items.bundle_id)
);

DROP POLICY IF EXISTS bundle_single_requests_participant_select ON public.bundle_single_book_requests;
DROP POLICY IF EXISTS bundle_single_requests_buyer_insert ON public.bundle_single_book_requests;
DROP POLICY IF EXISTS bundle_single_requests_participant_update ON public.bundle_single_book_requests;
CREATE POLICY bundle_single_requests_participant_select ON public.bundle_single_book_requests FOR SELECT USING (
  public.is_admin() OR buyer_id = auth.uid() OR seller_id = auth.uid()
);
CREATE POLICY bundle_single_requests_buyer_insert ON public.bundle_single_book_requests FOR INSERT WITH CHECK (
  buyer_id = auth.uid() AND buyer_id <> seller_id
);
CREATE POLICY bundle_single_requests_participant_update ON public.bundle_single_book_requests FOR UPDATE USING (
  public.is_admin() OR buyer_id = auth.uid() OR seller_id = auth.uid()
);

REVOKE INSERT,UPDATE,DELETE ON public.semester_bundles FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.semester_bundle_items FROM anon,authenticated;
GRANT SELECT ON public.semester_bundles, public.semester_bundle_items TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.bundle_single_book_requests TO authenticated;

-- One order targets either one physical listing or one complete semester bundle.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS semester_bundle_id UUID REFERENCES public.semester_bundles(id);
ALTER TABLE public.orders ALTER COLUMN seller_listing_id DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_exactly_one_sale_target;
ALTER TABLE public.orders ADD CONSTRAINT orders_exactly_one_sale_target
  CHECK (num_nonnulls(seller_listing_id, semester_bundle_id) = 1) NOT VALID;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_exactly_one_sale_target;
CREATE INDEX IF NOT EXISTS orders_semester_bundle_idx ON public.orders(semester_bundle_id);

CREATE OR REPLACE FUNCTION public.create_semester_bundle_batch(p_bundles JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_profile public.profiles%rowtype;
  v_batch UUID := gen_random_uuid();
  v_bundle JSONB;
  v_item JSONB;
  v_bundle_id UUID;
  v_pickup public.pickup_points%rowtype;
  v_semester TEXT;
  v_original INT;
  v_selling INT;
  v_expected INT;
  v_supplied INT;
  v_ids JSONB := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id=auth.uid();
  IF NOT FOUND OR btrim(coalesce(v_profile.department,''))='' OR btrim(coalesce(v_profile.institute,''))='' THEN
    RAISE EXCEPTION 'Complete your department and institute profile first';
  END IF;
  IF jsonb_typeof(p_bundles) <> 'array' OR jsonb_array_length(p_bundles)=0 THEN RAISE EXCEPTION 'Select at least one semester'; END IF;

  FOR v_bundle IN SELECT value FROM jsonb_array_elements(p_bundles)
  LOOP
    v_semester := btrim(v_bundle->>'semester');
    v_original := (v_bundle->>'originalPrice')::INT;
    v_selling := (v_bundle->>'sellingPrice')::INT;
    IF v_semester !~ '^[1-8](st|nd|rd|th) Semester$' THEN RAISE EXCEPTION 'Invalid semester'; END IF;
    IF v_original<=0 OR v_selling<=0 OR v_selling>v_original THEN RAISE EXCEPTION 'Invalid bundle prices for %',v_semester; END IF;
    SELECT * INTO v_pickup FROM public.pickup_points WHERE id=(v_bundle->>'pickupPointId') AND is_active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pickup point not found'; END IF;

    SELECT count(DISTINCT ce.book_id) INTO v_expected
    FROM public.curriculum_entries ce JOIN public.books b ON b.id=ce.book_id
    WHERE lower(btrim(ce.department))=lower(btrim(v_profile.department)) AND ce.semester=v_semester AND b.status='active';
    SELECT count(DISTINCT value->>'bookId') INTO v_supplied FROM jsonb_array_elements(v_bundle->'items');
    IF v_expected=0 OR v_supplied<>v_expected OR EXISTS (
      SELECT 1 FROM public.curriculum_entries ce JOIN public.books b ON b.id=ce.book_id
      WHERE lower(btrim(ce.department))=lower(btrim(v_profile.department)) AND ce.semester=v_semester AND b.status='active'
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_bundle->'items') x WHERE x->>'bookId'=ce.book_id)
    ) THEN RAISE EXCEPTION '% must include every active catalog book (% required)',v_semester,v_expected; END IF;

    INSERT INTO public.semester_bundles(batch_id,seller_id,department,semester,original_price,selling_price,pickup_point_id,pickup_point_name)
    VALUES(v_batch,auth.uid(),v_profile.department,v_semester,v_original,v_selling,v_pickup.id,v_pickup.name)
    RETURNING id INTO v_bundle_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(v_bundle->'items')
    LOOP
      IF (v_item->>'publication') NOT IN ('Haque Publication','Technical Publication') THEN RAISE EXCEPTION 'Invalid publication'; END IF;
      IF (v_item->>'condition') NOT IN ('Like New','Good','Used','Heavily Used') THEN RAISE EXCEPTION 'Invalid condition'; END IF;
      INSERT INTO public.semester_bundle_items(bundle_id,book_id,publication,condition,condition_details)
      VALUES(v_bundle_id,v_item->>'bookId',v_item->>'publication',v_item->>'condition',left(btrim(coalesce(v_item->>'conditionDetails','')),500));
    END LOOP;
    v_ids := v_ids || jsonb_build_array(v_bundle_id);
  END LOOP;
  RETURN jsonb_build_object('batchId',v_batch,'bundleIds',v_ids);
END $$;

CREATE OR REPLACE FUNCTION public.place_semester_bundle_order(p_bundle_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b public.semester_bundles%rowtype; p public.pickup_points%rowtype; v_id UUID; v_pin TEXT; v_num TEXT; buyer_inst TEXT; seller_inst TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO b FROM public.semester_bundles WHERE id=p_bundle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Semester bundle not found'; END IF;
  IF b.availability<>'Available' THEN RAISE EXCEPTION 'This semester bundle is no longer available'; END IF;
  IF b.seller_id=auth.uid() THEN RAISE EXCEPTION 'You cannot buy your own bundle'; END IF;
  SELECT institute INTO buyer_inst FROM public.profiles WHERE id=auth.uid();
  SELECT institute INTO seller_inst FROM public.profiles WHERE id=b.seller_id;
  IF buyer_inst IS DISTINCT FROM seller_inst THEN RAISE EXCEPTION 'You can only buy from your institute'; END IF;
  SELECT * INTO p FROM public.pickup_points WHERE id=b.pickup_point_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pickup point not found'; END IF;
  v_pin:=lpad((floor(random()*9000)+1000)::text,4,'0');
  v_num:='SB-'||lpad((floor(random()*900000)+100000)::text,6,'0');
  INSERT INTO public.orders(order_number,semester_bundle_id,buyer_id,seller_id,price,status,pickup_point_id,payment_state,verification_pin)
  VALUES(v_num,b.id,auth.uid(),b.seller_id,b.selling_price,'placed',p.id,'Paid (Escrow)',v_pin) RETURNING id INTO v_id;
  UPDATE public.semester_bundles SET availability='Reserved',updated_at=now() WHERE id=b.id;
  INSERT INTO public.notifications(user_id,title,message,type,link_route,link_id) VALUES
    (auth.uid(),'Semester Bundle Ordered','Order '||v_num||' is reserved. Your pickup PIN is '||v_pin||'.','order','orders',v_id::text),
    (b.seller_id,'New Semester Bundle Order','Your '||b.semester||' full set was ordered.','order','orders',v_id::text);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.request_bundle_single_book(p_bundle_id UUID,p_book_id TEXT,p_message TEXT DEFAULT '')
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b public.semester_bundles%rowtype; v_id UUID; v_title TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO b FROM public.semester_bundles WHERE id=p_bundle_id;
  IF NOT FOUND OR b.availability NOT IN ('Available','Reserved') THEN RAISE EXCEPTION 'Bundle is unavailable'; END IF;
  IF b.seller_id=auth.uid() THEN RAISE EXCEPTION 'You cannot request your own book'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.semester_bundle_items WHERE bundle_id=b.id AND book_id=p_book_id) THEN RAISE EXCEPTION 'Book is not in this bundle'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles me JOIN public.profiles seller ON seller.id=b.seller_id WHERE me.id=auth.uid() AND me.institute=seller.institute) THEN RAISE EXCEPTION 'Different institute'; END IF;
  INSERT INTO public.bundle_single_book_requests(bundle_id,book_id,buyer_id,seller_id,message)
  VALUES(b.id,p_book_id,auth.uid(),b.seller_id,left(btrim(coalesce(p_message,'')),500))
  ON CONFLICT(bundle_id,book_id,buyer_id) DO UPDATE SET message=excluded.message,status='pending',updated_at=now()
  RETURNING id INTO v_id;
  SELECT title INTO v_title FROM public.books WHERE id=p_book_id;
  INSERT INTO public.notifications(user_id,title,message,type,link_route,link_id)
  VALUES(b.seller_id,'Single-book request',coalesce(v_title,'A book')||' was requested separately from your '||b.semester||' bundle.','system','profile',v_id::text);
  RETURN v_id;
END $$;

-- Preserve existing single-listing behavior and add bundle lifecycle transitions.
CREATE OR REPLACE FUNCTION public.handle_order_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
  NEW.payment_state:='Released to Seller';
  IF NEW.seller_listing_id IS NOT NULL THEN UPDATE public.seller_listings SET availability='Sold',updated_at=now() WHERE id=NEW.seller_listing_id; END IF;
  IF NEW.semester_bundle_id IS NOT NULL THEN UPDATE public.semester_bundles SET availability='Sold',updated_at=now() WHERE id=NEW.semester_bundle_id; END IF;
  UPDATE public.profiles SET total_sales=total_sales+1 WHERE id=NEW.seller_id;
  UPDATE public.profiles SET total_purchases=total_purchases+1 WHERE id=NEW.buyer_id;
  INSERT INTO public.notifications(user_id,title,message,type,link_route,link_id) VALUES
    (NEW.buyer_id,'Pickup Completed','Order '||NEW.order_number||' is complete.','pickup','orders',NEW.id::text),
    (NEW.seller_id,'Sale Completed','Order '||NEW.order_number||' is complete and funds were released.','order','orders',NEW.id::text);
 ELSIF TG_OP='UPDATE' AND NEW.status='cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
  IF NEW.payment_state='Paid (Escrow)' THEN NEW.payment_state:='Refunded'; END IF;
  IF NEW.seller_listing_id IS NOT NULL THEN UPDATE public.seller_listings SET availability='Available',updated_at=now() WHERE id=NEW.seller_listing_id AND availability<>'Sold'; END IF;
  IF NEW.semester_bundle_id IS NOT NULL THEN UPDATE public.semester_bundles SET availability='Available',updated_at=now() WHERE id=NEW.semester_bundle_id AND availability<>'Sold'; END IF;
  INSERT INTO public.notifications(user_id,title,message,type,link_route,link_id) VALUES
    (NEW.buyer_id,'Order Cancelled','Order '||NEW.order_number||' was cancelled and refunded.','order','orders',NEW.id::text),
    (NEW.seller_id,'Order Cancelled','Order '||NEW.order_number||' was cancelled and is available again.','order','orders',NEW.id::text);
 END IF;
 RETURN NEW;
END $$;


CREATE OR REPLACE FUNCTION public.respond_bundle_single_book_request(p_request_id UUID,p_decision TEXT,p_original_price INT DEFAULT NULL,p_selling_price INT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.bundle_single_book_requests%rowtype; b public.semester_bundles%rowtype; i public.semester_bundle_items%rowtype; model public.books%rowtype; v_listing_id TEXT;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF p_decision NOT IN ('accepted','rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT * INTO r FROM public.bundle_single_book_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND OR r.seller_id<>auth.uid() THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'Request already handled'; END IF;
 IF p_decision='rejected' THEN
  UPDATE public.bundle_single_book_requests SET status='rejected',updated_at=now() WHERE id=r.id;
  INSERT INTO public.notifications(user_id,title,message,type,link_route,link_id) VALUES(r.buyer_id,'Single-book request declined','The seller kept this book in the complete semester set.','system','semester-bundles',r.bundle_id::text);
  RETURN NULL;
 END IF;
 IF p_original_price IS NULL OR p_selling_price IS NULL OR p_original_price<=0 OR p_selling_price<=0 OR p_selling_price>p_original_price THEN RAISE EXCEPTION 'Valid individual prices are required'; END IF;
 SELECT * INTO b FROM public.semester_bundles WHERE id=r.bundle_id FOR UPDATE;
 IF NOT FOUND OR b.seller_id<>auth.uid() OR b.availability<>'Available' THEN RAISE EXCEPTION 'Bundle is not available'; END IF;
 SELECT * INTO i FROM public.semester_bundle_items WHERE bundle_id=b.id AND book_id=r.book_id;
 SELECT * INTO model FROM public.books WHERE id=r.book_id;
 INSERT INTO public.seller_listings(book_id,seller_id,title,author,edition,subject_code,subject_name,department,semester,publication,condition,condition_details,original_price,selling_price,availability,pickup_point_id,pickup_point_name)
 VALUES(model.id,auth.uid(),model.title,model.author,model.edition,model.subject_code,model.subject_name,b.department,b.semester,i.publication,i.condition,i.condition_details,p_original_price,p_selling_price,'Available',b.pickup_point_id,b.pickup_point_name)
 RETURNING id INTO v_listing_id;
 UPDATE public.semester_bundles SET availability='Inactive',updated_at=now() WHERE id=b.id;
 UPDATE public.bundle_single_book_requests SET status=CASE WHEN id=r.id THEN 'accepted' ELSE 'rejected' END,updated_at=now()
 WHERE bundle_id=b.id AND status='pending';
 INSERT INTO public.notifications(user_id,title,message,type,link_route,link_id) VALUES(r.buyer_id,'Requested book is now available',model.title||' was separated from the semester set and listed for you.','system','book-details',model.id);
 RETURN v_listing_id;
END $$;

REVOKE ALL ON FUNCTION public.create_semester_bundle_batch(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_semester_bundle_order(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_bundle_single_book(UUID,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_bundle_single_book_request(UUID,TEXT,INT,INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_semester_bundle_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_semester_bundle_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_bundle_single_book(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_bundle_single_book_request(UUID,TEXT,INT,INT) TO authenticated;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.semester_bundles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bundle_single_book_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
 END IF;
END $$;

COMMIT;
NOTIFY pgrst, 'reload schema';
