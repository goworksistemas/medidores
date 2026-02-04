-- ============================================
-- FUNÇÃO PARA EXCLUIR USUÁRIO DO AUTH.USERS
-- ============================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- Isso permite que o sistema exclua usuários completamente
-- ============================================

-- Cria a função RPC que pode ser chamada pelo frontend
CREATE OR REPLACE FUNCTION public.delete_user_by_id(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o usuário que está executando é super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Apenas Admin Master pode excluir usuários';
  END IF;

  -- Não permite excluir a si mesmo
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta';
  END IF;

  -- Não permite excluir outros Admin Master
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Não é permitido excluir outros Admin Master';
  END IF;

  -- Exclui da tabela profiles (se ainda existir)
  DELETE FROM public.profiles WHERE id = user_id;

  -- Exclui da tabela auth.users
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Concede permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.delete_user_by_id(UUID) TO authenticated;

-- Comentário descritivo
COMMENT ON FUNCTION public.delete_user_by_id(UUID) IS 
'Exclui um usuário completamente do sistema (profiles + auth.users). Apenas Admin Master pode executar.';
