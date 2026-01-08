import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { 
  Gauge, Search, Edit2, Save, X, Plus, Trash2, AlertCircle, 
  CheckCircle2, Loader2, Droplets, Zap, QrCode, Eye, Download,
  FileText, Building, Layers, Filter, ChevronDown, ChevronUp,
  RefreshCw, Copy, Check
} from 'lucide-react'

// Componente simples de QR Code usando API externa
function QRCodeDisplay({ value, size = 150, showValue = false, metadata = null }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
  
  return (
    <div className="flex flex-col items-center gap-2">
      <img 
        src={qrUrl} 
        alt={`QR Code: ${value}`}
        width={size}
        height={size}
        className="rounded-lg border-2 border-gray-200"
      />
      {showValue && (
        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600 max-w-full truncate">
          {value}
        </code>
      )}
      {metadata && (
        <div className="text-xs text-center text-gray-500 space-y-0.5">
          <div className="font-semibold text-gray-700">{metadata.nome}</div>
          {metadata.predio && <div>📍 {metadata.predio}</div>}
          {metadata.andar && <div>🏢 {metadata.andar}</div>}
          <div className={metadata.tipo === 'agua' ? 'text-blue-600' : 'text-yellow-600'}>
            {metadata.tipo === 'agua' ? '💧 Água' : '⚡ Energia'}
          </div>
        </div>
      )}
    </div>
  )
}

