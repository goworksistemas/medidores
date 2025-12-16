import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext' // <--- Import novo

import Layout from './components/Layout'
import Leitura from './pages/Leitura'
import Historico from './pages/Historico'
import Dashboard from './pages/Dashboard'
import Login from './pages/login' // <--- Import novo

// Componente para proteger rotas
function RotaPrivada({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  
  if (!user) {
    return <Navigate to="/login" />
  }

  return children
}

function App() {
  return (
    <AuthProvider> {/* <--- Envolve tudo */}
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <RotaPrivada>
                <Layout />
              </RotaPrivada>
            }>
              <Route index element={<Leitura />} />
              <Route path="historico" element={<Historico />} />
              <Route path="dashboard" element={<Dashboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App