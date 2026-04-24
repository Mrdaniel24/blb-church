-- Add Snippe payment tracking columns to contributions
-- Run this in Supabase SQL Editor or via CLI: supabase db push

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS payment_method  text    NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS status          text    NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS snippe_session_id text  NULL,
  ADD COLUMN IF NOT EXISTS snippe_reference  text  NULL;

-- payment_method: 'cash' | 'mobile_money' | 'card'
-- status: 'pending' | 'completed' | 'failed'
-- snippe_session_id: Snippe session reference (sess_xxx) — links webhook to record
-- snippe_reference: Snippe payment reference from webhook (pi_xxx)

ALTER TABLE public.contributions
  ADD CONSTRAINT contributions_payment_method_check
    CHECK (payment_method IN ('cash', 'mobile_money', 'card')),
  ADD CONSTRAINT contributions_status_check
    CHECK (status IN ('pending', 'completed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_contributions_snippe_session
  ON public.contributions (snippe_session_id)
  WHERE snippe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contributions_status
  ON public.contributions (status);

-- Existing cash records have no status set — mark them completed
UPDATE public.contributions
  SET status = 'completed', payment_method = 'cash'
  WHERE status IS NULL OR status = '';
