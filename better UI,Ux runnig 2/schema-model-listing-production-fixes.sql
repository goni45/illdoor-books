-- Run after the successfully applied Book Model + Seller Listing migration.
BEGIN;

ALTER TABLE public.seller_listings DROP CONSTRAINT IF EXISTS seller_listings_positive_prices;
ALTER TABLE public.seller_listings ADD CONSTRAINT seller_listings_positive_prices
  CHECK (original_price > 0 AND selling_price > 0 AND selling_price <= original_price) NOT VALID;

-- Block direct REST insert/update; validated SECURITY DEFINER RPCs remain available.
REVOKE INSERT, UPDATE ON public.seller_listings FROM authenticated;

CREATE OR REPLACE FUNCTION public.set_my_listing_availability(p_listing_id TEXT,p_availability TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE l public.seller_listings%rowtype;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF p_availability NOT IN ('Available','Inactive') THEN RAISE EXCEPTION 'Invalid availability'; END IF;
 SELECT * INTO l FROM public.seller_listings WHERE id=p_listing_id FOR UPDATE;
 IF NOT FOUND OR (NOT public.is_admin() AND l.seller_id<>auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF l.availability IN ('Reserved','Sold') THEN RAISE EXCEPTION 'Reserved or sold listings cannot be changed'; END IF;
 UPDATE public.seller_listings SET availability=p_availability,updated_at=now() WHERE id=p_listing_id;
END $$;
REVOKE ALL ON FUNCTION public.set_my_listing_availability(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_listing_availability(TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_seller_listing(p_book_id TEXT,p_condition TEXT,p_condition_details TEXT,p_original_price INT,p_selling_price INT,p_pickup_point_id TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id TEXT; p public.pickup_points%rowtype;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF p_condition NOT IN ('Like New','Good','Used','Heavily Used') THEN RAISE EXCEPTION 'Invalid condition'; END IF;
 IF p_original_price<=0 OR p_selling_price<=0 OR p_selling_price>p_original_price THEN RAISE EXCEPTION 'Invalid prices'; END IF;
 IF length(coalesce(p_condition_details,''))>500 THEN RAISE EXCEPTION 'Condition notes too long'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.books WHERE id=p_book_id AND status='active') THEN RAISE EXCEPTION 'Book model not found'; END IF;
 SELECT * INTO p FROM public.pickup_points WHERE id=p_pickup_point_id AND is_active=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pickup point not found'; END IF;
 INSERT INTO public.seller_listings(book_id,seller_id,title,author,edition,subject_code,subject_name,department,semester,condition,condition_details,original_price,selling_price,availability,pickup_point_id,pickup_point_name)
 SELECT b.id,auth.uid(),b.title,b.author,b.edition,b.subject_code,b.subject_name,b.department,b.semester,p_condition,btrim(coalesce(p_condition_details,'')),p_original_price,p_selling_price,'Available',p.id,p.name FROM public.books b WHERE b.id=p_book_id RETURNING id INTO v_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_seller_listing(TEXT,TEXT,TEXT,INT,INT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_seller_listing(TEXT,TEXT,TEXT,INT,INT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_order_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
  NEW.payment_state:='Released to Seller';
  UPDATE public.seller_listings SET availability='Sold',updated_at=now() WHERE id=NEW.seller_listing_id;
  UPDATE public.profiles SET total_sales=total_sales+1 WHERE id=NEW.seller_id;
  UPDATE public.profiles SET total_purchases=total_purchases+1 WHERE id=NEW.buyer_id;
  INSERT INTO public.notifications(user_id,title,message,type,link_route,link_id) VALUES
   (NEW.buyer_id,'Pickup Completed','Order '||NEW.order_number||' is complete.','pickup','orders',NEW.id::text),
   (NEW.seller_id,'Sale Completed','Order '||NEW.order_number||' is complete and funds were released.','order','orders',NEW.id::text);
 ELSIF TG_OP='UPDATE' AND NEW.status='cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
  IF NEW.payment_state='Paid (Escrow)' THEN NEW.payment_state:='Refunded'; END IF;
  UPDATE public.seller_listings SET availability='Available',updated_at=now() WHERE id=NEW.seller_listing_id AND availability<>'Sold';
  INSERT INTO public.notifications(user_id,title,message,type,link_route,link_id) VALUES
   (NEW.buyer_id,'Order Cancelled','Order '||NEW.order_number||' was cancelled and refunded.','order','orders',NEW.id::text),
   (NEW.seller_id,'Order Cancelled','Order '||NEW.order_number||' was cancelled; the listing is available.','order','orders',NEW.id::text);
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.open_order_dispute(p_order_id UUID,p_reason TEXT,p_details TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.orders%rowtype; title TEXT; dispute_id UUID;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF auth.uid() NOT IN (o.buyer_id,o.seller_id) THEN RAISE EXCEPTION 'Only participants can file a dispute'; END IF;
 IF o.status IN ('completed','cancelled','disputed') THEN RAISE EXCEPTION 'Order cannot be disputed'; END IF;
 SELECT b.title INTO title FROM public.seller_listings l JOIN public.books b ON b.id=l.book_id WHERE l.id=o.seller_listing_id;
 INSERT INTO public.disputes(order_id,order_number,book_title,reported_by,reason,details,status,priority)
 VALUES(o.id,o.order_number,coalesce(title,'Textbook'),auth.uid(),btrim(p_reason),left(btrim(coalesce(p_details,'')),2000),'Open','Medium') RETURNING id INTO dispute_id;
 UPDATE public.orders SET status='disputed' WHERE id=o.id;
 RETURN dispute_id;
END $$;
REVOKE ALL ON FUNCTION public.open_order_dispute(UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_order_dispute(UUID,TEXT,TEXT) TO authenticated;

ALTER TABLE public.book_model_migration_report ADD COLUMN IF NOT EXISTS metadata_conflict BOOLEAN NOT NULL DEFAULT false;
WITH c AS (SELECT book_id FROM public.seller_listings GROUP BY book_id HAVING count(DISTINCT lower(btrim(title)))>1 OR count(DISTINCT lower(btrim(author)))>1 OR count(DISTINCT lower(btrim(coalesce(edition,''))))>1)
UPDATE public.book_model_migration_report r SET metadata_conflict=true,needs_manual_review=true,confidence='review' FROM c WHERE c.book_id=r.book_id;

COMMIT;
SELECT count(*) AS migration_rows_needing_review FROM public.book_model_migration_report WHERE needs_manual_review;
