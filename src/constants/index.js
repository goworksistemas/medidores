/**
 * Constantes centralizadas da aplicação
 */

export const CONFIG = {
  // URLs e Endpoints
  N8N_WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://flux.gowork.com.br/webhook/nova-leitura',
  
  // Validações e Limites
  PORCENTAGEM_ALERTA: 0.60, // 60% acima da média
  DIAS_HISTORICO: 10, // Dias para cálculo da média histórica
  MIN_REGISTROS_MEDIA: 2, // Mínimo de registros para calcular média
  
  // Arquivos
  MAX_FOTO_SIZE: 10 * 1024 * 1024, // 10MB em bytes
  TIPOS_IMAGEM_PERMITIDOS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  
  // Valores Especiais
  VALOR_SEM_ANDAR: '___SEM_ANDAR___',
  
  // Limites de Validação
  LEITURA_MIN: 0,
  LEITURA_MAX: 999999999,
  TOKEN_MIN_LENGTH: 8,
  
  // Timeouts (em milissegundos)
  TIMEOUT_AUTH: 4000,
  TIMEOUT_SESSION: 2500,
  TIMEOUT_TOKEN: 3000,
  TIMEOUT_PERFIL: 3000,
}

export const ROLES = {
  USER: 'user',
  N1: 'n1',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
}

export const TIPOS_MEDIDOR = {
  AGUA: 'agua',
  ENERGIA: 'energia',
}

export const UNIDADES_MEDIDA = {
  AGUA: 'm³',
  ENERGIA: 'kWh',
}

export const ROLE_DISPLAY_MAP = {
  [ROLES.USER]: 'Operacional',
  [ROLES.N1]: 'Operacional',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SUPER_ADMIN]: 'Master',
}
