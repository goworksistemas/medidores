import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import { 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts'
import { 
  Zap, Droplets, TrendingUp, History, 
  Calendar, MapPin, AlertCircle, ArrowUpRight, Filter, Building, Layers, X, ChevronDown, Activity
} from 'lucide-react'

// Cores do Tema - Paleta profissional
const COLORS_WATER = ['#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD', '#0284C7', '#0369A1']
const COLORS_ENERGY = ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#D97706', '#B45309']

// Opções de período predefinido
const PERIODOS_OPCOES = [
  { value: 7, label: 'Últimos 7 dias' },
  { value: 15, label: 'Últimos 15 dias' },
  { value: 30, label: 'Últimos 30 dias' },
  { value: 60, label: 'Últimos 60 dias' },
  { value: 90, label: 'Últimos 90 dias' },
  { value: 365, label: 'Último ano' },
  { value: 0, label: 'Personalizado' },
]

// Tooltip customizado
const CustomTooltip = ({ active, payload, label, tipo }) => {
  if (active && payload && payload.length) {
    const unidade = tipo === 'agua' ? 'm³' : 'kWh'
    return (
      <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
        <p className="text-lg font-bold" style={{ color: payload[0].color }}>
          {Number(payload[0].value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-sm font-medium text-gray-400">{unidade}</span>
        </p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { tipoAtivo, setTipoAtivo } = useTheme()
  const [loading, setLoading] = useState(true)
  const [allData, setAllData] = useState([])
  
  // Filtros
  const [periodo, setPeriodo] = useState(30)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroAndar, setFiltroAndar] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  
  // Opções dinâmicas
  const [opcoesUnidades, setOpcoesUnidades] = useState([])
  const [opcoesAndares, setOpcoesAndares] = useState([])

  // Calcula datas baseado no período
  const { dataCorteStr, dataFimStr } = useMemo(() => {
    if (periodo === 0 && dataInicio && dataFim) {
      return { dataCorteStr: dataInicio, dataFimStr: dataFim }
    }
    const hoje = new Date()
    const dataCorte = new Date()
    dataCorte.setDate(dataCorte.getDate() - (periodo || 30))
    return { 
      dataCorteStr: dataCorte.toISOString().split('T')[0],
      dataFimStr: hoje.toISOString().split('T')[0]
    }
  }, [periodo, dataInicio, dataFim])

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);

      const tabela = tipoAtivo === 'agua' ? 'med_hidrometros' : 'med_energia'

      // 1. Busca todas as leituras no período, com informações do medidor
      const { data: leiturasNoPeriodo, error } = await supabase
        .from(tabela)
        .select('leitura, created_at, medidor:med_medidores(id, nome, local_unidade, andar)')
        .gte('created_at', `${dataCorteStr}T00:00:00Z`)
        .lte('created_at', `${dataFimStr}T23:59:59Z`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        setAllData([]);
        setLoading(false);
        return;
      }

      // 2. Agrupa as leituras por medidor
      const leiturasPorMedidor = (leiturasNoPeriodo || []).reduce((acc, curr) => {
        if (!curr.medidor) return acc;
        const medidorId = curr.medidor.id;
        if (!acc[medidorId]) {
          acc[medidorId] = [];
        }
        acc[medidorId].push(curr);
        return acc;
      }, {});

      // 3. Busca a última leitura ANTERIOR ao período para cada medidor
      const medidorIds = Object.keys(leiturasPorMedidor);
      const promisesLeiturasAnteriores = medidorIds.map(id =>
        supabase
          .from(tabela)
          .select('leitura, medidor_id')
          .eq('medidor_id', id)
          .lt('created_at', `${dataCorteStr}T00:00:00Z`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      );
      
      const resultadosAnteriores = await Promise.all(promisesLeiturasAnteriores);
      const mapaLeiturasAnteriores = resultadosAnteriores.reduce((acc, res) => {
        if (res.data) {
          acc[res.data.medidor_id] = res.data;
        }
        return acc;
      }, {});

      // 4. Calcula o consumo para cada leitura no período
      const consumosCalculados = [];
      for (const medidorId in leiturasPorMedidor) {
        const leiturasDoMedidor = leiturasPorMedidor[medidorId];
        let leituraDeReferencia = mapaLeiturasAnteriores[medidorId]?.leitura;

        for (let i = 0; i < leiturasDoMedidor.length; i++) {
          const leituraAtual = leiturasDoMedidor[i];
          let consumo = 0; // O padrão é 0 se não houver referência

          // Só calcula o consumo se houver uma leitura anterior para comparar
          if (leituraDeReferencia !== undefined) {
            const consumoCalculado = Number(leituraAtual.leitura) - Number(leituraDeReferencia);
            // Apenas considera consumos positivos para evitar problemas com "virada" de medidor
            if (consumoCalculado >= 0) {
              consumo = consumoCalculado;
            }
          }

          consumosCalculados.push({
            consumo: consumo,
            dataRegistro: leituraAtual.created_at.split('T')[0],
            nomeMedidor: leituraAtual.medidor.nome,
            local_unidade: leituraAtual.medidor.local_unidade,
            andar: leituraAtual.medidor.andar,
          });

          // Atualiza a referência para a próxima iteração
          leituraDeReferencia = leituraAtual.leitura;
        }
      }

      setAllData(consumosCalculados);
      setLoading(false);
    }

    async function fetchFilterOptions() {
      const { data } = await supabase
        .from('med_medidores')
        .select('local_unidade, andar')
        .eq('tipo', tipoAtivo);

      if (data) {
        const unidades = [...new Set(data.map(d => d.local_unidade).filter(Boolean))].sort();
        const andares = [...new Set(data.map(d => d.andar).filter(Boolean))].sort();
        setOpcoesUnidades(unidades);
        setOpcoesAndares(andares);
      }
    }
    fetchDashboard()
    fetchFilterOptions()
  }, [tipoAtivo, dataCorteStr, dataFimStr])

  // Aplica filtros
  const rawData = useMemo(() => {
    let dados = allData
    if (filtroUnidade) {
      dados = dados.filter(d => d.local_unidade === filtroUnidade)
    }
    if (filtroAndar) {
      dados = dados.filter(d => d.andar === filtroAndar)
    }
    return dados
  }, [allData, filtroUnidade, filtroAndar])

  // Limpar filtros
  const limparFiltros = () => {
    setPeriodo(30)
    setDataInicio('')
    setDataFim('')
    setFiltroUnidade('')
    setFiltroAndar('')
  }

  const filtrosAtivos = [filtroUnidade, filtroAndar, (periodo === 0 && dataInicio)].filter(Boolean).length

  // Dias do período
  const diasPeriodo = useMemo(() => {
    if (periodo > 0) return periodo
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio)
      const fim = new Date(dataFim)
      return Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) || 1
    }
    return 30
  }, [periodo, dataInicio, dataFim])

  // KPIs
  const kpis = useMemo(() => {
    const total = rawData.reduce((acc, curr) => acc + curr.consumo, 0)
    const media = rawData.length > 0 ? total / diasPeriodo : 0
    const maiorRegistro = rawData.length > 0 ? Math.max(...rawData.map(d => d.consumo)) : 0
    const totalRegistros = rawData.length
    return { total, media, maiorRegistro, totalRegistros }
  }, [rawData, diasPeriodo])

  // Dados de Tendência Diária
  const dadosTendencia = useMemo(() => {
    const agrupado = {}
    
    rawData.forEach(curr => {
      let dataStr = curr.dataRegistro
      if (!dataStr) return
      
      // Normaliza a data
      let dataObj
      if (dataStr.includes('T')) {
        dataObj = new Date(dataStr)
      } else if (dataStr.includes('-')) {
        dataObj = new Date(dataStr + 'T12:00:00')
      } else {
        return
      }
      
      if (isNaN(dataObj.getTime())) return
      
      const chave = dataObj.toISOString().split('T')[0]
      if (!agrupado[chave]) {
        agrupado[chave] = { total: 0, count: 0 }
      }
      agrupado[chave].total += curr.consumo
      agrupado[chave].count += 1
    })
    
    return Object.entries(agrupado)
      .map(([data, info]) => ({
        data,
        dataFormatada: new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        consumo: Number(info.total.toFixed(2)),
        registros: info.count
      }))
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [rawData])

  // Distribuição por Unidade
  const dadosPorUnidade = useMemo(() => {
    const agrupado = {}

    rawData.forEach(curr => {
      const unidade = curr.local_unidade || 'Outros'
      if (!agrupado[unidade]) agrupado[unidade] = 0
      agrupado[unidade] += curr.consumo
    })

    return Object.entries(agrupado)
      .map(([name, value]) => ({ 
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        value: Number(value.toFixed(2)) 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 para não poluir
  }, [rawData])

  // Distribuição por Andar (NOVO GRÁFICO)
  const dadosPorAndar = useMemo(() => {
    const agrupado = {};
    rawData.forEach(curr => {
      const andar = curr.andar || 'N/A';
      if (!agrupado[andar]) {
        agrupado[andar] = 0;
      }
      agrupado[andar] += curr.consumo;
    });

    return Object.entries(agrupado)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8
  }, [rawData]);

  // Top Medidores (agrupado)
  const topMedidores = useMemo(() => {
    const agrupado = {}
    
    rawData.forEach(curr => {
      const nome = curr.nomeMedidor
      if (!agrupado[nome]) {
        agrupado[nome] = { total: 0, count: 0, unidade: curr.local_unidade }
      }
      agrupado[nome].total += curr.consumo
      agrupado[nome].count += 1
    })

    return Object.entries(agrupado)
      .map(([nome, info]) => ({
        nome: nome.length > 25 ? nome.substring(0, 25) + '...' : nome,
        nomeCompleto: nome,
        total: Number(info.total.toFixed(2)),
        media: Number((info.total / info.count).toFixed(2)),
        registros: info.count,
        unidade: info.unidade
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [rawData])

  // Config Cores
  const themeColor = tipoAtivo === 'agua' ? '#0EA5E9' : '#F59E0B'
  const themeColorDark = tipoAtivo === 'agua' ? '#0284C7' : '#D97706'
  const pieColors = tipoAtivo === 'agua' ? COLORS_WATER : COLORS_ENERGY
  const unidadeMedida = tipoAtivo === 'agua' ? 'm³' : 'kWh'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              {periodo > 0 ? `Análise dos últimos ${periodo} dias` : `Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`}
              {(filtroUnidade || filtroAndar) && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  {filtroUnidade} {filtroAndar && `• ${filtroAndar}`}
                </span>
              )}
            </p>
          </div>
          
          {/* Toggle Água/Energia */}
          <div className="inline-flex bg-white rounded-2xl p-1.5 shadow-lg border border-gray-200/50">
            <button
              onClick={() => setTipoAtivo('agua')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                tipoAtivo === 'agua' 
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Droplets className="w-4 h-4" /> Água
            </button>
            <button
              onClick={() => setTipoAtivo('energia')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                tipoAtivo === 'energia' 
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Zap className="w-4 h-4" /> Energia
            </button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/50 overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-xl">
                <Filter className="w-4 h-4 text-gray-600" />
              </div>
              <span className="font-bold text-gray-700">Filtros</span>
              {filtrosAtivos > 0 && (
                <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                  {filtrosAtivos} ativo{filtrosAtivos > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Período */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Período</label>
                  <select
                    value={periodo}
                    onChange={(e) => setPeriodo(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm font-medium transition-all"
                  >
                    {PERIODOS_OPCOES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {periodo === 0 && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">De</label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Até</label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm font-medium transition-all"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                    <Building className="w-3 h-3 inline mr-1" />
                    Unidade
                  </label>
                  <select
                    value={filtroUnidade}
                    onChange={(e) => setFiltroUnidade(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm font-medium transition-all"
                  >
                    <option value="">Todas</option>
                    {opcoesUnidades.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                    <Layers className="w-3 h-3 inline mr-1" />
                    Andar
                  </label>
                  <select
                    value={filtroAndar}
                    onChange={(e) => setFiltroAndar(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm font-medium transition-all"
                  >
                    <option value="">Todos</option>
                    {opcoesAndares.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

              </div>

              {filtrosAtivos > 0 && (
                <button
                  onClick={limparFiltros}
                  className="mt-4 flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-bold transition-colors"
                >
                  <X className="w-4 h-4" />
                  Limpar todos os filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* LOADING / EMPTY / CONTENT */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400 gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-sm font-medium">Carregando dados...</p>
          </div>
        ) : rawData.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-dashed border-gray-300">
            <div className="inline-flex p-5 bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl mb-6">
              <History className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Sem dados no período</h3>
            <p className="text-gray-500 mt-2 mb-8 max-w-md mx-auto">
              Não encontramos registros de {tipoAtivo === 'agua' ? 'água' : 'energia'} no período selecionado.
            </p>
            <Link 
              to="/leitura" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all"
            >
              Registrar Nova Leitura
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* CARDS DE KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total */}
              <div className={`relative overflow-hidden rounded-3xl p-6 ${
                tipoAtivo === 'agua' 
                  ? 'bg-gradient-to-br from-sky-500 to-blue-600' 
                  : 'bg-gradient-to-br from-amber-400 to-orange-500'
              } text-white shadow-xl`}>
                <div className="absolute -right-6 -top-6 opacity-20">
                  {tipoAtivo === 'agua' ? <Droplets size={100} /> : <Zap size={100} />}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">Consumo Total</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl md:text-4xl font-black">
                    {kpis.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </h3>
                  <span className="text-sm font-bold opacity-70">{unidadeMedida}</span>
                </div>
              </div>

              {/* Média */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Média/Dia</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl md:text-3xl font-black text-gray-900">
                    {kpis.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  </h3>
                  <span className="text-xs font-medium text-gray-400">{unidadeMedida}</span>
                </div>
              </div>

              {/* Pico */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Maior Pico</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl md:text-3xl font-black text-gray-900">
                    {kpis.maiorRegistro.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  </h3>
                  <span className="text-xs font-medium text-gray-400">{unidadeMedida}</span>
                </div>
              </div>

              {/* Registros */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-violet-100 rounded-xl">
                    <Activity className="w-4 h-4 text-violet-600" />
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Registros</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl md:text-3xl font-black text-gray-900">
                    {kpis.totalRegistros.toLocaleString('pt-BR')}
                  </h3>
                  <span className="text-xs font-medium text-gray-400">leituras</span>
                </div>
              </div>
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Gráfico de Tendência */}
              <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${tipoAtivo === 'agua' ? 'bg-sky-100' : 'bg-amber-100'}`}>
                      <TrendingUp className={`w-6 h-6 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Evolução do Consumo</h3>
                      <p className="text-xs text-gray-400">{dadosTendencia.length} dias com registro</p>
                    </div>
                  </div>
                </div>
                
                <div className="h-80 w-full">
                  {dadosTendencia.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dadosTendencia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorGradientArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={themeColor} stopOpacity={0.4}/>
                            <stop offset="100%" stopColor={themeColor} stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis 
                          dataKey="dataFormatada" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 500}} 
                          dy={10}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 500}}
                          tickFormatter={(v) => v.toLocaleString('pt-BR')}
                          width={60}
                        />
                        <Tooltip content={<CustomTooltip tipo={tipoAtivo} />} />
                        <Area 
                          type="monotone" 
                          dataKey="consumo" 
                          stroke={themeColor} 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorGradientArea)" 
                          activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff', fill: themeColor }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <p>Sem dados suficientes para o gráfico</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gráfico de Pizza */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2.5 rounded-xl ${tipoAtivo === 'agua' ? 'bg-sky-100' : 'bg-amber-100'}`}>
                    <Building className={`w-6 h-6 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Por Unidade</h3>
                    <p className="text-xs text-gray-400">{dadosPorUnidade.length} unidades</p>
                  </div>
                </div>
                
                <div className="h-80 w-full relative">
                  {dadosPorUnidade.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dadosPorUnidade}
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          cornerRadius={4}
                        >
                          {dadosPorUnidade.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [
                            `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidadeMedida}`,
                            'Consumo'
                          ]}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }} 
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={50} 
                          iconType="circle" 
                          iconSize={8} 
                          wrapperStyle={{ fontSize: '11px', fontWeight: 500 }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <p>Sem dados</p>
                    </div>
                  )}
                  
                  {/* Total no centro */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '50px' }}>
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total</span>
                      <div className="text-xl font-black text-gray-800">
                        {kpis.total >= 1000 
                          ? `${(kpis.total / 1000).toFixed(1)}k`
                          : kpis.total.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TOP MEDIDORES - Gráfico de Barras */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${tipoAtivo === 'agua' ? 'bg-sky-100' : 'bg-amber-100'}`}>
                    <AlertCircle className={`w-6 h-6 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Top 10 Maiores Consumidores</h3>
                    <p className="text-xs text-gray-400">Consumo total acumulado no período</p>
                  </div>
                </div>
              </div>
              
              <div className="h-96 w-full">
                {topMedidores.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={topMedidores} 
                      layout="vertical" 
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F3F4F6" />
                      <XAxis 
                        type="number" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 500}}
                        tickFormatter={(v) => v.toLocaleString('pt-BR')}
                      />
                      <YAxis 
                        dataKey="nome" 
                        type="category" 
                        width={150}
                        axisLine={false} 
                        tickLine={false}
                        tick={{fill: '#374151', fontSize: 11, fontWeight: 600}}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidadeMedida}`,
                          name === 'total' ? 'Total' : 'Média'
                        ]}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill={themeColor}
                        radius={[0, 8, 8, 0]}
                        barSize={24}
                      >
                        {topMedidores.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? themeColorDark : themeColor}
                            opacity={1 - (index * 0.06)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <p>Sem dados suficientes</p>
                  </div>
                )}
              </div>

              {/* NOVO GRÁFICO - POR ANDAR */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2.5 rounded-xl ${tipoAtivo === 'agua' ? 'bg-sky-100' : 'bg-amber-100'}`}>
                    <Layers className={`w-6 h-6 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Consumo por Andar</h3>
                    <p className="text-xs text-gray-400">{dadosPorAndar.length} andares</p>
                  </div>
                </div>
                <div className="h-96 w-full">
                  {dadosPorAndar.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dadosPorAndar}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={80}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#374151', fontSize: 11, fontWeight: 600 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                          content={<CustomTooltip tipo={tipoAtivo} />}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                          {dadosPorAndar.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={pieColors[index % pieColors.length]}
                            />
                          ))}
                          <LabelList 
                            dataKey="value" 
                            position="right" 
                            formatter={(v) => v.toLocaleString('pt-BR')}
                            style={{ fill: '#374151', fontSize: '11px', fontWeight: 'bold' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <p>Sem dados</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabela complementar */}
              {topMedidores.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">#</th>
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Medidor</th>
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Unidade</th>
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Registros</th>
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Média</th>
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {topMedidores.slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              idx === 0 ? 'bg-amber-100 text-amber-700' :
                              idx === 1 ? 'bg-gray-200 text-gray-600' :
                              idx === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-gray-700 text-sm" title={item.nomeCompleto}>
                            {item.nome}
                          </td>
                          <td className="py-3">
                            <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600">
                              {item.unidade || 'Geral'}
                            </span>
                          </td>
                          <td className="py-3 text-right text-sm text-gray-500 font-medium">
                            {item.registros}
                          </td>
                          <td className="py-3 text-right text-sm text-gray-500 font-medium">
                            {item.media.toLocaleString('pt-BR')} {unidadeMedida}
                          </td>
                          <td className={`py-3 text-right font-bold ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`}>
                            {item.total.toLocaleString('pt-BR')} {unidadeMedida}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
