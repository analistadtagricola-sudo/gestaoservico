# Instruções do Projeto / Project Rules

Este arquivo define as restrições e diretrizes operacionais para o desenvolvimento do sistema. Todos os agentes devem seguir rigorosamente estas regras.

## Módulos Bloqueados (Finalizados)
Os seguintes módulos estão completamente finalizados e **NÃO** devem sofrer nenhuma alteração ou ajuste sob nenhuma circunstância, a menos que explicitamente solicitado pelo usuário:
- **Implementos** (`/src/components/ImplementosView.tsx`)
- **Técnicos** (`/src/components/TecnicosView.tsx`)
- **Veículos** (`/src/components/VeiculosView.tsx`)
- **Clientes** (`/src/components/ClientesView.tsx`)
- **Tipos de Atendimento** (`/src/components/TiposAtendimentoView.tsx`)

Qualquer ajuste futuro solicitado pelo usuário deve focar apenas nos módulos restantes (como Ordens de Serviço, Integrações, Configurações, etc.).
