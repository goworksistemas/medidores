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

// --- CONFIGURAÇÕES DO SISTEMA ---
const N8N_WEBHOOK_URL = 'https://flux.gowork.com.br/webhook/nova-leitura' 
const PORCENTAGEM_ALERTA = 0.60 
const VALOR_SEM_ANDAR = '___SEM_ANDAR___'

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
  
  const fileInputRef = useRef(null)

  // 1. Efeito para abrir o scanner via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('scan') === 'true') {
      setMostrarScanner(true);
    }
  }, []);

  // 2. Carrega todos os medidores
  useEffect(() => {
    async function fetchMedidores() {
      const { data } = await supabase
        .from('med_medidores')
        .select('*')
        .eq('tipo', tipoAtivo)
        .order('nome')
      
      if (data) setTodosMedidores(data)
    }
    fetchMedidores()
  }, [tipoAtivo])

  // 3. Lógica do Scanner
  const handleMedidorScan = async (result) => {
    if (!result || result.length === 0) return
    
    const tokenLido = result[0].rawValue 
    setMostrarScanner(false)
    setLoading(true)

    try {
      const { data: medidor, error } = await supabase
        .from('med_medidores')
        .select('*')
        .eq('token', tokenLido) 
        .single()

      if (error || !medidor) {
        throw new Error('QR Code não cadastrado ou medidor não encontrado.')
      }

      if (medidor.tipo !== tipoAtivo) {
        // Boa Prática: Em vez de um timeout, garantimos que os dados necessários
        // estejam disponíveis para a UI renderizar corretamente e, em seguida, disparamos a busca completa.
        // 1. Adiciona temporariamente o medidor escaneado à lista atual. Isso evita que a
        //    UI "pisque" ou não encontre o nome do medidor selecionado.
        setTodosMedidores(prev => 
          prev.some(m => m.id === medidor.id) ? prev : [...prev, medidor]
        );
        // 2. Dispara a mudança de tipo, que fará com que o useEffect busque a lista
        //    completa e correta de medidores para o novo tipo.
        setTipoAtivo(medidor.tipo);
      }

      setPredioSelecionado(medidor.local_unidade)
      setAndarSelecionado(medidor.andar || VALOR_SEM_ANDAR)
      setMedidorSelecionado(medidor.id)
      
      setMensagem({ tipo: 'sucesso', texto: `Identificado: ${medidor.nome}` })
      setTimeout(() => setMensagem(null), 3000)

      // Limpa a URL para evitar que o scanner reabra ao recarregar a página
      navigate('/leitura', { replace: true });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false)
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

      // Busca as últimas 11 leituras para calcular 10 períodos de consumo
      const { data: historico, error } = await supabase
        .from(tabela)
        .select('leitura')
        .eq('medidor_id', medidorSelecionado)
        .order('data_hora', { ascending: false })
        .limit(11)

      if (error || !historico || historico.length === 0) {
        setLeituraAnterior(0)
        setMediaHistorica(null)
        return
      }

      // A leitura mais recente é a "anterior" para o novo registro
      setLeituraAnterior(Number(historico[0].leitura))

      // Calcula a média de consumo se houver dados suficientes
      if (historico.length > 1) {
        const consumos = []
        for (let i = 0; i < historico.length - 1; i++) {
          const atual = Number(historico[i].leitura)
          const anterior = Number(historico[i + 1].leitura)
          const consumoCalculado = atual - anterior
          if (consumoCalculado >= 0) { // Ignora "viradas de relógio" para a média
            consumos.push(consumoCalculado)
          }
        }

        if (consumos.length > 0) {
          const soma = consumos.reduce((a, b) => a + b, 0)
          setMediaHistorica(soma / consumos.length)
        } else {
          setMediaHistorica(null)
        }
      } else {
        setMediaHistorica(null)
      }
    }
    fetchDadosMedidor()
    // Otimização: A dependência `todosMedidores` não é estritamente necessária aqui.
    // O efeito só precisa ser executado novamente quando o ID do medidor selecionado ou o tipo do medidor mudar.
    // A lógica interna já lida com casos em que os detalhes do medidor não estão na lista local.
  }, [medidorSelecionado, tipoAtivo])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFoto(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // --- VALIDAÇÕES E CÁLCULOS ---
  const valorAtualNum = Number(leituraAtual)
  const valorAnteriorNum = Number(leituraAnterior)
  const consumo = leituraAtual ? valorAtualNum - valorAnteriorNum : 0
  
  const isMenorQueAnterior = leituraAtual && leituraAnterior !== null && valorAtualNum < valorAnteriorNum
  const isConsumoAlto = !isMenorQueAnterior && mediaHistorica && consumo > (mediaHistorica * (1 + PORCENTAGEM_ALERTA))

  const podeEnviar = leituraAtual && foto && 
                     (!isMenorQueAnterior || motivoValidacao !== '') &&
                     (!isConsumoAlto || justificativa.length > 3)

  // 5. Submit (ENVIO DOS DADOS COMPLETOS)
  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeEnviar) return
    setLoading(true)
    
    let fotoUrl = null; // Garante que a variável exista
    try {
      const fileExt = foto.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
      // Upload para o bucket 'evidencias'
      const { error: uploadError } = await supabase.storage.from('evidencias').upload(fileName, foto)
      if (uploadError) throw uploadError
      
      // Obtenção da URL pública do bucket 'evidencias'
      const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(fileName)
      fotoUrl = urlData.publicUrl;

      let obsFinal = ''
      let porcentagemAcimaMedia = null
      if (isConsumoAlto) {
        porcentagemAcimaMedia = Math.round(((consumo / mediaHistorica) - 1) * 100)
        obsFinal = `ALERTA: Consumo +${porcentagemAcimaMedia}% acima da média.`
      }
      if (isMenorQueAnterior) {
        obsFinal = motivoValidacao === 'virada' ? 'Virada de Relógio' : 'Ajuste Manual'
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
      if (N8N_WEBHOOK_URL && isConsumoAlto) {
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
        }).catch(err => console.error("Erro ao enviar Webhook para n8n:", err))
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
      
      setTimeout(() => setMensagem(null), 3000)

    } catch (error) {
      console.error('Erro ao salvar leitura:', error)
      let friendlyMessage = 'Erro ao salvar: ' + error.message
      if (error.message.includes('storage.objects.create')) {
        friendlyMessage = 'Erro ao salvar a foto. Verifique se o bucket "evidencias" existe e se as permissões estão corretas.'
      }
      // Usa o novo sistema de mensagens em vez do alert()
      setMensagem({ tipo: 'erro', texto: friendlyMessage });
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
                onClick={() => setMostrarScanner(true)}
                className="md:hidden p-3 bg-gray-900 text-white rounded-xl shadow-lg active:scale-95 flex flex-col items-center gap-1"
              >
                <QrCode className="w-6 h-6" />
                <span className="text-[10px] font-bold">SCAN</span>
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-end">
               <button 
                onClick={() => setMostrarScanner(true)}
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
                Aponte para o QR Code
              </h3>
              
              <div className="rounded-2xl overflow-hidden border-2 border-cyan-400">
                <Scanner 
                  onScan={handleMedidorScan}
                  scanDelay={500}
                  allowMultiple={false}
                />
              </div>
              
              <button 
                onClick={() => setMostrarScanner(false)} 
                className="mt-6 w-full py-3 bg-white/20 border border-white/30 text-white rounded-xl font-bold"
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

               {isConsumoAlto && (
                 <div className="mt-6 animate-in fade-in slide-in-from-top-4">
                   <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r-lg mb-4">
                     <p className="text-red-800 font-bold flex items-center gap-2">
                       <AlertTriangle className="w-5 h-5" />
                       Atenção: Consumo fora do padrão
                     </p>
                     <p className="text-red-700 text-sm mt-1">
                       O valor inserido representa um aumento de <strong>{Math.round(((consumo/mediaHistorica)-1)*100)}%</strong> em relação à média dos últimos 10 registros.
                     </p>
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
                 <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Leitura Anterior</p>
                   <p className="text-3xl font-bold text-gray-700 font-mono tracking-tight">
                     {leituraAnterior} <span className="text-sm font-normal text-gray-400">{tipoAtivo === 'agua' ? 'm³' : 'kWh'}</span>
                   </p>
                 </div>
                 
                 {leituraAtual && (
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
                       {consumo}
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