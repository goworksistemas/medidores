import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { 
  Users, Search, Edit2, Save, X, Shield, ShieldCheck, ShieldX,
  Mail, User, AlertCircle, CheckCircle2, Loader2, Eye, QrCode, Copy, Check,
  Trash2, UserX
} from 'lucide-react'

export default function GerenciarUsuarios() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [mensagem, setMensagem] = useState(null)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null)
  const [tokenUsuario, setTokenUsuario] = useState(null)
  const [loadingToken, setLoadingToken] = useState(false)
  const [tokenCopiado, setTokenCopiado] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Verifica se o usuário tem permissão (apenas Admin Master pode gerenciar usuários)
  const isAdminMaster = user?.role === 'super_admin'

  const roleDisplayMap = {
    user: 'Operacional',
    n1: 'N1',
    admin: 'Admin',
    super_admin: 'Admin Master',
  }

  useEffect(() => {
    if (!isAdminMaster) {
      setMensagem({ tipo: 'erro', texto: 'Apenas Admin Master pode acessar esta página.' })
      return
    }
    fetchUsuarios()
  }, [isAdminMaster])

  async function fetchUsuarios() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar usuários' })
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar o token QR Code do usuário
  async function buscarTokenUsuario(usuario) {
    setLoadingToken(true)
    setTokenUsuario(null)
    
    try {
      // Busca token na tabela tokens_acesso pela descricao (nome do usuário ou email)
      // Tenta primeiro pelo nome, depois pelo email
      let data = null
      let error = null

      // Tenta buscar pelo nome
      if (usuario.name) {
        const result1 = await supabase
          .from('tokens_acesso')
          .select('*')
          .eq('descricao', usuario.name)
          .eq('ativo', true)
          .maybeSingle()
        
        if (result1.data) {
          data = result1.data
        } else {
          error = result1.error
        }
      }

      // Se não encontrou pelo nome, tenta pelo email
      if (!data && usuario.email) {
        const result2 = await supabase
          .from('tokens_acesso')
          .select('*')
          .eq('descricao', usuario.email)
          .eq('ativo', true)
          .maybeSingle()
        
        if (result2.data) {
          data = result2.data
        } else if (!error) {
          error = result2.error
        }
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar token:', error)
        setMensagem({ tipo: 'erro', texto: 'Erro ao buscar QR Code do usuário' })
        setLoadingToken(false)
        return
      }

      setTokenUsuario(data)
      setLoadingToken(false)
    } catch (error) {
      console.error('Erro ao buscar token:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao buscar QR Code do usuário' })
      setLoadingToken(false)
    }
  }

  // Função para gerar UUID (compatível com navegadores mais antigos)
  function gerarUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback para navegadores que não suportam crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Função para criar um novo token QR Code para o usuário
  async function criarTokenUsuario() {
    if (!usuarioSelecionado) return

    setLoadingToken(true)
    try {
      // Gera um UUID único para o token
      const novoToken = gerarUUID()
      const descricao = usuarioSelecionado.name || usuarioSelecionado.email || 'Usuário'

      const { data, error } = await supabase
        .from('tokens_acesso')
        .insert({
          token: novoToken,
          descricao: descricao,
          ativo: true
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      setTokenUsuario(data)
      setMensagem({ tipo: 'sucesso', texto: 'QR Code criado com sucesso!' })
      setTimeout(() => setMensagem(null), 3000)
      setLoadingToken(false)
    } catch (error) {
      console.error('Erro ao criar token:', error)
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao criar QR Code. Tente novamente.' })
      setLoadingToken(false)
    }
  }

  // Função para abrir o modal de visualização
  function handleVerUsuario(usuario) {
    setUsuarioSelecionado(usuario)
    setTokenCopiado(false)
    buscarTokenUsuario(usuario)
  }

  // Função para fechar o modal
  function handleFecharModal() {
    setUsuarioSelecionado(null)
    setTokenUsuario(null)
    setTokenCopiado(false)
  }

  // Função para copiar o token
  function copiarToken() {
    if (tokenUsuario?.token) {
      navigator.clipboard.writeText(tokenUsuario.token)
      setTokenCopiado(true)
      setTimeout(() => setTokenCopiado(false), 2000)
    }
  }

  // Componente para exibir QR Code
  function QRCodeDisplay({ value, size = 200 }) {
    if (!value) return null
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
    
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <img 
            src={qrUrl} 
            alt={`QR Code: ${value}`}
            width={size}
            height={size}
            className="rounded-xl border-4 border-gray-200 shadow-lg w-full max-w-[200px] sm:max-w-none"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl opacity-0 hover:opacity-100 transition-opacity">
            <QrCode className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <code className="text-xs bg-gray-100 px-3 py-2 rounded-lg font-mono text-gray-700 max-w-full break-all text-center">
          {value}
        </code>
      </div>
    )
  }

  function handleEdit(usuario) {
    setEditingId(usuario.id)
    setEditForm({
      name: usuario.name || '',
      email: usuario.email || '',
      role: usuario.role || 'user',
      access_medicoes: usuario.access_medicoes ?? true,
      access_dp_rh: usuario.access_dp_rh ?? false
    })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  async function handleSave(usuarioId) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          access_medicoes: editForm.access_medicoes,
          access_dp_rh: editForm.access_dp_rh
        })
        .eq('id', usuarioId)

      if (error) throw error

      setMensagem({ tipo: 'sucesso', texto: 'Usuário atualizado com sucesso!' })
      setEditingId(null)
      // Atualiza o estado local para evitar recarregar a lista e manter a posição.
      setUsuarios(currentUsers =>
        currentUsers.map(u =>
          u.id === usuarioId ? { ...u, ...editForm } : u
        )
      )
      
      setTimeout(() => setMensagem(null), 3000)
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar usuário' })
      setTimeout(() => setMensagem(null), 3000)
    }
  }

  // Função para excluir usuário
  async function handleDeleteUser(usuarioId) {
    // Não permite excluir a si mesmo
    if (usuarioId === user?.id) {
      setMensagem({ tipo: 'erro', texto: 'Você não pode excluir sua própria conta!' })
      setTimeout(() => setMensagem(null), 3000)
      return
    }

    setDeletingId(usuarioId)
    
    try {
      // 1. Primeiro, tenta desativar/excluir tokens de acesso do usuário
      const usuarioParaExcluir = usuarios.find(u => u.id === usuarioId)
      if (usuarioParaExcluir?.name) {
        await supabase
          .from('tokens_acesso')
          .update({ ativo: false })
          .eq('descricao', usuarioParaExcluir.name)
      }
      if (usuarioParaExcluir?.email) {
        await supabase
          .from('tokens_acesso')
          .update({ ativo: false })
          .eq('descricao', usuarioParaExcluir.email)
      }

      // 2. Exclui da tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', usuarioId)

      if (profileError) {
        throw profileError
      }

      // 3. Tenta excluir do auth.users via função RPC (se existir)
      const { error: authError } = await supabase.rpc('delete_user_by_id', { user_id: usuarioId })
      
      if (authError) {
        // Se a função RPC não existir, apenas avisa que precisa excluir manualmente
        if (authError.code === 'PGRST202' || authError.message?.includes('function') || authError.message?.includes('does not exist')) {
          console.warn('Função RPC não encontrada. Usuário removido da tabela profiles, mas ainda existe no auth.users.')
          setMensagem({ 
            tipo: 'sucesso', 
            texto: `Usuário removido do sistema! Para exclusão completa do Auth, acesse o Supabase Dashboard.` 
          })
        } else {
          throw authError
        }
      } else {
        setMensagem({ tipo: 'sucesso', texto: 'Usuário excluído completamente com sucesso!' })
      }

      // Atualiza a lista local
      setUsuarios(currentUsers => currentUsers.filter(u => u.id !== usuarioId))
      setConfirmDelete(null)
      
      setTimeout(() => setMensagem(null), 5000)
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      setMensagem({ tipo: 'erro', texto: `Erro ao excluir usuário: ${error.message || 'Erro desconhecido'}` })
      setTimeout(() => setMensagem(null), 5000)
    } finally {
      setDeletingId(null)
    }
  }

  const usuariosFiltrados = usuarios.filter(u => {
    const termo = searchTerm.toLowerCase()
    return (
      u.name?.toLowerCase().includes(termo) ||
      u.email?.toLowerCase().includes(termo) ||
      u.role?.toLowerCase().includes(termo)
    )
  })

  if (!isAdminMaster) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600">Apenas <strong>Admin Master</strong> pode gerenciar usuários.</p>
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
              <Users className="w-6 h-6 text-gray-400" />
              Gerenciar Usuários
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Controle de acesso e permissões dos usuários
            </p>
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

        {/* BARRA DE BUSCA */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* TABELA DE USUÁRIOS */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Carregando usuários...</p>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Medições</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">RH</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                      {editingId === usuario.id ? (
                        <>
                          {/* MODO EDIÇÃO */}
                          <td className="p-4">
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Nome"
                              />
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Email"
                              />
                            </div>
                          </td>
                          <td className="p-4">
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="user">Operacional</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Admin Master</option>
                            </select>
                          </td>
                          <td className="p-4 text-center">
                            <label className="flex items-center justify-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.access_medicoes}
                                onChange={(e) => setEditForm({ ...editForm, access_medicoes: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </label>
                          </td>
                          <td className="p-4 text-center">
                            <label className="flex items-center justify-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.access_dp_rh}
                                onChange={(e) => setEditForm({ ...editForm, access_dp_rh: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </label>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSave(usuario.id)}
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
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{usuario.name || 'Sem nome'}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {usuario.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              usuario.role === 'admin' || usuario.role === 'super_admin' 
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {roleDisplayMap[usuario.role] || 'Usuário'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {usuario.access_medicoes ? (
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="text-xs font-medium">Sim</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-red-600">
                                <ShieldX className="w-5 h-5" />
                                <span className="text-xs font-medium">Não</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {usuario.access_dp_rh ? (
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="text-xs font-medium">Sim</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-red-600">
                                <ShieldX className="w-5 h-5" />
                                <span className="text-xs font-medium">Não</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleVerUsuario(usuario)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Ver detalhes e QR Code"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(usuario)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              {/* Não mostra botão de excluir para o próprio usuário ou outros Admin Master */}
                              {usuario.id !== user?.id && usuario.role !== 'super_admin' && (
                                <button
                                  onClick={() => setConfirmDelete(usuario)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir usuário"
                                  disabled={deletingId === usuario.id}
                                >
                                  {deletingId === usuario.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-5 h-5" />
                                  )}
                                </button>
                              )}
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
        </div>

        {/* LEGENDA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Legenda de Acessos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <span className="text-gray-700">
                <strong>Medições:</strong> Acesso ao sistema de medições de água e energia
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <span className="text-gray-700">
                <strong>RH:</strong> Acesso ao sistema de RH (Departamento Pessoal)
              </span>
            </div>
          </div>
        </div>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <UserX className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Excluir Usuário</h2>
                    <p className="text-sm text-red-100">Esta ação não pode ser desfeita</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-900 font-semibold mb-2">
                    Tem certeza que deseja excluir este usuário?
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-red-100">
                    <p className="font-bold text-gray-900">{confirmDelete.name || 'Sem nome'}</p>
                    <p className="text-sm text-gray-500">{confirmDelete.email}</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Atenção:</strong> O usuário será removido da tabela de perfis. 
                    Para exclusão completa do sistema de autenticação, pode ser necessário 
                    acessar o Supabase Dashboard.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-200 p-4 flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  disabled={deletingId}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteUser(confirmDelete.id)}
                  disabled={deletingId}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deletingId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Excluir Usuário
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE VISUALIZAÇÃO DO USUÁRIO E QR CODE */}
        {usuarioSelecionado && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4" onClick={handleFecharModal}>
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER DO MODAL */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Detalhes do Usuário</h2>
                    <p className="text-sm text-blue-100">{usuarioSelecionado.name || 'Sem nome'}</p>
                  </div>
                </div>
                <button
                  onClick={handleFecharModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Fechar"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* CONTEÚDO DO MODAL */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* INFORMAÇÕES DO USUÁRIO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nome</label>
                    <p className="text-gray-900 font-semibold">{usuarioSelecionado.name || 'Não informado'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Email</label>
                    <p className="text-gray-900 font-semibold flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {usuarioSelecionado.email || 'Não informado'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Role</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      usuarioSelecionado.role === 'admin' || usuarioSelecionado.role === 'super_admin' 
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {roleDisplayMap[usuarioSelecionado.role] || 'Usuário'}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Permissões</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {usuarioSelecionado.access_medicoes && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          Medições
                        </span>
                      )}
                      {usuarioSelecionado.access_dp_rh && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                          RH
                        </span>
                      )}
                      {!usuarioSelecionado.access_medicoes && !usuarioSelecionado.access_dp_rh && (
                        <span className="text-xs text-gray-500">Sem permissões específicas</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR CODE DO USUÁRIO */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-blue-600" />
                    QR Code de Login (Crachá)
                  </h3>
                  
                  {loadingToken ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-4" />
                      <p className="text-gray-500">Buscando QR Code...</p>
                    </div>
                  ) : tokenUsuario ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 sm:p-6 border-2 border-blue-200">
                        <QRCodeDisplay value={tokenUsuario.token} size={180} />
                      </div>
                      
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Token</label>
                          <button
                            onClick={copiarToken}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                          >
                            {tokenCopiado ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copiar Token
                              </>
                            )}
                          </button>
                        </div>
                        <code className="text-xs bg-white px-3 py-2 rounded-lg font-mono text-gray-700 block break-all border border-gray-200">
                          {tokenUsuario.token}
                        </code>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-green-900">QR Code Ativo</p>
                            <p className="text-xs text-green-700 mt-1">
                              Este QR Code pode ser usado para fazer login no sistema. Escaneie com o aplicativo para acessar.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center space-y-4">
                      <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto" />
                      <div>
                        <p className="text-yellow-900 font-semibold mb-2">QR Code não encontrado</p>
                        <p className="text-sm text-yellow-700 mb-4">
                          Este usuário ainda não possui um QR Code de login cadastrado.
                        </p>
                      </div>
                      <button
                        onClick={criarTokenUsuario}
                        disabled={loadingToken}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                      >
                        {loadingToken ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <QrCode className="w-5 h-5" />
                            Criar QR Code
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER DO MODAL */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-2xl flex justify-end">
                <button
                  onClick={handleFecharModal}
                  className="px-6 py-2 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
