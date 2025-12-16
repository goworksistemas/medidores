import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Zap, QrCode, X } from 'lucide-react'

export default function Login() {
  const { loginViaQrCode } = useAuth()
  const navigate = useNavigate()
  
  const [isScanning, setIsScanning] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleScan = async (result) => {
    if (result && result.length > 0) {
      // Pega o valor bruto do QR Code (o UUID)
      const rawValue = result[0].rawValue 
      
      setIsScanning(false) // Fecha camera
      setLoading(true)
      
      const res = await loginViaQrCode(rawValue)
      
      if (res.success) {
        navigate('/') // Manda para a home
      } else {
        setErro('QR Code não reconhecido no sistema.')
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header Visual */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <Zap className="w-8 h-8 text-white" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-white">GOWORK</h1>
          <p className="text-blue-100 text-sm mt-1">Gestão de Utilidades</p>
        </div>

        <div className="p-8">
          
          {/* MODO SCANNER ATIVO */}
          {isScanning ? (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
              <div className="w-full max-w-sm relative">
                <p className="text-white text-center mb-4 font-semibold">Aponte para o QR Code de Acesso</p>
                
                <div className="rounded-xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                  <Scanner 
                    onScan={handleScan} 
                    scanDelay={500}
                    allowMultiple={false}
                  />
                </div>

                <button 
                  onClick={() => setIsScanning(false)}
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

              {erro && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center justify-center gap-2 border border-red-100">
                  <X className="w-4 h-4" /> {erro}
                </div>
              )}

              {/* Botão Microsoft (Placeholder) */}
              <button 
                onClick={() => alert('Em breve integração com AD')}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all group"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="MS" className="w-5 h-5" />
                Entrar com Microsoft
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-medium">Operacional</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Botão QR Code N1 */}
              <button
                onClick={() => {
                  setErro('')
                  setIsScanning(true)
                }}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}