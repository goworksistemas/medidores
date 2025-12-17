import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import { 
  Calendar, Droplets, Zap, Trash2, Edit2, X, Search, Filter, 
  Building, MapPin, ChevronLeft, ChevronRight, BarChart3, 
  AlertTriangle, MessageSquare, CheckCircle2 
} from 'lucide-react'
import CustomSelect from '../components/CustomSelect'

const ITENS_POR_PAGINA = 20

export default function Historico() {
  const { tipoAtivo, setTipoAtivo } = useTheme()
  
  // Estados de Dados
  const [leituras, setLeituras] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [paginaAtual, setPaginaAtual] = useState(1)

  // Estados de Filtro
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroAndar, setFiltroAndar] = useState('')

  // Listas para os Selects (Filtros)
  const [opcoesUnidades, setOpcoesUnidades] = useState([])
  const [opcoesAndares, setOpcoesAndares] = useState([])

  // Modal de Justificativa
  const [justificativaModal, setJustificativaModal] = useState(null)

  // Carregar Dados
  useEffect(() => {
    fetchLeituras()
  }, [tipoAtivo, paginaAtual, filtroUnidade, filtroAndar, termoBusca])

  async function fetchLeituras() {
    setLoading(true)
    
    // Seleciona a tabela correta baseada no tema
    const tabela = tipoAtivo === 'agua' ? 'hidrometros' : 'energia'
    const colunaLeitura = tipoAtivo === 'agua' ? 'leitura_hidrometro' : 'leitura_energia'
    const colunaConsumo = tipoAtivo === 'agua' ? 'gasto_diario' : 'variacao'

    let query = supabase
      .from(tabela)
      .select('*', { count: 'exact' })
      .order('data_hora', { ascending: false })

    // Filtros
    if (filtroUnidade) query = query.eq('unidade', filtroUnidade)
    if (filtroAndar) query = query.eq('andar', filtroAndar)
    if (termoBusca) query = query.ilike('identificador_relogio', `%${termoBusca}%`)

    // Paginação
    const de = (paginaAtual - 1) * ITENS_POR_PAGINA
    const ate = de + ITENS_POR_PAGINA - 1
    query = query.range(de, ate)

    const { data, count, error } = await query

    if (error) {
      console.error('Erro ao buscar:', error)
    } else {
      setLeituras(data)
      setTotalRegistros(count)
      
      // Extrai opções únicas para os filtros
      if (data.length > 0) {
        const unidades = [...new Set(data.map(i => i.unidade).filter(Boolean))].sort()
        setOpcoesUnidades(unidades.map(u => ({ value: u, label: u })))
        
        const andares = [...new Set(data.map(i => i.andar).filter(Boolean))].sort()
        setOpcoesAndares(andares.map(a => ({ value: a, label: a })))
      }
    }
    setLoading(false)
  }

  // Função auxiliar para deletar (apenas exemplo, idealmente restrito a admins)
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) return
    
    const tabela = tipoAtivo === 'agua' ? 'hidrometros' : 'energia'
    const { error } = await supabase.from(tabela).delete().eq('id_registro', id)
    
    if (!error) fetchLeituras()
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-gray-400" />
              Histórico de Medições
            </h1>
            <p className="text-sm text-gray-500">
              Visualizando registros de <span className="font-bold uppercase">{tipoAtivo}</span>
            </p>
          </div>

          <div className="inline-flex bg-white rounded-xl p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setTipoAtivo('agua')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tipoAtivo === 'agua' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Água
            </button>
            <button
              onClick={() => setTipoAtivo('energia')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tipoAtivo === 'energia' ? 'bg-yellow-400 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Energia
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome do relógio..." 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="w-full md:w-48">
            <CustomSelect 
              options={opcoesUnidades} 
              value={filtroUnidade} 
              onChange={setFiltroUnidade} 
              placeholder="Unidade"
              icon={Building}
            />
          </div>
          <div className="w-full md:w-48">
            <CustomSelect 
              options={opcoesAndares} 
              value={filtroAndar} 
              onChange={setFiltroAndar} 
              placeholder="Andar"
              icon={MapPin}
            />
          </div>
          {(filtroUnidade || filtroAndar || termoBusca) && (
            <button 
              onClick={() => { setFiltroUnidade(''); setFiltroAndar(''); setTermoBusca('') }}
              className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        {/* TABELA DE DADOS */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Local / Relógio</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Leitura</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Consumo</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Evidência</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-400">Carregando dados...</td>
                  </tr>
                ) : leituras.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-400">Nenhum registro encontrado.</td>
                  </tr>
                ) : (
                  leituras.map((item) => {
                    const isAlerta = item.observacao?.includes('ALERTA') || item.justificativa
                    const consumo = tipoAtivo === 'agua' ? item.gasto_diario : item.variacao
                    const leitura = tipoAtivo === 'agua' ? item.leitura_hidrometro : item.leitura_energia

                    return (
                      <tr key={item.id_registro} className={`hover:bg-gray-50 transition-colors ${isAlerta ? 'bg-red-50/30' : ''}`}>
                        
                        {/* Status (Alerta ou Normal) */}
                        <td className="p-4">
                          {isAlerta ? (
                            <div className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded-full w-fit text-[10px] font-bold uppercase">
                              <AlertTriangle className="w-3 h-3" /> Atenção
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full w-fit text-[10px] font-bold uppercase">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </div>
                          )}
                        </td>

                        {/* Data */}
                        <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(item.data_hora).toLocaleDateString('pt-BR')}
                            <span className="text-xs text-gray-400">{new Date(item.data_hora).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </td>

                        {/* Local */}
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{item.unidade}</div>
                          <div className="text-xs text-gray-500">{item.andar || 'Sem andar'} • {item.identificador_relogio}</div>
                        </td>

                        {/* Leitura Atual */}
                        <td className="p-4 text-right font-mono font-medium text-gray-700">
                          {Number(leitura).toLocaleString('pt-BR')}
                        </td>

                        {/* Consumo Calculado */}
                        <td className="p-4 text-right">
                          <span className={`font-mono font-bold ${isAlerta ? 'text-red-600' : 'text-emerald-600'}`}>
                            {consumo ? Number(consumo).toLocaleString('pt-BR') : '-'}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1">{tipoAtivo === 'agua' ? 'm³' : 'kWh'}</span>
                        </td>

                        {/* Evidência (Foto) */}
                        <td className="p-4 text-center">
                          {item.foto_url ? (
                            <a href={item.foto_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                              Ver Foto
                            </a>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>

                        {/* Ações (Justificativa e Exclusão) */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            
                            {/* Botão de Justificativa (Só aparece se tiver obs ou justificativa) */}
                            {(item.justificativa || item.observacao) && (
                              <button 
                                onClick={() => setJustificativaModal({
                                  texto: item.justificativa,
                                  obs: item.observacao,
                                  autor: item.usuario
                                })}
                                className={`p-2 rounded-full transition-all ${
                                  item.justificativa 
                                    ? 'text-red-600 bg-red-100 hover:bg-red-200 animate-pulse' 
                                    : 'text-gray-400 hover:bg-gray-100'
                                }`}
                                title="Ler Observação/Justificativa"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}

                            <button 
                              onClick={() => handleDelete(item.id_registro)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Mostrando página {paginaAtual} de {Math.ceil(totalRegistros / ITENS_POR_PAGINA)}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPaginaAtual(p => p + 1)}
                disabled={leituras.length < ITENS_POR_PAGINA}
                className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE JUSTIFICATIVA */}
      {justificativaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Detalhes do Registro
              </h3>
              <button onClick={() => setJustificativaModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {justificativaModal.obs && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Observação do Sistema</p>
                  <p className="text-sm text-gray-800">{justificativaModal.obs}</p>
                </div>
              )}

              {justificativaModal.texto ? (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-600 uppercase mb-1">Justificativa do Operador</p>
                  <p className="text-sm text-gray-800 italic">"{justificativaModal.texto}"</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Nenhuma justificativa manual foi inserida.</p>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>Registrado por: <strong>{justificativaModal.autor || 'Sistema'}</strong></span>
              </div>
            </div>

            <button 
              onClick={() => setJustificativaModal(null)}
              className="mt-6 w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}