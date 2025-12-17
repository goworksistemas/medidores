import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, LayoutDashboard, List, PlusSquare } from 'lucide-react'
import BottomMenu from './BottomMenu'
import ChuvaAnimation from './ChuvaAnimation'
import RaiosAnimation from './RaiosAnimation'

export default function Layout() {
  const { tipoAtivo } = useTheme()
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Função para saber qual link está ativo e mudar a cor
  const getLinkClass = (path) => {
    const isActive = location.pathname === path
    const baseClass = "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
    
    if (tipoAtivo === 'agua') {
      return isActive 
        ? "bg-white/20 text-white shadow-sm" 
        : "text-blue-100 hover:bg-white/10 hover:text-white"
    } else {
      return isActive 
        ? "bg-yellow-600/20 text-yellow-900 shadow-sm" 
        : "text-yellow-800/70 hover:bg-yellow-600/10 hover:text-yellow-900"
    }
  }

  return (
    <div className={`min-h-screen transition-all md:pb-0 pb-24 ${
      tipoAtivo === 'agua'
        ? 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100'
        : 'bg-gradient-to-br from-slate-50 via-yellow-50/30 to-slate-100'
    }`}>
      
      {/* HEADER SUPERIOR (DESKTOP) */}
      <header className={`shadow-lg sticky top-0 z-40 transition-all relative ${
        tipoAtivo === 'agua'
          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
          : 'bg-gradient-to-r from-yellow-300 to-yellow-400 text-yellow-900'
      }`}>
        
        {/* Animação de fundo */}
        {tipoAtivo === 'agua' ? <ChuvaAnimation /> : <RaiosAnimation />}
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between relative z-10">
          
          {/* Logo e Título */}
          <div className="flex items-center gap-8">
            <div>
              <h1 className={`text-2xl font-bold tracking-wide transition-colors ${
                tipoAtivo === 'agua' ? 'text-white' : 'text-yellow-700'
              }`}>
                GOWORK
              </h1>
              <p className={`text-[10px] sm:text-xs uppercase tracking-wider opacity-90 ${
                tipoAtivo === 'agua' ? 'text-blue-100' : 'text-yellow-800'
              }`}>
                {user?.nome || 'Gestão de Utilidades'}
              </p>
            </div>

            {/* MENU DE NAVEGAÇÃO (Visível apenas Desktop) */}
            <nav className="hidden md:flex items-center gap-2">
              <Link to="/leitura" className={getLinkClass('/leitura')}>
                <PlusSquare className="w-4 h-4" /> Nova Leitura
              </Link>
              <Link to="/historico" className={getLinkClass('/historico')}>
                <List className="w-4 h-4" /> Histórico
              </Link>
              <Link to="/dashboard" className={getLinkClass('/dashboard')}>
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
            </nav>
          </div>

          {/* Lado Direito: Perfil e Logout */}
          <div className="flex items-center gap-3">
            <div className={`text-xs px-3 py-1 rounded-full font-semibold border ${
              tipoAtivo === 'agua'
                ? 'bg-blue-700/30 border-blue-400/30 text-white'
                : 'bg-yellow-600/10 border-yellow-600/20 text-yellow-800'
            }`}>
              {user?.role === 'n1' ? 'Operacional' : 'Admin'}
            </div>

            <button 
              onClick={handleLogout}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                tipoAtivo === 'agua'
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-yellow-600/20 text-yellow-900 hover:bg-yellow-700/30'
              }`}
              title="Sair do sistema"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO DA PÁGINA */}
      <main className="min-h-[calc(100vh-80px)] transition-all">
        <Outlet />
      </main>

      {/* MENU INFERIOR (Visível apenas Mobile) */}
      <div className="md:hidden">
        <BottomMenu />
      </div>
    </div>
  )
}