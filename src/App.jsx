import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Leitura from './pages/Leitura'
import Historico from './pages/Historico'  // <--- Descomentado
import Dashboard from './pages/Dashboard'  // <--- Descomentado

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Leitura />} />
            <Route path="historico" element={<Historico />} /> {/* <--- Descomentado */}
            <Route path="dashboard" element={<Dashboard />} /> {/* <--- Descomentado */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App