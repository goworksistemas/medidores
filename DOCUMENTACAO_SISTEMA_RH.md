# 📋 Documentação - Controle de Acesso Sistema RH/DP

## 📌 Visão Geral

O **Sistema de RH/DP** e o **Sistema de Medições** compartilham a mesma base de dados Supabase e a mesma tabela `profiles` para controle de usuários.

Este documento explica como implementar o controle de acesso no Sistema de RH seguindo a mesma arquitetura do Sistema de Medições.

---

## 🗄️ Estrutura da Tabela `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,                    -- ID do auth.users
  name TEXT,                              -- Nome do usuário
  email TEXT,                             -- Email
  photo TEXT,                             -- Foto de perfil
  role TEXT DEFAULT 'user',               -- Role global
  access_medicoes BOOLEAN DEFAULT true,   -- Acesso ao Sistema de Medições
  access_dp_rh BOOLEAN DEFAULT false,     -- Acesso ao Sistema RH/DP
  allowed_tabs TEXT[],                    -- Abas permitidas no RH
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 🔐 Campos Importantes para o Sistema RH

### `access_dp_rh` (BOOLEAN)
- `true` → Usuário **TEM** acesso ao Sistema RH
- `false` → Usuário **NÃO TEM** acesso ao Sistema RH

### `allowed_tabs` (TEXT[])
Define **quais abas/módulos** o usuário pode ver dentro do Sistema RH.

**Valores padrão:**
```sql
ARRAY['home', 'funcionarios', 'equipamentos', 'onboarding', 'calendario', 'documentos', 'avaliacoes', 'quick-actions', 'reports', 'admin']
```

### `role` (TEXT)
- `user` → Usuário comum (Operacional)
- `admin` → Administrador (acessa tudo, **EXCETO** gerenciar usuários)
- `super_admin` → Admin Master (desenvolvedores - acesso TOTAL, incluindo gerenciar usuários)

---

## 👥 Hierarquia de Permissões (Geral)

| Role | Gerenciar Usuários | Outras Telas Admin | Telas Comuns |
|------|-------------------|-------------------|--------------|
| `super_admin` (Admin Master) | ✅ **SIM** | ✅ SIM | ✅ SIM |
| `admin` (Admin) | ❌ **NÃO** | ✅ SIM | ✅ SIM |
| `user` (Operacional) | ❌ NÃO | ❌ NÃO | ✅ SIM (conforme permissões) |

### ⚠️ IMPORTANTE
**Apenas Admin Master (`super_admin`) pode acessar a tela de Gerenciar Usuários!**

Isso vale tanto para o Sistema de Medições quanto para o Sistema RH.

---

## ✅ Lógica de Acesso - Sistema RH

### Regra Principal

```
SE (access_dp_rh = true) ENTÃO
  → Usuário PODE acessar o Sistema RH
  → Exibir APENAS as abas listadas em allowed_tabs
SENÃO
  → Usuário NÃO PODE acessar
  → Redirecionar para página de "Acesso Negado"
FIM
```

### ⚠️ IMPORTANTE
Diferente do Sistema de Medições, no RH **NÃO importa a role** (`admin`, `super_admin`). 

O acesso é controlado **SOMENTE** por:
1. `access_dp_rh = true` → Pode entrar no sistema
2. `allowed_tabs` → Define o que pode ver

---

## 💻 Implementação no Frontend

### 1. Contexto de Autenticação (AuthContext)

Ao carregar o perfil do usuário, busque os campos necessários:

```javascript
async function carregarPerfilUsuario(userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, access_medicoes, access_dp_rh, allowed_tabs')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Erro ao buscar profile:', error)
    return null
  }

  return {
    id: userId,
    email: profile?.email,
    nome: profile?.name,
    role: profile?.role || 'user',
    access_medicoes: profile?.access_medicoes ?? false,
    access_dp_rh: profile?.access_dp_rh ?? false,
    allowed_tabs: profile?.allowed_tabs || [],
    tipo: 'email_senha'
  }
}
```

### 2. Verificação de Acesso (Componente de Rota Privada)

```jsx
function RotaPrivadaRH({ children }) {
  const { user, loading } = useAuth()

  // Loading state
  if (loading) {
    return <div>Carregando...</div>
  }

  // Não autenticado
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Verifica se tem acesso ao Sistema RH
  const temAcessoRH = user.access_dp_rh === true

  if (!temAcessoRH) {
    // Sem acesso - redireciona para página de acesso negado
    return <Navigate to="/acesso-negado" replace />
  }

  // Tem acesso - renderiza o conteúdo
  return children
}
```

### 3. Página de Acesso Negado

Crie uma página `AcessoNegado.jsx`:

```jsx
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
        
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acesso Negado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Você não tem permissão para acessar o <strong>Sistema de RH/DP</strong>.
        </p>

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

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-yellow-800">
            <strong>O que fazer?</strong>
          </p>
          <ul className="text-sm text-yellow-700 mt-2 space-y-1">
            <li>• Entre em contato com o administrador</li>
            <li>• Solicite acesso ao Sistema de RH/DP</li>
          </ul>
        </div>

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
```

### 4. Controle de Abas (allowed_tabs)

Crie um hook para verificar se uma aba é permitida:

```javascript
// hooks/useTabAccess.js
import { useAuth } from '../contexts/AuthContext'

export function useTabAccess() {
  const { user } = useAuth()
  
  const allowedTabs = user?.allowed_tabs || []
  
  // Verifica se uma aba específica é permitida
  const canAccessTab = (tabName) => {
    // Se não tem allowed_tabs definido, bloqueia tudo
    if (!allowedTabs || allowedTabs.length === 0) {
      return false
    }
    return allowedTabs.includes(tabName)
  }
  
  // Retorna lista de abas permitidas
  const getVisibleTabs = (allTabs) => {
    return allTabs.filter(tab => canAccessTab(tab.id || tab.name))
  }
  
  return {
    allowedTabs,
    canAccessTab,
    getVisibleTabs
  }
}
```

