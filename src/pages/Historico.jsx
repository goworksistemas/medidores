import { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import { 
  Calendar, Droplets, Zap, Trash2, X, Search, Filter, Edit2, Save,
  Building, MapPin, ChevronLeft, ChevronRight, BarChart3, 
  MessageSquare 
} from 'lucide-react'
import CustomSelect from '../components/CustomSelect'

const ITENS_POR_PAGINA = 50
const VALOR_SEM_ANDAR = '___SEM_ANDAR___'

export default function Historico() {
  const { tipoAtivo, setTipoAtivo, refreshData } = useTheme()
  
  // Estados de Dados
  const [leituras, setLeituras] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [paginaAtual, setPaginaAtual] = useState(1)

  // Estados para Edição
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Estados de Filtro
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroPredio, setFiltroPredio] = useState('')
  const [filtroAndar, setFiltroAndar] = useState('')
  
  // Filtros de Data
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const [medidores, setMedidores] = useState([])

  // Listas para os Selects
  const [opcoesUnidades, setOpcoesUnidades] = useState([])
  const [opcoesAndares, setOpcoesAndares] = useState([])

  // Modal de Justificativa
  const [justificativaModal, setJustificativaModal] = useState(null)

  // Carregar Dados
  useEffect(() => {
    // Carrega as opções de filtro uma vez
    async function fetchMedidorOptions() {
      const { data } = await supabase
        .from('med_medidores')
        .select('local_unidade, andar')
        .eq('tipo', tipoAtivo)
        .or('ativo.is.null,ativo.eq.true') // Apenas medidores ativos

      if (data) {
        const unidades = [...new Set(data.map(i => i.local_unidade).filter(Boolean))].sort()
        setOpcoesUnidades(unidades.map(u => ({ value: u, label: u })))
        
        const andares = [...new Set(data.map(i => i.andar).filter(Boolean))].sort()
        setOpcoesAndares(andares.map(a => ({ value: a, label: a })))
      }
    }
    fetchMedidorOptions()
    fetchLeituras()
  }, [tipoAtivo, paginaAtual, filtroPredio, filtroAndar, termoBusca, dataInicio, dataFim])

  async function fetchLeituras() {
    setLoading(true)
    
    const tabela = tipoAtivo === 'agua' ? 'med_hidrometros' : 'med_energia'

    let query = supabase
      .from(tabela)
      .select('*, medidor:med_medidores(nome, local_unidade, andar)', { count: 'exact' })
      .order('created_at', { ascending: false, nullsFirst: false })

    // Filtros
    if (filtroPredio) query = query.eq('medidor.local_unidade', filtroPredio)
    if (filtroAndar) {
      if (filtroAndar === VALOR_SEM_ANDAR) {
        query = query.is('medidor.andar', null)
      } else {
        query = query.eq('medidor.andar', filtroAndar)
      }
    }
    if (termoBusca) query = query.ilike('medidor.nome', `%${termoBusca}%`)
    if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00`)
    if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`)

    // Paginação - Pega um item a mais para o cálculo do consumo
    const de = (paginaAtual - 1) * ITENS_POR_PAGINA
    const ate = de + ITENS_POR_PAGINA // Pega 51 itens
    query = query.range(de, ate)
    
    const { data, count, error } = await query

    if (error) {
      console.error('Erro ao buscar:', error)
      setLeituras([])
      setTotalRegistros(0)
    } else {
      const leiturasComConsumo = []
      for (let i = 0; i < data.length; i++) {
        // O último item da lista (o item 'extra') não tem um próximo para comparar
        if (i >= ITENS_POR_PAGINA) continue

        const leituraAtual = data[i]
        const leituraAnterior = data[i + 1]
        
        let consumo = null
        if (leituraAnterior && leituraAnterior.medidor_id === leituraAtual.medidor_id) {
          const diferenca = leituraAtual.leitura - leituraAnterior.leitura
          // Sempre mostra a diferença, mesmo que seja negativa (indica virada do relógio)
          consumo = diferenca
        }
        
        leiturasComConsumo.push({ ...leituraAtual, consumo })
      }
      
      setLeituras(leiturasComConsumo)
      setTotalRegistros(count || 0)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) return
    const tabela = tipoAtivo === 'agua' ? 'med_hidrometros' : 'med_energia'
    const { error } = await supabase.from(tabela).delete().eq('id', id);
    if (!error) {
      fetchLeituras();
      refreshData(); // Força a atualização de outros componentes, como o Dashboard
    }
  }

  const limparFiltros = () => {
    setFiltroPredio('')
    setFiltroAndar('')
    setTermoBusca('')
    setDataInicio('')
    setDataFim('')
  }

  // Funções de Edição
  function handleEdit(item) {
    setEditingId(item.id)
    setEditForm({ leitura: item.leitura || '' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  async function handleSave(itemId) {
    const tabela = tipoAtivo === 'agua' ? 'med_hidrometros' : 'med_energia'
    try {
      const { error } = await supabase
        .from(tabela)
        .update({ leitura: editForm.leitura })
        .eq('id', itemId)

      if (error) throw error
      
      // Atualiza o estado local em vez de buscar tudo de novo,
      // para que o item não mude de posição na lista.
      setLeituras(leiturasAtuais =>
        leiturasAtuais.map(item =>
          item.id === itemId
            ? { ...item, leitura: editForm.leitura }
            : item
        )
      )
      setEditingId(null)
      refreshData() // Força a atualização de outros componentes, como o Dashboard
    } catch (error) {
      console.error("Erro ao salvar edição:", error)
      alert("Erro ao salvar a edição.")
    }
  }

  const de = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const ate = de + leituras.length;

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
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col lg:flex-row gap-4 items-end lg:items-center">
          
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar relógio..." 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Filtros de Data */}
          <div className="flex gap-2 w-full lg:w-auto">
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">De</label>
              <input 
                type="date" 
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Até</label>
              <input 
                type="date" 
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Selects */}
          <div className="w-full lg:w-40">
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Unidade</label>
            <CustomSelect 
              options={opcoesUnidades}
              value={filtroPredio}
              onChange={setFiltroPredio}
              placeholder="Todas"
              icon={Building}
            />
          </div>
          <div className="w-full lg:w-40">
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Andar</label>
            <CustomSelect 
              options={opcoesAndares} 
              value={filtroAndar} 
              onChange={setFiltroAndar} 
              placeholder="Todos"
              icon={MapPin}
            />
          </div>

          {(filtroPredio || filtroAndar || termoBusca || dataInicio || dataFim) && (
            <button 
              onClick={limparFiltros}
              className="px-4 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors h-[46px] mt-auto"
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
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Unidade</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Andar</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Relógio</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Leitura</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Consumo</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Foto</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-400">Carregando dados...</td>
                  </tr>
                ) : leituras.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-400">Nenhum registro encontrado com estes filtros.</td>
                  </tr>
                ) : (
                  leituras.map((item) => {
                    const unidadeMedida = tipoAtivo === 'agua' ? 'm³' : 'kWh'
                    const isAlerta = item.observacao?.includes('ALERTA') || item.justificativa
                    const dataObj = new Date(item.created_at)
                    const dataFormatada = !isNaN(dataObj.getTime())
                      ? dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '-'
                    
                    // Formata número ou retorna "-"
                    const formatNum = (val) => {
                      if (val === null || val === undefined || val === 'NÃO HÁ REGISTRO ANTERIOR' || val === 'NÃO HÁ REGISTRO PARA PARÂMETRO') return '-'
                      const num = Number(val)
                      return !isNaN(num) ? num.toLocaleString('pt-BR') : '-'
                    }

                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isAlerta ? 'bg-red-50/30' : ''}`}>
                        {/* Data */}
                        <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{dataFormatada}</span>
                          </div>
                        </td>
                        
                        {/* Medidor */}
                        <td className="p-4 text-sm text-gray-600">{item.medidor?.local_unidade || '-'}</td>
                        <td className="p-4 text-sm text-gray-600">{item.medidor?.andar || '-'}</td>
                        <td className="p-4 text-sm font-medium text-gray-900">{item.medidor?.nome || 'Não encontrado'}</td>
                        
                        {/* Leitura */}
                        <td className="p-4 text-right">
                          {editingId === item.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.leitura}
                              onChange={(e) => setEditForm({ ...editForm, leitura: e.target.value })}
                              className="w-32 px-2 py-1.5 border border-blue-300 rounded-lg text-right font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="font-mono font-semibold text-gray-900">{formatNum(item.leitura)}</span>
                              {item.leitura && !isNaN(Number(item.leitura)) && (
                                <span className="text-[10px] text-gray-400 ml-1">{unidadeMedida}</span>
                              )}
                            </>
                          )}
                        </td>

                        {/* Consumo */}
                        <td className="p-4 text-right">
                          {item.consumo !== null && item.consumo !== undefined ? (
                            <>
                              <span className={`font-mono font-semibold ${
                                item.consumo < 0 
                                  ? 'text-red-600' 
                                  : 'text-blue-600'
                              }`}>
                                {formatNum(item.consumo)}
                              </span>
                              <span className={`text-[10px] ml-1 ${
                                item.consumo < 0 
                                  ? 'text-red-400' 
                                  : 'text-blue-400'
                              }`}>
                                {unidadeMedida}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </td>
                        
                        {/* Foto */}
                        <td className="p-4 text-center">
                          {item.foto_url ? (
                            <a 
                              href={item.foto_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              📷 Ver
                            </a>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSave(item.id)}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Salvar"
                              >
                                <Save className="w-5 h-5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {(item.justificativa || item.observacao) && (
                                <button 
                                  onClick={() => setJustificativaModal({ texto: item.justificativa, obs: item.observacao, autor: item.usuario })}
                                  className={`p-2 rounded-lg transition-all ${
                                    item.justificativa 
                                      ? 'text-red-600 bg-red-50 hover:bg-red-100 animate-pulse' 
                                      : 'text-purple-600 hover:bg-purple-50'
                                  }`}
                                  title="Ler Observação/Justificativa"
                                >
                                  <MessageSquare className="w-5 h-5" />
                                </button>
                              )}
                              <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Mostrando <span className="font-bold text-gray-800">{leituras.length > 0 ? de + 1 : 0}</span> - <span className="font-bold text-gray-800">{ate}</span> de <span className="font-bold text-gray-800">{totalRegistros}</span> registros
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-600 hidden sm:inline">
                Página <span className="font-bold text-gray-800">{paginaAtual}</span> de <span className="font-bold text-gray-800">{Math.max(1, Math.ceil(totalRegistros / ITENS_POR_PAGINA))}</span>
              </span>
              <button 
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPaginaAtual(p => p + 1)}
                disabled={ate >= totalRegistros}
                className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

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