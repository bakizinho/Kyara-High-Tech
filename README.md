<div align="center">

<img src="./assets/kyara-high-tech.svg" width="100%" alt="KYARA HIGH-TECH">

<br>

<img src="./dados/midias/menu.jpg" width="520" alt="KYARA HIGH-TECH">

# 🌸 KYARA HIGH-TECH

### WhatsApp Bot • AI • Media • RPG • Economy • Groups

<p>
  <img src="https://img.shields.io/badge/VERSION-10.2.1-8a2be2?style=for-the-badge">
  <img src="https://img.shields.io/badge/NODE.JS-20%2B-00d9ff?style=for-the-badge&logo=node.js">
  <img src="https://img.shields.io/badge/WHATSAPP-BOT-25d366?style=for-the-badge&logo=whatsapp">
  <img src="https://img.shields.io/badge/TERMUX-SUPPORTED-000000?style=for-the-badge&logo=termux">
  <img src="https://img.shields.io/badge/OPEN_SOURCE-YES-00ff9d?style=for-the-badge">
</p>

### ✨ Mais que um bot. Um ecossistema.

</div>

---

# 🧭 ÍNDICE

- [🌸 Sobre](#-sobre)
- [⚡ Recursos](#-recursos)
- [🏗️ Arquitetura](#️-arquitetura)
- [📋 Requisitos](#-requisitos)
- [🚀 Instalação](#-instalação)
- [📱 Primeira execução](#-primeira-execução)
- [▶️ Iniciar a Kyara](#️-iniciar-a-kyara)
- [📦 Scripts NPM](#-scripts-npm)
- [📋 Comandos](#-comandos)
- [📥 Downloads](#-downloads)
- [🆙 Sistema de Level](#-sistema-de-level)
- [🎮 RPG](#-rpg)
- [👥 Grupos](#-grupos)
- [⚡ Native Flow](#-native-flow)
- [🌐 API](#-api)
- [📁 Estrutura](#-estrutura)
- [🔄 Atualização](#-atualização)
- [🛠️ Diagnóstico](#️-diagnóstico)
- [🔐 Segurança](#-segurança)
- [🤝 Desenvolvimento](#-desenvolvimento)
- [❤️ Créditos](#️-créditos)

---

# 🌸 SOBRE

A **KYARA HIGH-TECH** é um bot modular para WhatsApp desenvolvido em **Node.js**.

A proposta do projeto é reunir diferentes sistemas dentro de uma única arquitetura, mantendo os recursos separados em módulos para facilitar manutenção, evolução e expansão.

### 🧩 Ecossistema

| Sistema | Função |
|---|---|
| 📱 WhatsApp | Comunicação e processamento de mensagens |
| ⚡ Commands | Execução de comandos |
| 🌐 Native Flow | Menus e interfaces interativas |
| 📥 Media | Recursos de mídia e downloads |
| 🤖 IA | Recursos inteligentes |
| 👥 Groups | Ferramentas para grupos |
| 🛡️ Admin | Administração |
| 🎮 RPG | Entretenimento |
| 💰 Economy | Sistema de economia |
| 🆙 Level | XP e progressão |

---

# ⚡ RECURSOS

### 📥 Mídia

- 🎵 YouTube
- 🎧 YouTube MP3
- 🎬 YouTube MP4
- 🎵 TikTok
- 📸 Instagram
- 📘 Facebook
- 🎞️ Kwai
- 🐦 Twitter/X
- 📌 Pinterest

### 👥 Comunidades

- Administração
- Controle de grupo
- Ferramentas de interação
- Sistemas de entretenimento
- Level e XP

### 🎮 Entretenimento

- RPG
- Economia
- Sistemas de progressão
- Recursos interativos

### 🌐 Interface

- Native Flow
- Menus interativos
- Botões
- Fluxos de navegação
- Ações automatizadas

---

# 🏗️ ARQUITETURA

A Kyara utiliza uma arquitetura modular para separar o processamento principal das funcionalidades.

```text
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
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
          COMMANDS       FEATURES     NATIVE FLOW
              │             │             │
              └─────────────┼─────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
            MEDIA          RPG          GROUPS
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                         RESPONSE
```

### 🔄 Fluxo de processamento

```text
MESSAGE
   │
   ▼
DETECT
   │
   ▼
COMMAND
   │
   ▼
HANDLER
   │
   ├── MEDIA
   ├── GROUP
   ├── RPG
   ├── LEVEL
   ├── ECONOMY
   └── NATIVE FLOW
   │
   ▼
RESPONSE
```

---

# 📋 REQUISITOS

| Requisito | Necessário |
|---|---|
| Android | ✅ |
| Termux | ✅ |
| Node.js | 20+ |
| npm | 9+ |
| Git | ✅ |
| FFmpeg | Recomendado para mídia |
| WhatsApp | ✅ |

---

# 🚀 INSTALAÇÃO

A instalação abaixo é destinada ao **Termux**.

> 📱 Cada comando possui seu próprio bloco `bash`.  
> No GitHub, use o botão **📋 Copiar** de cada bloco para copiar diretamente para o Termux.

---

## 1️⃣ Atualizar o Termux

```bash
pkg update -y
```

```bash
pkg upgrade -y
```

---

## 2️⃣ Instalar Git

```bash
pkg install -y git
```

---

## 3️⃣ Instalar Node.js

```bash
pkg install -y nodejs-lts
```

---

## 4️⃣ Instalar FFmpeg

```bash
pkg install -y ffmpeg
```

---

## 5️⃣ Liberar armazenamento

Execute apenas na primeira configuração:

```bash
termux-setup-storage
```

Quando o Android solicitar permissão, selecione **Permitir**.

---

## 6️⃣ Entrar no armazenamento

```bash
cd ~/storage
```

---

## 7️⃣ Baixar a Kyara

```bash
git clone https://github.com/bakizinho/Kyara-High-Tech.git
```

---

## 8️⃣ Entrar na pasta

```bash
cd ~/storage/Kyara-High-Tech
```

---

## 9️⃣ Instalar dependências

```bash
npm install
```

---

## 🔟 Iniciar

```bash
npm start
```

---

# ⚡ INSTALAÇÃO RÁPIDA

Para quem já sabe utilizar o Termux:

```bash
pkg update -y
```

```bash
pkg upgrade -y
```

```bash
pkg install -y git
```

```bash
pkg install -y nodejs-lts
```

```bash
pkg install -y ffmpeg
```

```bash
termux-setup-storage
```

```bash
cd ~/storage
```

```bash
git clone https://github.com/bakizinho/Kyara-High-Tech.git
```

```bash
cd ~/storage/Kyara-High-Tech
```

```bash
npm install
```

```bash
npm start
```

---

# 📱 PRIMEIRA EXECUÇÃO

Depois de executar:

```bash
npm start
```

a Kyara iniciará o processo de conexão.

Siga as instruções exibidas no próprio Termux.

Após a conexão:

```text
TERMUX
   │
   ▼
KYARA START
   │
   ▼
WHATSAPP CONNECTION
   │
   ▼
AUTHENTICATION
   │
   ▼
BOT ONLINE
```

> ⚠️ Mantenha o processo do Termux aberto enquanto quiser manter a Kyara executando.

---

# ▶️ INICIAR A KYARA

Se a Kyara já estiver instalada:

```bash
cd ~/storage/Kyara-High-Tech
```

Depois:

```bash
npm start
```

Não é necessário executar `git clone` novamente.

---

# 📦 SCRIPTS NPM

Os scripts disponíveis no projeto são:

| Script | Função |
|---|---|
| `npm start` | Inicia a Kyara |
| `npm run dev` | Desenvolvimento |
| `npm run config` | Configuração |
| `npm run config:install` | Instalação/configuração |
| `npm run update` | Atualização |

---

## ▶️ Iniciar

```bash
npm start
```

---

## 🛠️ Desenvolvimento

```bash
npm run dev
```

---

## ⚙️ Configuração

```bash
npm run config
```

---

## 📥 Configuração de instalação

```bash
npm run config:install
```

---

## 🔄 Atualizador

```bash
npm run update
```

---

# 📋 COMANDOS

A Kyara utiliza:

```text
/
```

como prefixo principal.

### Menu

```text
/menu
```

---

# 📥 DOWNLOADS

## 🎵 YouTube

Pesquisar:

```text
/play nome da música
```

Áudio:

```text
/playaudio nome da música
```

Vídeo:

```text
/playvideo nome do vídeo
```

---

## 🎧 YouTube MP3

```text
/ytmp3 link
```

---

## 🎬 YouTube MP4

```text
/ytmp4 link
```

---

## 🎵 TikTok

```text
/tiktok link
```

---

## 📸 Instagram

```text
/instagram link
```

---

## 📘 Facebook

```text
/facebook link
```

---

## 🎞️ Kwai

```text
/kwai link
```

---

## 🐦 Twitter / X

```text
/twitter link
```

ou:

```text
/x link
```

---

## 📌 Pinterest

Pesquisa:

```text
/pinterest gato
```

Atalho:

```text
/pin gato
```

URL:

```text
/pinterest link
```

---

# 🆙 SISTEMA DE LEVEL

A Kyara possui um sistema de **XP e níveis**.

Consultar:

```text
/level
```

Ativar:

```text
/level on
```

Desativar:

```text
/level off
```

### 💾 Persistência

Ao desativar o sistema:

- o Level não é apagado;
- o XP não é apagado;
- os dados existentes são preservados;
- a configuração é individual por usuário.

O proprietário da Kyara não participa do sistema de Level.

---

# 🎮 RPG

A Kyara possui estrutura para sistemas de RPG e entretenimento.

Os recursos disponíveis podem variar conforme a versão e configuração instalada.

Para consultar os recursos disponíveis:

```text
/menu
```

---

# 👥 GRUPOS

A Kyara possui funcionalidades destinadas a grupos do WhatsApp.

### Categorias

- 🛡️ Administração
- 🔗 Controle de links
- 👥 Gerenciamento
- ⚙️ Configurações
- 🎮 Entretenimento
- 🆙 Level
- 💰 Economia

A disponibilidade de cada recurso depende da configuração atual.

---

# ⚡ NATIVE FLOW

O Native Flow é utilizado para criar uma experiência mais visual dentro do WhatsApp.

```text
                         🌸 MENU
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
        DOWNLOADS          RPG             ADMIN
            │               │               │
      ┌─────┼─────┐         │          ┌────┼────┐
      │     │     │         │          │    │    │
      ▼     ▼     ▼         ▼          ▼    ▼    ▼
     YT   TIKTOK  IG       RPG        LINK  GROUP ADMIN
      │
      ▼
   PINTEREST
```

### Componentes

```text
dados/src/core/nativeFlow/
```

A camada Native Flow permite organizar menus, ações e navegação sem concentrar toda a lógica em um único módulo.

---

# 🌐 API

A Kyara possui uma camada de API dentro de:

```text
dados/api/
```

Entre os componentes do projeto estão:

```text
dados/api/server.mjs
```

```text
dados/api/kyara-browser.html
```

```text
dados/api/kyara-tube.html
```

A API funciona como camada auxiliar para recursos que dependem de serviços internos do projeto.

---

# 📁 ESTRUTURA DO PROJETO

```text
Kyara-High-Tech/
│
├── assets/
│
├── config/
│
├── dados/
│   │
│   ├── api/
│   │
│   ├── database/
│   │
│   ├── midias/
│   │
│   └── src/
│       │
│       ├── .scripts/
│       │
│       ├── core/
│       │
│       ├── features/
│       │
│       └── ...
│
├── .gitignore
├── package.json
└── README.md
```

---

# 🧩 ORGANIZAÇÃO INTERNA

A estrutura interna separa diferentes responsabilidades.

```text
CORE
 │
 ├── CONNECTION
 ├── MESSAGE PROCESSING
 └── NATIVE FLOW

FEATURES
 │
 ├── COMMANDS
 ├── MEDIA
 ├── LEVEL
 ├── RPG
 ├── GROUPS
 └── SYSTEMS

DATABASE
 │
 └── PERSISTENT DATA

API
 │
 └── AUXILIARY SERVICES

MEDIA
 │
 └── BOT ASSETS
```

---

# 🔄 ATUALIZAÇÃO

Para atualizar uma instalação existente:

## 1️⃣ Entrar no projeto

```bash
cd ~/storage/Kyara-High-Tech
```

## 2️⃣ Verificar alterações locais

```bash
git status
```

## 3️⃣ Atualizar o código

```bash
git pull
```

## 4️⃣ Atualizar dependências

```bash
npm install
```

## 5️⃣ Iniciar novamente

```bash
npm start
```

---

# 🛠️ DIAGNÓSTICO

Se algo não funcionar, primeiro confira o ambiente.

### Diretório atual

```bash
pwd
```

### Arquivos do diretório

```bash
ls
```

### Node.js

```bash
node -v
```

### npm

```bash
npm -v
```

### Git

```bash
git --version
```

### FFmpeg

```bash
ffmpeg -version
```

### Estado do projeto

```bash
git status
```

---

# 🧰 REINSTALAR DEPENDÊNCIAS

Entre no projeto:

```bash
cd ~/storage/Kyara-High-Tech
```

Limpe o cache:

```bash
npm cache clean --force
```

Instale novamente:

```bash
npm install
```

Depois:

```bash
npm start
```

---

# 🐛 ERROS COMUNS

## Git não encontrado

```bash
pkg install -y git
```

## Node.js não encontrado

```bash
pkg install -y nodejs-lts
```

## FFmpeg não encontrado

```bash
pkg install -y ffmpeg
```

## Projeto não encontrado

Confira o armazenamento:

```bash
ls ~/storage
```

Entre na pasta:

```bash
cd ~/storage/Kyara-High-Tech
```

## Dependências com problema

```bash
npm install
```

Se necessário:

```bash
npm cache clean --force
```

Depois:

```bash
npm install
```

---

# 🔐 SEGURANÇA

Nunca publique informações privadas da sua sessão do WhatsApp.

Não compartilhe publicamente:

- 🔑 Tokens
- 🔐 Credenciais
- 📱 Dados de autenticação
- 🗝️ Chaves privadas
- 📂 Arquivos de sessão
- 🛡️ Informações sensíveis

Antes de publicar logs ou capturas do Termux, revise o conteúdo.

---

# 🧑‍💻 DESENVOLVIMENTO

Para obter o projeto:

```bash
git clone https://github.com/bakizinho/Kyara-High-Tech.git
```

Entre no projeto:

```bash
cd ~/storage/Kyara-High-Tech
```

Instale as dependências:

```bash
npm install
```

Execute em desenvolvimento:

```bash
npm run dev
```

### Princípios do projeto

```text
MODULARIDADE
      ↓
ORGANIZAÇÃO
      ↓
REUTILIZAÇÃO
      ↓
MANUTENIBILIDADE
      ↓
EXPANSÃO
```

Evite duplicar funcionalidades existentes.

Antes de criar um novo sistema, procure os módulos correspondentes em `dados/src/`.

---

# 📌 PREFIXO

O prefixo principal da Kyara é:

```text
/
```

Exemplo:

```text
/menu
```

---

# 🌸 FILOSOFIA

```text
                    KYARA
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       SIMPLE      MODULAR      FAST
          │           │           │
          └───────────┼───────────┘
                      ▼
                  HIGH-TECH
```

A ideia é manter a experiência simples para quem utiliza o bot e, ao mesmo tempo, manter uma estrutura organizada para quem desenvolve.

---

# 🤝 CONTRIBUIÇÃO

Contribuições são bem-vindas.

Antes de modificar o projeto:

1. mantenha a arquitetura modular;
2. evite duplicação de código;
3. preserve funcionalidades existentes;
4. teste suas alterações;
5. não envie credenciais;
6. mantenha a documentação organizada.

---

# 🌐 PROJETO

<div align="center">

### 🌸 KYARA HIGH-TECH

**WhatsApp • Node.js • Termux • JavaScript**

</div>

---

# ❤️ CRÉDITOS

<div align="center">

<img src="./assets/kyara-high-tech.svg" width="70%" alt="KYARA HIGH-TECH">

### 🌸 KYARA HIGH-TECH

**Desenvolvido por Baki**

### ✨ MAIS QUE UM BOT. UM ECOSSISTEMA.

**KYARA HIGH-TECH © 2026**

</div>