### 5. Uso nos Componentes

#### Menu/Sidebar:

```jsx
function Sidebar() {
  const { canAccessTab } = useTabAccess()
  
  const menuItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'funcionarios', label: 'Funcionários', icon: Users },
    { id: 'equipamentos', label: 'Equipamentos', icon: Laptop },
    { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
    { id: 'calendario', label: 'Calendário', icon: Calendar },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'avaliacoes', label: 'Avaliações', icon: ClipboardCheck },
    { id: 'quick-actions', label: 'Ações Rápidas', icon: Zap },
    { id: 'reports', label: 'Relatórios', icon: BarChart },
    { id: 'admin', label: 'Administração', icon: Settings },
  ]
  
  return (
    <nav>
      {menuItems.map(item => (
        // Só renderiza se o usuário tem acesso à aba
        canAccessTab(item.id) && (
          <Link key={item.id} to={`/${item.id}`}>
            <item.icon />
            {item.label}
          </Link>
        )
      ))}
    </nav>
  )
}
```

#### Proteção de Rotas por Aba:

```jsx
function RotaProtegidaPorAba({ tabName, children }) {
  const { canAccessTab } = useTabAccess()
  
  if (!canAccessTab(tabName)) {
    return <Navigate to="/" replace />
  }
  
  return children
}

// Uso no App.jsx
<Route 
  path="/funcionarios" 
  element={
    <RotaProtegidaPorAba tabName="funcionarios">
      <Funcionarios />
    </RotaProtegidaPorAba>
  } 
/>
```

---

## 🔒 Proteção da Tela de Gerenciar Usuários

**Apenas `super_admin` (Admin Master) pode acessar!**

### Verificação no Componente:

```jsx
// GerenciarUsuarios.jsx
export default function GerenciarUsuarios() {
  const { user } = useAuth()
  
  // APENAS Admin Master pode acessar
  const isAdminMaster = user?.role === 'super_admin'

  if (!isAdminMaster) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600">
            Apenas <strong>Admin Master</strong> pode gerenciar usuários.
          </p>
        </div>
      </div>
    )
  }

  // ... resto do componente
}
```

### Esconder Link no Menu (se não for Admin Master):

```jsx
function Menu() {
  const { user } = useAuth()
  const isAdminMaster = user?.role === 'super_admin'
  
  return (
    <nav>
      {/* Outras opções do menu... */}
      
      {/* Só mostra se for Admin Master */}
      {isAdminMaster && (
        <Link to="/usuarios">
          <Users className="w-5 h-5" />
          Gerenciar Usuários
        </Link>
      )}
    </nav>
  )
}
```

---

## 🔧 Funções SQL Disponíveis no Supabase

### `has_rh_dp_access()`

Verifica se o usuário atual tem acesso ao Sistema RH.

```sql
-- Já existe no banco
SELECT public.has_rh_dp_access();
-- Retorna: true ou false
```

**Lógica atual:**
```sql
SELECT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() 
  AND (role IN ('admin', 'super_admin') OR access_dp_rh = true)
);
```

### ⚠️ ATENÇÃO: Recomendação de Alteração

A função atual permite acesso a `admin` e `super_admin` automaticamente. Se você quiser que o acesso seja **SOMENTE** por `access_dp_rh`, altere a função:

```sql
-- Versão que ignora role, apenas verifica access_dp_rh
CREATE OR REPLACE FUNCTION public.has_rh_dp_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND access_dp_rh = true
  );
$$;
```

---

## 📊 Tabela de Decisão - Quem Acessa o Sistema RH?

| `role` | `access_dp_rh` | `allowed_tabs` | Resultado |
|--------|----------------|----------------|-----------|
| qualquer | `true` | `['home', 'funcionarios']` | ✅ Acessa (vê 2 abas) |
| qualquer | `true` | `['home', 'funcionarios', 'admin']` | ✅ Acessa (vê 3 abas) |
| qualquer | `true` | `[]` (vazio) | ✅ Acessa (não vê nenhuma aba) |
| qualquer | `false` | qualquer | ❌ **Acesso Negado** |

---

## 🎯 Checklist de Implementação

- [ ] Atualizar AuthContext para buscar `access_dp_rh`, `allowed_tabs` e `role`
- [ ] Criar componente `RotaPrivadaRH` com verificação de `access_dp_rh`
- [ ] Criar página `AcessoNegado`
- [ ] Criar hook `useTabAccess` para controle de abas
- [ ] Filtrar menu/sidebar baseado em `allowed_tabs`
- [ ] Proteger rotas individuais por aba
- [ ] Adicionar rota `/acesso-negado` no router
- [ ] **Restringir tela de Gerenciar Usuários apenas para `super_admin` (Admin Master)**
- [ ] Esconder link de Gerenciar Usuários no menu se não for Admin Master

---

## 🔄 Sincronização com Sistema de Medições

Ambos os sistemas usam a mesma tabela `profiles`. Quando um admin do Sistema de Medições altera os campos de um usuário:

- `access_medicoes` → Afeta acesso ao Sistema de Medições
- `access_dp_rh` → Afeta acesso ao Sistema RH
- `allowed_tabs` → Afeta quais abas o usuário vê no RH

**Não é necessário sincronização adicional** - ambos leem da mesma tabela.

---

## 📞 Contato

Em caso de dúvidas sobre a estrutura do banco ou as funções SQL, consulte o arquivo `supabase.json` exportado ou entre em contato com a equipe de desenvolvimento.

---

**Última atualização:** Fevereiro 2026
