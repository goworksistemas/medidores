import { Link, useLocation } from 'react-router-dom'
import { PlusSquare, List, BarChart3 } from 'lucide-react'

export default function BottomMenu() {
  const location = useLocation()
  
  // Função para destacar o ícone ativo
  const isActive = (path) => {
    return location.pathname === path 
      ? "text-blue-600 scale-110 font-bold" 
      : "text-gray-400 hover:text-gray-600"
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl pb-safe z-50">
      <div className="flex justify-around items-center h-20 px-4">
        
        <Link to="/" className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive('/')}`}>
          <PlusSquare className="w-7 h-7" />
          <span className="text-[11px] font-semibold tracking-tight">Leitura</span>
        </Link>

        <Link to="/historico" className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive('/historico')}`}>
          <List className="w-7 h-7" />
          <span className="text-[11px] font-semibold tracking-tight">Histórico</span>
        </Link>

        <Link to="/dashboard" className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive('/dashboard')}`}>
          <BarChart3 className="w-7 h-7" />
          <span className="text-[11px] font-semibold tracking-tight">Gráficos</span>
        </Link>

      </div>
    </div>
  )
}