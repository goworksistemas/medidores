import { Outlet, useNavigate } from 'react-router-dom'
import { useMemo, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { LogOut } from 'lucide-react'
import BottomMenu from './BottomMenu'
import ChuvaAnimation from './ChuvaAnimation'
import RaiosAnimation from './RaiosAnimation'
import LogoBranco from '../assets/Logotipo sistemas_BRANCO.svg'
import LogoPreto from '../assets/Logotipo sistemas_PRETO.svg'

export default function Layout() {
  const { tipoAtivo } = useTheme()
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Adiciona um parâmetro para evitar o cache do navegador
        const timestamp = new Date().getTime();
        const response = await fetch(`/version.json?v=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          // Não bloqueia o usuário se a verificação falhar (ex: offline)
          console.warn(`[Version] Falha ao buscar version.json: ${response.statusText}`);
          return;
        }
        
        const serverConfig = await response.json();
        const serverVersion = serverConfig.version;
        const forceUpdate = serverConfig.forceUpdate === true;
        const localVersion = localStorage.getItem('app_version');

        // Se não há versão local, salva a versão atual
        if (!localVersion) {
          localStorage.setItem('app_version', serverVersion);
          if (serverConfig.build) {
            localStorage.setItem('app_build', serverConfig.build);
          }
          return;
        }

        // Verifica se há nova versão ou se é forçado a atualizar
        if (localVersion !== serverVersion || forceUpdate) {
          console.log(`[Version] Nova versão detectada!`);
          console.log(`[Version] Servidor: ${serverVersion} (build: ${serverConfig.build || 'N/A'})`);
          console.log(`[Version] Local: ${localVersion}`);
          console.log(`[Version] Forçar atualização: ${forceUpdate}`);
          console.log(`[Version] Limpando todos os dados e recarregando...`);

          // Limpa todos os dados de armazenamento
          localStorage.clear();
          sessionStorage.clear();
          
          // Limpa cookies
          document.cookie.split(";").forEach((c) => {
            const eqPos = c.indexOf("=");
            const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
            // Limpa cookies do domínio atual e do domínio pai
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
          });

          // Salva a nova versão antes de recarregar
          localStorage.setItem('app_version', serverVersion);
          if (serverConfig.build) {
            localStorage.setItem('app_build', serverConfig.build);
          }

          // Mostra mensagem se disponível
          if (serverConfig.message) {
            console.log(`[Version] ${serverConfig.message}`);
          }

          // Força recarregamento completo (sem cache)
          window.location.href = window.location.origin + window.location.pathname + '?v=' + timestamp;
        }
      } catch (error) {
        console.error('[Version] Falha ao verificar a versão da aplicação:', error);
        // Não bloqueia o usuário em caso de erro
      }
    };

    // Verifica a versão na carga inicial (com pequeno delay para não interferir no carregamento)
    const initialTimer = setTimeout(() => {
      checkVersion();
    }, 1000);

    // Verifica novamente quando o usuário volta para a aba do navegador
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Limpa os timers e listeners quando o componente é desmontado
    return () => {
      clearTimeout(initialTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleDisplayMap = {
    user: 'Operacional',
    n1: 'Operacional',
    admin: 'Admin',
    super_admin: 'Master',
  }

  // Memoizamos as animações para que não sejam recriadas a cada navegação,
  // evitando que a animação de fundo reinicie desnecessariamente.
  const memoizedChuva = useMemo(() => <ChuvaAnimation />, [])
  const memoizedRaios = useMemo(() => <RaiosAnimation />, [])

  return (
    // Adicionamos pb-24 sempre, para o conteúdo não ficar escondido atrás do menu fixo no PC também
    <div className={`min-h-screen transition-all pb-24 ${
      tipoAtivo === 'agua'
        ? 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100'
        : 'bg-gradient-to-br from-slate-50 via-yellow-50/30 to-slate-100'
    }`}>
      
      {/* HEADER SUPERIOR (Igual para Mobile e Desktop) */}
      <header className={`shadow-lg sticky top-0 z-40 transition-all relative ${
        tipoAtivo === 'agua' 
          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
          : 'bg-gradient-to-r from-yellow-300 to-yellow-400 text-yellow-900'
      }`}>
        
        {/* Animação de fundo */}
        {tipoAtivo === 'agua' ? memoizedChuva : memoizedRaios}
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5">
            <img src={tipoAtivo === 'agua' ? LogoBranco : LogoPreto} alt="MensureGo Logo" className="w-20 h-16 sm:w-18 sm:h-18 object-contain" />
            <div>
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter transition-all ${
                tipoAtivo === 'agua' 
                  ? 'bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent drop-shadow-lg' 
                  : 'bg-gradient-to-r from-gray-900 via-black to-gray-900 bg-clip-text text-transparent drop-shadow-2xl'
              }`}>
                MensureGo
              </h1>
              <p className={`text-xs sm:text-sm uppercase tracking-wider mt-1 transition-colors ${
                tipoAtivo === 'agua' ? 'text-white opacity-90' : 'text-yellow-800 opacity-90'
              }`}>
                {user?.nome || 'Gestão de Utilidades'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`text-xs sm:text-sm px-4 py-2 rounded-full font-semibold transition-all hidden sm:block ${
              tipoAtivo === 'agua'
                ? 'bg-white/20 text-white'
                : 'bg-yellow-600/20 text-yellow-800'
            }`}>
              {roleDisplayMap[user?.role] || 'Usuário'}
            </div>

            {/* BOTÃO DE SAIR */}
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

      {/* MENU INFERIOR (Agora visível SEMPRE, removi o 'md:hidden') */}
      <div>
        <BottomMenu />
      </div>
    </div>
  )
}