import { createContext, useState, useContext, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const inicializadoRef = useRef(false)
  const processandoLoginRef = useRef(false) // Evita conflitos durante login manual
  const loadingTimeoutRef = useRef(null) // Ref para timeout de segurança

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
    console.log('[Auth] Validando token QR Code:', token.substring(0, 8) + '...')
    
    if (!validarFormatoToken(token)) {
      console.warn('[Auth] Token inválido:', token)
      try {
        localStorage.removeItem('gowork_token_n1')
      } catch (e) {
        console.warn('[Auth] Erro ao remover token:', e)
      }
      setUser(null)
      setLoading(false)
      return
    }

    try {
      // Adiciona timeout para a requisição (com tratamento de erro melhorado)
      const queryPromise = supabase
        .from('tokens_acesso')
        .select('*')
        .eq('token', token.trim())
        .eq('ativo', true)
        .single()
        .catch(err => {
          console.error('[Auth] Erro na query do token:', err)
          throw err
        })

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na validação do token')), 3000)
      )

      let queryResult
      try {
        queryResult = await Promise.race([queryPromise, timeoutPromise])
      } catch (raceError) {
        // Se for timeout ou erro de rede, trata aqui
        if (raceError.message.includes('Timeout')) {
          console.error('[Auth] Timeout na validação do token QR Code')
        } else {
          console.error('[Auth] Erro na validação do token:', raceError)
        }
        try {
          localStorage.removeItem('gowork_token_n1')
        } catch (e) {
          console.warn('[Auth] Erro ao remover token:', e)
        }
        setUser(null)
        setLoading(false)
        return
      }

      const { data, error } = queryResult

      if (error) {
        if (error.code === 'PGRST116') {
          // Token não encontrado
          console.warn('[Auth] Token não encontrado ou inativo')
        } else {
          console.error('[Auth] Erro ao buscar token:', error)
        }
        try {
          localStorage.removeItem('gowork_token_n1')
        } catch (e) {
          console.warn('[Auth] Erro ao remover token:', e)
        }
        setUser(null)
        setLoading(false)
        return
      }

      if (!data) {
        console.warn('[Auth] Token não retornou dados')
        try {
          localStorage.removeItem('gowork_token_n1')
        } catch (e) {
          console.warn('[Auth] Erro ao remover token:', e)
        }
        setUser(null)
        setLoading(false)
        return
      }

      console.log('[Auth] Token QR Code validado com sucesso:', data.descricao)
      setUser({ 
        id: data.id, 
        role: 'n1', 
        nome: data.descricao || 'Usuário QR Code',
        tipo: 'qr_code' 
      })
      setLoading(false)
    } catch (error) {
      console.error('[Auth] Erro ao validar token:', error)
      try {
        localStorage.removeItem('gowork_token_n1')
      } catch (e) {
        console.warn('[Auth] Erro ao remover token:', e)
      }
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

    // Timeout de segurança - força finalização do loading após 4 segundos
    // Garante que o loading sempre termina, mesmo em caso de erro de rede
    loadingTimeoutRef.current = setTimeout(() => {
      console.error('[Auth] TIMEOUT: Forçando finalização do loading após 4 segundos')
      setLoading(false)
    }, 4000)

    async function inicializarAuth() {
      try {
        console.log('[Auth] Iniciando autenticação...')
        
        // Aguarda um pouco para garantir que o localStorage está disponível (especialmente no mobile)
        await new Promise(resolve => setTimeout(resolve, 100))

        // Verifica se há token QR Code salvo primeiro (localStorage persiste entre sessões)
        let tokenSalvo = null
        try {
          tokenSalvo = localStorage.getItem('gowork_token_n1')
          console.log('[Auth] Token QR Code encontrado:', tokenSalvo ? 'SIM' : 'NÃO')
        } catch (e) {
          console.warn('[Auth] Erro ao acessar localStorage:', e)
        }

        if (tokenSalvo) {
          console.log('[Auth] Validando token QR Code...')
          // Adiciona timeout para validação do token (reduzido para mobile)
          const validacaoPromise = validarTokenN1(tokenSalvo)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na validação do token')), 2500)
          )
          
          try {
            await Promise.race([validacaoPromise, timeoutPromise])
          } catch (error) {
            console.error('[Auth] Erro ou timeout na validação do token:', error)
            setUser(null)
            setLoading(false)
          }
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
            loadingTimeoutRef.current = null
          }
          return
        }

        // Verifica sessão Supabase (usa localStorage automaticamente)
        console.log('[Auth] Verificando sessão Supabase...')
        
        // Adiciona timeout para getSession (reduzido para mobile)
        const sessionPromise = supabase.auth.getSession()
          .catch(err => {
            console.error('[Auth] Erro na chamada getSession:', err)
            throw err
          })
        
        const sessionTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao obter sessão')), 2500)
        )
        
        let sessionResult
        try {
          sessionResult = await Promise.race([sessionPromise, sessionTimeoutPromise])
        } catch (error) {
          console.error('[Auth] Erro ou timeout ao obter sessão:', error)
          setUser(null)
          setLoading(false)
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
            loadingTimeoutRef.current = null
          }
          return
        }
        
        const { data: { session }, error } = sessionResult || { data: { session: null }, error: null }
        
        if (error) {
          console.error('[Auth] Erro ao obter sessão:', error)
          setUser(null)
          setLoading(false)
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
            loadingTimeoutRef.current = null
          }
          return
        }

        console.log('[Auth] Sessão Supabase:', session ? 'ENCONTRADA' : 'NÃO ENCONTRADA')

        if (session?.user) {
          console.log('[Auth] Carregando perfil do usuário:', session.user.id)
          
          // Adiciona timeout para carregar perfil (reduzido para mobile)
          const perfilPromise = carregarPerfilUsuario(session.user.id)
            .catch(err => {
              console.error('[Auth] Erro ao carregar perfil:', err)
              return null // Retorna null em caso de erro
            })
          
          const perfilTimeoutPromise = new Promise((resolve) => 
            setTimeout(() => resolve(null), 2500)
          )
          
          let perfil
          try {
            perfil = await Promise.race([perfilPromise, perfilTimeoutPromise])
          } catch (error) {
            console.error('[Auth] Erro ao processar perfil:', error)
            perfil = null
          }
          
          if (perfil) {
            console.log('[Auth] Perfil carregado:', perfil.nome)
            setUser(perfil)
          } else {
            // Se não há perfil ou timeout, ainda permite login básico
            console.log('[Auth] Perfil não encontrado ou timeout, usando dados básicos')
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
          setLoading(false)
        } else {
          console.log('[Auth] Nenhuma sessão encontrada')
          setUser(null)
          setLoading(false)
        }
        
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
          loadingTimeoutRef.current = null
        }
      } catch (error) {
        console.error('[Auth] Erro na inicialização:', error)
        setUser(null)
        setLoading(false)
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
          loadingTimeoutRef.current = null
        }
      }
    }

    inicializarAuth()
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignora eventos durante a inicialização
        if (!inicializadoRef.current) return
        
        // Ignora eventos SIGNED_IN se já estamos processando um login manual
        if (event === 'SIGNED_IN' && processandoLoginRef.current) {
          return
        }

        // Se há token QR Code salvo, não processa eventos do Supabase Auth
        const tokenQRCode = localStorage.getItem('gowork_token_n1')
        if (tokenQRCode && event !== 'SIGNED_OUT') {
          return
        }

        if (event === 'SIGNED_IN' && session?.user) {
          setLoading(true)
          try {
            // Adiciona timeout para carregar perfil
            const perfilPromise = carregarPerfilUsuario(session.user.id)
            const perfilTimeoutPromise = new Promise((resolve) => 
              setTimeout(() => resolve(null), 3000)
            )
            
            const perfil = await Promise.race([perfilPromise, perfilTimeoutPromise])
            
            if (perfil) {
              setUser(perfil)
            } else {
              // Se não há perfil ou timeout, ainda permite login básico
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
          } catch (error) {
            console.error('[Auth] Erro ao processar SIGNED_IN:', error)
            // Em caso de erro, ainda permite login básico
            setUser({
              id: session.user.id,
              email: session.user.email,
              nome: session.user.email,
              role: 'user',
              tipo: 'email_senha',
              access_medicoes: false,
              access_dp_rh: false
            })
          } finally {
            setLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          // Limpa token QR Code também ao fazer logout
          localStorage.removeItem('gowork_token_n1')
          setUser(null)
          setLoading(false)
          processandoLoginRef.current = false
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Atualiza sessão sem recarregar tudo (apenas se não houver QR Code ativo)
          if (!tokenQRCode) {
            const perfil = await carregarPerfilUsuario(session.user.id)
            if (perfil) {
              setUser(perfil)
            }
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
          data: { name: nome.trim() },
          // Desabilita a necessidade de confirmação de e-mail.
          // O usuário poderá fazer login imediatamente após criar a conta,
          // mas ainda dependerá da liberação de acesso pelo administrador.
          email_confirm: false
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

      // Marca que estamos processando um login manual
      processandoLoginRef.current = true

      // Limpa qualquer token QR Code anterior
      try {
        localStorage.removeItem('gowork_token_n1')
      } catch (e) {
        console.warn('[Auth] Erro ao remover token QR Code:', e)
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha
      })

      if (error) {
        console.error('[Auth] Erro no login:', error)
        processandoLoginRef.current = false
        return { success: false, message: error.message || 'Credenciais inválidas.' }
      }

      if (!data.user) {
        processandoLoginRef.current = false
        return { success: false, message: 'Erro ao fazer login. Tente novamente.' }
      }

      // Carrega o perfil do usuário
      setLoading(true)
      const perfil = await carregarPerfilUsuario(data.user.id)
      if (perfil) {
        setUser(perfil)
        // Aguarda um ciclo de renderização para garantir que o estado foi atualizado
        await new Promise(resolve => setTimeout(resolve, 150))
      } else {
        // Se não há perfil, ainda permite login básico
        setUser({
          id: data.user.id,
          email: data.user.email,
          nome: data.user.email,
          role: 'user',
          tipo: 'email_senha',
          access_medicoes: false,
          access_dp_rh: false
        })
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      setLoading(false)
      processandoLoginRef.current = false

      return { success: true }
    } catch (error) {
      console.error('[Auth] Erro loginComEmailSenha:', error)
      setLoading(false)
      processandoLoginRef.current = false
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

      // Marca que estamos processando um login manual
      processandoLoginRef.current = true

      // Limpa qualquer sessão Supabase anterior
      await supabase.auth.signOut()

      const { data, error } = await supabase
        .from('tokens_acesso')
        .select('*')
        .eq('token', tokenLimpo)
        .eq('ativo', true)
        .single()

      if (error) {
        processandoLoginRef.current = false
        localStorage.removeItem('gowork_token_n1')
        if (error.code === 'PGRST116') {
          return { success: false, message: 'QR Code não encontrado ou inativo.' }
        }
        console.error('[Auth] Erro ao buscar token:', error)
        return { success: false, message: 'Erro ao validar QR Code. Tente novamente.' }
      }

      if (!data) {
        processandoLoginRef.current = false
        localStorage.removeItem('gowork_token_n1')
        return { success: false, message: 'QR Code não encontrado ou inativo.' }
      }

      setLoading(true)
      setUser({ 
        id: data.id, 
        role: 'n1', 
        nome: data.descricao || 'Usuário QR Code',
        tipo: 'qr_code' 
      })
      // Salva em localStorage para persistir entre sessões
      try {
        localStorage.setItem('gowork_token_n1', tokenLimpo)
        console.log('[Auth] Token QR Code salvo no localStorage')
      } catch (e) {
        console.error('[Auth] Erro ao salvar token no localStorage:', e)
        // Continua mesmo se não conseguir salvar (pode ser problema de quota)
      }
      // Aguarda um ciclo de renderização para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 200))
      setLoading(false)
      processandoLoginRef.current = false
      console.log('[Auth] Login QR Code concluído com sucesso')
      return { success: true }
    } catch (error) {
      console.error('[Auth] Erro loginViaQrCode:', error)
      setLoading(false)
      processandoLoginRef.current = false
      return { success: false, message: error.message || 'Erro inesperado ao validar QR Code.' }
    }
  }

  async function logout() {
    try {
      console.log('[Auth] Fazendo logout...')
      // Limpa o token da sessão ANTES de deslogar do Supabase.
      // Isso evita que o onAuthStateChange re-autentique o usuário QR Code.
      try {
        localStorage.removeItem('gowork_token_n1')
      } catch (e) {
        console.warn('[Auth] Erro ao remover token no logout:', e)
      }
      await supabase.auth.signOut()
      setUser(null)
      setLoading(false)
      processandoLoginRef.current = false
      console.log('[Auth] Logout concluído')
    } catch (error) {
      console.error('[Auth] Erro no logout:', error)
      // Mesmo com erro, limpa o estado local
      try {
        localStorage.removeItem('gowork_token_n1')
      } catch (e) {
        console.warn('[Auth] Erro ao remover token:', e)
      }
      setUser(null)
      setLoading(false)
      processandoLoginRef.current = false
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
