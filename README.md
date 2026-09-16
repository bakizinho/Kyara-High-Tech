<div align="center"><img src="./assets/kyara-high-tech.svg" width="100%" alt="KYARA HIGH-TECH"><br><br>

<img src="./dados/midias/menu.jpg" width="520" alt="KYARA HIGH-TECH"><h1>🌸 KYARA HIGH-TECH v1</h1><p>
  <strong>WhatsApp Automation • Media • AI • RPG • Economy • Groups</strong>
</p><p>
  <img src="https://img.shields.io/badge/VERSION-10.2.1-8a2be2?style=for-the-badge">
  <img src="https://img.shields.io/badge/NODE.JS-20%2B-00d9ff?style=for-the-badge&logo=node.js">
  <img src="https://img.shields.io/badge/WHATSAPP-BOT-25d366?style=for-the-badge&logo=whatsapp">
  <img src="https://img.shields.io/badge/LICENSE-ISC-ff69b4?style=for-the-badge">
</p><p>
  <em>Mais que um bot. Um ecossistema.</em>
</p></div>---

🌸 Sobre a Kyara

A KYARA HIGH-TECH é um sistema de automação para WhatsApp desenvolvido em Node.js, com arquitetura modular e diferentes sistemas integrados.

O projeto reúne ferramentas para:

- 🤖 Automação do WhatsApp
- 🎵 Downloads de mídia
- 🎬 YouTube
- 📱 TikTok
- 📸 Instagram
- 📌 Pinterest
- 📘 Facebook
- 🎞️ Kwai
- 🎮 Jogos e entretenimento
- ⭐ Sistema de Level e XP
- 🛡️ Administração de grupos
- 🧩 Menus interativos
- ⚡ Native Flow
- 🌐 Interface Web
- ⏰ Agendamentos
- 🖼️ Figurinhas
- 🔧 Sistemas modulares

---

✨ Principais sistemas

<table>
<tr>
<td width="50%">🎵 Media

Sistema de download e processamento de mídia com suporte a diferentes plataformas.

</td>
<td width="50%">⭐ Level

Sistema de XP e níveis para membros, com armazenamento persistente.

</td>
</tr><tr>
<td>🛡️ Grupos

Ferramentas para administração e gerenciamento de grupos.

</td>
<td>🎮 Entretenimento

Jogos, comandos interativos e sistemas especiais.

</td>
</tr><tr>
<td>📱 Native Flow

Menus interativos integrados à interface do WhatsApp.

</td>
<td>🌐 Kyara Web

Interface web para recursos relacionados ao sistema.

</td>
</tr>
</table>---

📲 Instalação

1. Requisitos

Antes de iniciar, tenha instalado:

- Android
- Termux
- Node.js 20 ou superior
- npm
- Git
- Conexão com a internet

A versão do Node exigida pelo projeto é:

Node.js >= 20
npm >= 9

---

2. Preparar o Termux

Atualize os pacotes:

pkg update -y && pkg upgrade -y

Instale Git e Node.js:

pkg install -y git nodejs-lts

Verifique as versões:

node -v
npm -v
git --version

---

3. Liberar o armazenamento

No Termux:

termux-setup-storage

Quando o Android solicitar permissão, permita o acesso aos arquivos.

---

4. Baixar a Kyara

Clone o projeto:

cd ~/storage
git clone https://github.com/bakizinho/BKkyara- BKkyara-

Entre na pasta:

cd ~/storage/BKkyara-

---

5. Instalar as dependências

Execute:

npm install

O projeto utiliza, entre outras dependências:

- Baileys
- Axios
- Cheerio
- Sharp
- FFmpeg
- Node Cache
- Node Cron
- Pino
- WebSocket
- YouTube Search

---

6. Iniciar o bot

A forma principal de iniciar a Kyara é:

npm start

Ou diretamente:

node dados/src/.scripts/start.js

Também é possível iniciar pelo entrypoint configurado pelo projeto:

node .

---

📱 Configuração

As configurações principais ficam relacionadas ao sistema em:

dados/src/config.json

Entre as configurações utilizadas estão:

Configuração| Valor padrão
Nome do bot| "BOT-KYARA"
Prefixo| "/"
Dono| "baki"
Repositório| "BKkyara-"

«⚠️ Algumas configurações são específicas do ambiente e podem precisar ser ajustadas antes da primeira execução.»

---

▶️ Executando novamente

Depois da instalação inicial, normalmente basta:

cd ~/storage/BKkyara-
npm start

Para interromper o processo:

CTRL + C

---

🎛️ Comandos

O prefixo padrão da Kyara é:

/

🎵 Downloads

Alguns dos sistemas de mídia presentes no projeto incluem:

/play
/playaudio
/playvideo

/ytmp3
/ytmp4

/tiktok
/instagram
/facebook
/kwai
/twitter
/x

/pinterest
/pin

📌 Pinterest

O sistema possui módulo específico para Pinterest:

/pinterest <pesquisa>

Também há suporte ao processamento de URLs através do módulo de download.

---

⭐ Sistema de Level

A Kyara possui sistema de experiência e níveis.

Comandos de controle:

/level
/level on
/level off

O sistema utiliza armazenamento persistente para preservar o progresso dos usuários.

