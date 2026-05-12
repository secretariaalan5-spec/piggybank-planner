-- ============================================================
-- Fase 3: Suporte à integração WhatsApp
-- ============================================================
-- Objetivo: Adicionar suporte seguro e econômico para o
-- registro de transações via WhatsApp Cloud API.
--
-- Estratégia de dados:
-- 1. Adiciona 'phone' ao profiles para lookup por número WPP
-- 2. Cria índice parcial no campo 'notes' para buscar wamid
--    (deduplicação sem criar nova tabela)
-- 3. NÃO armazena payloads brutos do WhatsApp
-- ============================================================

-- 1. Adiciona coluna phone ao profiles (para vincular número WPP ao usuário)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- Índice para busca rápida por número de telefone
CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

-- 2. Índice parcial para busca eficiente de wamid nos notes
-- Só indexa registros vindos do WhatsApp (source = 'whatsapp')
-- Evita índice desnecessariamente grande
CREATE INDEX IF NOT EXISTS idx_transactions_wamid
  ON public.transactions (notes)
  WHERE source = 'whatsapp' AND notes LIKE 'wamid:%';

-- 3. Garante que o campo source aceite o valor 'whatsapp'
-- (se havia um CHECK constraint limitando os valores)
DO $$
BEGIN
  -- Remove constraint antiga se existia com enum limitado
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'transactions'
      AND constraint_name = 'transactions_source_check'
  ) THEN
    ALTER TABLE public.transactions DROP CONSTRAINT transactions_source_check;
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_source_check
      CHECK (source IN ('manual', 'csv_import', 'whatsapp', 'api'));
  END IF;
END $$;

-- 4. Comentários documentando o propósito
COMMENT ON COLUMN public.profiles.phone IS
  'Número de telefone do usuário no formato internacional (ex: 5511999999999). Usado para vincular mensagens do WhatsApp ao usuário correto.';

COMMENT ON INDEX idx_transactions_wamid IS
  'Índice parcial para deduplicação de mensagens WhatsApp via wamid armazenado no campo notes.';
