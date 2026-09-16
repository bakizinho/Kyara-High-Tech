🌸 KYARA HIGH-TECH v1

<div align="center"><img src="./assets/kyara-high-tech.svg" width="100%" alt="KYARA HIGH-TECH"><br><img src="./dados/midias/menu.jpg" width="520" alt="KYARA HIGH-TECH">WhatsApp Bot • AI • Media • RPG • Economy • Groups

<p>
  <img src="https://img.shields.io/badge/VERSION-HIGH--TECH_v1-8a2be2?style=for-the-badge">
  <img src="https://img.shields.io/badge/NODE.JS-20%2B-00d9ff?style=for-the-badge&logo=node.js">
  <img src="https://img.shields.io/badge/WHATSAPP-BOT-25d366?style=for-the-badge&logo=whatsapp">
  <img src="https://img.shields.io/badge/LICENSE-ISC-ff69b4?style=for-the-badge">
</p><strong>Mais que um bot. Um ecossistema.</strong>

</div>---

⚡ Sobre

A KYARA HIGH-TECH é um bot modular para WhatsApp desenvolvido em Node.js.

O projeto reúne automação, mídia, entretenimento, sistemas de grupo, RPG, economia, ferramentas e menus interativos em uma única estrutura.

---

📲 Instalação no Android

A maneira mais simples de executar a Kyara no Android é utilizando o Termux.

1. Instale o Termux

Instale o Termux em uma fonte confiável e abra o aplicativo.

Depois, copie e cole este comando inteiro no Termux:

pkg update -y && pkg upgrade -y

Aguarde terminar.

---

2. Instale os requisitos

Agora copie e cole:

pkg install -y git nodejs-lts

Depois confira se tudo foi instalado:

node -v && npm -v && git --version

A Kyara requer Node.js 20 ou superior.

---

3. Libere o armazenamento

Copie e cole:

termux-setup-storage

O Android irá solicitar permissão para acessar os arquivos.

Toque em Permitir.

---

🚀 4. Baixe a Kyara

Agora vem a parte principal.

Copie e cole este comando inteiro:

cd ~/storage && git clone https://github.com/bakizinho/Kyara-High-Tech.git

Depois entre na pasta:

cd ~/storage/Kyara-High-Tech

---

📦 5. Instale as dependências

Agora copie e cole:

npm install

Espere o processo terminar.

«⏳ A primeira instalação pode demorar dependendo da velocidade da internet e do aparelho.»

---

▶️ 6. Inicie a Kyara

Depois que o "npm install" terminar:

npm start

Pronto.

A Kyara irá iniciar e mostrar no terminal o processo de conexão.

---

🔁 Iniciar novamente depois

Depois que tudo já estiver instalado, você não precisa repetir a instalação.

Basta copiar e colar:

cd ~/storage/Kyara-High-Tech && npm start

Esse é o comando principal para iniciar a Kyara novamente.

---

🛑 Parar a Kyara

Para desligar o bot no Termux:

CTRL + C

Isso encerra o processo atual.

---

🧰 Instalação rápida

Se o Termux já estiver configurado e você quiser fazer a instalação de uma vez, use:

pkg update -y && pkg upgrade -y && pkg install -y git nodejs-lts && termux-setup-storage && cd ~/storage && git clone https://github.com/bakizinho/Kyara-High-Tech.git && cd Kyara-High-Tech && npm install

Depois inicie:

cd ~/storage/Kyara-High-Tech && npm start

---

❗ Problemas durante a instalação

"node: command not found"

Execute:

pkg install -y nodejs-lts

Depois:

node -v

---

"git: command not found"

Execute:

pkg install -y git

---

"npm install" apresentou erro

Primeiro tente:

pkg update -y && pkg upgrade -y

Depois:

cd ~/storage/Kyara-High-Tech
npm install

---

A pasta "Kyara-High-Tech" não existe

Confira as pastas:

ls ~/storage

Se o projeto estiver presente, entre nele:

cd ~/storage/Kyara-High-Tech

---

🎛️ Prefixo

O prefixo padrão dos comandos da Kyara é:

/

Exemplos:

/ping
/menu
/play
/pinterest
/level

---

🎵 Downloads

A Kyara possui sistemas para trabalhar com diferentes plataformas e tipos de mídia.

Entre os comandos disponíveis estão:

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

Pesquisas podem ser feitas diretamente pelo comando:

/pinterest gato

Também existe suporte ao processamento de links através do sistema de mídia.

---

⭐ Sistema de Level

A Kyara possui um sistema de XP e níveis.

/level
/level on
/level off

O progresso do usuário é armazenado de forma persistente.

Desativar o sistema individualmente não significa apagar automaticamente o progresso existente.

---

📱 Native Flow

A Kyara possui uma arquitetura própria para menus e interações utilizando Native Flow.

A estrutura fica organizada dentro de:

dados/src/core/nativeFlow/

O objetivo é permitir que funções do bot possam ser acessadas através de menus e botões interativos.

---

🌐 API

O projeto possui uma camada de API dentro de:

dados/api/

Incluindo:

server.mjs
kyara-browser.html
kyara-tube.html

---

📁 Estrutura

Kyara-High-Tech/
│
├── assets/
│
├── config/
│
├── dados/
│   ├── api/
│   ├── midias/
│   └── src/
│       ├── core/
│       ├── features/
│       ├── funcs/
│       └── .scripts/
│
├── package.json
├── README.md
└── ...

---

⚙️ Scripts

O projeto possui scripts para diferentes operações:

npm start

Inicia a Kyara.

npm run dev

Executa o projeto em modo de desenvolvimento.

npm run config

Abre o sistema de configuração.

npm run update

Executa o atualizador do projeto.

---

🔐 Segurança

Nunca publique ou compartilhe:

- Sessões do WhatsApp
- Tokens
- Senhas
- Chaves privadas
- Credenciais
- Dados pessoais

Mantenha arquivos de autenticação protegidos.

---

🌸 KYARA HIGH-TECH

<div align="center"><img src="./assets/kyara-high-tech.svg" width="300" alt="KYARA"><br><br>

<strong>WhatsApp Automation System</strong>

<br><br>

Desenvolvido por <strong>Baki</strong>

<br><br>

<em>Automation • Entertainment • Management</em>

</div>
