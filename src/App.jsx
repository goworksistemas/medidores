import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import { logger } from './utils/logger'

import Layout from './components/Layout'
import Leitura from './pages/Leitura'
import Historico from './pages/Historico'
import Dashboard from './pages/Dashboard'
import Login from './pages/login'
import OpcaoEntrada from './pages/OpcaoEntrada'
import GerenciarUsuarios from './pages/GerenciarUsuarios'
import GerenciarMedidores from './pages/GerenciarMedidores'

// Componente para proteger rotas
function RotaPrivada({ children }) {
  const { user, loading } = useAuth()
  const [timeoutReached, setTimeoutReached] = useState(false)
  const [forceRedirect, setForceRedirect] = useState(false)
  
  useEffect(() => {
    logger.debug('App', 'Estado da rota privada - loading:', loading, 'user:', user ? 'SIM' : 'NÃO')
  }, [loading, user])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        logger.warn('[App] Loading demorando mais que 2 segundos')
        setTimeoutReached(true)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [loading])
  
  useEffect(() => {
    const forceTimeout = setTimeout(() => {
      if (loading) {
        logger.error('[App] Timeout absoluto de autenticação: redirecionando para login')
        setForceRedirect(true)
      }
    }, 6000)
    return () => clearTimeout(forceTimeout)
  }, [loading])

  if (forceRedirect) {
    logger.error('[App] Forçando redirecionamento para login')
    return <Navigate to="/login" replace />
  }
  
  // Se está carregando, mostra loading
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 font-medium text-center">Verificando autenticação...</p>
        {timeoutReached && (
          <div className="mt-4 p-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl max-w-md text-center shadow-lg">
            <p className="text-base font-semibold text-yellow-900 mb-3">
              O carregamento está demorando mais que o esperado.
            </p>
            <p className="text-sm text-yellow-800 mb-4">
              Isso pode ser um problema de conexão. Tente novamente ou limpe os dados do navegador.
            </p>
            <button 
              onClick={() => {
                try {
                  localStorage.clear()
                  sessionStorage.clear()
                } catch (e) {
                  logger.warn('[App] Erro ao limpar storage:', e)
                }
                window.location.href = '/login'
              }} 
              className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
              Ir para Login
            </button>
          </div>
        )}
      </div>
    )
  }
  
  if (!user) {
    logger.debug('App', 'Nenhum usuário encontrado, redirecionando para login')
    return <Navigate to="/login" replace />
  }
  
  logger.debug('App', 'Usuário autenticado:', user.tipo, user.nome)
  
  // Usuário autenticado pode acessar o sistema
  // O controle de acesso (Medições/RH) é feito pela tela de Gerenciar Usuários
  return children
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <RotaPrivada>
                  <Layout />
                </RotaPrivada>
              }>
                <Route index element={<OpcaoEntrada />} />
                <Route path="leitura" element={<Leitura />} />
                <Route path="historico" element={<Historico />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="usuarios" element={<GerenciarUsuarios />} />
                <Route path="medidores" element={<GerenciarMedidores />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App