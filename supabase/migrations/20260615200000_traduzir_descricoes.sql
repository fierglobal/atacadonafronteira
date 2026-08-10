-- Regenera descricao_curta dos produtos em espanhol com template profissional PT-BR
-- baseado no tipo de produto detectado no nome.

UPDATE products
SET descricao_curta = CASE
  WHEN name ILIKE '%pen%' THEN
    'Apresentação em pen pré-carregado de alta praticidade. Produto importado oficial do Paraguai com estoque imediato. PIX à vista e retirada na loja.'
  WHEN name ILIKE '%vial%' OR name ILIKE '%amp%' OR name ILIKE '%-ml%' THEN
    'Vial injetável de uso técnico, importado direto do Paraguai. Estoque imediato com PIX à vista e retirada presencial na loja.'
  WHEN name ILIKE '%agua%bact%' OR name ILIKE '%bacteriost%' THEN
    'Solução estéril de alta pureza para reconstituição e diluição. Importado oficial, pack pronto para uso técnico. Retire na loja.'
  WHEN name ILIKE '%whey%' OR name ILIKE '%protein%' THEN
    'Suplemento proteico premium, importado direto do Paraguai. Estoque imediato, preços em USD. PIX à vista e retirada na loja.'
  WHEN name ILIKE '%creatina%' THEN
    'Creatina monohidratada de alta pureza. Importada direto do Paraguai com estoque imediato. PIX à vista e retirada presencial.'
  WHEN name ILIKE '%bcaa%' OR name ILIKE '%glut%' OR name ILIKE '%aminoacid%' THEN
    'Aminoácido em alta concentração para suporte profissional. Importado direto do Paraguai, estoque imediato.'
  WHEN name ILIKE '%pre%treino%' OR name ILIKE '%preworkout%' THEN
    'Pré-treino de alto desempenho. Importado direto do Paraguai com estoque imediato e PIX à vista.'
  WHEN name ILIKE '%mg%' OR name ILIKE '%ui%' THEN
    'Produto importado oficial do Paraguai, estoque imediato. Atacado e varejo com PIX à vista e retirada na loja.'
  ELSE
    'Produto importado direto do Paraguai. Estoque imediato. Pagamento em USD ou BRL via PIX, retirada presencial na loja.'
END
WHERE ativo = true
  AND (
    descricao_curta ILIKE '%para que sirve%' OR
    descricao_curta ILIKE '%este producto%' OR
    descricao_curta ILIKE '%composición%' OR
    descricao_curta ILIKE '%presentación%' OR
    descricao_curta ILIKE '% es %' OR
    descricao_curta ILIKE '%tratamiento%' OR
    descricao_curta ILIKE '%PRECIO DEL%' OR
    descricao_curta ILIKE '%compuesto%' OR
    descricao_curta ILIKE '%producto frecuentemente%' OR
    descricao_curta ILIKE '%bacteriost%cica%' OR
    descricao_curta ILIKE '%entorno%' OR
    descricao_curta ILIKE '%diluci%n%'
  );

-- Limpar descricao_curta vazia em produtos sem (forçar template)
UPDATE products
SET descricao_curta = CASE
  WHEN name ILIKE '%pen%' THEN 'Apresentação em pen pré-carregado. Importado direto do Paraguai, estoque imediato.'
  WHEN name ILIKE '%vial%' OR name ILIKE '%-ml%' THEN 'Vial injetável importado direto do Paraguai. Estoque imediato com PIX à vista.'
  WHEN name ILIKE '%mg%' OR name ILIKE '%ui%' THEN 'Produto importado oficial do Paraguai, estoque imediato. Atacado e varejo.'
  ELSE 'Produto importado direto do Paraguai. Estoque imediato. Retirada presencial.'
END
WHERE ativo = true
  AND (descricao_curta IS NULL OR descricao_curta = '');

-- Traduzir as 5 descricao completas em espanhol que detectamos (templated)
UPDATE products
SET descricao = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  descricao,
  'Para qué sirve', 'Para que serve'),
  'para que sirve', 'para que serve'),
  'Este producto', 'Este produto'),
  'este producto', 'este produto'),
  'Composición', 'Composição'),
  'composición', 'composição'),
  'Presentación', 'Apresentação'),
  'presentación', 'apresentação'),
  'Dosificación', 'Dosagem'),
  'dosificación', 'dosagem'),
  'Tratamiento', 'Tratamento'),
  'tratamiento', 'tratamento'),
  'Administración', 'Administração'),
  'administración', 'administração'),
  'investigación', 'pesquisa'),
  'Investigación', 'Pesquisa'),
  'compuesto', 'composto'),
  'frecuentemente', 'frequentemente'),
  'desarrollo', 'desenvolvimento'),
  'músculos', 'músculos'),
  'utilización', 'utilização'),
  'aplicación', 'aplicação'),
  'asociado', 'associado'),
  'señalización', 'sinalização'),
  'sintético', 'sintético'),
  'rejuvenecimiento', 'rejuvenescimento'),
  ' es ', ' é '
)
WHERE ativo = true
  AND descricao IS NOT NULL
  AND (descricao ILIKE '%para que sirve%' OR descricao ILIKE '%este producto%' OR descricao ILIKE '%composición%' OR descricao ILIKE '%presentación%' OR descricao ILIKE '%dosificación%');