Quando o sistema é desativado individualmente, o progresso existente pode ser mantido sem apagar automaticamente o nível ou XP.

---

🎮 Jogos e entretenimento

A estrutura do projeto possui módulos dedicados a jogos e sistemas especiais.

dados/src/features/

Entre eles estão:

- Sistema de jogos
- Sistema de figurinhas
- Level
- Comandos especiais
- Manutenção de comandos
- Navegador Kyara
- Menus
- Sistemas semanais

---

📱 Native Flow

A Kyara possui uma arquitetura dedicada para Native Flow:

dados/src/core/nativeFlow/

O sistema contém componentes para:

- Menus
- Botões
- Roteamento
- Fluxos do proprietário
- Integração com comandos

A estrutura foi desenvolvida para permitir uma experiência de navegação mais organizada dentro do WhatsApp.

---

🌐 API e Web

O projeto possui uma API própria:

dados/api/server.mjs

Também existem interfaces web relacionadas à Kyara:

dados/api/kyara-browser.html
dados/api/kyara-tube.html

Esses componentes podem ser utilizados pelos recursos que dependem da camada web/API do projeto.

---

🧩 Estrutura do projeto

BKkyara-
│
├── assets/
│
├── dados/
│   │
│   ├── api/
│   │   ├── server.mjs
│   │   ├── kyara-browser.html
│   │   └── kyara-tube.html
│   │
│   ├── midias/
│   │   ├── menu.jpg
│   │   └── level-up.jpg
│   │
│   └── src/
│       │
│       ├── core/
│       │   ├── nativeFlow/
│       │   ├── menuAdaptativo/
│       │   ├── menuDono/
│       │   └── ...
│       │
│       ├── features/
│       │
│       ├── funcs/
│       │   └── downloads/
│       │
│       ├── .scripts/
│       │
│       ├── config.json
│       └── connect.js
│
├── package.json
└── README.md

---

🧠 Arquitetura modular

A Kyara foi organizada para separar diferentes responsabilidades.

WhatsApp
   │
   ▼
Connection Layer
   │
   ▼
Command Engine
   │
   ├── Features
   ├── Downloads
   ├── Groups
   ├── Games
   ├── Level
   └── Native Flow
        │
        ▼
     Database

Essa organização facilita a manutenção e a criação de novos sistemas sem concentrar toda a lógica em um único arquivo.

---

⚙️ Scripts disponíveis

O "package.json" possui os seguintes scripts:

Comando| Função
"npm start"| Inicia a Kyara
"npm run dev"| Executa em modo desenvolvimento
"npm run config"| Abre o sistema de configuração
"npm run config:install"| Configuração/instalação
"npm run update"| Executa o atualizador do projeto

Desenvolvimento

Para utilizar o modo de desenvolvimento:

npm run dev

---

🔧 Solução de problemas

"node: command not found"

Instale o Node.js:

pkg install nodejs-lts

---

"git: command not found"

Instale o Git:

pkg install git

---

Problemas com dependências

Dentro da pasta do projeto:

npm install

Se necessário, atualize os pacotes do Termux:

pkg update -y && pkg upgrade -y

---

A pasta não foi encontrada

Verifique:

ls ~/storage

Depois:

cd ~/storage/BKkyara-

---

📊 Status do projeto

<div align="center"><table>
<tr>
<th>Sistema</th>
<th>Status</th>
</tr><tr>
<td>WhatsApp Core</td>
<td>🟢 Ativo</td>
</tr><tr>
<td>Command Engine</td>
<td>🟢 Ativo</td>
</tr><tr>
<td>Media System</td>
<td>🟢 Ativo</td>
</tr><tr>
<td>Native Flow</td>
<td>🟢 Ativo</td>
</tr><tr>
<td>Level System</td>
<td>🟢 Ativo</td>
</tr><tr>
<td>Web / API</td>
<td>🟢 Disponível</td>
</tr>
</table></div>---

📦 Tecnologias

<div align="center"><img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white">
<img src="https://img.shields.io/badge/JavaScript-ESM-F7DF1E?style=flat-square&logo=javascript&logoColor=black">
<img src="https://img.shields.io/badge/WhatsApp-Baileys-25D366?style=flat-square&logo=whatsapp&logoColor=white">
<img src="https://img.shields.io/badge/FFmpeg-Media-007808?style=flat-square&logo=ffmpeg&logoColor=white">
<img src="https://img.shields.io/badge/WebSocket-Support-333333?style=flat-square"></div>---

🔐 Segurança

Nunca compartilhe publicamente:

- Credenciais de autenticação
- Sessões do WhatsApp
- Tokens
- Chaves privadas
- Dados pessoais
- Configurações sensíveis

Arquivos de sessão devem permanecer protegidos e fora de repositórios públicos quando contiverem credenciais.

---

📜 Licença

Este projeto utiliza a licença:

ISC

Consulte o arquivo "package.json" para as informações de licença declaradas pelo projeto.

---

👑 Créditos

<div align="center">🌸 KYARA HIGH-TECH

WhatsApp Automation System

<br>Desenvolvido e mantido por Baki.

<br><img src="./assets/kyara-high-tech.svg" width="280" alt="Kyara"><br><br>

<em>Automation • Entertainment • Management</em>

</div>