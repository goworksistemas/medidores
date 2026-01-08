import { createContext, useState, useContext, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const inicializadoRef = useRef(false)

  // Função auxiliar para validar formato de token (UUID ou string válida)
  function validarFormatoToken(token) {
    if (!token || typeof token !== 'string') return false
    // Aceita UUIDs ou strings alfanuméricas com pelo menos 8 caracteres
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const tokenRegex = /^[a-zA-Z0-9_-]{8,}$/
    return uuidRegex.test(token) || tokenRegex.test(token)
  }

  // Função para validar o token QR Code salvo
  async function validarTokenN1(token) {
    if (!validarFormatoToken(token)) {
      console.warn('[Auth] Token inválido:', token)
      sessionStorage.removeItem('gowork_token_n1')
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('tokens_acesso')
        .select('*')
        .eq('token', token.trim())
        .eq('ativo', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Token não encontrado
          console.warn('[Auth] Token não encontrado ou inativo')
        } else {
          console.error('[Auth] Erro ao buscar token:', error)
        }
        sessionStorage.removeItem('gowork_token_n1')
        setUser(null)
        setLoading(false)
        return
      }

      if (!data) {
        sessionStorage.removeItem('gowork_token_n1')
        setUser(null)
        setLoading(false)
        return
      }

      setUser({ 
        id: data.id, 
        role: 'n1', 
        nome: data.descricao || 'Usuário QR Code',
        tipo: 'qr_code' 
      })
      setLoading(false)
    } catch (error) {
      console.error('[Auth] Erro ao validar token:', error)
      sessionStorage.removeItem('gowork_token_n1')
      setUser(null)
      setLoading(false)
    }
  }

  // Função para carregar perfil do usuário autenticado
  async function carregarPerfilUsuario(userId) {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('name, role, email, photo, export, view, access_medicoes, access_dp_rh')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('[Auth] Erro ao buscar profile:', error.message)
      }

      return {
        id: userId,
        email: profileData?.email || null,
        nome: profileData?.name || null,
        role: profileData?.role || 'user',
        photo: profileData?.photo || null,
        export: profileData?.export || false,
        view: profileData?.view || false,
        access_medicoes: profileData?.access_medicoes ?? true,
        access_dp_rh: profileData?.access_dp_rh ?? false,
        tipo: 'email_senha'
      }
    } catch (error) {
      console.error('[Auth] Erro ao carregar perfil:', error)
      return null
    }
  }

  // Inicialização da autenticação
  useEffect(() => {
    if (inicializadoRef.current) return
    inicializadoRef.current = true

    async function inicializarAuth() {
      try {
        // Verifica se há token QR Code salvo primeiro
        const tokenSalvo = sessionStorage.getItem('gowork_token_n1')
        if (tokenSalvo) {
          await validarTokenN1(tokenSalvo)
          return
        }

        // Verifica sessão Supabase
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[Auth] Erro ao obter sessão:', error)
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          const perfil = await carregarPerfilUsuario(session.user.id)
          if (perfil) {
            setUser(perfil)
          } else {
            // Se não há perfil, ainda permite login básico
            setUser({
              id: session.user.id,
              email: session.user.email,
              nome: session.user.email,
              role: 'user',
              tipo: 'email_senha',
              access_medicoes: false,
              access_dp_rh: false
            })
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('[Auth] Erro na inicialização:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    inicializarAuth()

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignora eventos durante a inicialização
        if (!inicializadoRef.current) return

        if (event === 'SIGNED_IN' && session?.user) {
          setLoading(true)
          const perfil = await carregarPerfilUsuario(session.user.id)
          if (perfil) {
            setUser(perfil)
          }
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          // Limpa token QR Code também ao fazer logout
          sessionStorage.removeItem('gowork_token_n1')
          setUser(null)
          setLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Atualiza sessão sem recarregar tudo
          const perfil = await carregarPerfilUsuario(session.user.id)
          if (perfil) {
            setUser(perfil)
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Função para criar conta com email e senha
  async function criarConta(nome, email, senha) {
    try {
      // Validações básicas
      if (!nome || !email || !senha) {
        return { success: false, message: 'Todos os campos são obrigatórios.' }
      }

      if (senha.length < 6) {
        return { success: false, message: 'A senha deve ter pelo menos 6 caracteres.' }
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return { success: false, message: 'Email inválido.' }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: {
          data: { name: nome.trim() }
        }
      })

      if (authError) {
        console.error('[Auth] Erro ao criar conta:', authError)
        return { success: false, message: authError.message || 'Erro ao criar conta.' }
      }

      if (!authData.user) {
        return { success: false, message: 'Erro ao criar conta. Tente novamente.' }
      }

      // Cria profile com acesso NEGADO por padrão
      // O admin deve liberar o acesso manualmente depois
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: nome.trim(),
          email: email.trim().toLowerCase(),
          role: 'user',
          access_medicoes: false,  // Sem acesso por padrão
          access_dp_rh: false      // Sem acesso por padrão
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('[Auth] Erro ao criar profile:', profileError)
        // Não falha a criação da conta se o profile falhar, mas loga o erro
      }

      return { success: true, message: 'Conta criada! Aguarde liberação de acesso pelo administrador.' }
    } catch (error) {
      console.error('[Auth] Erro criarConta:', error)
      return { success: false, message: error.message || 'Erro inesperado ao criar conta.' }
    }
  }

  // Função para login com email e senha
  async function loginComEmailSenha(email, senha) {
    try {
      if (!email || !senha) {
        return { success: false, message: 'Email e senha são obrigatórios.' }
      }

      // Limpa qualquer token QR Code anterior
      sessionStorage.removeItem('gowork_token_n1')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha
      })

      if (error) {
        console.error('[Auth] Erro no login:', error)
        return { success: false, message: error.message || 'Credenciais inválidas.' }
      }

      if (!data.user) {
        return { success: false, message: 'Erro ao fazer login. Tente novamente.' }
      }

      // Carrega o perfil do usuário
      setLoading(true)
      const perfil = await carregarPerfilUsuario(data.user.id)
      if (perfil) {
        setUser(perfil)
      }
      setLoading(false)

      return { success: true }
    } catch (error) {
      console.error('[Auth] Erro loginComEmailSenha:', error)
      setLoading(false)
      return { success: false, message: error.message || 'Erro inesperado ao fazer login.' }
    }
  }

  // Função para validar o QR Code
  async function loginViaQrCode(tokenLido) {
    try {
      if (!tokenLido || typeof tokenLido !== 'string') {
        return { success: false, message: 'QR Code inválido.' }
      }

      const tokenLimpo = tokenLido.trim()
      
      if (!validarFormatoToken(tokenLimpo)) {
        return { success: false, message: 'Formato de QR Code inválido.' }
      }

      // Limpa qualquer sessão Supabase anterior
      await supabase.auth.signOut()

      const { data, error } = await supabase
        .from('tokens_acesso')
        .select('*')
        .eq('token', tokenLimpo)
        .eq('ativo', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, message: 'QR Code não encontrado ou inativo.' }
        }
        console.error('[Auth] Erro ao buscar token:', error)
        return { success: false, message: 'Erro ao validar QR Code. Tente novamente.' }
      }

      if (!data) {
        return { success: false, message: 'QR Code não encontrado ou inativo.' }
      }

      setUser({ 
        id: data.id, 
        role: 'n1', 
        nome: data.descricao || 'Usuário QR Code',
        tipo: 'qr_code' 
      })
      sessionStorage.setItem('gowork_token_n1', tokenLimpo)
      return { success: true }
    } catch (error) {
      console.error('[Auth] Erro loginViaQrCode:', error)
      return { success: false, message: error.message || 'Erro inesperado ao validar QR Code.' }
    }
  }

  async function logout() {
    try {
      // Limpa o token da sessão ANTES de deslogar do Supabase.
      // Isso evita que o onAuthStateChange re-autentique o usuário QR Code.
      sessionStorage.removeItem('gowork_token_n1')
      await supabase.auth.signOut()
      setUser(null)
      setLoading(false)
    } catch (error) {
      console.error('[Auth] Erro no logout:', error)
      // Mesmo com erro, limpa o estado local
      sessionStorage.removeItem('gowork_token_n1')
      setUser(null)
      setLoading(false)
    }
  }

  // Nova função para salvar leituras de água ou energia
  async function salvarLeitura(dadosLeitura) {
    try {
      if (!user) {
        return { success: false, message: 'Usuário não autenticado.' }
      }

      const { medidor_id, tipo, leitura, foto_url, observacao, justificativa } = dadosLeitura

      // Validações
      if (!medidor_id) {
        return { success: false, message: 'Medidor não selecionado.' }
      }

      if (tipo !== 'agua' && tipo !== 'energia') {
        return { success: false, message: 'Tipo de medidor inválido.' }
      }

      if (leitura === null || leitura === undefined || leitura === '') {
        return { success: false, message: 'Leitura não informada.' }
      }

      const leituraNum = Number(leitura)
      if (isNaN(leituraNum) || leituraNum < 0) {
        return { success: false, message: 'Valor de leitura inválido.' }
      }

      const tabela = tipo === 'agua' ? 'med_hidrometros' : 'med_energia'

      const dadosParaSalvar = {
        medidor_id,
        leitura: leituraNum,
        foto_url: foto_url || null,
        observacao: observacao || null,
        justificativa: justificativa || null,
        usuario: user.nome || user.email || 'Usuário desconhecido',
        // data_hora e created_at usarão o default do banco de dados
      }

      const { error } = await supabase.from(tabela).insert(dadosParaSalvar)

      if (error) {
        console.error(`[Auth] Erro ao salvar leitura em ${tabela}:`, error)
        return { success: false, message: `Erro ao salvar leitura: ${error.message || 'Erro desconhecido'}` }
      }

      return { success: true, message: 'Leitura salva com sucesso!' }
    } catch (error) {
      console.error('[Auth] Erro ao salvar leitura:', error)
      return { success: false, message: `Erro inesperado ao salvar leitura: ${error.message || 'Erro desconhecido'}` }
    }
  }

  return (
    <AuthContext.Provider value={{ user, criarConta, loginComEmailSenha, loginViaQrCode, logout, loading, salvarLeitura }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
