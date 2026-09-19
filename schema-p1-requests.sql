-- ============================================================
-- ILLDOOR USED BOOK MARKETPLACE - BOOK REQUESTS MIGRATION (PRD §15 & §38)
-- Run this script in the Supabase SQL Editor.
-- Safe to re-run (idempotent).
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

-- ── Indexes for fast searching & matching ─────────────────────
CREATE INDEX IF NOT EXISTS idx_book_requests_status_created 
  ON public.book_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_requests_subject_code 
  ON public.book_requests (LOWER(subject_code));

CREATE INDEX IF NOT EXISTS idx_book_requests_department_semester 
  ON public.book_requests (department, semester);

CREATE INDEX IF NOT EXISTS idx_book_requests_requester 
  ON public.book_requests (requester_id);

-- ── Enable Row Level Security ─────────────────────────────────
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──────────────────────────────────────────────
DROP POLICY IF EXISTS "book_requests_select" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_insert_own" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_update_own" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_delete_own" ON public.book_requests;
DROP POLICY IF EXISTS "book_requests_admin_all" ON public.book_requests;

-- Anyone can browse open requests (potential sellers need to see demand), or users see their own
CREATE POLICY "book_requests_select" ON public.book_requests 
  FOR SELECT USING (
    status = 'open' 
    OR auth.uid() = requester_id 
    OR public.is_admin()
  );

-- Authenticated users can create requests for themselves
CREATE POLICY "book_requests_insert_own" ON public.book_requests 
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Requesters can update their own requests (mark fulfilled, cancelled, edit notes)
CREATE POLICY "book_requests_update_own" ON public.book_requests 
  FOR UPDATE USING (auth.uid() = requester_id OR public.is_admin());

-- Requesters or admins can delete
CREATE POLICY "book_requests_delete_own" ON public.book_requests 
  FOR DELETE USING (auth.uid() = requester_id OR public.is_admin());

-- ── Auto-Notify Requesters Trigger ─────────────────────────────
-- Whenever a new book is listed, notify requesters with matching subject code
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
