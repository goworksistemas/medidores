import { createClient } from '@supabase/supabase-js'
import { logger } from './utils/logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

logger.debug('Supabase', 'URL configurada:', supabaseUrl ? 'SIM' : 'NÃO')
if (supabaseUrl) {
  try {
    const urlObj = new URL(supabaseUrl)
    logger.debug('Supabase', 'Domínio:', urlObj.hostname)
  } catch (e) {
    logger.debug('Supabase', 'URL:', supabaseUrl.substring(0, 30) + '...')
  }
}
logger.debug('Supabase', 'Key configurada:', supabaseAnonKey ? 'SIM' : 'NÃO')

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('[Supabase] Variáveis de ambiente não configuradas!')
  logger.error('Crie um arquivo .env na raiz do projeto com:')
  logger.error('VITE_SUPABASE_URL=sua_url')
  logger.error('VITE_SUPABASE_ANON_KEY=sua_key')
  throw new Error(
    'Variáveis de ambiente do Supabase não configuradas. ' +
    'Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no arquivo .env'
  )
}

// Configuração seguindo as melhores práticas do Supabase
// Usa localStorage por padrão para persistência entre sessões
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // persistSession: true é o padrão e mantém a sessão entre recarregamentos
    // Usa localStorage automaticamente para persistir a sessão
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true, // Garante persistência da sessão
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'gowork-supabase-auth-token',
    // Configurações adicionais para mobile
    flowType: 'pkce' // Usa PKCE para melhor segurança e compatibilidade mobile
  },
  // Configurações globais do cliente
  global: {
    headers: {
      'x-client-info': 'gowork-medicao@1.0.0'
    }
  }
})