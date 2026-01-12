import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import { 
  AreaChart, Area, BarChart, Bar, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts'
import { 
  Zap, Droplets, TrendingUp, History, 
  Calendar, MapPin, AlertCircle, ArrowUpRight, Filter, Building, Layers, X, ChevronDown, Activity, BarChart3
} from 'lucide-react'

// Cores do Tema - Paleta profissional
const COLORS_WATER = ['#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD', '#0284C7', '#0369A1']
const COLORS_ENERGY = ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#D97706', '#B45309']

// Opções de período predefinido (máximo 30 dias)
const PERIODOS_OPCOES = [
  { value: 7, label: 'Últimos 7 dias' },
  { value: 15, label: 'Últimos 15 dias' },
  { value: 30, label: 'Últimos 30 dias' },
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

// Tooltip customizado para Top Medidores
const CustomTooltipTopMedidores = ({ active, payload, label, tipo }) => {
  if (active && payload && payload.length) {
    const unidade = tipo === 'agua' ? 'm³' : 'kWh'
    const item = payload[0]?.payload
    
    return (
      <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border border-gray-200">
        <p className="text-sm font-bold text-gray-900 mb-2">{label}</p>
        {item && (
          <div className="text-xs text-gray-600 space-y-1">
            <p><span className="font-semibold">Unidade:</span> {item.unidade}</p>
            <p><span className="font-semibold">Andar:</span> {item.andar}</p>
          </div>
        )}
        <p className="text-lg font-bold mt-2" style={{ color: payload[0].color }}>
          {Number(payload[0].value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-sm font-medium text-gray-400">{unidade}</span>
        </p>
      </div>
    )
  }
  return null
}

// Tooltip customizado para Consumo por Andar
const CustomTooltipPorAndar = ({ active, payload, label, tipo }) => {
  if (active && payload && payload.length) {
    const unidade = tipo === 'agua' ? 'm³' : 'kWh'
    const item = payload[0]?.payload
    
    return (
      <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border border-gray-200">
        <p className="text-sm font-bold text-gray-900 mb-2">{label}</p>
        {item && item.unidade && (
          <div className="text-xs text-gray-600 mb-2">
            <p><span className="font-semibold">Unidade:</span> {item.unidade}</p>
          </div>
        )}
        <p className="text-lg font-bold mt-2" style={{ color: payload[0].color }}>
          {Number(payload[0].value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-sm font-medium text-gray-400">{unidade}</span>
        </p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { tipoAtivo, setTipoAtivo, dataVersion } = useTheme()
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

  // Calcula datas baseado no período (períodos predefinidos limitados a 30 dias)
  const { dataCorteStr, dataFimStr } = useMemo(() => {
    const hoje = new Date()
    
    if (periodo === 0 && dataInicio && dataFim) {
      // Período personalizado - sem limite
      return { dataCorteStr: dataInicio, dataFimStr: dataFim }
    }
    
    // Limita período predefinido a máximo 30 dias
    const periodoLimitado = Math.min(periodo || 30, 30)
    const dataCorte = new Date()
    dataCorte.setDate(dataCorte.getDate() - periodoLimitado)
    
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
            // Apenas considera consumos positivos. Em caso de "virada" do medidor, o consumo é a leitura atual.
            if (consumoCalculado >= 0) {
              consumo = consumoCalculado;
            } else {
              consumo = Number(leituraAtual.leitura);
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
        .eq('tipo', tipoAtivo)
        .or('ativo.is.null,ativo.eq.true'); // Apenas medidores ativos

      if (data) {
        const unidades = [...new Set(data.map(d => d.local_unidade).filter(Boolean))].sort();
        const andares = [...new Set(data.map(d => d.andar).filter(Boolean))].sort();
        setOpcoesUnidades(unidades);
        setOpcoesAndares(andares);
      }
    }
    fetchDashboard()
    fetchFilterOptions()
  }, [tipoAtivo, dataCorteStr, dataFimStr, dataVersion])

  // Aplica filtros
  const rawData = useMemo(() => {
    let dados = allData
    if (filtroUnidade && filtroUnidade.trim() !== '') {
      dados = dados.filter(d => {
        const unidade = d.local_unidade || ''
        return unidade.trim() === filtroUnidade.trim()
      })
    }
    if (filtroAndar && filtroAndar.trim() !== '') {
      dados = dados.filter(d => {
        const andar = d.andar || ''
        return andar.trim() === filtroAndar.trim()
      })
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

  // Agrupa dados por mês e cria lista de meses disponíveis
  const { dadosPorMes, mesesDisponiveis } = useMemo(() => {
    const agrupadoPorMes = {}
    
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
      
      // Cria chave no formato YYYY-MM para agrupar por mês
      const anoMes = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}`
      const dia = dataObj.toISOString().split('T')[0]
      
      if (!agrupadoPorMes[anoMes]) {
        agrupadoPorMes[anoMes] = {}
      }
      
      if (!agrupadoPorMes[anoMes][dia]) {
        agrupadoPorMes[anoMes][dia] = { total: 0, count: 0 }
      }
      
      agrupadoPorMes[anoMes][dia].total += curr.consumo
      agrupadoPorMes[anoMes][dia].count += 1
    })
    
    // Cria lista de meses ordenados
    const meses = Object.keys(agrupadoPorMes).sort()
    
    // Processa dados de cada mês
    const dadosProcessados = meses.map(anoMes => {
      const diasDoMes = Object.entries(agrupadoPorMes[anoMes])
        .map(([data, info]) => ({
          data,
          dataFormatada: new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          consumo: Number(info.total.toFixed(2)),
          registros: info.count
        }))
        .sort((a, b) => a.data.localeCompare(b.data))
      
      return {
        anoMes,
        label: new Date(anoMes + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        dias: diasDoMes
      }
    })
    
    return {
      dadosPorMes: dadosProcessados,
      mesesDisponiveis: meses
    }
  }, [rawData])

  // Dados de todos os meses para exibição com rolagem lateral
  const dadosTendencia = useMemo(() => {
    if (dadosPorMes.length === 0) return []
    
    // Concatena todos os dias de todos os meses em uma única lista
    const todosOsDias = []
    dadosPorMes.forEach(mes => {
      todosOsDias.push(...mes.dias)
    })
    
    return todosOsDias
  }, [dadosPorMes])

  // Distribuição por Unidade - sem truncamento
  const dadosPorUnidade = useMemo(() => {
    const agrupado = {}

    rawData.forEach(curr => {
      const unidade = curr.local_unidade || 'Outros'
      if (!agrupado[unidade]) agrupado[unidade] = 0
      agrupado[unidade] += curr.consumo
    })

    return Object.entries(agrupado)
      .map(([name, value]) => ({ 
        name: name, // Nome completo sem truncamento
        fullName: name,
        value: Number(value.toFixed(2)) 
      }))
      .sort((a, b) => b.value - a.value)
  }, [rawData])

  // Distribuição por Andar (NOVO GRÁFICO)
  const dadosPorAndar = useMemo(() => {
    const agrupado = {};
    rawData.forEach(curr => {
      const andar = curr.andar || 'N/A';
      const unidade = curr.local_unidade || 'Sem unidade';
      
      // Chave única para agrupar por andar (pode haver andares com mesmo nome em unidades diferentes)
      const chave = `${unidade}|${andar}`;
      
      if (!agrupado[chave]) {
        agrupado[chave] = {
          andar: andar,
          unidade: unidade,
          value: 0
        };
      }
      agrupado[chave].value += curr.consumo;
    });

    return Object.entries(agrupado)
      .map(([chave, info]) => ({ 
        name: info.andar, // Mostra apenas o nome do andar
        andar: info.andar,
        unidade: info.unidade,
        value: Number(info.value.toFixed(2)) 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8
  }, [rawData]);

  // Distribuição por Andar agrupado por Unidade (um gráfico por unidade)
  const dadosPorAndarPorUnidade = useMemo(() => {
    // rawData já está filtrado por unidade e andar, então apenas agrupamos
    const agrupadoPorUnidade = {};
    
    // Se não há dados filtrados, retorna array vazio
    if (!rawData || rawData.length === 0) {
      return [];
    }
    
    rawData.forEach(curr => {
      const andar = curr.andar || 'N/A';
      const unidade = curr.local_unidade || 'Sem unidade';
      
      // Garante que apenas dados válidos sejam processados
      if (!unidade || unidade.trim() === '') {
        return;
      }
      
      if (!agrupadoPorUnidade[unidade]) {
        agrupadoPorUnidade[unidade] = {};
      }
      
      if (!agrupadoPorUnidade[unidade][andar]) {
        agrupadoPorUnidade[unidade][andar] = 0;
      }
      
      agrupadoPorUnidade[unidade][andar] += curr.consumo || 0;
    });

    // Converte para array de unidades, cada uma com seus andares
    // Filtra unidades que não têm dados (importante para quando há filtros)
    return Object.entries(agrupadoPorUnidade)
      .map(([unidade, andares]) => {
        const dadosAndares = Object.entries(andares)
          .filter(([andar, value]) => value > 0) // Remove andares com consumo zero
          .map(([andar, value]) => ({
            name: andar,
            andar: andar,
            unidade: unidade,
            value: Number(value.toFixed(2))
          }))
          .sort((a, b) => b.value - a.value);
        
        return {
          unidade: unidade,
          dados: dadosAndares
        };
      })
      .filter(unidadeData => unidadeData.dados.length > 0 && unidadeData.dados.some(d => d.value > 0)) // Remove unidades sem dados válidos
      .sort((a, b) => {
        // Ordena por total de consumo da unidade (soma de todos os andares)
        const totalA = a.dados.reduce((sum, item) => sum + item.value, 0);
        const totalB = b.dados.reduce((sum, item) => sum + item.value, 0);
        return totalB - totalA;
      });
  }, [rawData]);

  // Top Medidores (agrupado) com hierarquia: Unidade > Andar > Relógio
  const topMedidores = useMemo(() => {
    const agrupado = {}
    
    rawData.forEach(curr => {
      const nome = curr.nomeMedidor
      const unidade = curr.local_unidade || 'Sem unidade'
      const andar = curr.andar || 'Sem andar'
      
      // Chave única para agrupar por medidor
      const chave = `${unidade}|${andar}|${nome}`
      
      if (!agrupado[chave]) {
        agrupado[chave] = { 
          total: 0, 
          count: 0, 
          unidade: unidade,
          andar: andar,
          nomeMedidor: nome
        }
      }
      agrupado[chave].total += curr.consumo
      agrupado[chave].count += 1
    })

    return Object.entries(agrupado)
      .map(([chave, info]) => ({
        nome: info.nomeMedidor, // Mostra apenas o nome do relógio
        nomeCompleto: `${info.unidade} > ${info.andar} > ${info.nomeMedidor}`,
        nomeMedidor: info.nomeMedidor,
        unidade: info.unidade,
        andar: info.andar,
        total: Number(info.total.toFixed(2)),
        media: Number((info.total / info.count).toFixed(2)),
        registros: info.count
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

        {/* CARDS PRINCIPAIS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Consumo Total */}
          <div className={`relative overflow-hidden rounded-3xl p-4 sm:p-6 shadow-xl md:col-span-2 lg:col-span-1 ${
            tipoAtivo === 'agua' 
              ? 'bg-gradient-to-br from-sky-500 to-blue-600' 
              : 'bg-gradient-to-br from-amber-400 to-orange-500'
          } text-white`}>
            <div className="absolute -right-4 -top-4 sm:-right-6 sm:-top-6 opacity-20">
              {tipoAtivo === 'agua' ? <Droplets size={60} className="sm:hidden" /> : <Zap size={60} className="sm:hidden" />}
              {tipoAtivo === 'agua' ? <Droplets size={100} className="hidden sm:block" /> : <Zap size={100} className="hidden sm:block" />}
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-80 mb-1 sm:mb-2">Consumo Total</p>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-xl sm:text-3xl md:text-4xl font-black">
                {kpis.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </h3>
              <span className="text-[10px] sm:text-sm font-bold opacity-70">{unidadeMedida}</span>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className={`w-5 h-5 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
              <h3 className="text-sm font-bold text-gray-800">Estatísticas</h3>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Média Diária</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900">
                {kpis.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                <span className="text-xs font-medium text-gray-500 ml-1">{unidadeMedida}/dia</span>
              </p>
            </div>
          </div>
          
          {/* Registros */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className={`w-5 h-5 ${tipoAtivo === 'agua' ? 'text-blue-600' : 'text-amber-600'}`} />
              <h3 className="text-sm font-bold text-gray-800">Registros</h3>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl sm:text-2xl font-black text-blue-700">
                {kpis.totalRegistros.toLocaleString('pt-BR')}
                <span className="text-xs font-medium text-blue-600 ml-1">leituras</span>
              </p>
            </div>
          </div>
          
          {/* Maior Pico */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className={`w-5 h-5 ${tipoAtivo === 'agua' ? 'text-emerald-600' : 'text-orange-600'}`} />
              <h3 className="text-sm font-bold text-gray-800">Maior Pico</h3>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Consumo</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700">
                {kpis.maiorRegistro.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                <span className="text-xs font-medium text-emerald-600 ml-1">{unidadeMedida}</span>
              </p>
            </div>
          </div>
          
          {/* Período */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className={`w-5 h-5 ${tipoAtivo === 'agua' ? 'text-purple-600' : 'text-pink-600'}`} />
              <h3 className="text-sm font-bold text-gray-800">Período</h3>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Dias Ativos</p>
              <p className="text-xl sm:text-2xl font-black text-purple-700">
                {dadosTendencia.length > 0 ? dadosTendencia.length : 0}
                <span className="text-xs font-medium text-purple-600 ml-1">dias</span>
              </p>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="w-full bg-white rounded-3xl shadow-sm border border-gray-200/50 overflow-hidden">
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
              <div className={`grid gap-4 w-full ${periodo === 0 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} auto-rows-fr`}>
                
                {/* Período */}
                <div className="w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Período</label>
                  <select
                    value={periodo}
                    onChange={(e) => {
                      const novoPeriodo = Number(e.target.value)
                      setPeriodo(novoPeriodo)
                      // Limpa datas personalizadas quando seleciona período predefinido
                      if (novoPeriodo !== 0) {
                        setDataInicio('')
                        setDataFim('')
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm font-medium transition-all"
                  >
                    {PERIODOS_OPCOES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {periodo !== 0 && (
                    <p className="text-[10px] text-gray-400 mt-1">Máximo: 30 dias</p>
                  )}
                </div>

                {periodo === 0 && (
                  <>
                    <div className="w-full">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">De</label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        max={dataFim || undefined}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm font-medium transition-all"
                      />
                    </div>
                    <div className="w-full">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Até</label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        min={dataInicio || undefined}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm font-medium transition-all"
                      />
                    </div>
                  </>
                )}

                <div className="w-full">
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

                <div className="w-full">
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
            
            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 gap-6 xl:gap-8">
              
              {/* Gráfico de Barras - Evolução Mensal */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${tipoAtivo === 'agua' ? 'bg-sky-100' : 'bg-amber-100'}`}>
                      <BarChart3 className={`w-5 h-5 sm:w-6 sm:h-6 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-800">Evolução do Consumo Diário</h3>
                      <p className="text-xs text-gray-400">
                        {dadosTendencia.length > 0 
                          ? `Consumo por dia • ${dadosTendencia.length} ${dadosTendencia.length === 1 ? 'dia registrado' : 'dias registrados'} • Role horizontalmente para ver todos`
                          : 'Carregando dados...'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="h-64 sm:h-80 w-full overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400" style={{ scrollbarWidth: 'thin' }}>
                  {dadosTendencia.length > 0 ? (
                    <div className="min-w-full" style={{ minWidth: `${Math.max(600, dadosTendencia.length * 50)}px` }}>
                      <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                        <BarChart data={dadosTendencia} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis 
                            dataKey="dataFormatada" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 500}} 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 500}}
                            tickFormatter={(v) => v.toLocaleString('pt-BR')}
                            width={50}
                          />
                          <Tooltip content={<CustomTooltip tipo={tipoAtivo} />} />
                          <Bar 
                            dataKey="consumo" 
                            fill={themeColor}
                            radius={[8, 8, 0, 0]}
                            barSize={dadosTendencia.length > 15 ? 30 : 40}
                          >
                            {dadosTendencia.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={themeColor}
                                opacity={0.9}
                              />
                            ))}
                            <LabelList 
                              dataKey="consumo" 
                              position="top" 
                              formatter={(v) => v > 0 ? `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}` : ''}
                              style={{ fill: '#374151', fontSize: '9px', fontWeight: 'bold' }}
                              offset={5}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <p className="text-sm">Sem dados suficientes para o gráfico</p>
                    </div>
                  )}
                </div>
                
                {/* Indicador de scroll */}
                {dadosTendencia.length > 12 && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
                      <span>←</span>
                      <span>Role horizontalmente para ver todos os dias</span>
                      <span>→</span>
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* GRÁFICOS DE BARRAS - TOP MEDIDORES E POR UNIDADE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
              
              {/* TOP MEDIDORES - Gráfico de Barras */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${tipoAtivo === 'agua' ? 'bg-sky-100' : 'bg-amber-100'}`}>
                      <AlertCircle className={`w-5 h-5 sm:w-6 sm:h-6 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-800">Top 10 Maiores Consumidores</h3>
                      <p className="text-xs text-gray-400">Medidores com maior consumo total no período selecionado</p>
                    </div>
                  </div>
                </div>
                
                <div className="h-80 sm:h-96 w-full">
                  {topMedidores.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={topMedidores} 
                        layout="vertical" 
                        margin={{ top: 5, right: 80, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F3F4F6" />
                        <XAxis 
                          type="number" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 500}}
                          tickFormatter={(v) => v.toLocaleString('pt-BR')}
                        />
                        <YAxis 
                          dataKey="nome" 
                          type="category" 
                          width={150}
                          axisLine={false} 
                          tickLine={false}
                          tick={{fill: '#374151', fontSize: 10, fontWeight: 600}}
                          interval={0}
                        />
                        <Tooltip 
                          content={<CustomTooltipTopMedidores tipo={tipoAtivo} />}
                        />
                        <Bar 
                          dataKey="total" 
                          fill={themeColor}
                          radius={[0, 8, 8, 0]}
                          barSize={22}
                        >
                          {topMedidores.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={index === 0 ? themeColorDark : themeColor}
                              opacity={1 - (index * 0.06)}
                            />
                          ))}
                          <LabelList 
                            dataKey="total" 
                            position="right" 
                            formatter={(v) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidadeMedida}`}
                            style={{ fill: '#374151', fontSize: '10px', fontWeight: 'bold' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <p className="text-sm">Sem dados suficientes</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gráfico de Barras - Por Unidade */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className={`p-2.5 rounded-xl ${tipoAtivo === 'agua' ? 'bg-sky-100' : 'bg-amber-100'}`}>
                    <Building className={`w-5 h-5 sm:w-6 sm:h-6 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">Por Unidade</h3>
                    <p className="text-xs text-gray-400">{dadosPorUnidade.length} unidades</p>
                  </div>
                </div>
                
                <div className="h-80 sm:h-96 w-full">
                  {dadosPorUnidade.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dadosPorUnidade}
                        layout="vertical"
                        margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F3F4F6" />
                        <XAxis 
                          type="number" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 500}}
                          tickFormatter={(v) => v.toLocaleString('pt-BR')}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={80}
                          axisLine={false} 
                          tickLine={false}
                          tick={{fill: '#374151', fontSize: 10, fontWeight: 600}}
                        />
                        <Tooltip 
                          formatter={(value) => [
                            `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidadeMedida}`,
                            'Consumo'
                          ]}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
                          labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[0, 8, 8, 0]} 
                          barSize={20}
                        >
                          {dadosPorUnidade.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={pieColors[index % pieColors.length]}
                            />
                          ))}
                          <LabelList 
                            dataKey="value" 
                            position="right" 
                            formatter={(v) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidadeMedida}`}
                            style={{ fill: '#374151', fontSize: '10px', fontWeight: 'bold' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <p className="text-sm">Sem dados</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Tabela complementar */}
            {topMedidores.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-6">
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100 overflow-x-auto">
                  <div className="min-w-full">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">#</th>
                          <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Hierarquia</th>
                          <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Unidade</th>
                          <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Andar</th>
                          <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Relógio</th>
                          <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider text-right hidden xl:table-cell">Registros</th>
                          <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider text-right hidden lg:table-cell">Média</th>
                          <th className="pb-2 sm:pb-3 px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {topMedidores.slice(0, 5).map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-2 sm:py-3 px-2 sm:px-4">
                              <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold ${
                                idx === 0 ? 'bg-amber-100 text-amber-700' :
                                idx === 1 ? 'bg-gray-200 text-gray-600' :
                                idx === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm" title={item.nomeCompleto}>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400">{item.unidade}</span>
                                <span className="text-[10px] text-gray-500">{item.andar}</span>
                                <span className="font-bold">{item.nomeMedidor}</span>
                              </div>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">
                              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] sm:text-xs font-semibold">
                                {item.unidade || 'Sem unidade'}
                              </span>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 hidden md:table-cell">
                              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-purple-50 text-purple-700 rounded-lg text-[10px] sm:text-xs font-semibold">
                                {item.andar || 'Sem andar'}
                              </span>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 hidden lg:table-cell">
                              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded-lg text-[10px] sm:text-xs font-semibold">
                                {item.nomeMedidor}
                              </span>
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm text-gray-500 font-medium hidden xl:table-cell">
                              {item.registros}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm text-gray-500 font-medium hidden lg:table-cell">
                              {item.media.toLocaleString('pt-BR')} {unidadeMedida}
                            </td>
                            <td className={`py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-bold ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`}>
                              {item.total.toLocaleString('pt-BR')} {unidadeMedida}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* GRÁFICOS DE BARRAS VERTICAIS POR UNIDADE - CONSUMO POR ANDAR */}
            {dadosPorAndarPorUnidade.length > 0 && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${tipoAtivo === 'agua' ? 'bg-sky-100' : 'bg-amber-100'}`}>
                      <BarChart3 className={`w-5 h-5 sm:w-6 sm:h-6 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-800">Consumo por Andar - Por Unidade</h3>
                      <p className="text-xs text-gray-400">{dadosPorAndarPorUnidade.length} unidades • Role horizontalmente para ver todas</p>
                    </div>
                  </div>
                </div>
                
                {/* Carrossel horizontal de gráficos */}
                <div className="w-full overflow-x-auto pb-2">
                  <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
                    {dadosPorAndarPorUnidade.map((unidadeData, unidadeIndex) => {
                    const totalUnidade = unidadeData.dados.reduce((sum, item) => sum + item.value, 0);
                    const alturaGrafico = unidadeData.dados.length > 8 ? 'h-[400px]' : 'h-80';
                    const barSize = unidadeData.dados.length > 10 ? 25 : unidadeData.dados.length > 6 ? 35 : 45;
                    const marginBottom = unidadeData.dados.length > 6 ? 80 : 60;
                    const fontSizeXAxis = unidadeData.dados.length > 8 ? 9 : 10;
                    const fontSizeLabel = unidadeData.dados.length > 8 ? '12px' : '13px';
                    const angleXAxis = unidadeData.dados.length > 6 ? -45 : -30;
                    
                    return (
                      <div 
                        key={unidadeIndex} 
                        className="flex-shrink-0 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-5 sm:p-6"
                        style={{ width: '600px' }}
                      >
                        {/* Header do gráfico da unidade */}
                        <div className="mb-4 sm:mb-5">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-xl ${tipoAtivo === 'agua' ? 'bg-sky-100' : 'bg-amber-100'}`}>
                              <Building className={`w-4 h-4 sm:w-5 sm:h-5 ${tipoAtivo === 'agua' ? 'text-sky-600' : 'text-amber-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm sm:text-base font-bold text-gray-800 truncate" title={unidadeData.unidade}>
                                {unidadeData.unidade}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {unidadeData.dados.length} {unidadeData.dados.length === 1 ? 'andar' : 'andares'} • 
                                Total: {totalUnidade.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {unidadeMedida}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Gráfico de barras verticais */}
                        {unidadeData.dados.length > 0 ? (
                          <div className="w-full overflow-x-auto">
                            <div className={`${alturaGrafico}`} style={{ minWidth: `${Math.max(500, unidadeData.dados.length * 80)}px`, width: '100%' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={unidadeData.dados}
                                  margin={{ top: 20, right: 15, left: 10, bottom: marginBottom }}
                                >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis 
                                  dataKey="name"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{fill: '#9CA3AF', fontSize: fontSizeXAxis, fontWeight: 500}}
                                  angle={angleXAxis}
                                  textAnchor="end"
                                  height={marginBottom}
                                  interval={0}
                                />
                                <YAxis 
                                  type="number"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 500}}
                                  tickFormatter={(v) => v.toLocaleString('pt-BR')}
                                  width={60}
                                />
                                <Tooltip
                                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                  content={<CustomTooltipPorAndar tipo={tipoAtivo} />}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={barSize}>
                                  {unidadeData.dados.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={pieColors[index % pieColors.length]}
                                    />
                                  ))}
                                  <LabelList 
                                    dataKey="value" 
                                    position="top" 
                                    content={((barWidth) => (props) => {
                                      const { x, y, value, width, payload, index } = props
                                      if (!value || value === 0) return null
                                      const formattedValue = `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidadeMedida}`
                                      // No Recharts, para barras verticais com position="top",
                                      // o x representa a posição horizontal da barra
                                      // Precisamos calcular o centro considerando a largura real
                                      // Tenta usar width das props primeiro (mais preciso)
                                      let centerX = x
                                      if (width && width > 0) {
                                        // Se width está disponível, x é o início, então adiciona metade
                                        centerX = x + width / 2
                                      } else {
                                        // Se não, usa barSize como aproximação
                                        centerX = x + barWidth / 2
                                      }
                                      // Offset vertical para posicionar acima da barra
                                      const offsetY = -10
                                      return (
                                        <g transform={`translate(${centerX},${y + offsetY})`}>
                                          <text
                                            x={0}
                                            y={0}
                                            textAnchor="middle"
                                            fill="#374151"
                                            fontSize={fontSizeLabel}
                                            fontWeight="bold"
                                          >
                                            {formattedValue}
                                          </text>
                                        </g>
                                      )
                                    })(barSize)}
                                  />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                            </div>
                          </div>
                        ) : (
                          <div className="h-96 flex items-center justify-center text-gray-400">
                            <p className="text-sm">Sem dados de andares para esta unidade</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
