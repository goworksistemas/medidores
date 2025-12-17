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
  Calendar, MapPin, AlertCircle, ArrowUpRight 
} from 'lucide-react'

// Cores do Tema
const COLORS_WATER = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#1D4ED8']
const COLORS_ENERGY = ['#EAB308', '#FACC15', '#FEF08A', '#854D0E', '#A16207']

export default function Dashboard() {
  const { tipoAtivo, setTipoAtivo } = useTheme()
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState([])
  
  // Período de análise (30 dias padrão)
  const [periodo] = useState(30) 

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      
      // Define tabela e coluna de consumo baseada no tipo
      const tabela = tipoAtivo === 'agua' ? 'hidrometros' : 'energia'
      const colunaConsumo = tipoAtivo === 'agua' ? 'gasto_diario' : 'variacao'
      const colunaData = 'apenas_data' // ou data_hora se preferir precisão
      
      // Data de corte (X dias atrás)
      const dataCorte = new Date()
      dataCorte.setDate(dataCorte.getDate() - periodo)
      const dataCorteStr = dataCorte.toISOString().split('T')[0]
      
      // Busca dados diretos (Muito mais rápido que view)
      const { data, error } = await supabase
        .from(tabela)
        .select(`identificador_relogio, ${colunaConsumo}, data_hora, unidade, andar`)
        .gte('data_hora', `${dataCorteStr}T00:00:00`)
        .order('data_hora', { ascending: true })

      if (error) {
        console.error('Erro ao buscar dados:', error)
      } else {
        // Padroniza o nome da coluna de valor para "valor"
        const dadosFormatados = data?.map(d => ({
          ...d,
          valor: Number(d[colunaConsumo]) || 0, // Garante número
          data: d.data_hora
        })).filter(d => d.valor >= 0) || [] // Filtra erros negativos

        setRawData(dadosFormatados)
      }
      setLoading(false)
    }

    fetchDashboard()
  }, [tipoAtivo, periodo])

  // --- PROCESSAMENTO (MEMOIZED) ---

  // 1. KPIs Gerais
  const kpis = useMemo(() => {
    const total = rawData.reduce((acc, curr) => acc + curr.valor, 0)
    const media = rawData.length > 0 ? total / periodo : 0 // Média diária aprox
    const maiorRegistro = rawData.length > 0 ? Math.max(...rawData.map(d => d.valor)) : 0
    return { total, media, maiorRegistro }
  }, [rawData, periodo])

  // 2. Tendência Diária (Agrupado por Data)
  const dadosTendencia = useMemo(() => {
    const agrupado = rawData.reduce((acc, curr) => {
      const dataFormatada = new Date(curr.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (!acc[dataFormatada]) acc[dataFormatada] = 0
      acc[dataFormatada] += curr.valor
      return acc
    }, {})
    
    return Object.entries(agrupado).map(([data, valor]) => ({
      data,
      consumo: Number(valor.toFixed(2))
    }))
  }, [rawData])

  // 3. Distribuição por Unidade (Pizza)
  const dadosPorUnidade = useMemo(() => {
    const agrupado = rawData.reduce((acc, curr) => {
      const unidade = curr.unidade || 'Sem Unidade'
      if (!acc[unidade]) acc[unidade] = 0
      acc[unidade] += curr.valor
      return acc
    }, {})

    return Object.entries(agrupado)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
  }, [rawData])

  // 4. Ranking Top 5 (Individuais)
  const topConsumidores = useMemo(() => {
    return [...rawData]
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
      .map(d => ({
        nome: d.identificador_relogio,
        unidade: d.unidade,
        valor: d.valor,
        data: new Date(d.data).toLocaleDateString('pt-BR')
      }))
  }, [rawData])

  // Config Cores
  const themeColor = tipoAtivo === 'agua' ? '#3B82F6' : '#EAB308'
  const gradientId = "colorGradient"
  const pieColors = tipoAtivo === 'agua' ? COLORS_WATER : COLORS_ENERGY

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Gerencial</h1>
            <p className="text-sm text-gray-500">Panorama dos últimos {periodo} dias</p>
          </div>
          
          <div className="inline-flex bg-white rounded-xl p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setTipoAtivo('agua')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tipoAtivo === 'agua' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Droplets className="w-4 h-4" /> Água
            </button>
            <button
              onClick={() => setTipoAtivo('energia')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tipoAtivo === 'energia' ? 'bg-yellow-400 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Zap className="w-4 h-4" /> Energia
            </button>
          </div>
        </div>

        {/* LOADING */}
        {loading ? (
           <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
             <p className="text-sm">Carregando indicadores...</p>
           </div>
        ) : rawData.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-dashed border-gray-300">
            <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
              <History className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Sem dados recentes</h3>
            <p className="text-gray-500 mt-1 mb-6">Nenhuma leitura encontrada nos últimos 30 dias.</p>
            <Link to="/leitura" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Registrar Nova Leitura
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. CARDS DE KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className={`absolute -right-4 -top-4 opacity-10 ${tipoAtivo === 'agua' ? 'text-blue-500' : 'text-yellow-500'}`}>
                  {tipoAtivo === 'agua' ? <Droplets size={100} /> : <Zap size={100} />}
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Consumo Total</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-3xl font-bold text-gray-900">
                    {kpis.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </h3>
                  <span className="text-sm font-medium text-gray-500">{tipoAtivo === 'agua' ? 'm³' : 'kWh'}</span>
                </div>
              </div>

              {/* Média */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Média Diária (Est.)</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-3xl font-bold text-gray-900">
                    {kpis.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  </h3>
                  <span className="text-sm font-medium text-gray-500">/ dia</span>
                </div>
              </div>

              {/* Pico */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="w-4 h-4 text-red-500" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Maior Pico</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-3xl font-bold text-gray-900">
                    {kpis.maiorRegistro.toLocaleString('pt-BR')}
                  </h3>
                  <span className="text-sm font-medium text-gray-500">un.</span>
                </div>
              </div>
            </div>

            {/* 2. GRÁFICOS PRINCIPAIS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Gráfico de Tendência (2/3 da tela) */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                  Evolução Diária
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dadosTendencia}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={themeColor} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis 
                        dataKey="data" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#9CA3AF', fontSize: 11}} 
                        dy={10}
                        minTickGap={30}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#9CA3AF', fontSize: 11}} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#374151', fontWeight: 'bold' }}
                        cursor={{ stroke: themeColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="consumo" 
                        stroke={themeColor} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill={`url(#${gradientId})`} 
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Pizza (1/3 da tela) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  Por Unidade
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
                        cornerRadius={6}
                      >
                        {dadosPorUnidade.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Total no centro */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total</span>
                      <div className="text-xl font-bold text-gray-800">
                        {kpis.total.toLocaleString('pt-BR', { notation: "compact" })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. RANKING (Top 5) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                Maiores Registros (Top 5)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Relógio</th>
                      <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Local</th>
                      <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                      <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Consumo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topConsumidores.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 font-medium text-gray-700">{item.nome}</td>
                        <td className="py-4 text-sm text-gray-500">
                          <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium border border-gray-200">
                            {item.unidade || 'Geral'}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-gray-500">{item.data}</td>
                        <td className={`py-4 text-right font-bold ${tipoAtivo === 'agua' ? 'text-blue-600' : 'text-yellow-600'}`}>
                          {item.valor.toLocaleString('pt-BR')}
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