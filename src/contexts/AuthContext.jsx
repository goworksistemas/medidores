import { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // null = não logado
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica se já tem um "crachá" salvo no navegador ao abrir o app
    const tokenSalvo = localStorage.getItem('gowork_token_n1')
    if (tokenSalvo) {
      validarTokenN1(tokenSalvo)
    } else {
      setLoading(false)
    }
  }, [])

  // Função para validar o QR Code
  async function loginViaQrCode(tokenLido) {
    try {
      const { data, error } = await supabase
        .from('tokens_acesso')
        .select('*')
        .eq('token', tokenLido)
        .eq('ativo', true)
        .single()

      if (error || !data) {
        throw new Error('QR Code inválido ou inativo.')
      }

      // Sucesso: Define o usuário como "Operacional"
      const usuarioN1 = { 
        id: data.id, 
        role: 'n1', 
        nome: data.descricao,
        tipo: 'qr_code' 
      }
      
      setUser(usuarioN1)
      localStorage.setItem('gowork_token_n1', tokenLido) // Mantém logado
      return { success: true }
      
    } catch (error) {
      console.error(error)
      return { success: false, message: error.message }
    }
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('gowork_token_n1')
    // Aqui adicionaremos o logout da Microsoft futuramente
  }

  return (
    <AuthContext.Provider value={{ user, loginViaQrCode, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}