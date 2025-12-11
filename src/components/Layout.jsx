import { Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import BottomMenu from './BottomMenu'

export default function Layout() {
  const { tipoAtivo } = useTheme()

  return (
    <div className={`min-h-screen transition-all md:pb-0 pb-24 ${
      tipoAtivo === 'agua'
        ? 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100'
        : 'bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100'
    }`}>
      {/* Top Bar - Responsivo */}
      <header className={`text-white shadow-lg sticky top-0 z-40 transition-all ${
        tipoAtivo === 'agua'
          ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
          : 'bg-gradient-to-r from-orange-600 to-amber-600'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-wide">GOWORK</h1>
            <p className="text-xs sm:text-sm opacity-90 uppercase tracking-wider mt-1">Gestão de Utilidades</p>
          </div>
          <div className="text-xs sm:text-sm bg-white/20 px-4 py-2 rounded-full font-semibold hover:bg-white/30 transition-colors">
            Admin
          </div>
        </div>
      </header>

      {/* Conteúdo das Páginas - Responsivo */}
      <main className="min-h-screen md:min-h-[calc(100vh-120px)] transition-all">
        <Outlet />
      </main>

      {/* Menu Inferior - Apenas Mobile */}
      <div className="md:hidden">
        <BottomMenu />
      </div>
    </div>
  )
}