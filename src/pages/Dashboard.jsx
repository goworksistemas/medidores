import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts'
import { 
  Zap, Droplets, TrendingUp, Plus, History, 
  Calendar, MapPin, AlertCircle 
} from 'lucide-react'

// Cores do Tema
const COLORS_WATER = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#1D4ED8']
const COLORS_ENERGY = ['#EAB308', '#FACC15', '#FEF08A', '#854D0E', '#A16207']

export default function Dashboard() {
  const { tipoAtivo, setTipoAtivo } = useTheme()
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState([])
  
  // Estado para filtros de data (Padrão: últimos 30 dias)
  const [periodo] = useState(30) 

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      const view = tipoAtivo === 'agua' ? 'view_hidrometros_calculada' : 'view_energia_calculada'
      
      // Data de corte (X dias atrás)
      const dataCorte = new Date()
      dataCorte.setDate(dataCorte.getDate() - periodo)
      
      const { data, error } = await supabase
        .from(view)
        .select('identificador_relogio, consumo_calculado, data_real, unidade, andar')
        .gte('data_real', dataCorte.toISOString())
        .order('data_real', { ascending: true })

      if (error) {
        console.error('Erro ao buscar dados:', error)
      } else {
        // Filtra consumos negativos (viradas ou erros) e nulos
        const validos = data?.filter(d => d.consumo_calculado !== null && d.consumo_calculado >= 0) || []
        setRawData(validos)
      }
      setLoading(false)
    }

    fetchDashboard()
  }, [tipoAtivo, periodo])

  // --- PROCESSAMENTO DOS DADOS (Memoized) ---

  // 1. KPIs Gerais
  const kpis = useMemo(() => {
    const total = rawData.reduce((acc, curr) => acc + Number(curr.consumo_calculado), 0)
    const media = rawData.length > 0 ? total / periodo : 0 // Média por dia aproximada do período
    const maiorRegistro = rawData.length > 0 ? Math.max(...rawData.map(d => Number(d.consumo_calculado))) : 0
    return { total, media, maiorRegistro }
  }, [rawData, periodo])

  // 2. Gráfico de Tendência Diária (Agrupado por Dia)
  const dadosTendencia = useMemo(() => {
    const agrupado = rawData.reduce((acc, curr) => {
      const dataFormatada = new Date(curr.data_real).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (!acc[dataFormatada]) acc[dataFormatada] = 0
      acc[dataFormatada] += Number(curr.consumo_calculado)
      return acc
    }, {})
    
    return Object.entries(agrupado).map(([data, valor]) => ({
      data,
      consumo: Number(valor.toFixed(2))
    }))
  }, [rawData])

  // 3. Gráfico de Distribuição por Unidade (Pizza)
  const dadosPorUnidade = useMemo(() => {
    const agrupado = rawData.reduce((acc, curr) => {
      const unidade = curr.unidade || 'Sem Unidade'
      if (!acc[unidade]) acc[unidade] = 0
      acc[unidade] += Number(curr.consumo_calculado)
      return acc
    }, {})

    return Object.entries(agrupado)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value) // Ordena do maior para o menor
  }, [rawData])

  // 4. Top 5 Consumidores (Ranking)
  const topConsumidores = useMemo(() => {
    // Clona e ordena para não mutar o original
    return [...rawData]
      .sort((a, b) => b.consumo_calculado - a.consumo_calculado)
      .slice(0, 5)
      .map(d => ({
        nome: d.identificador_relogio,
        unidade: d.unidade,
        valor: d.consumo_calculado,
        data: new Date(d.data_real).toLocaleDateString('pt-BR')
      }))
  }, [rawData])

  // Configuração de Cores Dinâmica
  const themeColor = tipoAtivo === 'agua' ? '#3B82F6' : '#EAB308' // Blue-500 vs Yellow-500
  const gradientId = "colorGradient"
  const pieColors = tipoAtivo === 'agua' ? COLORS_WATER : COLORS_ENERGY

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-6 px-4 sm:py-12">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard de Consumo</h1>
            <p className="text-sm text-gray-600 mt-1">Análise estratégica dos últimos {periodo} dias</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Seletor de Tipo */}
            <div className="inline-flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-200">
              <button
                onClick={() => setTipoAtivo('agua')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm ${
                  tipoAtivo === 'agua'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Droplets className="w-4 h-4" /> Água
              </button>
              <button
                onClick={() => setTipoAtivo('energia')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm ${
                  tipoAtivo === 'energia'
                    ? 'bg-yellow-400 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Zap className="w-4 h-4" /> Energia
              </button>
            </div>

            {/* Links Rápidos */}
            <div className="hidden md:flex gap-2">
              <Link to="/" className="p-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 border border-gray-200 shadow-sm transition-transform hover:scale-105" title="Nova Leitura">
                <Plus className="w-5 h-5" />
              </Link>
              <Link to="/historico" className="p-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 border border-gray-200 shadow-sm transition-transform hover:scale-105" title="Histórico">
                <History className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
           <div className="flex items-center justify-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
           </div>
        ) : rawData.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm">
            <p className="text-gray-400">Nenhum dado encontrado nos últimos {periodo} dias.</p>
            <Link to="/" className="text-blue-500 hover:underline mt-2 inline-block">Registrar primeira leitura</Link>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. CARDS DE KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Total */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden group">
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${tipoAtivo === 'agua' ? 'text-blue-500' : 'text-yellow-500'}`}>
                  {tipoAtivo === 'agua' ? <Droplets size={80} /> : <Zap size={80} />}
                </div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Consumo Total (30 dias)</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {kpis.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  <span className="text-sm font-normal text-gray-400 ml-1">{tipoAtivo === 'agua' ? 'm³' : 'kWh'}</span>
                </h3>
              </div>

              {/* Card Média */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-500">Média Diária Estimada</p>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">
                  {kpis.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  <span className="text-sm font-normal text-gray-400 ml-1">/ dia</span>
                </h3>
              </div>

              {/* Card Pico */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-500">Maior Pico Registrado</p>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">
                  {kpis.maiorRegistro.toLocaleString('pt-BR')}
                  <span className="text-sm font-normal text-gray-400 ml-1">un.</span>
                </h3>
              </div>
            </div>

            {/* 2. GRÁFICOS PRINCIPAIS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Gráfico de Área (Tendência) - Ocupa 2 colunas */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                  Evolução do Consumo Diário
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dadosTendencia}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={themeColor} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="data" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#9CA3AF', fontSize: 12}} 
                        dy={10}
                        minTickGap={30}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#9CA3AF', fontSize: 12}} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#374151', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="consumo" 
                        stroke={themeColor} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill={`url(#${gradientId})`} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Pizza (Distribuição por Unidade) */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  Consumo por Unidade
                </h3>
                <div className="h-80 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosPorUnidade}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dadosPorUnidade.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Total no centro */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                    <div className="text-center">
                      <span className="text-xs text-gray-400 font-semibold uppercase">Total</span>
                      <div className="text-xl font-bold text-gray-800">
                        {kpis.total.toLocaleString('pt-BR', { notation: "compact" })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. RANKING (Top 5) */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Top 5 - Maiores Registros do Mês</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Relógio</th>
                      <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Local</th>
                      <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                      <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Consumo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topConsumidores.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 font-medium text-gray-700">{item.nome}</td>
                        <td className="py-4 text-sm text-gray-500">
                          <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium">
                            {item.unidade || 'Geral'}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-gray-500">{item.data}</td>
                        <td className={`py-4 text-right font-bold ${tipoAtivo === 'agua' ? 'text-blue-600' : 'text-yellow-600'}`}>
                          {item.valor}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}