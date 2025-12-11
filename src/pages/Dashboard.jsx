import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Zap, Droplets, TrendingUp, Plus, History } from 'lucide-react'

export default function Dashboard() {
  const { tipoAtivo, setTipoAtivo } = useTheme() // 'agua' | 'energia'
  const [dadosGrafico, setDadosGrafico] = useState([])
  const [resumo, setResumo] = useState({ totalConsumo: 0, leiturasCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      const view = tipoAtivo === 'agua' ? 'view_hidrometros_calculada' : 'view_energia_calculada'
      
      // Busca os últimos 50 registros para calcular métricas
      const { data, error } = await supabase
        .from(view)
        .select('identificador_relogio, consumo_calculado, data_real')
        .order('data_real', { ascending: false })
        .limit(100)

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      // 1. Calcula totais (Ignorando viradas negativas para soma)
      const validos = data.filter(d => d.consumo_calculado >= 0)
      const total = validos.reduce((acc, curr) => acc + Number(curr.consumo_calculado), 0)
      
      setResumo({
        totalConsumo: total,
        leiturasCount: data.length
      })

      // 2. Prepara dados para o gráfico (Top 10 maiores consumos recentes)
      // Agrupa por relógio apenas para visualização simplificada
      const agrupado = validos.slice(0, 15).map(d => ({
        nome: d.identificador_relogio.split(' - ')[0].substring(0, 10), // Encurta nome
        valor: d.consumo_calculado
      })).reverse()

      setDadosGrafico(agrupado)
      setLoading(false)
    }

    fetchDashboard()
  }, [tipoAtivo])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-6 px-4 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header com Navegação */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gráficos e Análises</h1>
              <p className="text-sm text-gray-600 mt-1">Visualize o consumo e tendências de uso</p>
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

              {/* Navegação Desktop - Leitura e Histórico */}
              <div className="hidden md:flex gap-2">
                <Link to="/" className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-100 border-2 border-gray-200 transition-all shadow-md">
                  <Plus className="w-5 h-5" />
                  Leitura
                </Link>
                <Link to="/historico" className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-100 border-2 border-gray-200 transition-all shadow-md">
                  <History className="w-5 h-5" />
                  Histórico
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className={`flex items-center gap-3 mb-3 ${tipoAtivo === 'agua' ? 'text-blue-600' : 'text-orange-600'}`}>
              {tipoAtivo === 'agua' ? <Droplets className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
              <span className="text-sm font-semibold">Consumo Total</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {resumo.totalConsumo.toLocaleString('pt-BR')} 
              <span className="text-xs font-normal text-gray-500 ml-2">{tipoAtivo === 'agua' ? 'm³' : 'kWh'}</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">Últimos 100 registros</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 text-gray-700 mb-3">
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm font-semibold">Leituras Realizadas</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{resumo.leiturasCount}</p>
            <p className="text-xs text-gray-500 mt-2">Registros recentes</p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className={`w-5 h-5 ${tipoAtivo === 'agua' ? 'text-blue-600' : 'text-orange-600'}`} />
            Consumo Recente (por Leitura)
          </h3>
          
          {loading ? (
            <div className="h-80 flex items-center justify-center text-gray-400">Carregando gráfico...</div>
          ) : dadosGrafico.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Sem dados suficientes para gráfico.</div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dadosGrafico}>
                <XAxis dataKey="nome" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{fill: 'transparent'}}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {dadosGrafico.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={tipoAtivo === 'energia' ? '#FF6B35' : '#3F76FF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}