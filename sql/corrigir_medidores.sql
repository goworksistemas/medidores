-- ============================================
-- CORREÇÃO DOS MEDIDORES COM CAMPOS INVERTIDOS
-- ============================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- para corrigir os medidores que foram cadastrados com
-- o campo 'unidade' contendo o nome do prédio
-- ============================================

-- 1. Corrige o medidor ID 71 (Teste)
-- Problema: unidade = 'Amauri 2', local_unidade = ''
-- Correção: unidade = 'm³', local_unidade = 'Amauri 2'
UPDATE public.med_medidores 
SET 
  unidade = 'm³',
  local_unidade = 'Amauri 2'
WHERE id = 71;

-- 2. Corrige o medidor ID 72 (TESTE 2)
-- Problema: unidade = 'Joaquim Antunes', local_unidade = ''
-- Correção: unidade = 'm³', local_unidade = 'Joaquim Antunes'
UPDATE public.med_medidores 
SET 
  unidade = 'm³',
  local_unidade = 'Joaquim Antunes'
WHERE id = 72;

-- ============================================
-- VERIFICAÇÃO: Lista medidores que podem estar incorretos
-- (campo unidade diferente de 'm³' ou 'kWh')
-- ============================================
SELECT id, nome, tipo, unidade, local_unidade, andar
FROM public.med_medidores
WHERE unidade NOT IN ('m³', 'kWh', 'm3', 'kwh')
  AND unidade IS NOT NULL
ORDER BY id;

-- ============================================
-- CORREÇÃO EM MASSA (se necessário)
-- Corrige todos os medidores de água que não tem unidade correta
-- ============================================
-- UPDATE public.med_medidores 
-- SET unidade = 'm³'
-- WHERE tipo = 'agua' AND (unidade IS NULL OR unidade NOT IN ('m³', 'm3'));

-- Corrige todos os medidores de energia que não tem unidade correta
-- UPDATE public.med_medidores 
-- SET unidade = 'kWh'
-- WHERE tipo = 'energia' AND (unidade IS NULL OR unidade NOT IN ('kWh', 'kwh'));
