-- =========================================
-- UPDATE TRANSACTIONS FOR INSTALLMENTS (v2)
-- =========================================

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS installment_group_id uuid,
ADD COLUMN IF NOT EXISTS installment_total integer,
ADD COLUMN IF NOT EXISTS installment_current integer;

-- Index for performance when filtering/deleting groups
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON public.transactions(installment_group_id);
