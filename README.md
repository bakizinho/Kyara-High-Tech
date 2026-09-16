<div align="center"><img src="./assets/kyara-high-tech.svg" width="100%" alt="KYARA HIGH-TECH"><br /><img src="./dados/midias/menu.jpg" width="520" alt="KYARA HIGH-TECH">🌸 KYARA HIGH-TECH v10.2.1

WhatsApp Bot • AI • Media • RPG • Economy • Groups

<p>
  <img src="https://img.shields.io/badge/STATUS-ONLINE-00ff9d?style=for-the-badge">
  <img src="https://img.shields.io/badge/VERSION-10.2.1-8a2be2?style=for-the-badge">
  <img src="https://img.shields.io/badge/NODE.JS-20%2B-00d9ff?style=for-the-badge&logo=node.js">
  <img src="https://img.shields.io/badge/WHATSAPP-BOT-25d366?style=for-the-badge&logo=whatsapp">
  <img src="https://img.shields.io/badge/TERMUX-SUPPORTED-000000?style=for-the-badge&logo=termux">
</p>✨ Mais que um bot. Um ecossistema.

</div>---

🧭 DOCUMENTAÇÃO

- "🌸 Sobre a Kyara" (#-sobre-a-kyara)
- "⚡ Recursos" (#-recursos)
- "🧱 Arquitetura" (#-arquitetura)
- "📋 Requisitos" (#-requisitos)
- "🚀 Instalação no Termux" (#-instalação-no-termux)
- "⚙️ Configuração" (#️-configuração)
- "📱 Conexão com WhatsApp" (#-conexão-com-whatsapp)
- "▶️ Inicialização" (#️-inicialização)
- "📦 Scripts NPM" (#-scripts-npm)
- "🔄 Atualização" (#-atualização)
- "📁 Estrutura do projeto" (#-estrutura-do-projeto)
- "⚡ Native Flow" (#-native-flow)
- "📥 Downloads" (#-downloads)
- "🆙 Sistema de Level" (#-sistema-de-level)
- "👥 Grupos" (#-grupos)
- "🔎 Diagnóstico" (#-diagnóstico)
- "🛡️ Segurança" (#️-segurança)
- "🤝 Contribuição" (#-contribuição)

---

🌸 SOBRE A KYARA

A KYARA HIGH-TECH é um bot modular para WhatsApp desenvolvido em Node.js.

O projeto reúne automação, mídia, sistemas de grupo, entretenimento, RPG, economia, Level e interfaces interativas em uma arquitetura modular.

✨ Ecossistema

Sistema| Descrição
🤖 Core| Núcleo da aplicação
📱 WhatsApp| Conexão e processamento
⚡ Commands| Sistema de comandos
🌐 Native Flow| Menus e interfaces interativas
📥 Media| Downloads e processamento de mídia
👥 Groups| Recursos para grupos
🛡️ Admin| Administração
🎮 RPG| Entretenimento
💰 Economy| Economia
🆙 Level| XP e progressão
🌐 API| Serviços auxiliares

---

⚡ RECURSOS

📥 Mídia

- YouTube
- YouTube MP3
- YouTube MP4
- TikTok
- Instagram
- Facebook
- Kwai
- Twitter/X
- Pinterest

👥 Sistemas

- Administração
- Recursos para grupos
- Level e XP
- RPG
- Economia
- Sistemas interativos

🌐 Interface

- Native Flow
- Menus
- Botões
- Fluxos interativos
- Ações automatizadas

---

🧱 ARQUITETURA

A Kyara foi estruturada de forma modular para separar o processamento principal das funcionalidades.

                    🌸 KYARA
                       │
                       ▼
              ┌─────────────────┐
              │     WHATSAPP    │
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
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
     MEDIA            RPG            GROUPS
       │               │               │
       └───────────────┼───────────────┘
                       ▼
                    RESPONSE

---

📋 REQUISITOS

Para instalar a Kyara pelo Termux, tenha:

- Android
- Termux
- Node.js 20+
- npm 9+
- Git
- FFmpeg
- WhatsApp

Verificar Node.js

node -v

Verificar npm

npm -v

Verificar Git

git --version

Verificar FFmpeg

ffmpeg -version

---

🚀 INSTALAÇÃO NO TERMUX

«📋 Copiar: todos os comandos estão em blocos individuais para que o GitHub disponibilize o botão Copiar em cada bloco.»

---

1️⃣ Atualizar o Termux

pkg update -y

Depois:

pkg upgrade -y

---

2️⃣ Instalar o Git

pkg install -y git

---

3️⃣ Instalar Node.js

pkg install -y nodejs-lts

---

4️⃣ Instalar FFmpeg

pkg install -y ffmpeg

---

5️⃣ Liberar armazenamento

Execute uma única vez:

termux-setup-storage

Quando aparecer a solicitação do Android, toque em Permitir.

---

6️⃣ Entrar no armazenamento

cd ~/storage

---

7️⃣ Clonar o projeto

git clone https://github.com/bakizinho/Kyara-High-Tech.git

---

8️⃣ Entrar na Kyara

cd ~/storage/Kyara-High-Tech

---

9️⃣ Instalar dependências

npm install

Aguarde o processo terminar.

---

🔟 Iniciar a Kyara

npm start

---

⚡ INSTALAÇÃO RÁPIDA

Para uma instalação nova:

Atualizar pacotes

pkg update -y

Atualizar sistema

pkg upgrade -y

Instalar Git

pkg install -y git

Instalar Node.js

pkg install -y nodejs-lts

Instalar FFmpeg

pkg install -y ffmpeg

Liberar armazenamento

termux-setup-storage

Entrar no armazenamento

cd ~/storage

Clonar

git clone https://github.com/bakizinho/Kyara-High-Tech.git

Entrar na pasta

cd ~/storage/Kyara-High-Tech

Instalar

npm install

Iniciar

npm start

---

⚙️ CONFIGURAÇÃO

A Kyara possui um sistema próprio de configuração.

Abrir o configurador

npm run config

Instalação/verificação pelo configurador

npm run config:install

O sistema de configuração utiliza os scripts internos do projeto.

---

📱 CONEXÃO COM WHATSAPP

Depois da instalação:

npm start

Na primeira execução, siga as instruções exibidas pelo inicializador.

A Kyara poderá solicitar o método de autenticação disponível no ambiente.

Depois de concluir a conexão, aguarde o bot finalizar a inicialização.

«⚠️ Não feche o Termux enquanto quiser manter a Kyara executando.»

---

▶️ INICIALIZAÇÃO

Para iniciar normalmente:

npm start

O script principal utiliza:

dados/src/.scripts/start.js

---

🔄 INICIAR NOVAMENTE

Se o projeto já estiver instalado:

cd ~/storage/Kyara-High-Tech

Depois:

npm start

Não é necessário executar "git clone" novamente.

---

📦 SCRIPTS NPM

Os scripts abaixo correspondem aos scripts declarados no "package.json".

Comando| Função
"npm start"| Inicia a Kyara
"npm run dev"| Modo desenvolvimento
"npm run config"| Configuração
"npm run config:install"| Instalação/verificação
"npm run update"| Atualização

---

▶️ "npm start"

npm start

Inicialização normal da aplicação.

---

🛠️ "npm run dev"

npm run dev

Modo destinado ao desenvolvimento.

Utiliza o Nodemon para reinicialização durante alterações monitoradas.

---

⚙️ "npm run config"

npm run config

Executa o sistema de configuração.

---

📥 "npm run config:install"

npm run config:install

Executa o fluxo interno de instalação/verificação.

---

🔄 "npm run update"

npm run update

Executa o atualizador interno do projeto.

---

🔄 ATUALIZAÇÃO

Entre na pasta:

cd ~/storage/Kyara-High-Tech

Confira o estado:

git status

Atualize o código:

git pull

Atualize as dependências:

npm install

Inicie novamente:

npm start

---

🛠️ ATUALIZAÇÃO COMPLETA

Fluxo recomendado:

cd ~/storage/Kyara-High-Tech

git pull

npm install

npm start

---

📁 ESTRUTURA DO PROJETO

Kyara-High-Tech/
│
├── assets/
│
├── config/
│
├── dados/
│   ├── api/
│   ├── database/
│   ├── midias/
│   └── src/
│       ├── .scripts/
│       ├── core/
│       ├── features/
│       └── ...
│
├── .gitignore
├── package.json
└── README.md

---

🌐 API

A aplicação possui uma camada de API dentro de:

dados/api/

Componentes existentes incluem:

dados/api/server.mjs

dados/api/kyara-browser.html

dados/api/kyara-tube.html

A API funciona como uma camada auxiliar para determinados recursos da aplicação.

---

⚡ NATIVE FLOW

A Kyara possui uma camada dedicada ao Native Flow:

dados/src/core/nativeFlow/

A finalidade é permitir interfaces interativas dentro do WhatsApp.

Estrutura conceitual

🌸 MENU
 │
 ├── 📥 DOWNLOADS
 │    ├── 🎵 YOUTUBE
 │    ├── 🎬 TIKTOK
 │    ├── 📸 INSTAGRAM
 │    └── 📌 PINTEREST
 │
 ├── 🎮 RPG
 │
 ├── 💰 ECONOMIA
 │
 └── 🛡️ ADMIN

---

📥 DOWNLOADS

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

Ou:

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

Consultar:

/level

Ativar:

/level on

Desativar:

/level off

Persistência

Ao desativar o sistema:

- Level não é apagado;
- XP não é apagado;
- dados existentes permanecem preservados;
- a configuração é individual.

O proprietário da Kyara não participa do sistema de Level.

---

👥 GRUPOS

A Kyara possui recursos destinados à utilização em grupos.

A disponibilidade dos recursos depende da versão e da configuração instalada.

Entre as categorias do projeto estão:

- 🛡️ Administração
- 🔗 Controle de links
- 👥 Gerenciamento
- ⚙️ Configurações
- 🎮 Entretenimento
- 🆙 Level

---

🤖 IA

A Kyara possui uma estrutura modular para recursos inteligentes.

Os módulos podem evoluir independentemente do núcleo principal da aplicação.

---

📋 MENU

Para acessar o menu principal:

/menu

O menu apresenta os recursos disponíveis na instalação atual.

---

🔎 DIAGNÓSTICO

Quando alguma coisa apresentar problema, comece verificando o ambiente.

Diretório atual

pwd

Arquivos

ls

Node.js

node -v

npm

npm -v

Git

git --version

FFmpeg

ffmpeg -version

Estado do Git

git status

---

🧰 REINSTALAR DEPENDÊNCIAS

Entre no projeto:

cd ~/storage/Kyara-High-Tech

Limpe o cache:

npm cache clean --force

Instale novamente:

npm install

Inicie:

npm start

---

🐛 ERROS COMUNS

"git: command not found"

pkg install -y git

---

"node: command not found"

pkg install -y nodejs-lts

---

"npm: command not found"

pkg install -y nodejs-lts

---

FFmpeg não encontrado

pkg install -y ffmpeg

---

Projeto não encontrado

Verifique:

ls ~/storage

Depois:

cd ~/storage/Kyara-High-Tech

---

Dependências quebradas

npm install

Se persistir:

npm cache clean --force

E novamente:

npm install

---

🔐 SEGURANÇA

Nunca publique arquivos de autenticação ou informações privadas da sua sessão.

Evite compartilhar:

- 🔑 Tokens
- 🔐 Credenciais
- 📱 Dados privados
- 🗝️ Chaves
- 📂 Arquivos de sessão
- 🛡️ Informações sensíveis

Antes de publicar logs, revise o conteúdo.

---

🧑‍💻 DESENVOLVIMENTO

Para trabalhar no projeto:

git clone https://github.com/bakizinho/Kyara-High-Tech.git

Entre na pasta:

cd ~/storage/Kyara-High-Tech

Instale as dependências:

npm install

Execute em desenvolvimento:

npm run dev

---

🧩 PRINCÍPIOS DA KYARA

A arquitetura busca priorizar:

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

- reduzir duplicação;
- manter responsabilidades separadas;
- facilitar manutenção;
- facilitar expansão;
- preservar estabilidade;
- melhorar a experiência do usuário.

---

🤝 CONTRIBUIÇÃO

Contribuições são bem-vindas.

Antes de enviar alterações:

1. mantenha a organização existente;
2. evite duplicar funcionalidades;
3. preserve módulos existentes;
4. teste suas alterações;
5. não envie credenciais;
6. mantenha o README atualizado quando necessário.

---

🌐 REPOSITÓRIO

<div align="center">KYARA HIGH-TECH

https://github.com/bakizinho/Kyara-High-Tech

</div>---

❤️ CRÉDITOS

<div align="center"><img src="./assets/kyara-high-tech.svg" width="70%" alt="KYARA HIGH-TECH">🌸 KYARA HIGH-TECH

Desenvolvido por Baki

WhatsApp • Node.js • Termux • JavaScript

✨ MAIS QUE UM BOT. UM ECOSSISTEMA.

KYARA HIGH-TECH © 2026

</div>