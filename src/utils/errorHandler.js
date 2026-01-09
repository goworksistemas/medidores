/**
 * Tratamento centralizado de erros do Supabase e outros
 */

/**
 * Traduz erros do Supabase para mensagens amigáveis
 * @param {Error} error - Erro do Supabase ou outro
 * @returns {string} - Mensagem amigável para o usuário
 */
export function handleSupabaseError(error) {
  if (!error) {
    return 'Erro desconhecido. Tente novamente.'
  }

  // Erros de rede/conexão
  if (error.message?.includes('fetch') || 
      error.message?.includes('network') ||
      error.message?.includes('Failed to fetch') ||
      error.code === 'PGRST301') {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }

  // Erros específicos do Supabase
  if (error.code === 'PGRST116') {
    return 'Registro não encontrado.'
  }

  if (error.code === 'PGRST301') {
    return 'Erro de conexão com o servidor.'
  }

  if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
    return 'A operação demorou muito. Tente novamente.'
  }

  // Erros de storage
  if (error.message?.includes('storage') || error.message?.includes('bucket')) {
    return 'Erro ao salvar arquivo. Verifique as permissões.'
  }

  if (error.message?.includes('Bucket not found')) {
    return 'Erro: bucket de armazenamento não encontrado. Contate o administrador.'
  }

  if (error.message?.includes('already exists')) {
    return 'Arquivo já existe. Tente novamente com outro nome.'
  }

  // Erros de permissão
  if (error.message?.includes('permission') || 
      error.message?.includes('row-level security') ||
      error.message?.includes('RLS')) {
    return 'Sem permissão para realizar esta ação. Contate o administrador.'
  }

  // Erros de autenticação
  if (error.message?.includes('Invalid login credentials') ||
      error.message?.includes('Email not confirmed')) {
    return 'Credenciais inválidas ou email não confirmado.'
  }

  if (error.message?.includes('User already registered')) {
    return 'Este email já está cadastrado.'
  }

  // Erros de validação
  if (error.message?.includes('violates') || error.message?.includes('constraint')) {
    return 'Dados inválidos. Verifique os campos preenchidos.'
  }

  // Retorna mensagem original se não houver tradução específica
  return error.message || 'Erro desconhecido. Tente novamente.'
}

/**
 * Trata erros de forma genérica
 * @param {Error|string|any} error - Erro a ser tratado
 * @returns {string} - Mensagem amigável
 */
export function handleError(error) {
  if (typeof error === 'string') {
    return error
  }

  if (error?.message) {
    return handleSupabaseError(error)
  }

  if (error?.error_description) {
    return error.error_description
  }

  return 'Erro inesperado. Tente novamente.'
}

/**
 * Loga erro de forma segura (sem expor dados sensíveis)
 * @param {string} context - Contexto do erro
 * @param {Error} error - Erro a ser logado
 */
export function logError(context, error) {
  // Remove informações sensíveis antes de logar
  const safeError = {
    message: error?.message,
    code: error?.code,
    // Não loga stack trace em produção
    stack: import.meta.env.DEV ? error?.stack : undefined,
  }

  console.error(`[${context}]`, safeError)
}
