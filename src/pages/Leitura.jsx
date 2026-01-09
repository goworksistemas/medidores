import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import { Scanner } from '@yudiel/react-qr-scanner'
import { 
  Camera, CheckCircle, Trash2, AlertTriangle, TrendingUp, 
  Droplets, Zap, Building, MapPin, ArrowRight, Info, 
  BarChart3, History, QrCode, X, Search 
} from 'lucide-react'
import CustomSelect from '../components/CustomSelect'
import ErrorBoundary from '../components/ErrorBoundary'
import { logger } from '../utils/logger'
import { CONFIG } from '../constants'

const N8N_WEBHOOK_URL = CONFIG.N8N_WEBHOOK_URL
const PORCENTAGEM_ALERTA = CONFIG.PORCENTAGEM_ALERTA
const VALOR_SEM_ANDAR = CONFIG.VALOR_SEM_ANDAR
const CONSUMO_MINIMO_ALERTA_ABSOLUTO = 5

export default function Leitura() {
  const navigate = useNavigate()
  const { user, salvarLeitura } = useAuth()
  const { tipoAtivo, setTipoAtivo, refreshData } = useTheme()
  const [todosMedidores, setTodosMedidores] = useState([])
  
  // Estados de Seleção (Filtros)
  const [predioSelecionado, setPredioSelecionado] = useState('')
  const [andarSelecionado, setAndarSelecionado] = useState('')
  const [medidorSelecionado, setMedidorSelecionado] = useState('')
  
  // Estados da Leitura e Validação
  const [leituraAnterior, setLeituraAnterior] = useState(null)
  const [leituraAtual, setLeituraAtual] = useState('')
  const [mediaHistorica, setMediaHistorica] = useState(null)
  const [numConsumosHistoricos, setNumConsumosHistoricos] = useState(0)
  const [ultimasLeituras, setUltimasLeituras] = useState([]) // Últimas 2 leituras para exibição
  
  // Estados de Foto e Upload
  const [foto, setFoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  
  // Estados de Exceção (Justificativas)
  const [motivoValidacao, setMotivoValidacao] = useState('') 
  const [justificativa, setJustificativa] = useState('')     
  
  // Controle do Scanner
  const [mostrarScanner, setMostrarScanner] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [scannerKey, setScannerKey] = useState(0) // Para forçar remontagem do scanner
  
  const fileInputRef = useRef(null)

  // 1. Efeito para abrir o scanner via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('scan') === 'true') {
      setMostrarScanner(true)
    }
  }, [])

  // Função para lidar com erros do scanner
  const handleScannerError = (error) => {
    logger.error('[Leitura] Erro no scanner:', error)
    let mensagemErro = 'Erro ao acessar a câmera.'
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      mensagemErro = 'Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.'
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      mensagemErro = 'Nenhuma câmera encontrada. Verifique se há uma câmera conectada.'
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      mensagemErro = 'Câmera já está em uso por outro aplicativo.'
    } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      mensagemErro = 'Câmera não suporta os requisitos necessários.'
    }
    
    setCameraError(mensagemErro)
    setMostrarScanner(false)
  }

  // Função para abrir o scanner com tratamento de erros
  const abrirScanner = async () => {
    try {
      // Verifica se há suporte para getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Seu navegador não suporta acesso à câmera. Use um navegador mais recente.')
        return
      }

      // Tenta acessar a câmera para verificar permissões
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        // Se conseguir, para o stream e abre o scanner
        stream.getTracks().forEach(track => track.stop())
        setCameraError(null)
        setScannerKey(prev => prev + 1) // Força remontagem do scanner
        setMostrarScanner(true)
      } catch (err) {
        handleScannerError(err)
      }
    } catch (err) {
      handleScannerError(err)
    }
  }

  // 2. Carrega todos os medidores (apenas ativos)
  useEffect(() => {
    async function fetchMedidores() {
      const { data } = await supabase
        .from('med_medidores')
        .select('*')
        .eq('tipo', tipoAtivo)
        .or('ativo.is.null,ativo.eq.true') // Inclui medidores ativos ou sem campo ativo (compatibilidade)
        .order('nome')
      
      if (data) setTodosMedidores(data)
    }
    fetchMedidores()
  }, [tipoAtivo])

  // Função auxiliar para validar formato de token
  function validarFormatoToken(token) {
    if (!token || typeof token !== 'string') return false
    const tokenLimpo = token.trim()
    // Aceita UUIDs ou strings alfanuméricas com pelo menos 4 caracteres
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const tokenRegex = /^[a-zA-Z0-9_-]{4,}$/
    return uuidRegex.test(tokenLimpo) || tokenRegex.test(tokenLimpo)
  }

  // 3. Lógica do Scanner
  const handleMedidorScan = async (result) => {
    try {
      // Validação robusta do resultado
      if (!result) {
        logger.debug('Leitura', 'Scan result vazio ou null')
        return
      }

      // Verifica se é array
      if (!Array.isArray(result)) {
        logger.debug('Leitura', 'Scan result não é array:', typeof result)
        // Tenta tratar como objeto único
        if (typeof result === 'object' && result !== null) {
          result = [result]
        } else {
          return
        }
      }

      if (result.length === 0) {
        logger.debug('Leitura', 'Scan result array vazio')
        return
      }

      let tokenLido = null
      
      // Tenta extrair o token de diferentes formatos possíveis
      try {
        const firstResult = result[0]
        
        if (firstResult?.rawValue) {
          tokenLido = firstResult.rawValue
        } else if (firstResult?.text) {
          tokenLido = firstResult.text
        } else if (typeof firstResult === 'string') {
          tokenLido = firstResult
        } else if (typeof result === 'string') {
          tokenLido = result
        } else {
          logger.error('[Leitura] Formato de QR Code não reconhecido:', firstResult)
          setMensagem({ tipo: 'erro', texto: 'Formato de QR Code não reconhecido. Tente novamente.' })
          return
        }

        // Valida se conseguiu extrair o token
        if (!tokenLido || typeof tokenLido !== 'string') {
          logger.error('[Leitura] Token não extraído corretamente:', tokenLido)
          setMensagem({ tipo: 'erro', texto: 'Erro ao ler QR Code. Tente novamente.' })
          return
        }
      } catch (err) {
        logger.error('[Leitura] Erro ao extrair token do QR Code:', err)
        setMensagem({ tipo: 'erro', texto: 'Erro ao ler QR Code. Tente novamente.' })
        return
      }

    // Valida formato do token
    if (!validarFormatoToken(tokenLido)) {
      setMensagem({ tipo: 'erro', texto: 'QR Code inválido. Verifique se está escaneando o código correto.' })
      return
    }

      // Fecha o scanner antes de processar
      setMostrarScanner(false)
      setLoading(true)
      setMensagem(null)

      try {
        const tokenLimpo = tokenLido.trim()
        
        if (!tokenLimpo || tokenLimpo.length === 0) {
          throw new Error('Token vazio após limpeza.')
        }

        // Valida formato do token antes de buscar
        if (!validarFormatoToken(tokenLimpo)) {
          throw new Error('QR Code inválido. Verifique se está escaneando o código correto.')
        }
        
        const { data: medidor, error } = await supabase
          .from('med_medidores')
          .select('*')
          .eq('token', tokenLimpo) 
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error('QR Code não cadastrado no sistema.')
          }
          logger.error('[Leitura] Erro ao buscar medidor:', error)
          throw new Error('Erro ao buscar medidor. Tente novamente.')
        }

        if (!medidor) {
          throw new Error('Medidor não encontrado.')
        }

        // Verifica se o medidor está ativo (se houver campo ativo)
        if (medidor.ativo === false) {
          throw new Error('Este medidor está inativo.')
        }

        if (medidor.tipo !== tipoAtivo) {
          // Adiciona temporariamente o medidor escaneado à lista atual
          setTodosMedidores(prev => 
            prev.some(m => m.id === medidor.id) ? prev : [...prev, medidor]
          )
          // Dispara a mudança de tipo
          setTipoAtivo(medidor.tipo)
        }

        setPredioSelecionado(medidor.local_unidade || '')
        setAndarSelecionado(medidor.andar || VALOR_SEM_ANDAR)
        setMedidorSelecionado(medidor.id)
        
        setMensagem({ tipo: 'sucesso', texto: `Medidor identificado: ${medidor.nome || 'Sem nome'}` })
        setTimeout(() => setMensagem(null), 3000)

        // Limpa a URL para evitar que o scanner reabra ao recarregar a página
        navigate('/leitura', { replace: true })
      } catch (err) {
        logger.error('[Leitura] Erro no processamento do scan:', err)
        const mensagemErro = err?.message || 'Erro ao processar QR Code.'
        setMensagem({ tipo: 'erro', texto: mensagemErro })
        setTimeout(() => setMensagem(null), 5000)
      } finally {
        setLoading(false)
      }
    } catch (err) {
      // Captura qualquer erro não tratado acima
      logger.error('[Leitura] Erro crítico no handleMedidorScan:', err)
      setMostrarScanner(false)
      setMensagem({ tipo: 'erro', texto: 'Erro inesperado ao processar QR Code. Tente novamente.' })
      setTimeout(() => setMensagem(null), 5000)
    }
  }

  // --- LÓGICA DE FILTROS ---
  const prediosUnicos = [...new Set(todosMedidores.map(m => m.local_unidade).filter(Boolean))].sort()
  
  let andaresOpcoes = []
  if (predioSelecionado) {
    const medidoresDoPredio = todosMedidores.filter(m => m.local_unidade === predioSelecionado)
    const andaresReais = [...new Set(medidoresDoPredio.map(m => m.andar).filter(Boolean))].sort()
    
    andaresOpcoes = andaresReais.map(a => ({ valor: a, label: a }))
    
    const temSemAndar = medidoresDoPredio.some(m => !m.andar)
    if (temSemAndar) {
      andaresOpcoes.unshift({ valor: VALOR_SEM_ANDAR, label: 'Geral / Sem Andar' })
    }
  }

  const medidoresFinais = todosMedidores.filter(m => {
    if (m.local_unidade !== predioSelecionado) return false
    if (andarSelecionado === VALOR_SEM_ANDAR) return !m.andar
    return m.andar === andarSelecionado
  })

  // 4. Busca Histórico
  useEffect(() => {
    if (!medidorSelecionado) return

    async function fetchDadosMedidor() {
      // Busca histórico diretamente das tabelas corretas
      const tabela = tipoAtivo === 'agua' ? 'med_hidrometros' : 'med_energia'

      // Calcula a data de 10 dias atrás (início do dia)
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - 10)
      dataLimite.setHours(0, 0, 0, 0)
      const dataLimiteStr = dataLimite.toISOString()

      // Primeiro, tenta buscar todos os registros dos últimos 10 dias
      // Não limita a quantidade, pois pode haver múltiplos registros por dia
      const { data: historico, error } = await supabase
        .from(tabela)
        .select('leitura, created_at')
        .eq('medidor_id', medidorSelecionado)
        .gte('created_at', dataLimiteStr)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('[Leitura] Erro ao buscar histórico:', error)
        setLeituraAnterior(0)
        setMediaHistorica(null)
        setNumConsumosHistoricos(0)
        return
      }

      // Se não houver registros nos últimos 10 dias, busca todas as leituras do medidor
      // (mas limita a um número razoável para não sobrecarregar)
      let leiturasParaProcessar = historico || []
      
      if (leiturasParaProcessar.length === 0) {
        const { data: todasLeituras, error: errorTodas } = await supabase
          .from(tabela)
          .select('leitura, created_at')
          .eq('medidor_id', medidorSelecionado)
          .order('created_at', { ascending: false })
          .limit(50) // Limita a 50 para performance

        if (errorTodas) {
          logger.error('[Leitura] Erro ao buscar todas as leituras:', errorTodas)
          setLeituraAnterior(0)
          setMediaHistorica(null)
          setNumConsumosHistoricos(0)
          return
        }

        leiturasParaProcessar = todasLeituras || []
      } else {
        // Se encontrou registros nos últimos 10 dias, usa apenas esses (limitado a 11)
        // Mas se houver menos de 11, já está correto
      }

      // Se encontrou registros nos últimos 10 dias, limita aos últimos 11 registros
      // (11 para ter 10 períodos de consumo entre eles)
      if (leiturasParaProcessar.length > 11) {
        leiturasParaProcessar = leiturasParaProcessar.slice(0, 11)
      }

      // Processa o histórico
      processarHistorico(leiturasParaProcessar)
    }

    function processarHistorico(historico) {
      if (!historico || historico.length === 0) {
        setLeituraAnterior(0)
        setMediaHistorica(null)
        setNumConsumosHistoricos(0)
        setUltimasLeituras([])
        return
      }

      // Ordena por data (mais recente primeiro) caso não esteja ordenado
      const historicoOrdenado = [...historico].sort((a, b) => {
        const dataA = new Date(a.created_at)
        const dataB = new Date(b.created_at)
        return dataB - dataA
      })

      // A leitura mais recente é a "anterior" para o novo registro
      const leituraMaisRecente = Number(historicoOrdenado[0].leitura)
      setLeituraAnterior(isNaN(leituraMaisRecente) ? 0 : leituraMaisRecente)

      // Armazena as últimas 2 leituras para exibição no resumo
      const ultimasDuasLeituras = historicoOrdenado.slice(0, 2).map(item => ({
        leitura: Number(item.leitura),
        data: new Date(item.created_at)
      }))
      setUltimasLeituras(ultimasDuasLeituras)

      // Calcula a média de consumo se houver pelo menos 2 registros
      if (historicoOrdenado.length >= 2) {
        const consumos = []
        
        // Calcula o consumo entre cada par de leituras consecutivas
        for (let i = 0; i < historicoOrdenado.length - 1; i++) {
          const atual = Number(historicoOrdenado[i].leitura)
          const anterior = Number(historicoOrdenado[i + 1].leitura)
          
          // Valida se os números são válidos
          if (isNaN(atual) || isNaN(anterior)) continue
          
          const consumoCalculado = atual - anterior
          
          // Ignora "viradas de relógio" (consumo negativo) para a média
          // Mas permite consumo zero
          if (consumoCalculado >= 0) {
            consumos.push(consumoCalculado)
          }
        }

        setNumConsumosHistoricos(consumos.length)

        // Calcula a média se tiver pelo menos 1 consumo válido (ou seja, pelo menos 2 registros)
        // Se tiver apenas 1 consumo, usa esse valor como média
        // Se tiver 2 ou mais consumos, calcula a média aritmética
        if (consumos.length >= 1) {
          const soma = consumos.reduce((a, b) => a + b, 0)
          const media = soma / consumos.length
          setMediaHistorica(media)
          
          logger.debug('Leitura', 'Média histórica calculada:', {
            totalRegistros: historicoOrdenado.length,
            consumosValidos: consumos.length,
            consumos: consumos,
            media: media,
            limiteExcessivo: media * (1 + PORCENTAGEM_ALERTA)
          })
        } else {
          // Se não tiver nenhum consumo válido, não calcula média
          setMediaHistorica(null)
          setNumConsumosHistoricos(0)
          logger.debug('Leitura', 'Média não calculada: nenhum consumo válido', {
            totalRegistros: historicoOrdenado.length,
            consumosValidos: consumos.length
          })
        }
      } else {
        // Menos de 2 registros, não calcula média
        setMediaHistorica(null)
        setNumConsumosHistoricos(0)
        logger.debug('Leitura', 'Média não calculada: menos de 2 registros', {
          totalRegistros: historicoOrdenado.length
        })
      }
    }

    fetchDadosMedidor()
  }, [medidorSelecionado, tipoAtivo])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validações do arquivo
    if (!file.type.startsWith('image/')) {
      setMensagem({ tipo: 'erro', texto: 'Por favor, selecione um arquivo de imagem válido.' })
      setTimeout(() => setMensagem(null), 3000)
      return
    }

    // Limita o tamanho da foto (10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB em bytes
    if (file.size > maxSize) {
      setMensagem({ tipo: 'erro', texto: 'A foto é muito grande. O tamanho máximo é 10MB.' })
      setTimeout(() => setMensagem(null), 3000)
      return
    }

    // Limpa a preview anterior se existir
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setFoto(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMensagem(null)
  }

  // --- VALIDAÇÕES E CÁLCULOS ---
  const valorAtualNum = leituraAtual ? Number(leituraAtual) : null
  const valorAnteriorNum = leituraAnterior !== null ? Number(leituraAnterior) : null
  const consumo = (valorAtualNum !== null && valorAnteriorNum !== null) ? valorAtualNum - valorAnteriorNum : null
  
  const isMenorQueAnterior = valorAtualNum !== null && valorAnteriorNum !== null && valorAtualNum < valorAnteriorNum
  
  // Consumo excessivo: quando ultrapassar 60% acima da média histórica (consumo > media * 1.60)
  // Precisa ter pelo menos 1 consumo histórico válido (ou seja, pelo menos 2 registros) para calcular a média
  const limiteConsumoExcessivo = mediaHistorica !== null && mediaHistorica > 0 ? mediaHistorica * (1 + PORCENTAGEM_ALERTA) : null
  const isConsumoAlto = numConsumosHistoricos >= 1 && 
                        !isMenorQueAnterior && 
                        mediaHistorica !== null && 
                        mediaHistorica > 0 && 
                        consumo !== null && 
                        consumo > 0 &&
                        limiteConsumoExcessivo !== null &&
                        consumo > limiteConsumoExcessivo

  // Debug: Log dos valores calculados
  useEffect(() => {
    if (leituraAtual && leituraAnterior !== null) {
      const porcentagemAcima = limiteConsumoExcessivo && consumo !== null && mediaHistorica > 0 
        ? ((consumo / mediaHistorica - 1) * 100).toFixed(2) + '%' 
        : 'N/A'
      
      logger.debug('Leitura', 'Validação de consumo excessivo:', {
        leituraAtual: valorAtualNum,
        leituraAnterior: valorAnteriorNum,
        consumo: consumo,
        mediaHistorica: mediaHistorica,
        limiteExcessivo: limiteConsumoExcessivo,
        porcentagemAcima: porcentagemAcima,
        numConsumosHistoricos: numConsumosHistoricos,
        isConsumoAlto: isConsumoAlto,
        isMenorQueAnterior: isMenorQueAnterior,
        condicoes: {
          temConsumosHistoricos: numConsumosHistoricos >= 1,
          naoMenorQueAnterior: !isMenorQueAnterior,
          temMedia: mediaHistorica !== null && mediaHistorica > 0,
          temConsumo: consumo !== null && consumo > 0,
          temLimite: limiteConsumoExcessivo !== null,
          consumoMaiorQueLimite: consumo !== null && limiteConsumoExcessivo !== null ? consumo > limiteConsumoExcessivo : false
        }
      })
    }
  }, [leituraAtual, leituraAnterior, consumo, mediaHistorica, numConsumosHistoricos, isConsumoAlto, isMenorQueAnterior, limiteConsumoExcessivo, valorAtualNum, valorAnteriorNum])

  const podeEnviar = leituraAtual && foto && 
                     (!isMenorQueAnterior || motivoValidacao !== '') &&
                     (!isConsumoAlto || justificativa.length > 3) &&
                     consumo !== null

  // 5. Submit (ENVIO DOS DADOS COMPLETOS)
  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeEnviar) return
    
    // Validações adicionais antes de enviar
    if (!medidorSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um medidor antes de salvar.' })
      return
    }

    if (!foto) {
      setMensagem({ tipo: 'erro', texto: 'É necessário tirar uma foto do medidor.' })
      return
    }

    setLoading(true)
    setMensagem(null)
    
    let fotoUrl = null
    try {
      // Valida o arquivo de foto
      if (!foto.type.startsWith('image/')) {
        throw new Error('O arquivo selecionado não é uma imagem válida.')
      }

      // Limita o tamanho da foto (10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB em bytes
      if (foto.size > maxSize) {
        throw new Error('A foto é muito grande. O tamanho máximo é 10MB.')
      }

      const fileExt = foto.name.split('.').pop() || 'jpg'
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      
      // Upload para o bucket 'evidencias'
      const { error: uploadError } = await supabase.storage.from('evidencias').upload(fileName, foto, {
        cacheControl: '3600',
        upsert: false
      })
      
      if (uploadError) {
        logger.error('[Leitura] Erro no upload:', uploadError)
        if (uploadError.message.includes('already exists')) {
          throw new Error('Erro: arquivo já existe. Tente novamente.')
        } else if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Erro: bucket de armazenamento não encontrado. Contate o administrador.')
        } else if (uploadError.message.includes('new row violates row-level security')) {
          throw new Error('Erro: sem permissão para fazer upload. Contate o administrador.')
        }
        throw uploadError
      }
      
      // Obtenção da URL pública do bucket 'evidencias'
      const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(fileName)
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Erro ao obter URL da foto após upload.')
      }
      fotoUrl = urlData.publicUrl

      let obsFinal = ''
      let porcentagemAcimaMedia = null
      if (isConsumoAlto && consumo !== null && mediaHistorica !== null && mediaHistorica > 0) {
        porcentagemAcimaMedia = Math.round(((consumo / mediaHistorica) - 1) * 100)
        obsFinal = `ALERTA: Consumo +${porcentagemAcimaMedia}% acima da média.`
      }
      if (isMenorQueAnterior) {
        obsFinal = motivoValidacao === 'virada' 
          ? 'ROLLOVER_CONFIRMADO: Virada de Relógio' 
          : 'Ajuste Manual'
      }

      const dadosLeitura = {
        medidor_id: medidorSelecionado,
        tipo: tipoAtivo,
        leitura: valorAtualNum,
        foto_url: fotoUrl,
        observacao: obsFinal,
        justificativa: isConsumoAlto ? justificativa : null
      }

      const resultado = await salvarLeitura(dadosLeitura)
      if (!resultado.success) throw new Error(resultado.message)

      refreshData() // Força a atualização de outros componentes, como o Dashboard
      
      // --- LÓGICA DO WEBHOOK PARA N8N ---
      // Dispara o webhook apenas se o consumo for alto
      if (N8N_WEBHOOK_URL && isConsumoAlto && consumo !== null) {
        const medidor = todosMedidores.find(m => m.id === medidorSelecionado)

        const webhookPayload = {
          nome_medidor: medidor?.nome || 'Não encontrado',
          local_unidade: medidor?.local_unidade || 'Não informada',
          andar: medidor?.andar || 'Não informado',
          tipo: tipoAtivo,
          leitura_atual: valorAtualNum,
          leitura_anterior: valorAnteriorNum,
          consumo: consumo,
          media_historica: mediaHistorica,
          porcentagem_acima_media: porcentagemAcimaMedia,
          justificativa: justificativa,
          usuario: user?.nome || user?.email,
          foto_url: fotoUrl,
        }

        fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        }).catch(err => logger.error("Erro ao enviar Webhook para n8n:", err))
      }

      setMensagem({ tipo: 'sucesso', texto: isConsumoAlto ? 'Salvo com justificativa!' : 'Leitura salva com sucesso!' })
      
      // Limpeza
      setLeituraAtual('')
      setFoto(null)
      setPreviewUrl(null)
      setMotivoValidacao('')
      setJustificativa('')
      setMedidorSelecionado('') 
      setPredioSelecionado('')
      setAndarSelecionado('')
      setUltimasLeituras([])
      setLeituraAnterior(null)
      setMediaHistorica(null)
      setNumConsumosHistoricos(0)
      
      setTimeout(() => setMensagem(null), 3000)

    } catch (error) {
      logger.error('[Leitura] Erro ao salvar leitura:', error)
      let friendlyMessage = 'Erro ao salvar leitura.'
      
      if (error.message) {
        friendlyMessage = error.message
      } else if (typeof error === 'string') {
        friendlyMessage = error
      } else if (error.error_description) {
        friendlyMessage = error.error_description
      }

      // Mensagens específicas para diferentes tipos de erro
      if (friendlyMessage.includes('storage') || friendlyMessage.includes('bucket')) {
        friendlyMessage = 'Erro ao salvar a foto. Verifique se o bucket "evidencias" existe e se as permissões estão corretas.'
      } else if (friendlyMessage.includes('network') || friendlyMessage.includes('fetch')) {
        friendlyMessage = 'Erro de conexão. Verifique sua internet e tente novamente.'
      } else if (friendlyMessage.includes('permission') || friendlyMessage.includes('row-level security')) {
        friendlyMessage = 'Sem permissão para realizar esta ação. Contate o administrador.'
      }

      setMensagem({ tipo: 'erro', texto: friendlyMessage })
      setTimeout(() => setMensagem(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Visual
  const currentStep = !predioSelecionado ? 1 : !andarSelecionado ? 2 : !medidorSelecionado ? 3 : !leituraAtual ? 4 : !foto ? 5 : 6

  return (
    <div className="min-h-screen bg-transparent py-6 px-4 sm:py-12">
      <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center justify-between w-full md:w-auto">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Nova Leitura</h1>
                <p className="text-sm text-gray-600 mt-1">Identificação via QR Code ou Manual</p>
              </div>
              
              <button 
                onClick={abrirScanner}
                className="md:hidden p-3 bg-gray-900 text-white rounded-xl shadow-lg active:scale-95 flex flex-col items-center gap-1"
              >
                <QrCode className="w-6 h-6" />
                <span className="text-[10px] font-bold">SCAN</span>
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-end">
               <button 
                onClick={abrirScanner}
                className="hidden md:flex items-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900 shadow-lg transition-transform hover:scale-105 mr-2"
              >
                <QrCode className="w-5 h-5" />
                Escanear Relógio
              </button>

              <div className="inline-flex bg-white rounded-2xl p-1.5 shadow-lg border border-gray-200">
                <button
                  onClick={() => {
                    setTipoAtivo('agua');
                    setPredioSelecionado('');
                    setAndarSelecionado('');
                    setMedidorSelecionado('');
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    tipoAtivo === 'agua'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Droplets className="w-5 h-5" />
                  <span className="hidden sm:inline">Água</span>
                </button>
                <button
                  onClick={() => {
                    setTipoAtivo('energia');
                    setPredioSelecionado('');
                    setAndarSelecionado('');
                    setMedidorSelecionado('');
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    tipoAtivo === 'energia'
                      ? 'bg-gradient-to-r from-yellow-300 to-yellow-300 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  <span className="hidden sm:inline">Energia</span>
                </button>
              </div>
            </div>
          </div>

          {/* STEPS */}
          <div className="hidden md:flex items-center justify-between gap-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {[
              { num: 1, title: 'Unidade', icon: Building, done: !!predioSelecionado },
              { num: 2, title: 'Andar', icon: MapPin, done: !!andarSelecionado },
              { num: 3, title: 'Relógio', icon: Info, done: !!medidorSelecionado },
              { num: 4, title: 'Leitura', icon: TrendingUp, done: leituraAtual !== '' },
              { num: 5, title: 'Foto', icon: Camera, done: !!foto }
            ].map((step, idx, arr) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className={`flex items-center gap-3 ${currentStep === step.num ? 'scale-105' : ''} transition-transform`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all ${
                    step.done
                      ? (tipoAtivo === 'agua' ? 'bg-blue-500 text-white' : 'bg-yellow-300 text-white')
                      : currentStep === step.num
                      ? 'bg-white border-2 border-gray-300 text-gray-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step.done ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Passo {step.num}</div>
                    <div className="text-sm font-semibold text-gray-900">{step.title}</div>
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <ArrowRight className="mx-2 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* MODAL SCANNER */}
        {mostrarScanner && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm relative">
              <h3 className="text-white text-center text-lg font-bold mb-4">
                Aponte para o QR Code do Relógio
              </h3>
              
              <div className="rounded-2xl overflow-hidden border-2 border-cyan-400 relative min-h-[300px] bg-gray-900">
                <ErrorBoundary>
                  {(() => {
                    try {
                      return (
                        <Scanner 
                          key={scannerKey}
                          onScan={(result) => {
                            try {
                              handleMedidorScan(result)
                            } catch (err) {
                              logger.error('[Leitura] Erro no onScan:', err)
                              handleScannerError(err)
                            }
                          }}
                          onError={(error) => {
                            try {
                              logger.error('[Leitura] Erro do Scanner:', error)
                              handleScannerError(error)
                            } catch (err) {
                              logger.error('[Leitura] Erro crítico no onError:', err)
                              setMostrarScanner(false)
                              setMensagem({ tipo: 'erro', texto: 'Erro ao acessar a câmera. Verifique as permissões e tente novamente.' })
                            }
                          }}
                          scanDelay={500}
                          allowMultiple={false}
                          constraints={{
                            facingMode: 'environment' // Prefere câmera traseira
                          }}
                        />
                      )
                    } catch (err) {
                      logger.error('[Leitura] Erro ao renderizar Scanner:', err)
                      return (
                        <div className="p-8 text-center text-white">
                          <p className="mb-4 text-lg font-semibold">Erro ao inicializar scanner</p>
                          <p className="mb-6 text-sm text-gray-300">
                            {err?.message || 'Erro desconhecido ao acessar a câmera.'}
                          </p>
                          <button
                            onClick={() => {
                              setMostrarScanner(false)
                              setMensagem({ tipo: 'erro', texto: 'Erro ao acessar a câmera. Verifique as permissões nas configurações do navegador.' })
                            }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Fechar
                          </button>
                        </div>
                      )
                    }
                  })()}
                </ErrorBoundary>
              </div>
              
              <button 
                onClick={() => {
                  try {
                    setMostrarScanner(false)
                    setCameraError(null)
                  } catch (err) {
                    logger.error('[Leitura] Erro ao fechar scanner:', err)
                  }
                }} 
                className="mt-6 w-full py-3 bg-white/20 border border-white/30 text-white rounded-xl font-bold hover:bg-white/30 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ERRO DE CÂMERA */}
        {cameraError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800">Erro ao acessar câmera</p>
              <p className="text-sm text-amber-700 mt-1">{cameraError}</p>
              <button 
                onClick={() => setCameraError(null)}
                className="mt-2 text-sm text-amber-600 hover:text-amber-800 font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* MENSAGEM */}
        {mensagem && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top ${
            mensagem.tipo === 'erro'
              ? 'bg-red-50 border-red-200 text-red-800'
              : mensagem.tipo === 'aviso'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-green-50 border-green-200 text-emerald-900' // sucesso ou info
          }`}>
            {mensagem.tipo === 'erro' ? (
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
            )}
            <span className="font-semibold">{mensagem.texto}</span>
          </div>
        )}

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-6">
            
            {/* IDENTIFICAÇÃO */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-500" /> Identificação
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Unidade</label>
                  <CustomSelect
                    value={predioSelecionado}
                    onChange={(val) => { setPredioSelecionado(val); setAndarSelecionado(''); setMedidorSelecionado('') }}
                    options={prediosUnicos.map(p => ({ value: p, label: p }))}
                    placeholder="Selecione..."
                    icon={Building}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Andar</label>
                  <CustomSelect
                    value={andarSelecionado}
                    onChange={(val) => { setAndarSelecionado(val); setMedidorSelecionado('') }}
                    options={andaresOpcoes.map(a => ({ value: a.valor, label: a.label }))}
                    placeholder="Selecione..."
                    disabled={!predioSelecionado}
                    icon={MapPin}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700">Medidor</label>
                  <CustomSelect
                    value={medidorSelecionado}
                    onChange={(val) => setMedidorSelecionado(val)}
                    options={medidoresFinais.map(m => ({ value: m.id, label: m.nome }))}
                    placeholder="Qual medidor?"
                    disabled={!andarSelecionado}
                  />
                </div>
              </div>
            </div>

            {/* LEITURA */}
            <div className={`rounded-2xl shadow-lg border p-6 transition-colors duration-300 ${
               isConsumoAlto ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
            }`}>
               <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                 isConsumoAlto ? 'text-red-700' : 'text-gray-900'
               }`}>
                <TrendingUp className={`w-5 h-5 ${isConsumoAlto ? 'text-red-600' : 'text-gray-500'}`} />
                {isConsumoAlto ? 'Alerta: Consumo Excessivo' : `Valor da Leitura (${tipoAtivo === 'agua' ? 'm³' : 'kWh'})`}
              </h2>
              
              <input
                type="number"
                step="0.01"
                className={`w-full px-6 py-5 text-3xl font-black tracking-wider rounded-xl focus:outline-none transition-all ${
                  !medidorSelecionado
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isConsumoAlto
                    ? 'bg-white border-2 border-red-400 text-red-600 focus:border-red-500'
                    : 'bg-gray-50 border-2 border-gray-300 text-gray-900 focus:border-blue-500'
                }`}
                placeholder="00000"
                value={leituraAtual}
                onChange={(e) => {
                  setLeituraAtual(e.target.value)
                  if (Number(e.target.value) >= leituraAnterior) setMotivoValidacao('')
                }}
                disabled={!medidorSelecionado}
              />

               {isConsumoAlto && consumo !== null && mediaHistorica !== null && (
                 <div className="mt-6 animate-in fade-in slide-in-from-top-4">
                   <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r-lg mb-4">
                     <p className="text-red-800 font-bold flex items-center gap-2">
                       <AlertTriangle className="w-5 h-5" />
                       Atenção: Consumo fora do padrão
                     </p>
                     <p className="text-red-700 text-sm mt-1">
                       O valor inserido representa um aumento de <strong>{Math.round(((consumo/mediaHistorica)-1)*100)}%</strong> em relação à média histórica ({mediaHistorica.toFixed(2)} {tipoAtivo === 'agua' ? 'm³' : 'kWh'}).
                     </p>
                     {numConsumosHistoricos < 10 && (
                       <p className="text-red-600 text-xs mt-2 italic">
                         Média calculada com {numConsumosHistoricos} registro(s) disponível(is).
                       </p>
                     )}
                   </div>
                   
                   <label className="block text-sm font-bold text-red-800 uppercase mb-2">
                     Justificativa Obrigatória:
                   </label>
                   <textarea
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      placeholder="Descreva o motivo (Ex: Vazamento no banheiro, evento extra, obra no local...)"
                      className="w-full p-4 rounded-xl border-2 border-red-300 focus:border-red-500 focus:ring-0 text-red-900 placeholder-red-300 min-h-[100px]"
                   />
                 </div>
               )}

               {isMenorQueAnterior && (
                  <div className="mt-4 bg-white border border-red-200 rounded-xl p-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                      <AlertTriangle className="w-5 h-5" /> Leitura Menor que Anterior
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                       <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-red-50 rounded-lg">
                         <input type="radio" name="motivo" onChange={() => setMotivoValidacao('virada')} className="accent-red-600 w-5 h-5" />
                         <span className="text-sm font-medium text-gray-700">Relógio Virou (Reiniciou)</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-red-50 rounded-lg">
                         <input type="radio" name="motivo" onChange={() => setMotivoValidacao('ajuste')} className="accent-red-600 w-5 h-5" />
                         <span className="text-sm font-medium text-gray-700">Correção/Ajuste Manual</span>
                       </label>
                    </div>
                  </div>
                )}
            </div>

            {/* FOTO */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-gray-500" /> Evidência Fotográfica
              </h2>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!leituraAtual}
                  className={`w-full py-12 border-3 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-3 ${
                      !leituraAtual
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : tipoAtivo === 'agua'
                        ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-600 hover:border-blue-400'
                        : 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50 text-yellow-600 hover:border-yellow-400'
                    }`}
                >
                  <Camera className="w-12 h-12 mb-1 opacity-50" />
                  <span className="font-bold text-lg">Tirar Foto do Relógio</span>
                  <span className="text-xs opacity-70">Obrigatório para auditoria</span>
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 h-80 group">
                  <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-white text-gray-900 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                    >
                      Trocar Foto
                    </button>
                    <button 
                      onClick={() => {setFoto(null); setPreviewUrl(null)}} 
                      className="p-3 bg-red-600 text-white rounded-full shadow-lg hover:scale-105 transition-transform"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* BOTÃO MOBILE */}
            <button
                type="submit"
                disabled={loading || !podeEnviar}
                className={`md:hidden w-full py-5 rounded-xl font-bold text-lg shadow-xl text-white mb-20 transition-all active:scale-95 ${
                  !podeEnviar
                    ? 'bg-gray-300 cursor-not-allowed'
                    : tipoAtivo === 'agua' ? 'bg-blue-600 shadow-blue-500/30' : 'bg-yellow-500 shadow-yellow-500/30'
                }`}
              >
                {loading ? 'Salvando...' : 'Confirmar Leitura'}
            </button>

          </div>

          {/* RESUMO FIXO DESKTOP */}
          <div className="hidden md:block col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-8">
              <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-400" /> Resumo
              </h3>
              
              <div className="space-y-4">
                 {/* Últimas 2 Leituras */}
                 {ultimasLeituras.length > 0 && (
                   <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                     <p className="text-xs text-blue-600 uppercase font-bold tracking-wider mb-3">Últimas 2 Leituras</p>
                     <div className="space-y-3">
                       {ultimasLeituras.map((item, index) => {
                         const dataFormatada = item.data.toLocaleDateString('pt-BR', { 
                           day: '2-digit', 
                           month: '2-digit', 
                           year: 'numeric' 
                         })
                         const horaFormatada = item.data.toLocaleTimeString('pt-BR', { 
                           hour: '2-digit', 
                           minute: '2-digit' 
                         })
                         return (
                           <div key={index} className={`p-3 rounded-lg border ${index === 0 ? 'bg-white border-blue-300 shadow-sm' : 'bg-blue-50/50 border-blue-200'}`}>
                             <div className="flex items-center justify-between mb-1">
                               <span className="text-xs font-semibold text-blue-700">
                                 {index === 0 ? 'Mais Recente' : 'Anterior'}
                               </span>
                               <span className="text-[10px] text-blue-500 font-medium">
                                 {dataFormatada} {horaFormatada}
                               </span>
                             </div>
                             <p className={`font-mono tracking-tight ${index === 0 ? 'text-2xl font-bold text-gray-800' : 'text-xl font-semibold text-gray-700'}`}>
                               {item.leitura.toLocaleString('pt-BR')} <span className="text-sm font-normal text-blue-500">{tipoAtivo === 'agua' ? 'm³' : 'kWh'}</span>
                             </p>
                           </div>
                         )
                       })}
                     </div>
                   </div>
                 )}
                 
                 {leituraAtual && consumo !== null && (
                   <div className={`p-4 rounded-xl border transition-colors ${
                     isConsumoAlto 
                       ? 'bg-red-50 border-red-200' 
                       : isMenorQueAnterior 
                       ? 'bg-orange-50 border-orange-200'
                       : 'bg-green-50 border-green-200'
                   }`}>
                     <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${
                       isConsumoAlto ? 'text-red-600' : isMenorQueAnterior ? 'text-orange-600' : 'text-green-600'
                     }`}>
                       Consumo Calculado
                     </p>
                     <p className={`text-4xl font-black font-mono tracking-tight ${
                       isConsumoAlto ? 'text-red-600' : isMenorQueAnterior ? 'text-orange-600' : 'text-green-600'
                     }`}>
                       {consumo.toFixed(2)}
                     </p>
                   </div>
                 )}

                 <button
                  type="submit"
                  disabled={loading || !podeEnviar}
                  className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 mt-4 ${
                    !podeEnviar
                      ? 'bg-gray-300 cursor-not-allowed'
                      : tipoAtivo === 'agua' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Confirmar
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className={`hidden md:block bg-gradient-to-br ${tipoAtivo === 'agua' ? 'from-blue-50 to-cyan-50 border-blue-200' : 'from-yellow-50 to-yellow-50 border-yellow-200'} rounded-2xl shadow-lg border p-6`}>
              <h3 className={`text-lg font-bold ${tipoAtivo === 'agua' ? 'text-blue-900' : 'text-yellow-800'} mb-3 flex items-center gap-2`}>
                <Info className="w-5 h-5" />
                Dica
              </h3>
              <p className={`text-sm ${tipoAtivo === 'agua' ? 'text-blue-800' : 'text-yellow-700'} leading-relaxed`}>
                Tire uma foto clara do medidor, garantindo que todos os dígitos estejam visíveis. 
                Isso ajuda na auditoria posterior caso haja divergência nos valores.
              </p>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}