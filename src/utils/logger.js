/**
 * Logger centralizado para a aplicação
 * Remove logs de debug em produção para melhor performance e segurança
 */

const isDevelopment = import.meta.env.DEV

/**
 * Logger que só funciona em desenvolvimento
 */
export const logger = {
  /**
   * Log de debug - apenas em desenvolvimento
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args)
    }
  },

  /**
   * Log de erro - sempre loga (importante para produção)
   */
  error: (...args) => {
    console.error('[ERROR]', ...args)
    // Aqui você pode adicionar integração com serviço de monitoramento
    // Exemplo: Sentry.captureException(...args)
  },

  /**
   * Log de aviso - apenas em desenvolvimento
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args)
    }
  },

  /**
   * Log de informação - apenas em desenvolvimento
   */
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },

  /**
   * Log de debug com contexto - apenas em desenvolvimento
   */
  debug: (context, ...args) => {
    if (isDevelopment) {
      console.log(`[DEBUG:${context}]`, ...args)
    }
  }
}

export default logger