// Modal de Detalhes do Medidor
function ModalDetalhes({ medidor, onClose }) {
  const [medicoes, setMedicoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [totalMedicoes, setTotalMedicoes] = useState(0)

  useEffect(() => {
    async function fetchMedicoes() {
      setLoading(true)
      try {
        const tabela = medidor.tipo === 'agua' ? 'med_hidrometros' : 'med_energia'
        
        // Busca as medições relacionadas pelo ID do medidor
        const { data, error, count } = await supabase
          .from(tabela)
          .select('id, created_at, leitura, usuario, foto_url, observacao', { count: 'exact' })
          .eq('medidor_id', medidor.id)
          .order('created_at', { ascending: false, nullsFirst: false })
          .limit(20)

        if (error) throw error
        
        setMedicoes(data || [])
        setTotalMedicoes(count || 0)
      } catch (error) {
        console.error('Erro ao buscar medições:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMedicoes()
  }, [medidor])

  const copyToken = () => {
    navigator.clipboard.writeText(medidor.token || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {medidor.tipo === 'agua' ? (
                <Droplets className="w-8 h-8" />
              ) : (
                <Zap className="w-8 h-8" />
              )}
              <div>
                <h2 className="text-2xl font-bold">{medidor.nome}</h2>
                <p className="text-blue-100 text-sm">
                  {medidor.local_unidade && `${medidor.local_unidade}`}
                  {medidor.andar && ` • ${medidor.andar}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR Code */}
            <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Code do Medidor
              </h3>
              <QRCodeDisplay 
                value={medidor.token || medidor.id} 
                size={200}
                metadata={{
                  nome: medidor.nome,
                  predio: medidor.local_unidade,
                  andar: medidor.andar,
                  tipo: medidor.tipo
                }}
              />
              <div className="mt-4 w-full">
                <label className="block text-sm font-medium text-gray-600 mb-1">Token:</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-mono text-gray-700 truncate">
                    {medidor.token || 'Não definido'}
                  </code>
                  <button
                    onClick={copyToken}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Copiar token"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Informações */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Informações</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tipo</p>
                  <div className="flex items-center gap-2">
                    {medidor.tipo === 'agua' ? (
                      <Droplets className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Zap className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-semibold">{medidor.tipo === 'agua' ? 'Água' : 'Energia'}</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Unidade</p>
                  <p className="font-semibold">{medidor.unidade || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Prédio/Local</p>
                  <p className="font-semibold">{medidor.local_unidade || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Andar</p>
                  <p className="font-semibold">{medidor.andar || '-'}</p>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-xs text-blue-600 uppercase font-bold mb-1">Total de Medições</p>
                <p className="text-3xl font-bold text-blue-700">{totalMedicoes}</p>
              </div>
            </div>
          </div>

          {/* Histórico de Medições */}
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Últimas Medições</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : medicoes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Gauge className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma medição registrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left font-bold text-gray-600">Data e Hora</th>
                      <th className="p-3 text-right font-bold text-gray-600">Leitura</th>
                      <th className="p-3 text-left font-bold text-gray-600">Usuário</th>
                      <th className="p-3 text-center font-bold text-gray-600">Foto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {medicoes.map((m, i) => {
                      const unidadeMedida = medidor.tipo === 'agua' ? 'm³' : 'kWh'
                      const dataObj = new Date(m.created_at)
                      const dataFormatada = dataObj 
                        ? dataObj.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : '-'
                      
                      // Formata número
                      const formatNum = (val) => {
                        if (!val || val === 'NÃO HÁ REGISTRO ANTERIOR') return '-'
                        const num = Number(val)
                        return !isNaN(num) ? num.toLocaleString('pt-BR') : '-'
                      }
                      
                      return (
                        <tr key={m.id || i} className="hover:bg-gray-50">
                          <td className="p-3 whitespace-nowrap text-gray-700">{dataFormatada}</td>
                          <td className="p-3 text-right font-mono font-semibold text-gray-900">
                            {formatNum(m.leitura)}
                            {m.leitura && !isNaN(Number(m.leitura)) && <span className="text-[10px] text-gray-400 ml-1">{unidadeMedida}</span>}
                          </td>
                          <td className="p-3 text-left text-gray-600">{m.usuario || '-'}</td>
                          <td className="p-3 text-center">
                            {m.foto_url ? (
                              <a 
                                href={m.foto_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                              >
                                📷 Ver
                              </a>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GerenciarMedidores() {
  const { user } = useAuth()
  const [medidores, setMedidores] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [mensagem, setMensagem] = useState(null)
  const [modalDetalhes, setModalDetalhes] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [showFilters, setShowFilters] = useState(true)
  const [exportando, setExportando] = useState(false)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroPredio, setFiltroPredio] = useState('')
  const [filtroAndar, setFiltroAndar] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState('')

  // Verifica se o usuário é admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  // Opções únicas para os filtros
  const filterOptions = useMemo(() => {
    const predios = [...new Set(medidores.map(m => m.local_unidade).filter(Boolean))].sort();

    let andares = [];
    if (filtroPredio) {
      const medidoresDoPredio = medidores.filter(m => m.local_unidade === filtroPredio);
      andares = [...new Set(medidoresDoPredio.map(m => m.andar).filter(Boolean))].sort();
    }

    const unidades = [...new Set(medidores.map(m => m.unidade).filter(Boolean))].sort();
    
    return { predios, andares, unidades };
  }, [medidores, filtroPredio]);

  useEffect(() => {
    if (!isAdmin) {
      setMensagem({ tipo: 'erro', texto: 'Você não tem permissão para acessar esta página.' })
      return
    }
    fetchMedidores()
  }, [isAdmin])

  async function fetchMedidores() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('med_medidores')
        .select('*')
        .order('nome', { ascending: true })

      if (error) throw error
      setMedidores(data || [])
    } catch (error) {
      console.error('Erro ao buscar medidores:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar medidores' })
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(medidor) {
    setEditingId(medidor.id)
    setEditForm({
      nome: medidor.nome || '',
      tipo: medidor.tipo || 'agua',
      unidade: medidor.unidade || '',
      local_unidade: medidor.local_unidade || '',
      andar: medidor.andar || '',
      token: medidor.token || ''
    })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  function handleCancelAdd() {
    setShowAddForm(false)
    setEditForm({})
  }

  // Gera um token único para o medidor
  function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let token = 'MED-'
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  async function handleSave(medidorId) {
    try {
      const { error } = await supabase
        .from('med_medidores')
        .update({
          nome: editForm.nome,
          tipo: editForm.tipo,
          unidade: editForm.unidade,
          local_unidade: editForm.local_unidade,
          andar: editForm.andar || null
        })
        .eq('id', medidorId)

      if (error) throw error

      setMensagem({ tipo: 'sucesso', texto: 'Medidor atualizado com sucesso!' })
      setEditingId(null)
      setEditForm({})
      fetchMedidores()
      
      setTimeout(() => setMensagem(null), 3000)
    } catch (error) {
      console.error('Erro ao atualizar medidor:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar medidor' })
      setTimeout(() => setMensagem(null), 3000)
    }
  }

  async function handleAdd() {
    try {
      const { error } = await supabase
        .from('med_medidores')
        .insert({
          nome: editForm.nome,
          tipo: editForm.tipo,
          unidade: editForm.unidade,
          local_unidade: editForm.local_unidade,
          andar: editForm.andar || null
          // O token é gerado automaticamente pelo banco de dados (default gen_random_uuid())
        })

      if (error) throw error

      setMensagem({ tipo: 'sucesso', texto: 'Medidor adicionado com sucesso!' })
      setShowAddForm(false)
      setEditForm({})
      fetchMedidores()
      
      setTimeout(() => setMensagem(null), 3000)
    } catch (error) {
      console.error('Erro ao adicionar medidor:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao adicionar medidor' })
      setTimeout(() => setMensagem(null), 3000)
    }
  }

  async function handleDelete(medidorId) {
    if (!window.confirm('Tem certeza que deseja excluir este medidor?')) return
    
    try {
      const { error } = await supabase
        .from('med_medidores')
        .delete()
        .eq('id', medidorId)

      if (error) throw error

      setMensagem({ tipo: 'sucesso', texto: 'Medidor excluído com sucesso!' })
      setSelectedItems(prev => prev.filter(id => id !== medidorId))
      fetchMedidores()
      
      setTimeout(() => setMensagem(null), 3000)
    } catch (error) {
      console.error('Erro ao excluir medidor:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir medidor' })
      setTimeout(() => setMensagem(null), 3000)
    }
  }

  // Toggle seleção de item
  function toggleSelect(medidorId) {
    setSelectedItems(prev => 
      prev.includes(medidorId) 
        ? prev.filter(id => id !== medidorId)
        : [...prev, medidorId]
    )
  }

  // Selecionar todos filtrados
  function toggleSelectAll() {
    if (selectedItems.length === medidoresFiltrados.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(medidoresFiltrados.map(m => m.id))
    }
  }

  // Exportar QR Codes selecionados para PDF
  async function exportarQRCodesPDF() {
    if (selectedItems.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Selecione pelo menos um medidor para exportar' })
      setTimeout(() => setMensagem(null), 3000)
      return
    }

    setExportando(true)
    
    try {
      const medidoresSelecionados = medidores.filter(m => selectedItems.includes(m.id))
      
      // Gera HTML para impressão
      const printWindow = window.open('', '_blank')
      
      const qrCodesHtml = medidoresSelecionados.map(m => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(m.token || m.id)}`
        return `
          <div class="qr-card">
            <img src="${qrUrl}" alt="QR Code ${m.nome}" />
            <div class="metadata">
              <h3>${m.nome}</h3>
              <p><strong>Tipo:</strong> ${m.tipo === 'agua' ? '💧 Água' : '⚡ Energia'}</p>
              ${m.local_unidade ? `<p><strong>Prédio:</strong> ${m.local_unidade}</p>` : ''}
              ${m.andar ? `<p><strong>Andar:</strong> ${m.andar}</p>` : ''}
              ${m.unidade ? `<p><strong>Unidade:</strong> ${m.unidade}</p>` : ''}
              <p class="token"><strong>Token:</strong> ${m.token || 'N/A'}</p>
            </div>
          </div>
        `
      }).join('')

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Codes - Medidores</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              background: #f5f5f5;
            }
            h1 { text-align: center; margin-bottom: 30px; color: #333; }
            .container {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 20px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .qr-card {
              background: white;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              page-break-inside: avoid;
            }
            .qr-card img {
              width: 180px;
              height: 180px;
              margin-bottom: 15px;
              border: 2px solid #eee;
              border-radius: 8px;
            }
            .metadata h3 {
              font-size: 16px;
              color: #333;
              margin-bottom: 10px;
            }
            .metadata p {
              font-size: 12px;
              color: #666;
              margin: 4px 0;
            }
            .token {
              font-family: monospace;
              background: #f0f0f0;
              padding: 4px 8px;
              border-radius: 4px;
              margin-top: 10px !important;
              font-size: 11px !important;
            }
            @media print {
              body { background: white; padding: 10px; }
              .qr-card { box-shadow: none; border: 1px solid #ddd; }
            }
          </style>
        </head>
        <body>
          <h1>QR Codes dos Medidores</h1>
          <p style="text-align: center; color: #666; margin-bottom: 30px;">
            Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
            • Total: ${medidoresSelecionados.length} medidor(es)
          </p>
          <div class="container">
            ${qrCodesHtml}
          </div>
          <script>
            // Aguarda imagens carregarem antes de imprimir
            Promise.all(
              Array.from(document.images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              })
            ).then(() => {
              window.print();
            });
          </script>
        </body>
        </html>
      `)
      
      printWindow.document.close()
      
      setMensagem({ tipo: 'sucesso', texto: `${medidoresSelecionados.length} QR Code(s) exportado(s)!` })
      setTimeout(() => setMensagem(null), 3000)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao exportar QR Codes' })
      setTimeout(() => setMensagem(null), 3000)
    } finally {
      setExportando(false)
    }
  }

  // Limpar filtros
  function limparFiltros() {
    setSearchTerm('')
    setFiltroTipo('')
    setFiltroPredio('')
    setFiltroAndar('')
    setFiltroUnidade('')
  }

  // Filtragem de medidores
  const medidoresFiltrados = medidores.filter(m => {
    const termo = searchTerm.toLowerCase()
    const matchSearch = 
      m.nome?.toLowerCase().includes(termo) ||
      m.local_unidade?.toLowerCase().includes(termo) ||
      m.unidade?.toLowerCase().includes(termo) ||
      m.andar?.toLowerCase().includes(termo) ||
      m.token?.toLowerCase().includes(termo)
    
    const matchTipo = !filtroTipo || m.tipo === filtroTipo
    const matchPredio = !filtroPredio || m.local_unidade === filtroPredio
    const matchAndar = !filtroAndar || m.andar === filtroAndar
    const matchUnidade = !filtroUnidade || m.unidade === filtroUnidade
    
    return matchSearch && matchTipo && matchPredio && matchAndar && matchUnidade
  })

  // Contagem de filtros ativos
  const filtrosAtivos = [filtroTipo, filtroPredio, filtroAndar, filtroUnidade].filter(Boolean).length

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gauge className="w-6 h-6 text-gray-400" />
              Gerenciar Medidores
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Cadastro, edição e QR Codes dos medidores de água e energia
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedItems.length > 0 && (
              <button
                onClick={exportarQRCodesPDF}
                disabled={exportando}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {exportando ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                Exportar QR Codes ({selectedItems.length})
              </button>
            )}
            <button
              onClick={() => {
                setShowAddForm(true)
                setEditForm({
                  nome: '',
                  tipo: 'agua',
                  unidade: '',
                  local_unidade: '',
                  andar: ''
                })
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Adicionar Medidor
            </button>
          </div>
        </div>

        {/* MENSAGEM */}
        {mensagem && (
          <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top ${
            mensagem.tipo === 'sucesso'
              ? 'bg-green-50 border border-green-200 text-green-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}>
            {mensagem.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-semibold">{mensagem.texto}</span>
          </div>
        )}

        {/* FORMULÁRIO DE ADICIONAR */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Novo Medidor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Medidor *</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Hidrômetro 01"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo *</label>
                <select
                  value={editForm.tipo}
                  onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="agua">Água</option>
                  <option value="energia">Energia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Unidade</label>
                <input
                  type="text"
                  value={editForm.unidade}
                  onChange={(e) => setEditForm({ ...editForm, unidade: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Unidade 1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Prédio/Local</label>
                <input
                  type="text"
                  value={editForm.local_unidade}
                  onChange={(e) => setEditForm({ ...editForm, local_unidade: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Prédio A"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Andar</label>
                <input
                  type="text"
                  value={editForm.andar}
                  onChange={(e) => setEditForm({ ...editForm, andar: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 1º Andar"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdd}
                disabled={!editForm.nome || !editForm.tipo}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
              <button
                onClick={handleCancelAdd}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Busca e Toggle de Filtros */}
          <div className="p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, unidade, local ou token..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-colors ${
                filtrosAtivos > 0 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filtros
              {filtrosAtivos > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {filtrosAtivos}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Filtros Expandidos */}
          {showFilters && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo</label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  >
                    <option value="">Todos os tipos</option>
                    <option value="agua">💧 Água</option>
                    <option value="energia">⚡ Energia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Prédio/Local</label>
                  <select
                    value={filtroPredio}
                    onChange={(e) => {
                      setFiltroPredio(e.target.value)
                      setFiltroAndar('') // Reseta o filtro de andar ao trocar de prédio
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  >
                    <option value="">Todos os prédios</option>
                    {filterOptions.predios.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Andar</label>
                  <select
                    value={filtroAndar}
                    onChange={(e) => setFiltroAndar(e.target.value)}
                    disabled={!filtroPredio}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Todos os andares</option>
                    {filterOptions.andares.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Unidade</label>
                  <select
                    value={filtroUnidade}
                    onChange={(e) => setFiltroUnidade(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  >
                    <option value="">Todas as unidades</option>
                    {filterOptions.unidades.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              {filtrosAtivos > 0 && (
                <button
                  onClick={limparFiltros}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* TABELA DE MEDIDORES */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Carregando medidores...</p>
            </div>
          ) : medidoresFiltrados.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Gauge className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum medidor encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === medidoresFiltrados.length && medidoresFiltrados.length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Medidor</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Unidade</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Andar</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Token</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {medidoresFiltrados.map((medidor) => (
                    <tr key={medidor.id} className={`hover:bg-gray-50 transition-colors ${
                      selectedItems.includes(medidor.id) ? 'bg-blue-50' : ''
                    }`}>
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(medidor.id)}
                          onChange={() => toggleSelect(medidor.id)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      {editingId === medidor.id ? (
                        <>
                          {/* MODO EDIÇÃO */}
                          <td className="p-4">
                            <input
                              type="text"
                              value={editForm.nome}
                              onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="Nome"
                            />
                          </td>
                          <td className="p-4">
                            <select
                              value={editForm.tipo}
                              onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="agua">Água</option>
                              <option value="energia">Energia</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <input
                              type="text"
                              value={editForm.local_unidade}
                              onChange={(e) => setEditForm({ ...editForm, local_unidade: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="Prédio/Local"
                            />
                          </td>
                          <td className="p-4">
                            <input
                              type="text"
                              value={editForm.andar}
                              onChange={(e) => setEditForm({ ...editForm, andar: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="Andar"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <input // O token é um UUID gerado pelo banco, não deve ser editável.
                                type="text"
                                value={editForm.token}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-sm font-mono text-gray-500 cursor-not-allowed"
                                title="O token não pode ser editado"
                              />
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSave(medidor.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Salvar"
                              >
                                <Save className="w-5 h-5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* MODO VISUALIZAÇÃO */}
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{medidor.nome}</div>
                            {medidor.unidade && (
                              <div className="text-sm text-gray-500">Unidade: {medidor.unidade}</div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {medidor.tipo === 'agua' ? (
                                <Droplets className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Zap className="w-5 h-5 text-yellow-600" />
                              )}
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                medidor.tipo === 'agua'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {medidor.tipo === 'agua' ? 'Água' : 'Energia'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-700">
                            {medidor.local_unidade || '-'}
                          </td>
                          <td className="p-4 text-sm text-gray-500">
                            {medidor.andar || '-'}
                          </td>
                          <td className="p-4">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                              {medidor.token || 'N/A'}
                            </code>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setModalDetalhes(medidor)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Ver detalhes e QR Code"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(medidor)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(medidor.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumo */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 flex items-center justify-between">
            <span>
              {medidoresFiltrados.length} medidor(es) encontrado(s)
              {filtrosAtivos > 0 && ` (filtrado de ${medidores.length})`}
            </span>
            {selectedItems.length > 0 && (
              <span className="text-blue-600 font-semibold">
                {selectedItems.length} selecionado(s)
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Detalhes */}
      {modalDetalhes && (
        <ModalDetalhes 
          medidor={modalDetalhes} 
          onClose={() => setModalDetalhes(null)} 
        />
      )}
    </div>
  )
}
