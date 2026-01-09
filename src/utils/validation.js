/**
 * Funções de validação centralizadas
 */

/**
 * Valida formato de token (UUID ou string alfanumérica)
 * @param {string} token - Token a ser validado
 * @param {number} minLength - Tamanho mínimo (padrão: 8)
 * @returns {boolean} - True se válido
 */
export function validarFormatoToken(token, minLength = 8) {
  if (!token || typeof token !== 'string') return false
  
  const tokenLimpo = token.trim()
  
  // Aceita UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  // Aceita strings alfanuméricas com caracteres especiais permitidos
  const tokenRegex = new RegExp(`^[a-zA-Z0-9_-]{${minLength},}$`)
  
  return uuidRegex.test(tokenLimpo) || tokenRegex.test(tokenLimpo)
}

/**
 * Valida formato de email
 * @param {string} email - Email a ser validado
 * @returns {boolean} - True se válido
 */
export function validarEmail(email) {
  if (!email || typeof email !== 'string') return false
  
  // Regex mais robusto para validação de email
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  return emailRegex.test(email.trim().toLowerCase())
}

/**
 * Valida valor de leitura
 * @param {number|string} valor - Valor a ser validado
 * @param {number} min - Valor mínimo (padrão: 0)
 * @param {number} max - Valor máximo (padrão: 999999999)
 * @returns {object} - { valido: boolean, valor: number|null, erro: string|null }
 */
export function validarLeitura(valor, min = 0, max = 999999999) {
  if (valor === null || valor === undefined || valor === '') {
    return { valido: false, valor: null, erro: 'Leitura não informada.' }
  }

  const valorNum = Number(valor)
  
  if (isNaN(valorNum)) {
    return { valido: false, valor: null, erro: 'Valor de leitura inválido.' }
  }

  if (valorNum < min) {
    return { valido: false, valor: null, erro: `Valor deve ser maior ou igual a ${min}.` }
  }

  if (valorNum > max) {
    return { valido: false, valor: null, erro: `Valor deve ser menor ou igual a ${max}.` }
  }

  return { valido: true, valor: valorNum, erro: null }
}

/**
 * Valida tamanho de arquivo
 * @param {File} file - Arquivo a ser validado
 * @param {number} maxSizeBytes - Tamanho máximo em bytes (padrão: 10MB)
 * @returns {object} - { valido: boolean, erro: string|null }
 */
export function validarTamanhoArquivo(file, maxSizeBytes = 10 * 1024 * 1024) {
  if (!file) {
    return { valido: false, erro: 'Arquivo não selecionado.' }
  }

  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0)
    return { valido: false, erro: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB.` }
  }

  return { valido: true, erro: null }
}

/**
 * Valida tipo de arquivo de imagem
 * @param {File} file - Arquivo a ser validado
 * @returns {object} - { valido: boolean, erro: string|null }
 */
export function validarTipoImagem(file) {
  if (!file) {
    return { valido: false, erro: 'Arquivo não selecionado.' }
  }

  if (!file.type.startsWith('image/')) {
    return { valido: false, erro: 'Por favor, selecione um arquivo de imagem válido.' }
  }

  // Tipos permitidos
  const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!tiposPermitidos.includes(file.type.toLowerCase())) {
    return { valido: false, erro: 'Tipo de imagem não suportado. Use JPG, PNG ou WEBP.' }
  }

  return { valido: true, erro: null }
}
