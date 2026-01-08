import React, { createContext, useState, useContext, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [tipoAtivo, setTipoAtivo] = useState('agua')
  const [dataVersion, setDataVersion] = useState(0)
  const [theme, rawSetTheme] = useState(undefined)

  // Carrega o tema do localStorage na inicialização
  useEffect(() => {
    const storedTheme = localStorage.getItem('color-theme') || 'light'
    rawSetTheme(storedTheme)
  }, [])

  // Aplica a classe 'dark' no HTML quando o tema muda
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const setTheme = (newTheme) => {
    localStorage.setItem('color-theme', newTheme)
    rawSetTheme(newTheme)
  }

  // Função para forçar a atualização de componentes que dependem de dados do banco
  const refreshData = () => {
    setDataVersion(v => v + 1)
  }

  return (
    <ThemeContext.Provider value={{ tipoAtivo, setTipoAtivo, dataVersion, refreshData, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
