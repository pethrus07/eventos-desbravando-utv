-- ============================================================
-- Backfill único: leva os valores já lançados no CHECKLIST (itens.valor)
-- para a nova tabela CUSTOS, para os eventos não começarem zerados na v3.2.
-- Só copia itens que TÊM valor. Rodar UMA VEZ (a tabela custos deve estar vazia).
--   npx wrangler d1 execute eventos --remote --file=backfill_custos_do_checklist.sql
-- Mapeamento de status: concluido->pago, andamento->andamento, resto->pendente.
-- Fornecedor do checklist é texto livre -> vai para observações (custos usa fornecedor_id).
-- ============================================================
INSERT INTO custos (evento_id, ordem, item, categoria, quantidade, valor, status, observacoes, atualizado_por)
SELECT
  evento_id,
  ordem,
  item,
  setor,
  1,
  valor,
  CASE status WHEN 'concluido' THEN 'pago' WHEN 'andamento' THEN 'andamento' ELSE 'pendente' END,
  TRIM(
    (CASE WHEN fornecedor <> '' THEN 'Fornecedor: ' || fornecedor || '  ' ELSE '' END) ||
    (CASE WHEN quantidade <> '' THEN 'Qtd: ' || quantidade ELSE '' END)
  ),
  'backfill'
FROM itens
WHERE valor IS NOT NULL;
