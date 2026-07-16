# 🛠️ Gestão de Serviços - Sistema de Ordens de Serviço

Bem-vindo ao **Gestão de Serviços**, um sistema completo, moderno e altamente intuitivo desenvolvido em **React**, **TypeScript** e **Tailwind CSS** para o controle e gestão de ordens de serviço, agendamentos, clientes, equipamentos/implementos, técnicos e relatórios financeiros de oficinas e prestadores de serviços.

---

## 🚀 Funcionalidades Principais

Este sistema conta com uma interface robusta e modularizada que abrange todos os processos de uma empresa de serviços:

*   **📊 Dashboard Inteligente:** Gráficos de faturamento, andamento de Ordens de Serviço (OS), métricas de prioridade, quantidade de ordens abertas e encerradas e visão geral do status da operação.
*   **📋 Controle de Ordens de Serviço (OS):** Criação, edição, cancelamento e encerramento de OS, com cálculo de horas trabalhadas, quilometragem rodada, valores de mão de obra, deslocamento e emissão de nota fiscal.
*   **📅 Agenda Interativa:** Visualização em calendário dos atendimentos agendados por técnico, facilitando o gerenciamento do tempo e a distribuição de tarefas.
*   **👥 Cadastro de Clientes:** Fichas completas de clientes com diferenciação por tipo de pessoa (Física ou Jurídica), histórico de contatos, localização integrada e códigos internos de integração.
*   **🚜 Cadastro de Implementos / Máquinas:** Rastreamento completo dos equipamentos por fabricante, número de série, ano e vinculação direta aos planos de manutenção e clientes proprietários.
*   **🧑‍🔧 Gestão de Técnicos e Comissões:** Controle detalhado da equipe técnica, valores de hora e km por profissional, além de um painel financeiro para apuração de comissões de técnicos e auxiliares.
*   **⚙️ Configurações Personalizadas:** Configuração de numeração automática de OS, tipos de atendimento personalizados, planos de revisão periódica e gerenciamento completo de usuários com controle refinado de permissões (Administrador, Gerente, Faturista e Técnico).
*   **🔄 Backups e Logs:** Histórico completo de ações no sistema para fins de auditoria e ferramentas para exportação/importação de dados para segurança da informação.

---

## 🛠️ Tecnologias Utilizadas

*   **React 19** (com componentes funcionais e hooks modernos)
*   **TypeScript** (com tipagem estática e interfaces robustas para segurança do código)
*   **Vite** (bundler ultrarrápido para desenvolvimento)
*   **Tailwind CSS** (estilização moderna, responsiva e de alta performance)
*   **Lucide React** (biblioteca elegante de ícones vetoriais)
*   **Motion (Framer Motion)** (transições suaves e animações de interface)
*   **Recharts** (para gráficos interativos do Dashboard)
*   **XLSX (SheetJS)** (para exportação de relatórios em planilhas Excel)

---

## 💻 Como Executar o Projeto Localmente

Siga o passo a passo abaixo para rodar o projeto em seu computador:

### **Pré-requisitos**
Certifique-se de ter instalado em sua máquina:
*   [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada)
*   Gerenciador de pacotes (npm, yarn ou bun)

### **Instalação**

1.  **Clone o repositório ou extraia os arquivos baixados:**
    ```bash
    git clone https://github.com/analistadtagricola-sudo/gestaoservico.git
    cd gestaoservico
    ```

2.  **Instale as dependências do projeto:**
    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento local:**
    ```bash
    npm run dev
    ```

4.  **Acesse no seu navegador:**
    O terminal exibirá uma URL local, geralmente `http://localhost:3000` ou `http://localhost:5173`. Abra esse endereço para ver o sistema funcionando em tempo real com HMR (Hot Module Replacement).

### **Credenciais de Acesso Padrão (Local)**
Para efetuar o login no ambiente local pela primeira vez, utilize o usuário administrador padrão:
*   **Usuário:** `admin`
*   **Senha:** `admin`

---

## 📤 Como Publicar este Projeto no seu GitHub

Para enviar o código atual do seu espaço de desenvolvimento do Google AI Studio para o repositório **GitHub** que você criou (`https://github.com/analistadtagricola-sudo/gestaoservico.git`), siga estas etapas simples:

### **Opção 1: Via exportação direta de ZIP (Recomendado)**

1.  **Baixar o projeto:**
    No menu superior ou lateral de configurações do **Google AI Studio**, selecione a opção de **Exportar como ZIP** ou **Baixar código**.
2.  **Extrair os arquivos:**
    Extraia o arquivo ZIP recebido em uma pasta de sua escolha em seu computador local.
3.  **Configurar o repositório local:**
    Abra o terminal (Command Prompt, Git Bash ou PowerShell) na pasta onde você extraiu os arquivos e execute os seguintes comandos para inicializar o repositório local e conectá-lo ao GitHub:

    ```bash
    # Inicializa o Git no projeto
    git init

    # Adiciona todos os arquivos ao controle de versão
    git add .

    # Cria o primeiro commit
    git commit -m "Initial commit: Sistema de Gestão de Serviços"

    # Define a branch principal como 'main'
    git branch -M main

    # Vincula ao seu repositório remoto do GitHub
    git remote add origin https://github.com/analistadtagricola-sudo/gestaoservico.git

    # Envia o código para o GitHub (pode solicitar seu login/senha ou Personal Access Token)
    git push -u origin main
    ```

### **Opção 2: Integração Direta pelo Google AI Studio**
Se a plataforma disponibilizar o botão de conexão direta com o GitHub no painel de configurações:
1.  Clique em **Export/Share** ou acesse as configurações do projeto.
2.  Selecione **Export to GitHub**.
3.  Autorize o acesso à sua conta do GitHub.
4.  Selecione a sua organização/usuário `analistadtagricola-sudo` e o repositório correspondente (`gestaoservico`).
5.  Confirme a exportação para que o código seja carregado diretamente!

---

## 📂 Estrutura do Projeto

*   `/src/main.tsx` - Ponto de entrada do React.
*   `/src/App.tsx` - Componente principal de rotas e verificação de autenticação.
*   `/src/AppContent.tsx` - Componente base que gerencia o menu lateral, topo e renderização condicional das telas.
*   `/src/types.ts` - Definições das interfaces TypeScript (`Cliente`, `OrdemServico`, `Tecnico`, `Usuario`, etc.).
*   `/src/components/` - Telas modulares do sistema (Clientes, Agenda, Comissões, Ordem de Serviço, Dashboard, Usuários, etc.).
*   `/src/index.css` - Estilos globais carregando o Tailwind CSS e fontes customizadas.
*   `package.json` - Gerenciamento de scripts, dependências e versões.

---

Desenvolvido com carinho no ambiente **Google AI Studio**! 🚀
