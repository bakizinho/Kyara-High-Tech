<div align="center"><img src="./assets/kyara-high-tech.svg" width="100%" alt="KYARA HIGH-TECH"><br><img src="./dados/midias/menu.jpg" width="520" alt="KYARA HIGH-TECH">🌸 KYARA HIGH-TECH

WhatsApp Automation • Media • Native Flow • RPG • Economy • Groups

<p>
  <img src="https://img.shields.io/badge/KYARA-v10.2.1-8a2be2?style=for-the-badge">
  <img src="https://img.shields.io/badge/Node.js-20%2B-00d9ff?style=for-the-badge&logo=node.js">
  <img src="https://img.shields.io/badge/WhatsApp-Bot-25d366?style=for-the-badge&logo=whatsapp">
  <img src="https://img.shields.io/badge/Termux-Supported-111111?style=for-the-badge&logo=termux">
</p><p>
  <strong>Mais que um bot. Um ecossistema.</strong>
</p></div>---

🧭 DOCUMENTAÇÃO

- "🌸 Sobre a Kyara" (#-sobre-a-kyara)
- "⚡ Recursos" (#-recursos)
- "🧱 Arquitetura" (#-arquitetura)
- "📋 Requisitos" (#-requisitos)
- "🚀 Instalação" (#-instalação)
- "📱 Termux" (#-instalação-no-termux)
- "⚙️ Configuração" (#️-configuração)
- "🔐 Conexão com WhatsApp" (#-conexão-com-whatsapp)
- "▶️ Inicialização" (#️-inicialização)
- "📦 Scripts NPM" (#-scripts-npm)
- "🔄 Atualização" (#-atualização)
- "🧪 Desenvolvimento" (#-desenvolvimento)
- "📁 Estrutura" (#-estrutura-do-projeto)
- "⚡ Native Flow" (#-native-flow)
- "📥 Sistema de mídia" (#-sistema-de-mídia)
- "🆙 Sistema de Level" (#-sistema-de-level)
- "👥 Sistemas de grupo" (#-sistemas-de-grupo)
- "🔎 Diagnóstico" (#-diagnóstico)
- "🛡️ Segurança" (#️-segurança)
- "🤝 Contribuição" (#-contribuição)

---

🌸 SOBRE A KYARA

A KYARA HIGH-TECH é uma aplicação modular para automação no WhatsApp, construída em Node.js.

O projeto foi organizado em camadas para separar conexão, processamento de mensagens, comandos, funcionalidades, mídia, sistemas de grupo e interfaces interativas.

A ideia central é simples:

«um núcleo organizado, módulos independentes e uma experiência de utilização visual.»

🧩 O ecossistema

Área| Função
🤖 Core| Inicialização e processamento
📱 WhatsApp| Conexão e comunicação
⚡ Commands| Processamento de comandos
🌐 Native Flow| Menus e interfaces interativas
📥 Media| Processamento e downloads
🎮 RPG| Sistemas de entretenimento
💰 Economy| Sistemas econômicos
🆙 Level| XP e progressão
👥 Groups| Recursos para grupos
🛡️ Admin| Recursos administrativos
🌐 API| Serviços auxiliares e interface web

---

⚡ RECURSOS

📱 WhatsApp

- conexão com WhatsApp;
- processamento de mensagens;
- comandos com prefixo;
- autenticação;
- sistema de sessão;
- inicialização automatizada.

⚡ Interface

- Native Flow;
- menus interativos;
- botões;
- fluxos específicos;
- roteamento de ações;
- interface administrativa.

📥 Mídia

- YouTube;
- TikTok;
- Instagram;
- Facebook;
- Kwai;
- Twitter/X;
- Pinterest;
- áudio;
- vídeo.

🎮 Sistemas

- RPG;
- economia;
- Level/XP;
- recursos de grupo;
- ferramentas administrativas.

---

🧱 ARQUITETURA

A Kyara não depende de um único arquivo gigante para controlar todo o comportamento.

O fluxo principal pode ser representado assim:

                    🌸 KYARA
                       │
                       ▼
              ┌─────────────────┐
              │    WHATSAPP     │
              │    CONNECTION   │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ MESSAGE ENGINE  │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
      COMMANDS      FEATURES    NATIVE FLOW
          │            │            │
          └────────────┼────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
      MEDIA           RPG           GROUPS
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                    RESPONSE

---

📋 REQUISITOS

Antes de instalar, tenha:

- Android;
- Termux;
- Node.js 20 ou superior;
- npm 9 ou superior;
- Git;
- WhatsApp.

Os requisitos de Node.js e npm são declarados no "package.json" do projeto.

Verificar Node.js

node -v

Verificar npm

npm -v

Verificar Git

git --version

---

🚀 INSTALAÇÃO

A instalação foi organizada para funcionar diretamente pelo Termux.

«📋 Importante: cada comando possui seu próprio bloco. No GitHub, use o botão Copiar exibido no canto superior direito de cada bloco.»

---

📱 INSTALAÇÃO NO TERMUX

1️⃣ Atualizar os pacotes

pkg update -y

Depois:

pkg upgrade -y

---

2️⃣ Instalar Git
sh
pkg install -y git

---

3️⃣ Instalar Node.js
sh
pkg install -y nodejs-lts

---

4️⃣ Instalar FFmpeg

O projeto possui processamento de mídia e utiliza FFmpeg em recursos relacionados a mídia.
sh
pkg install -y ffmpeg

---

5️⃣ Liberar armazenamento

Execute uma vez:

termux-setup-storage

Quando o Android solicitar permissão, toque em:

Permitir

---

6️⃣ Entrar no armazenamento

cd ~/storage

---

7️⃣ Clonar a Kyara

git clone https://github.com/bakizinho/Kyara-High-Tech.git

---

8️⃣ Entrar no projeto

cd ~/storage/Kyara-High-Tech

---

9️⃣ Instalar dependências

npm install

Aguarde o processo terminar.

---

🔟 Iniciar

npm start

---

⚙️ CONFIGURAÇÃO INICIAL

A Kyara possui um configurador próprio.

Para abrir o configurador:

npm run config

O sistema permite configurar informações básicas do bot, incluindo:

- nome do dono;
- número do dono;
- nome do bot;
- prefixo.

Depois da configuração, o projeto pode solicitar a instalação/verificação das dependências.

---

📦 INSTALAÇÃO AUTOMÁTICA DE DEPENDÊNCIAS

A Kyara também possui um modo específico para instalação/verificação das dependências:

npm run config:install

Esse modo executa o instalador interno do projeto.

Ele verifica dependências do sistema e dependências Node.js.

O instalador possui suporte para verificar componentes como:

- Git;
- Yarn;
- FFmpeg;
- dependências NPM.

---

🔐 CONEXÃO COM WHATSAPP

Depois da instalação, execute:

npm start

O inicializador da Kyara possui um fluxo próprio de autenticação.

Quando não existe uma sessão válida, o inicializador apresenta as opções de conexão disponíveis.

Métodos disponíveis

📷 QR CODE

🔑 CÓDIGO DE PAREAMENTO

🚪 SAIR

Escolha o método apresentado pelo inicializador e siga as instruções exibidas no próprio Termux.

---

▶️ INICIALIZAÇÃO

Depois que a instalação estiver concluída:

npm start

A inicialização utiliza o arquivo:

dados/src/.scripts/start.js

O inicializador verifica a existência de uma sessão antes de iniciar o processo de conexão.

---

🔄 INICIAR NOVAMENTE

Se a Kyara já estiver instalada:

cd ~/storage/Kyara-High-Tech

Depois:

npm start

Não é necessário executar "git clone" novamente.

---

⚡ INSTALAÇÃO RÁPIDA

Para uma instalação limpa pelo Termux, execute cada bloco na ordem.

Atualizar

pkg update -y

Upgrade

pkg upgrade -y

Git

pkg install -y git

Node.js

pkg install -y nodejs-lts

FFmpeg

pkg install -y ffmpeg

Armazenamento

termux-setup-storage

Diretório

cd ~/storage

Projeto

git clone https://github.com/bakizinho/Kyara-High-Tech.git

Kyara

cd ~/storage/Kyara-High-Tech

Dependências

npm install

Inicialização

npm start

---

📦 SCRIPTS NPM

Os scripts abaixo são os scripts declarados atualmente no "package.json".

Script| Finalidade
"npm start"| Inicialização normal
"npm run dev"| Desenvolvimento
"npm run config"| Configuração
"npm run config:install"| Instalação de dependências pelo configurador
"npm run update"| Atualizador interno

---

▶️ "npm start"

Inicializa o bot:

npm start

Executa:

node dados/src/.scripts/start.js

---

🛠️ "npm run dev"

Modo de desenvolvimento:

npm run dev

Executa o inicializador através do Nodemon:

nodemon dados/src/.scripts/start.js

---

⚙️ "npm run config"

Abre o configurador:

npm run config

Arquivo responsável:

dados/src/.scripts/config.js

---

📥 "npm run config:install"

Executa a instalação interna:

npm run config:install

O configurador verifica dependências do sistema e do projeto.

---

🔄 "npm run update"

Executa o atualizador interno:

npm run update

Arquivo responsável:

dados/src/.scripts/update.js

---

🔄 ATUALIZAÇÃO

Para atualizar uma instalação existente, entre no projeto:

cd ~/storage/Kyara-High-Tech

Confira o estado atual:

git status

Baixe as alterações:

git pull

Atualize as dependências:

npm install

Depois inicialize:

npm start

---

🧪 DESENVOLVIMENTO

Durante o desenvolvimento, utilize:

npm run dev

O modo de desenvolvimento utiliza Nodemon para reinicialização automática do processo quando arquivos monitorados são alterados.

---

📁 ESTRUTURA DO PROJETO

A estrutura principal da Kyara é organizada desta forma:

Kyara-High-Tech/
│
├── assets/
│   ├── kyara-header.html
│   ├── kyara-high-tech.svg
│   └── kyara-system.svg
│
├── config/
│
├── dados/
│   │
│   ├── api/
│   │   ├── server.mjs
│   │   ├── kyara-browser.html
│   │   └── kyara-tube.html
│   │
│   ├── database/
│   │
│   ├── midias/
│   │
│   └── src/
│       │
│       ├── .scripts/
│       │   ├── start.js
│       │   ├── config.js
│       │   └── update.js
│       │
│       ├── core/
│       │   └── nativeFlow/
│       │
│       └── ...
│
├── package.json
└── README.md

---

🌐 API

A Kyara possui uma camada de API dentro de:

dados/api/

Principais componentes presentes no projeto:

dados/api/server.mjs

dados/api/kyara-browser.html

dados/api/kyara-tube.html

Essa camada funciona separadamente do núcleo de conexão do WhatsApp.

---

⚡ NATIVE FLOW

A Kyara possui uma camada própria para Native Flow:

dados/src/core/nativeFlow/

Entre os módulos presentes estão:

autoButtons.js

kyara-flow-adapter.js

native-flow.js

owner-flow-router.js

owner-flow.js

---

🧭 FLUXO DO NATIVE FLOW

                 🌸 MENU
                    │
       ┌────────────┼────────────┐
       │            │            │
       ▼            ▼            ▼
    📥 MEDIA      🎮 RPG       🛡️ ADMIN
       │            │            │
       ▼            ▼            ▼
    DOWNLOAD     SYSTEMS      CONTROLS
       │
   ┌───┼────┐
   │   │    │
   ▼   ▼    ▼
  YT  TTK  PIN

O Native Flow permite centralizar ações visuais sem precisar depender exclusivamente da digitação de comandos.

---

📋 PREFIXO

O prefixo configurável do bot é definido durante a configuração.

O valor inicial utilizado pelo configurador é:

!

«Se você quiser utilizar outro prefixo, configure-o através do sistema de configuração.»

---

📥 SISTEMA DE MÍDIA

A estrutura de mídia da Kyara possui suporte para diferentes plataformas e formatos.

---

🎵 YouTube

Pesquisar:

/play nome da música

Áudio:

/playaudio nome da música

Vídeo:

/playvideo nome do vídeo

---

🎧 YouTube MP3

/ytmp3 link

---

🎬 YouTube MP4

/ytmp4 link

---

🎵 TikTok

/tiktok link

---

📸 Instagram

/instagram link

---

📘 Facebook

/facebook link

---

🎞️ Kwai

/kwai link

---

🐦 Twitter / X

/twitter link

ou:

/x link

---

📌 Pinterest

Pesquisa:

/pinterest gato

Atalho:

/pin gato

URL:

/pinterest link

---

🆙 SISTEMA DE LEVEL

Consultar o Level:

/level

Ativar:

/level on

Desativar:

/level off

🔒 Persistência

A desativação individual não deve ser tratada como exclusão dos dados.

Os dados de Level/XP existentes permanecem preservados.

---

👥 SISTEMAS DE GRUPO

A arquitetura da Kyara possui módulos voltados para utilização em grupos.

Os recursos podem incluir:

- administração;
- controles de grupo;
- ferramentas de interação;
- sistemas de entretenimento;
- configurações individuais;
- sistemas automáticos.

A disponibilidade dos comandos depende da versão e configuração do projeto.

---

🤖 SISTEMA MODULAR

A Kyara foi estruturada para que funcionalidades possam ser isoladas em módulos.

A ideia é:

CORE
 │
 ├── CONNECTION
 │
 ├── COMMANDS
 │
 ├── FEATURES
 │
 ├── MEDIA
 │
 ├── LEVEL
 │
 ├── RPG
 │
 ├── GROUPS
 │
 └── NATIVE FLOW

Isso reduz a necessidade de concentrar toda a lógica em um único arquivo.

---

🔎 DIAGNÓSTICO

Quando algo não funcionar, primeiro verifique o ambiente.

Diretório atual

pwd

Arquivos do projeto

ls

Node.js

node -v

npm

npm -v

Git

git --version

Estado do projeto

git status

---

🧰 RECUPERAÇÃO BÁSICA

Se as dependências apresentarem problemas, entre no projeto:

cd ~/storage/Kyara-High-Tech

Limpe o cache:

npm cache clean --force

Reinstale:

npm install

Execute:

npm start

---

🔧 CONFIGURAÇÃO DE DEPENDÊNCIAS

A própria Kyara possui um instalador interno.

Execute:

npm run config:install

Esse fluxo pode verificar componentes externos e dependências necessárias ao ambiente.

---

🧠 VERIFICAÇÃO DO AMBIENTE

Uma verificação rápida pode ser feita com:

node -v

npm -v

git --version

ffmpeg -version

Se os comandos responderem corretamente, o ambiente básico está disponível.

---

🛡️ SEGURANÇA

Nunca publique arquivos ou informações privadas da sua sessão.

Não compartilhe:

- 🔐 credenciais;
- 🔑 tokens;
- 🗝️ chaves privadas;
- 📱 informações de autenticação;
- 📂 arquivos de sessão;
- dados pessoais presentes em logs.

⚠️ Logs

Antes de publicar um log para solicitar ajuda, revise o conteúdo e remova qualquer informação privada.

---

🧩 DEPENDÊNCIAS PRINCIPAIS

O "package.json" declara componentes utilizados pelo projeto, incluindo:

- Baileys;
- Axios;
- FFmpeg;
- Sharp;
- WebSocket;
- Pino;
- QRCode Terminal;
- Node Cache;
- Node Cron;
- ferramentas relacionadas ao YouTube;
- ferramentas de processamento de HTML;
- Nodemon para desenvolvimento.

A instalação deve ser feita pelo gerenciador do projeto:

npm install

---

🏗️ FLUXO DE EXECUÇÃO

┌───────────────────┐
│      TERMUX       │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│    npm start      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│    START.JS       │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  SESSION CHECK    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│    CONNECT.JS     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│     WHATSAPP      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ MESSAGE PROCESSOR │
└─────────┬─────────┘
          │
     ┌────┴────┐
     ▼         ▼
 COMMANDS    FLOWS
     │         │
     └────┬────┘
          ▼
       RESPONSE

---

🧪 CHECKLIST DE INSTALAÇÃO

Depois da instalação, confirme:

node -v

npm -v

git --version

Depois:

cd ~/storage/Kyara-High-Tech

Instale:

npm install

E execute:

npm start

---

🔄 CHECKLIST DE ATUALIZAÇÃO

Para atualizar uma instalação existente:

cd ~/storage/Kyara-High-Tech

git status

git pull

npm install

npm start

---

🧑‍💻 CONTRIBUIÇÃO

Antes de modificar o projeto:

1. entenda o módulo que será alterado;
2. evite duplicar funcionalidades existentes;
3. mantenha a separação de responsabilidades;
4. preserve as interfaces existentes quando possível;
5. teste a alteração antes de enviá-la;
6. não envie credenciais ou arquivos de sessão.

Fluxo básico

git clone https://github.com/bakizinho/Kyara-High-Tech.git

cd ~/storage/Kyara-High-Tech

npm install

npm run dev

---

📐 PRINCÍPIOS DA KYARA

MODULARIDADE
     ↓
ORGANIZAÇÃO
     ↓
REUTILIZAÇÃO
     ↓
MANUTENIBILIDADE
     ↓
ESCALABILIDADE

Objetivos

- código organizado;
- módulos independentes;
- menor duplicação;
- manutenção simplificada;
- evolução contínua;
- experiência de utilização moderna.

---

🌐 REPOSITÓRIO

<div align="center">KYARA HIGH-TECH

Projeto:

https://github.com/bakizinho/Kyara-High-Tech

</div>---

❤️ CRÉDITOS

<div align="center"><img src="./assets/kyara-high-tech.svg" width="70%" alt="KYARA">🌸 KYARA HIGH-TECH

Desenvolvido por Baki

WhatsApp • Node.js • Termux • JavaScript

---

⚡ MAIS QUE UM BOT. UM ECOSSISTEMA.

KYARA HIGH-TECH © 2026

</div>