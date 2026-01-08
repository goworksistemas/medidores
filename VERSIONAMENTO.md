# Sistema de Versionamento

Este sistema força a atualização automática da aplicação quando uma nova versão é detectada, limpando todos os dados locais (localStorage, sessionStorage e cookies).

## Como Funciona

1. **Arquivo de Versão**: O arquivo `public/version.json` contém a versão atual da aplicação
2. **Verificação Automática**: O sistema verifica a versão:
   - Ao carregar a aplicação (após 1 segundo)
   - Quando o usuário volta para a aba do navegador
3. **Atualização Forçada**: Quando uma nova versão é detectada:
   - Limpa `localStorage`
   - Limpa `sessionStorage`
   - Limpa todos os cookies
   - Recarrega a aplicação completamente

## Estrutura do version.json

```json
{
  "version": "1.0.0",
  "build": "20240101",
  "forceUpdate": false,
  "message": "Nova versão disponível. A aplicação será atualizada automaticamente."
}
```

### Campos

- **version** (obrigatório): Versão da aplicação no formato semântico (ex: "1.0.0", "1.2.3")
- **build** (opcional): Identificador de build/data (ex: "20240101", "build-123")
- **forceUpdate** (opcional): Se `true`, força atualização mesmo que a versão seja a mesma
- **message** (opcional): Mensagem exibida no console quando atualização é detectada

## Como Atualizar a Versão

1. Edite o arquivo `public/version.json`
2. Altere o campo `version` para a nova versão (ex: de "1.0.0" para "1.0.1")
3. Opcionalmente, atualize o `build` com a data ou número de build
4. Faça o deploy da nova versão

## Exemplos

### Atualização Normal
```json
{
  "version": "1.0.1",
  "build": "20240115",
  "forceUpdate": false
}
```

### Forçar Atualização Imediata
```json
{
  "version": "1.0.0",
  "build": "20240115",
  "forceUpdate": true,
  "message": "Atualização crítica disponível. Limpando cache e recarregando..."
}
```

## Comportamento

- **Primeira vez**: Salva a versão atual sem limpar dados
- **Versão diferente**: Limpa todos os dados e recarrega
- **forceUpdate = true**: Sempre limpa dados e recarrega, mesmo com mesma versão
- **Offline**: Não bloqueia o usuário se não conseguir verificar a versão

## Localização

- Arquivo de versão: `public/version.json`
- Lógica de verificação: `src/components/Layout.jsx`
