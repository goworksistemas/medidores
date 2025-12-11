import { Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import BottomMenu from './BottomMenu'
import ChuvaAnimation from './ChuvaAnimation'
import RaiosAnimation from './RaiosAnimation'

export default function Layout() {
  const { tipoAtivo } = useTheme()

  return (
    <div className={`min-h-screen transition-all md:pb-0 pb-24 ${
      tipoAtivo === 'agua'
        ? 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100'
        : 'bg-gradient-to-br from-slate-50 via-yellow-50/30 to-slate-100'
    }`}>
      {/* Top Bar - Responsivo */}
      <header className={`shadow-lg sticky top-0 z-40 transition-all relative ${
        tipoAtivo === 'agua'
          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
          : 'bg-gradient-to-r from-yellow-300 to-yellow-400 text-yellow-900'

      }`}>
        {/* Animação - Chuva para Água, Raios para Energia */}
        {tipoAtivo === 'agua' ? <ChuvaAnimation /> : <RaiosAnimation />}
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between relative z-10">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-wide transition-colors ${
              tipoAtivo === 'agua' ? 'text-white' : 'text-yellow-700'
            }`}>
              GOWORK
            </h1>
            <p className={`text-xs sm:text-sm uppercase tracking-wider mt-1 transition-colors ${
              tipoAtivo === 'agua' ? 'text-white opacity-90' : 'text-yellow-800 opacity-90'
            }`}>
              Gestão de Utilidades
            </p>
          </div>
          <div className={`text-xs sm:text-sm px-4 py-2 rounded-full font-semibold transition-all ${
            tipoAtivo === 'agua'
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-yellow-600/20 text-yellow-800 hover:bg-yellow-700/30'
          }`}>
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