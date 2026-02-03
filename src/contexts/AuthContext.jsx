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

  // Função auxiliar para limpar dados de autenticação QR Code
  function limparDadosQRCode() {
    try {
      localStorage.removeItem('gowork_token_n1')
      localStorage.removeItem('gowork_user_data')
    } catch (e) {
      console.warn('[Auth] Erro ao limpar dados QR Code:', e)
    }
  }

  // Função para validar o token QR Code salvo
  // Retorna true se validado com sucesso, false caso contrário
  async function validarTokenN1(token) {
    console.log('[Auth] Validando token QR Code:', token.substring(0, 8) + '...')
    
    if (!validarFormatoToken(token)) {
      console.warn('[Auth] Token inválido:', token)
      limparDadosQRCode()
      setUser(null)
      setLoading(false)
      return false
    }

    try {
      // Adiciona timeout para a requisição (com tratamento de erro melhorado)
      const queryPromise = supabase
        .from('tokens_acesso')
        .select('*')
        .eq('token', token.trim())
        .eq('ativo', true)
        .single()

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na validação do token')), 5000) // Aumentado para 5s
      )

      let queryResult
      try {
        queryResult = await Promise.race([queryPromise, timeoutPromise])
      } catch (raceError) {
        // Se for timeout ou erro de rede, NÃO remove o token imediatamente
        // Pode ser problema temporário de conexão
        console.error('[Auth] Erro na validação do token:', raceError)
        if (raceError.message && raceError.message.includes('Timeout')) {
          console.error('[Auth] Timeout na validação do token QR Code - mantendo token para retry')
        } else {
          console.error('[Auth] Erro de rede ou query - mantendo token para retry')
        }
        // Em caso de erro/timeout, mantém o token mas não autentica agora
        // A inicialização vai usar os dados salvos
        setUser(null)
        setLoading(false)
        return false
      }

      const { data, error } = queryResult || { data: null, error: null }

      if (error) {
        if (error.code === 'PGRST116') {
          // Token não encontrado ou inativo - remove do localStorage
          console.warn('[Auth] Token não encontrado ou inativo')
        } else {
          console.error('[Auth] Erro ao buscar token:', error)
        }
        limparDadosQRCode()
        setUser(null)
        setLoading(false)
        return false
      }

      if (!data) {
        console.warn('[Auth] Token não retornou dados')
        limparDadosQRCode()
        setUser(null)
        setLoading(false)
        return false
      }

      console.log('[Auth] Token QR Code validado com sucesso:', data.descricao)
      const userData = { 
        id: data.id, 
        role: 'n1', 
        nome: data.descricao || 'Usuário QR Code',
        tipo: 'qr_code' 
      }
      
      // Salva os dados do usuário junto com o token para persistência
      try {
        localStorage.setItem('gowork_user_data', JSON.stringify(userData))
      } catch (e) {
        console.warn('[Auth] Erro ao salvar dados do usuário:', e)
      }
      
      setUser(userData)
      setLoading(false)
      return true // Retorna true indicando sucesso
    } catch (error) {
      console.error('[Auth] Erro ao validar token:', error)
      // Em caso de erro inesperado, mantém o token para retry posterior
      // A inicialização vai usar os dados salvos se o token ainda existir
      console.log('[Auth] Erro na validação - mantendo token para retry (usando dados salvos)')
      setUser(null)
      setLoading(false)
      return false
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
          
          // Tenta carregar dados do usuário salvos (fallback se validação falhar)
          let userDataSalvo = null
          try {
            const userDataStr = localStorage.getItem('gowork_user_data')
            if (userDataStr) {
              userDataSalvo = JSON.parse(userDataStr)
              console.log('[Auth] Dados do usuário encontrados no localStorage')
            }
          } catch (e) {
            console.warn('[Auth] Erro ao ler dados do usuário salvos:', e)
          }
          
          // Aumenta o timeout de segurança para dar mais tempo para validação
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
            loadingTimeoutRef.current = null
          }
          // Novo timeout de 8 segundos para validação QR Code
          loadingTimeoutRef.current = setTimeout(() => {
            console.warn('[Auth] TIMEOUT: Usando dados salvos do usuário (validação demorou muito)')
            // Se há dados salvos, usa eles temporariamente
            if (userDataSalvo) {
              console.log('[Auth] Restaurando usuário dos dados salvos:', userDataSalvo.nome)
              setUser(userDataSalvo)
            }
            setLoading(false)
          }, 8000)
          
          // Valida o token QR Code
          const validado = await validarTokenN1(tokenSalvo)
          
          // Limpa o timeout de segurança se ainda estiver ativo
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
            loadingTimeoutRef.current = null
          }
          
          // Se validado com sucesso, não precisa verificar sessão Supabase
          if (validado) {
            console.log('[Auth] Token QR Code validado - autenticação concluída')
            return
          }
          
          // Se não foi validado, verifica se o token ainda existe no localStorage
          // (pode ter sido removido pela função validarTokenN1)
          try {
            const tokenAindaExiste = localStorage.getItem('gowork_token_n1')
            if (!tokenAindaExiste) {
              console.log('[Auth] Token removido - continuando para verificação de sessão Supabase')
              // Remove também os dados salvos
              limparDadosQRCode()
              // Token foi removido, continua para verificar sessão Supabase
            } else {
              console.log('[Auth] Token mantido mas não validado - usando dados salvos temporariamente')
              // Token mantido mas não validado (timeout de rede), usa dados salvos
              // Isso permite que o usuário continue logado mesmo com problemas de conexão
              if (userDataSalvo) {
                console.log('[Auth] Restaurando usuário dos dados salvos (validação falhou por timeout/rede):', userDataSalvo.nome)
                setUser(userDataSalvo)
                setLoading(false)
                // Tenta validar em background (não bloqueia)
                validarTokenN1(tokenAindaExiste).then(validado => {
                  if (validado) {
                    console.log('[Auth] Token validado em background - dados atualizados')
                  } else {
                    console.warn('[Auth] Token ainda não validado em background - mantendo dados salvos')
                  }
                }).catch(err => {
                  console.warn('[Auth] Erro na validação em background:', err)
                })
                return
              } else {
                console.warn('[Auth] Token mantido mas sem dados salvos - tentando validar novamente...')
                // Tenta validar novamente com timeout menor
                const retryValidado = await Promise.race([
                  validarTokenN1(tokenAindaExiste),
                  new Promise((resolve) => setTimeout(() => resolve(false), 3000))
                ])
                
                if (retryValidado) {
                  console.log('[Auth] Token QR Code validado no retry - autenticação concluída')
                  return
                } else {
                  console.warn('[Auth] Token não validado mesmo após retry - sem autenticação')
                  setUser(null)
                  setLoading(false)
                  return
                }
              }
            }
          } catch (e) {
            console.warn('[Auth] Erro ao verificar token:', e)
            // Em caso de erro, tenta usar dados salvos
            if (userDataSalvo) {
              console.log('[Auth] Usando dados salvos devido a erro:', userDataSalvo.nome)
              setUser(userDataSalvo)
              setLoading(false)
              return
            }
            // Se não há dados salvos, continua para verificar sessão Supabase
          }
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

        // Verifica se há token QR Code salvo ANTES de processar qualquer evento
        let tokenQRCode = null
        try {
          tokenQRCode = localStorage.getItem('gowork_token_n1')
        } catch (e) {
          console.warn('[Auth] Erro ao verificar token QR Code:', e)
        }

        // Se há token QR Code salvo, não processa eventos do Supabase Auth
        // EXCETO SIGNED_OUT que deve limpar tudo
        if (tokenQRCode && event !== 'SIGNED_OUT') {
          console.log('[Auth] Token QR Code ativo - ignorando evento Supabase Auth:', event)
          return
        }

        if (event === 'SIGNED_IN' && session?.user) {
          // Só processa se não houver token QR Code
          if (tokenQRCode) {
            console.log('[Auth] Ignorando SIGNED_IN - token QR Code ativo')
            return
          }
          
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
          // Limpa token QR Code e dados do usuário ao fazer logout do Supabase
          console.log('[Auth] SIGNED_OUT - limpando token QR Code e dados do usuário')
          limparDadosQRCode()
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
          } else {
            console.log('[Auth] Ignorando TOKEN_REFRESHED - token QR Code ativo')
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

      // Cria profile com acesso LIBERADO ao sistema de Medições por padrão
      // O admin pode depois ajustar os acessos (Medições e/ou RH)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: nome.trim(),
          email: email.trim().toLowerCase(),
          role: 'user',
          access_medicoes: true,   // Acesso liberado por padrão
          access_dp_rh: false,     // Sem acesso ao RH por padrão
          allowed_tabs: []         // Sem abas liberadas no RH por padrão
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('[Auth] Erro ao criar profile:', profileError)
        // Não falha a criação da conta se o profile falhar, mas loga o erro
      }

      return { success: true, message: 'Conta criada com sucesso! Você já pode acessar o sistema.' }
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
      limparDadosQRCode()

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
        limparDadosQRCode()
        if (error.code === 'PGRST116') {
          return { success: false, message: 'QR Code não encontrado ou inativo.' }
        }
        console.error('[Auth] Erro ao buscar token:', error)
        return { success: false, message: 'Erro ao validar QR Code. Tente novamente.' }
      }

      if (!data) {
        processandoLoginRef.current = false
        limparDadosQRCode()
        return { success: false, message: 'QR Code não encontrado ou inativo.' }
      }

      setLoading(true)
      
      // Cria objeto com dados do usuário para persistência
      const userData = { 
        id: data.id, 
        role: 'n1', 
        nome: data.descricao || 'Usuário QR Code',
        tipo: 'qr_code' 
      }
      
      // IMPORTANTE: Salva o token E os dados do usuário ANTES de setar o usuário
      // Isso garante que a persistência funcione mesmo se houver erro depois
      try {
        localStorage.setItem('gowork_token_n1', tokenLimpo)
        localStorage.setItem('gowork_user_data', JSON.stringify(userData))
        console.log('[Auth] Token QR Code e dados do usuário salvos no localStorage:', tokenLimpo.substring(0, 8) + '...')
      } catch (e) {
        console.error('[Auth] Erro ao salvar no localStorage:', e)
        // Se não conseguir salvar, ainda permite login mas sem persistência
        if (e.name === 'QuotaExceededError') {
          console.warn('[Auth] Quota do localStorage excedida - login sem persistência')
        }
      }
      
      // Define o usuário após salvar o token e dados
      setUser(userData)
      
      // Aguarda um ciclo de renderização para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 200))
      
      setLoading(false)
      processandoLoginRef.current = false
      console.log('[Auth] Login QR Code concluído com sucesso')
      return { success: true }
    } catch (error) {
      console.error('[Auth] Erro loginViaQrCode:', error)
      // Em caso de erro após salvar o token, remove para evitar estado inconsistente
      limparDadosQRCode()
      setUser(null)
      setLoading(false)
      processandoLoginRef.current = false
      return { success: false, message: error.message || 'Erro inesperado ao validar QR Code.' }
    }
  }

  async function logout() {
    try {
      console.log('[Auth] Fazendo logout...')
      // Limpa o token e dados do usuário ANTES de deslogar do Supabase.
      // Isso evita que o onAuthStateChange re-autentique o usuário QR Code.
      limparDadosQRCode()
      await supabase.auth.signOut()
      setUser(null)
      setLoading(false)
      processandoLoginRef.current = false
      console.log('[Auth] Logout concluído')
    } catch (error) {
      console.error('[Auth] Erro no logout:', error)
      // Mesmo com erro, limpa o estado local
      limparDadosQRCode()
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
