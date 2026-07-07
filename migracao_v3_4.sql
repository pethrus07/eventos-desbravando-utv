-- ============================================================
-- v3.4: Staff nos participantes + acompanhamento financeiro nos custos
-- Aplicar com:
--   npx wrangler d1 execute eventos --remote --file=migracao_v3_4.sql
-- (local: trocar --remote por --local)
-- ============================================================

-- Marca um participante como staff/equipe (sai da receita; vira custo)
ALTER TABLE clientes ADD COLUMN staff INTEGER NOT NULL DEFAULT 0;

-- Financeiro por item de custo
ALTER TABLE custos ADD COLUMN forma_pagamento TEXT NOT NULL DEFAULT '';  -- Pix, Boleto, Cartão…
ALTER TABLE custos ADD COLUMN parcelas        INTEGER;                    -- nº de parcelas (opcional)
ALTER TABLE custos ADD COLUMN valor_pago      REAL NOT NULL DEFAULT 0;    -- quanto já foi pago (calcula saldo/status)
