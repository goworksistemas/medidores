import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import { Camera, CheckCircle, Trash2, AlertTriangle, TrendingUp, Droplets, Zap, Building, MapPin, ArrowRight, Info, BarChart3, History, ChevronDown } from 'lucide-react'

// CONFIGURAÇÕES
const N8N_WEBHOOK_URL = ''
const PORCENTAGEM_ALERTA = 0.60 
const VALOR_SEM_ANDAR = '___SEM_ANDAR___'

export default function Leitura() {
  const { tipoAtivo, setTipoAtivo } = useTheme()
  const [todosMedidores, setTodosMedidores] = useState([])
  const [predioSelecionado, setPredioSelecionado] = useState('')
  const [andarSelecionado, setAndarSelecionado] = useState('')
  const [medidorSelecionado, setMedidorSelecionado] = useState('')
  const [leituraAnterior, setLeituraAnterior] = useState(null)
  const [leituraAtual, setLeituraAtual] = useState('')
  const [mediaHistorica, setMediaHistorica] = useState(null)
  const [foto, setFoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [motivoValidacao, setMotivoValidacao] = useState('')
  const fileInputRef = useRef(null)

  // Fetch medidores
  useEffect(() => {
    async function fetchMedidores() {
      setTodosMedidores([])
      setPredioSelecionado('')
      setAndarSelecionado('')
      setMedidorSelecionado('')
      setLeituraAtual('')
      setFoto(null)
      setPreviewUrl(null)

      const { data } = await supabase
        .from('medidores')
        .select('*')
        .eq('tipo', tipoAtivo)
        .order('nome')
      
      if (data) setTodosMedidores(data)
    }
    fetchMedidores()
  }, [tipoAtivo])

  // Lógica de filtros
  const prediosUnicos = [...new Set(todosMedidores.map(m => m.local_unidade).filter(Boolean))].sort()
  
  let andaresOpcoes = []
  if (predioSelecionado) {
    const medidoresDoPredio = todosMedidores.filter(m => m.local_unidade === predioSelecionado)
    const andaresReais = [...new Set(medidoresDoPredio.map(m => m.andar).filter(Boolean))].sort()
    const temSemAndar = medidoresDoPredio.some(m => !m.andar)
    andaresOpcoes = andaresReais.map(a => ({ valor: a, label: a }))
    if (temSemAndar) {
      andaresOpcoes.unshift({ valor: VALOR_SEM_ANDAR, label: 'Geral / Sem Andar' })
    }
  }

  const medidoresFinais = todosMedidores.filter(m => {
    if (m.local_unidade !== predioSelecionado) return false
    if (andarSelecionado === VALOR_SEM_ANDAR) return !m.andar
    return m.andar === andarSelecionado
  })

  // Busca dados do medidor
  useEffect(() => {
    if (!medidorSelecionado) return

    async function fetchDadosMedidor() {
      const nomeMedidor = todosMedidores.find(m => m.id == medidorSelecionado)?.nome
      if (!nomeMedidor) return

      const viewAlvo = tipoAtivo === 'agua' ? 'view_hidrometros_calculada' : 'view_energia_calculada'

      const { data: historico } = await supabase
        .from(viewAlvo)
        .select('leitura_num, consumo_calculado')
        .eq('identificador_relogio', nomeMedidor)
        .order('data_real', { ascending: false })
        .limit(10)

      if (historico && historico.length > 0) {
        setLeituraAnterior(historico[0].leitura_num || 0)
        const consumosValidos = historico.map(h => h.consumo_calculado).filter(c => c !== null && c >= 0)
        if (consumosValidos.length > 0) {
          const soma = consumosValidos.reduce((a, b) => a + b, 0)
          setMediaHistorica(soma / consumosValidos.length)
        } else {
          setMediaHistorica(null)
        }
      } else {
        setLeituraAnterior(0)
        setMediaHistorica(null)
      }
    }
    fetchDadosMedidor()
  }, [medidorSelecionado, todosMedidores, tipoAtivo])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFoto(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // Cálculos e validação
  const valorAtualNum = Number(leituraAtual)
  const valorAnteriorNum = Number(leituraAnterior)
  const consumo = leituraAtual ? valorAtualNum - valorAnteriorNum : 0
  const isMenorQueAnterior = leituraAtual && leituraAnterior !== null && valorAtualNum < valorAnteriorNum
  const isConsumoAlto = !isMenorQueAnterior && mediaHistorica && consumo > (mediaHistorica * (1 + PORCENTAGEM_ALERTA))
  const podeEnviar = leituraAtual && foto && (!isMenorQueAnterior || motivoValidacao !== '')

  // Submit
  async function handleSubmit(e) {
    e.preventDefault()
    if (!podeEnviar) return
    setLoading(true)
    
    try {
      const fileExt = foto.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('evidencias').upload(fileName, foto)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(fileName)
      
      const medidorObj = todosMedidores.find(m => m.id == medidorSelecionado)
      
      let obsFinal = isConsumoAlto ? `ALERTA: Consumo Alto (+${Math.round((consumo/mediaHistorica - 1)*100)}%)` : ''
      if (isMenorQueAnterior) obsFinal = motivoValidacao === 'virada' ? 'Virada de Relógio' : 'Ajuste Manual'

      const dadosComuns = {
        identificador_relogio: medidorObj.nome,
        unidade: medidorObj.local_unidade,
        andar: medidorObj.andar,
        data_hora: new Date().toISOString(),
        apenas_data: new Date().toISOString().split('T')[0],
        foto_url: urlData.publicUrl,
        usuario: 'App Web',
        observacao: obsFinal
      }

      if (tipoAtivo === 'agua') {
        await supabase.from('hidrometros').insert({ ...dadosComuns, leitura_hidrometro: leituraAtual.toString() })
      } else {
        await supabase.from('energia').insert({ ...dadosComuns, leitura_energia: leituraAtual.toString() })
      }
      
    // N8N
      if (N8N_WEBHOOK_URL) {
        fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: tipoAtivo,
            medidor: medidorObj.nome,
            unidade: medidorObj.local_unidade,
            andar: medidorObj.andar || 'Geral',
            leitura_atual: valorAtualNum,
            consumo: isMenorQueAnterior ? valorAtualNum : consumo,
            alerta: isConsumoAlto || isMenorQueAnterior,
            foto: urlData.publicUrl
          })
        }).catch(err => console.error(err))
      }

      setMensagem(isConsumoAlto ? 'Salvo! Alerta enviado.' : 'Leitura salva com sucesso!')
      setLeituraAtual('')
      setFoto(null)
      setPreviewUrl(null)
      setMotivoValidacao('')
      setMedidorSelecionado('')
      setTimeout(() => setMensagem(null), 3000)

    } catch (error) {
      alert('Erro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const currentStep = !predioSelecionado ? 1 : !andarSelecionado ? 2 : !medidorSelecionado ? 3 : !leituraAtual ? 4 : !foto ? 5 : 6

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-6 px-4 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header com Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Registro de Leitura</h1>
              <p className="text-sm text-gray-600 mt-1">Selecione o tipo de medidor e preencha os dados</p>
            </div>
            
            {/* Botões Água e Energia + Navegação Desktop */}
            <div className="flex flex-col items-center sm:flex-row gap-3 sm:items-center justify-center sm:justify-end">
              {/* Tabs Modernos */}
              <div className="inline-flex bg-white rounded-2xl p-1.5 shadow-lg border border-gray-200">
                <button
                  onClick={() => setTipoAtivo('agua')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    tipoAtivo === 'agua'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Droplets className="w-5 h-5" />
                  <span className="hidden sm:inline">Água</span>
                </button>
                <button
                  onClick={() => setTipoAtivo('energia')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    tipoAtivo === 'energia'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  <span className="hidden sm:inline">Energia</span>
                </button>
              </div>

              {/* Navegação Desktop - Histórico e Gráficos */}
              <div className="hidden md:flex gap-2">
                <Link to="/historico" className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-100 border-2 border-gray-200 transition-all shadow-md">
                  <History className="w-5 h-5" />
                  Histórico
                </Link>
                <Link to="/dashboard" className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-100 border-2 border-gray-200 transition-all shadow-md">
                  <BarChart3 className="w-5 h-5" />
                  Gráficos
                </Link>
              </div>
            </div>
          </div>

          {/* Progress Steps - Horizontal em Desktop, Compact em Mobile */}
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
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
                    step.done
                      ? tipoAtivo === 'agua'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                      : currentStep === step.num
                      ? 'bg-white border-2 border-gray-300 text-gray-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step.done ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Passo {step.num}</div>
                    <div className={`text-sm font-semibold ${step.done || currentStep === step.num ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.title}
                    </div>
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <ArrowRight className={`mx-2 flex-shrink-0 ${step.done ? 'text-gray-400' : 'text-gray-300'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Progress Compact para Mobile */}
          <div className="md:hidden flex items-center justify-center gap-2 pb-2">
            {[1, 2, 3, 4, 5].map(num => (
              <div key={num} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all flex-shrink-0 ${
                currentStep > num
                  ? tipoAtivo === 'agua'
                    ? 'bg-blue-500 text-white'
                    : 'bg-orange-500 text-white'
                  : currentStep === num
                  ? 'bg-white border-2 border-gray-400 text-gray-700 scale-110'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {currentStep > num ? <CheckCircle className="w-5 h-5" /> : num}
              </div>
            ))}
          </div>
        </div>

        {/* Alert Message */}
        {mensagem && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
            mensagem.includes('Alerta')
              ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-orange-900'
              : 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-900'
          }`}>
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <span className="font-semibold">{mensagem}</span>
          </div>
        )}

        {/* Main Content - Desktop: 2 colunas, Mobile: 1 coluna */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Coluna Esquerda - Formulário Principal */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Card de Seleção de Localização */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building className={`w-5 h-5 ${tipoAtivo === 'agua' ? 'text-blue-600' : 'text-orange-600'}`} />
                Localização do Medidor de {tipoAtivo === 'agua' ? 'Água' : 'Energia'}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Unidade */}
                <div className="space-y-2 relative z-10">
                  <label className="block text-sm font-semibold text-gray-700">
                    Unidade (Prédio)
                  </label>
                  <div className="relative isolate">
                    <Building className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-[1]" />
                    <select
                      className={`w-full pl-10 pr-10 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:z-[100] appearance-none cursor-pointer transition-colors ${tipoAtivo === 'agua' ? 'focus:border-blue-500' : 'focus:border-orange-500'}`}
                      value={predioSelecionado}
                      onChange={(e) => {
                        setPredioSelecionado(e.target.value)
                        setAndarSelecionado('')
                        setMedidorSelecionado('')
                      }}
                    >
                      <option value="">Selecione...</option>
                      {prediosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-[1]" />
                  </div>
                </div>

                {/* Andar */}
                <div className="space-y-2 relative z-10">
                  <label className="block text-sm font-semibold text-gray-700">
                    Andar / Setor
                  </label>
                  <div className="relative isolate">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-[1]" />
                    <select
                      className={`w-full pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:z-[100] appearance-none cursor-pointer transition-colors ${
                        !predioSelecionado
                          ? 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
                          : `bg-gray-50 border-2 border-gray-200 focus:bg-white ${tipoAtivo === 'agua' ? 'focus:border-blue-500' : 'focus:border-orange-500'}`
                      }`}
                      value={andarSelecionado}
                      onChange={(e) => { setAndarSelecionado(e.target.value); setMedidorSelecionado('') }}
                      disabled={!predioSelecionado}
                    >
                      <option value="">Selecione...</option>
                      {andaresOpcoes.map(opcao => (
                        <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-[1]" />
                  </div>
                </div>

                {/* Medidor */}
                <div className="space-y-2 sm:col-span-2 md:col-span-1 relative z-10">
                  <label className="block text-sm font-semibold text-gray-700">
                    Medidor
                  </label>
                  <div className="relative isolate">
                    <select
                      className={`w-full pl-4 pr-10 py-3 rounded-xl focus:outline-none focus:z-[100] appearance-none cursor-pointer transition-colors ${
                        !andarSelecionado
                          ? 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
                          : tipoAtivo === 'agua'
                          ? 'bg-blue-50 border-2 border-blue-300 focus:border-blue-500 font-semibold text-blue-900'
                          : 'bg-orange-50 border-2 border-orange-300 focus:border-orange-500 font-semibold text-orange-900'
                      }`}
                      value={medidorSelecionado}
                      onChange={(e) => setMedidorSelecionado(e.target.value)}
                      disabled={!andarSelecionado}
                    >
                      <option value="">Qual medidor?</option>
                      {medidoresFinais.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-[1]" style={{ color: !andarSelecionado ? '#9ca3af' : (tipoAtivo === 'agua' ? '#1e3a8a' : '#92400e') }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Card de Leitura */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className={`w-5 h-5 ${tipoAtivo === 'agua' ? 'text-blue-600' : 'text-orange-600'}`} />
                Valor da Leitura {tipoAtivo === 'agua' ? '(m³)' : '(kWh)'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Digite o valor atual do medidor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className={`w-full px-6 py-5 text-3xl font-black tracking-wider rounded-xl focus:outline-none transition-all ${
                      !medidorSelecionado
                        ? 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
                        : isMenorQueAnterior || isConsumoAlto
                        ? 'bg-red-50 border-2 border-red-400 text-red-600 focus:border-red-500'
                        : `bg-gray-50 border-2 border-gray-300 text-gray-900 ${tipoAtivo === 'agua' ? 'focus:border-blue-500' : 'focus:border-orange-500'}`
                    }`}
                    placeholder="00000"
                    value={leituraAtual}
                    onChange={(e) => {
                      setLeituraAtual(e.target.value)
                      if (Number(e.target.value) >= leituraAnterior) setMotivoValidacao('')
                    }}
                    disabled={!medidorSelecionado}
                  />
                </div>

                {/* Alertas de Validação */}
                {isMenorQueAnterior && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-900 mb-1">Atenção: Valor Menor</h4>
                        <p className="text-sm text-red-700">O valor informado é menor que a leitura anterior. Por favor, explique o motivo:</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-red-400 transition-colors">
                        <input
                          type="radio"
                          name="motivo"
                          checked={motivoValidacao === 'virada'}
                          onChange={() => setMotivoValidacao('virada')}
                          className="w-5 h-5 text-red-600"
                        />
                        <span className="text-sm font-medium text-gray-900">Relógio Virou (Zerou)</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-red-400 transition-colors">
                        <input
                          type="radio"
                          name="motivo"
                          checked={motivoValidacao === 'ajuste'}
                          onChange={() => setMotivoValidacao('ajuste')}
                          className="w-5 h-5 text-red-600"
                        />
                        <span className="text-sm font-medium text-gray-900">Ajuste / Correção Manual</span>
                      </label>
                    </div>
                  </div>
                )}

                {isConsumoAlto && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-5 flex items-start gap-3">
                    <TrendingUp className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-orange-900 mb-1">Consumo Elevado Detectado</h4>
                      <p className="text-sm text-orange-700">
                        O consumo de <span className="font-bold">{consumo}</span> está{' '}
                        <span className="font-bold">{Math.round(((consumo/mediaHistorica)-1)*100)}%</span> acima da média histórica.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card de Foto */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className={`w-5 h-5 ${tipoAtivo === 'agua' ? 'text-blue-600' : 'text-orange-600'}`} />
                Evidência Fotográfica
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
                        ? 'border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700'
                        : 'border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-orange-400 hover:bg-orange-50 text-gray-700 hover:text-orange-700'
                    }`}
                >
                  <Camera className="w-12 h-12" />
                  <div className="text-center">
                    <div className="font-bold text-lg">Tirar Foto do Medidor</div>
                    <div className="text-sm text-gray-500 mt-1">Clique para abrir a câmera</div>
                  </div>
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 shadow-md group">
                  <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                  <button
                    type="button"
                    onClick={() => { setFoto(null); setPreviewUrl(null) }}
                    className="absolute top-4 right-4 p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-all hover:scale-110"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white font-semibold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Foto capturada com sucesso
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Envio - Mobile */}
            <div className="md:hidden">
              <button
                type="submit"
                disabled={loading || !podeEnviar}
                className={`w-full py-5 rounded-xl font-bold text-lg shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                  !podeEnviar
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isConsumoAlto || isMenorQueAnterior
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-orange-500/50 hover:shadow-2xl'
                    : tipoAtivo === 'agua'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-500/50 hover:shadow-2xl'
                    : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-orange-500/50 hover:shadow-2xl'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    Confirmar Leitura
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Coluna Direita - Sidebar de Informações (Desktop) */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Card de Informações Técnicas */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dados Técnicos</h3>
              
              <div className="space-y-4">
                {/* Leitura Anterior */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Leitura Anterior</span>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-3xl font-black text-gray-900">
                    {leituraAnterior !== null ? leituraAnterior.toLocaleString() : '—'}
                  </div>
                </div>

                {/* Média Histórica */}
                <div className={`bg-gradient-to-br ${tipoAtivo === 'agua' ? 'from-blue-50 to-cyan-50 border-blue-200' : 'from-orange-50 to-amber-50 border-orange-200'} rounded-xl p-4 border`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${tipoAtivo === 'agua' ? 'text-blue-700' : 'text-orange-700'} uppercase tracking-wide`}>Média Histórica</span>
                    <TrendingUp className={`w-4 h-4 ${tipoAtivo === 'agua' ? 'text-blue-600' : 'text-orange-600'}`} />
                  </div>
                  <div className={`text-3xl font-black ${tipoAtivo === 'agua' ? 'text-blue-900' : 'text-orange-900'}`}>
                    {mediaHistorica ? Math.round(mediaHistorica).toLocaleString() : '—'}
                  </div>
                </div>

                {/* Consumo Calculado */}
                {leituraAtual && (
                  <div className={`bg-gradient-to-br rounded-xl p-4 border-2 ${
                    isConsumoAlto
                      ? 'from-orange-50 to-red-50 border-orange-300'
                      : 'from-emerald-50 to-green-50 border-emerald-300'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${
                        isConsumoAlto ? 'text-orange-700' : 'text-emerald-700'
                      }`}>
                        Consumo Atual
                      </span>
                      <TrendingUp className={`w-4 h-4 ${isConsumoAlto ? 'text-orange-600' : 'text-emerald-600'}`} />
                    </div>
                    <div className={`text-3xl font-black ${
                      isConsumoAlto ? 'text-orange-900' : 'text-emerald-900'
                    }`}>
                      {consumo >= 0 ? consumo.toLocaleString() : '—'}
                    </div>
                    {mediaHistorica && consumo > 0 && (
                      <div className="mt-2 text-xs font-medium text-gray-600">
                        {consumo > mediaHistorica
                          ? `+${Math.round(((consumo/mediaHistorica)-1)*100)}% vs média`
                          : `${Math.round(((consumo/mediaHistorica)-1)*100)}% vs média`
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botão de Envio - Desktop */}
              <div className="mt-6 hidden md:block">
                <button
                  type="submit"
                  disabled={loading || !podeEnviar}
                  className={`w-full py-4 rounded-xl font-bold text-base shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                    !podeEnviar
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isConsumoAlto || isMenorQueAnterior
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-orange-500/50 hover:shadow-2xl'
                      : tipoAtivo === 'agua'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-500/50 hover:shadow-2xl'
                      : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-orange-500/50 hover:shadow-2xl'
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

            {/* Card de Ajuda */}
            <div className={`hidden md:block bg-gradient-to-br ${tipoAtivo === 'agua' ? 'from-blue-50 to-cyan-50 border-blue-200' : 'from-orange-50 to-amber-50 border-orange-200'} rounded-2xl shadow-lg border p-6`}>
              <h3 className={`text-lg font-bold ${tipoAtivo === 'agua' ? 'text-blue-900' : 'text-orange-900'} mb-3 flex items-center gap-2`}>
                <Info className="w-5 h-5" />
                Dica
              </h3>
              <p className={`text-sm ${tipoAtivo === 'agua' ? 'text-blue-800' : 'text-orange-800'} leading-relaxed`}>
                Tire uma foto clara do medidor, garantindo que todos os dígitos estejam visíveis. 
                Isso ajuda na auditoria posterior e comprova o valor registrado.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}