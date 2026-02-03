import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ShieldX, LogOut, Mail } from 'lucide-react'

export default function AcessoNegado() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-gray-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 p-8 max-w-md w-full text-center">
        
        {/* Ícone */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-600" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acesso Negado
        </h1>
        
        {/* Mensagem */}
        <p className="text-gray-600 mb-6">
          Você não tem permissão para acessar o <strong>Sistema de Medições</strong>.
        </p>

        {/* Info do usuário */}
        {user && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Logado como:</p>
            <p className="text-gray-900 font-semibold">{user.nome || user.email}</p>
            {user.email && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Mail className="w-3 h-3" />
                {user.email}
              </p>
            )}
          </div>
        )}

        {/* Instruções */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-yellow-800">
            <strong>O que fazer?</strong>
          </p>
          <ul className="text-sm text-yellow-700 mt-2 space-y-1">
            <li>• Entre em contato com o administrador</li>
            <li>• Solicite acesso ao Sistema de Medições</li>
          </ul>
        </div>

        {/* Botão de Sair */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sair e Fazer Login com Outra Conta
        </button>
      </div>
    </div>
  )
}
