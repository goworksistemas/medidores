import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Scanner } from '@yudiel/react-qr-scanner'
import { QrCode, X, Mail, Lock, UserPlus, Check } from 'lucide-react'
import MixedAnimation from '../components/MixedAnimation'
import LogoBranco from '../assets/Logotipo sistemas_BRANCO.svg'

export default function Login() {
  const { user, criarConta, loginComEmailSenha, loginViaQrCode } = useAuth()
  const navigate = useNavigate()
  
  const [isScanning, setIsScanning] = useState(false)
  const [scannerKey, setScannerKey] = useState(0) // Para forçar remontagem do scanner
  const [modoLogin, setModoLogin] = useState('email') // 'email', 'qr' ou 'criar'
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)

  // Redireciona se já estiver logado
  useEffect(() => {
    if (user && !loading) {
      console.log('[Login] Usuário autenticado, redirecionando...', user.tipo)
      // Pequeno delay para garantir que o estado foi atualizado (aumentado para mobile)
      const timer = setTimeout(() => {
        navigate('/', { replace: true })
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [user, loading, navigate])

  const handleCriarConta = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    
    if (!nome || !email || !senha || !confirmarSenha) {
      setErro('Por favor, preencha todos os campos.')
      return
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    const res = await criarConta(nome, email, senha)
    
    if (res.success) {
      setSucesso(res.message || 'Conta criada! Aguarde liberação de acesso pelo administrador.')
      setLoading(false)
      // Limpa o formulário
      setEmail('')
      setNome('')
      setSenha('')
      setConfirmarSenha('')
      // Muda para aba de login após 3 segundos
      setTimeout(() => {
        setModoLogin('email')
        setSucesso('')
      }, 4000)
    } else {
      setErro(res.message || 'Erro ao criar conta. Tente novamente.')
      setLoading(false)
    }
  }

  const handleLoginEmailSenha = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    
    if (!email || !senha) {
      setErro('Por favor, preencha todos os campos.')
      return
    }

    setLoading(true)
    try {
      const res = await loginComEmailSenha(email, senha)
      
      if (res.success) {
        setSucesso('Login realizado! Redirecionando...')
        // Aguarda um pouco para garantir que o estado foi atualizado
        await new Promise(resolve => setTimeout(resolve, 300))
        // Redireciona explicitamente
        navigate('/', { replace: true })
      } else {
        setErro(res.message || 'Erro ao fazer login. Verifique suas credenciais.')
        setLoading(false)
      }
    } catch (error) {
      console.error('[Login] Erro no handleLoginEmailSenha:', error)
      setErro('Erro inesperado ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }


  // Função auxiliar para validar formato de token
  function validarFormatoToken(token) {
    if (!token || typeof token !== 'string') return false
    const tokenLimpo = token.trim()
    // Aceita UUIDs ou strings alfanuméricas com pelo menos 4 caracteres
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const tokenRegex = /^[a-zA-Z0-9_-]{4,}$/
    return uuidRegex.test(tokenLimpo) || tokenRegex.test(tokenLimpo)
  }

  // Função para lidar com erros do scanner
  const handleScannerError = (error) => {
    console.error('[Login] Erro no scanner:', error)
    let mensagemErro = 'Erro ao acessar a câmera.'
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      mensagemErro = 'Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.'
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      mensagemErro = 'Nenhuma câmera encontrada. Verifique se há uma câmera conectada.'
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      mensagemErro = 'Câmera já está em uso por outro aplicativo.'
    } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      mensagemErro = 'Câmera não suporta os requisitos necessários.'
    }
    
    setErro(mensagemErro)
    setIsScanning(false)
    setLoading(false)
  }

  const handleScan = async (result) => {
    if (!result || !Array.isArray(result) || result.length === 0) {
      setErro('QR Code não detectado. Tente novamente.')
      return
    }

    let tokenLido = null
    
    // Tenta extrair o token de diferentes formatos possíveis
    try {
      if (result[0].rawValue) {
        tokenLido = result[0].rawValue
      } else if (result[0].text) {
        tokenLido = result[0].text
      } else if (typeof result[0] === 'string') {
        tokenLido = result[0]
      } else {
        setErro('Formato de QR Code não reconhecido.')
        return
      }
    } catch (err) {
      console.error('[Login] Erro ao extrair token:', err)
      setErro('Erro ao ler QR Code. Tente novamente.')
      return
    }

    // Valida formato do token
    if (!validarFormatoToken(tokenLido)) {
      setErro('QR Code inválido. Verifique se está escaneando o código correto.')
      setIsScanning(false)
      return
    }
    
    setIsScanning(false) // Fecha camera
    setLoading(true)
    setErro('')
    setSucesso('')
    
    try {
      const res = await loginViaQrCode(tokenLido)
      
      if (res.success) {
        setSucesso('QR Code validado! Redirecionando...')
        // Aguarda um pouco para garantir que o estado foi atualizado
        await new Promise(resolve => setTimeout(resolve, 300))
        // Redireciona explicitamente
        navigate('/', { replace: true })
      } else {
        setErro(res.message || 'QR Code não reconhecido no sistema.')
        setLoading(false)
      }
    } catch (error) {
      console.error('[Login] Erro no handleScan:', error)
      setErro('Erro inesperado ao validar QR Code. Tente novamente.')
      setLoading(false)
    }
  }

  // Memoiza a animação para que ela não seja recriada a cada renderização do formulário.
  // Isso impede que a animação "pisque" ou reinicie ao digitar nos campos.
  const backgroundAnimation = useMemo(() => <MixedAnimation />, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animação Mista - Chuva + Raios */}
      {backgroundAnimation}
      
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative z-10">
        
        {/* Header Visual */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-center">
          <div className="flex flex-col items-center justify-center mb-4">
            <img src={LogoBranco} alt="MensureGo Logo" className="w-24 h-24 object-contain mb-2" />
            <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent drop-shadow-lg">
              MensureGo
            </h1>
          </div>
          <p className="text-blue-100 text-sm mt-1">Gestão de Utilidades</p>
        </div>

        <div className="p-8">
          
          {/* MODO SCANNER ATIVO */}
          {isScanning ? (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-sm relative">
                <p className="text-white text-center mb-4 font-semibold">
                  Aponte para o QR Code de Acesso
                </p>
                
                <div className="rounded-xl overflow-hidden border-2 border-cyan-400">
                  <Scanner 
                    key={scannerKey}
                    onScan={handleScan}
                    onError={handleScannerError}
                    scanDelay={500}
                    allowMultiple={false}
                    constraints={{
                      facingMode: 'environment' // Prefere câmera traseira
                    }}
                  />
                </div>

                <button 
                  onClick={() => {
                    setIsScanning(false)
                    setErro('')
                  }}
                  className="mt-8 mx-auto flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all border border-white/20"
                >
                  <X className="w-5 h-5" /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            
            /* MODO SELEÇÃO DE LOGIN */
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Bem-vindo</h2>
                <p className="text-gray-500 text-sm">Escolha como deseja entrar</p>
              </div>

              {/* Tabs para alternar entre Email, Criar Conta e QR Code */}
              <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => {
                    setModoLogin('email')
                    setErro('')
                    setSucesso('')
                    setNome('')
                    setEmail('')
                    setSenha('')
                    setConfirmarSenha('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                    modoLogin === 'email'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    setModoLogin('criar')
                    setErro('')
                    setSucesso('')
                    setNome('')
                    setEmail('')
                    setSenha('')
                    setConfirmarSenha('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                    modoLogin === 'criar'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Criar Conta
                </button>
                <button
                  onClick={() => {
                    setModoLogin('qr')
                    setErro('')
                    setSucesso('')
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                    modoLogin === 'qr'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  QR Code
                </button>
              </div>

              {erro && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center justify-center gap-2 border border-red-100">
                  <X className="w-4 h-4" /> {erro}
                </div>
              )}

              {sucesso && (
                <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl flex items-center justify-center gap-2 border border-green-100">
                  <Check className="w-4 h-4" /> {sucesso}
                </div>
              )}

              {/* Formulário de Criar Conta */}
              {modoLogin === 'criar' ? (
                <form onSubmit={handleCriarConta} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        disabled={loading}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        placeholder="Digite a senha novamente"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        disabled={loading}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <span className="animate-pulse">Criando conta...</span>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        Criar Conta
                      </>
                    )}
                  </button>
                </form>
              ) : modoLogin === 'email' ? (
                /* Formulário de Email e Senha */
                <form onSubmit={handleLoginEmailSenha} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <span className="animate-pulse">Entrando...</span>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Entrar
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Botão QR Code */
                <>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-medium">Operacional</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <button
                    onClick={async () => {
                      setErro('')
                      setSucesso('')
                      
                      // Verifica se há suporte para getUserMedia
                      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                        setErro('Seu navegador não suporta acesso à câmera. Use um navegador mais recente.')
                        return
                      }

                      // Tenta acessar a câmera para verificar permissões
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                        // Se conseguir, para o stream e abre o scanner
                        stream.getTracks().forEach(track => track.stop())
                        setScannerKey(prev => prev + 1) // Força remontagem do scanner
                        setIsScanning(true)
                      } catch (err) {
                        handleScannerError(err)
                      }
                    }}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <span className="animate-pulse">Validando...</span>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        Ler Crachá (QR Code)
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}