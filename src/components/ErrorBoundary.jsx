import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo)
    this.setState({ errorInfo })
    
    // Log mais detalhado em desenvolvimento
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Stack:', error.stack)
      console.error('[ErrorBoundary] Component Stack:', errorInfo.componentStack)
    }
    
    // Aqui você pode enviar para um serviço de monitoramento (ex: Sentry)
    // Exemplo: Sentry.captureException(error, { extra: errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-200">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Ops! Algo deu errado
            </h2>
            
            <p className="text-gray-600 mb-6">
              Ocorreu um erro inesperado na aplicação. Por favor, recarregue a página.
            </p>

            {(import.meta.env.DEV || this.state.error?.message?.includes('Scanner')) && this.state.error && (
              <details className="mb-6 text-left bg-gray-50 rounded-lg p-4 border border-gray-200">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-2">
                  Detalhes do erro {import.meta.env.DEV ? '(desenvolvimento)' : ''}
                </summary>
                <div className="text-xs text-red-600 space-y-2">
                  <div>
                    <strong>Erro:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.error?.message && (
                    <div>
                      <strong>Mensagem:</strong> {this.state.error.message}
                    </div>
                  )}
                  {import.meta.env.DEV && this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 overflow-auto max-h-40 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Recarregar Página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
