const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const file = path.resolve('dados/src/funcs/private/ia.js');

if (!fs.existsSync(file)) {
  throw new Error('[KYARA IA] ia.js não encontrado: ' + file);
}

let s = fs.readFileSync(file, 'utf8');

/*
 * ============================================================
 * BACKUP
 * ============================================================
 */

const backup =
  file +
  '.antes-llama-server-' +
  Date.now() +
  '-' +
  crypto.randomBytes(3).toString('hex') +
  '.bak';

fs.copyFileSync(file, backup);

console.log('[KYARA IA] Backup criado:');
console.log(backup);

/*
 * ============================================================
 * 1. SUBSTITUI EXECUTOR ANTIGO
 *
 * Remove:
 *   spawnSync + llama-cli por mensagem
 *
 * Coloca:
 *   llama-server persistente
 *   /v1/chat/completions
 * ============================================================
 */

const inicio = s.indexOf("import { spawnSync } from 'child_process';");
const fim = s.indexOf('function extrairMensagemAssistente');

if (inicio === -1) {
  throw new Error(
    '[KYARA IA] Import antigo spawnSync não encontrado.'
  );
}

if (fim === -1) {
  throw new Error(
    '[KYARA IA] function extrairMensagemAssistente não encontrada.'
  );
}

const novoExecutor = `import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import crypto from 'crypto';
import userContextDB from '../../utils/userContextDB.js';

const LOCAL_AI_URL =
  (process.env.KYARA_AI_URL || 'http://127.0.0.1:8080')
    .replace(/\\\\/$/, '');

const LOCAL_AI_MODEL =
  process.env.KYARA_AI_MODEL ||
  'qwen2.5-0.5b-instruct-q4_k_m.gguf';

const LOCAL_AI_ENDPOINT =
  '/v1/chat/completions';

const AI_TIMEOUT =
  Number(process.env.KYARA_AI_TIMEOUT || 45000);

const AI_START_TIMEOUT =
  Number(process.env.KYARA_AI_START_TIMEOUT || 60000);

const AI_MAX_TOKENS =
  Math.min(
    Number(process.env.KYARA_AI_MAX_TOKENS || 256),
    384
  );

const AI_TEMPERATURE = 0.55;

let kyaraServerProcess = null;
let kyaraServerStarting = null;

function encontrarModeloKyara() {
  const nome = LOCAL_AI_MODEL;

  const candidatos = [
    nome,
    path.join(
      process.env.HOME || '',
      'kyara-ai',
      'models',
      nome
    ),
    path.join(
      process.env.HOME || '',
      'models',
      nome
    ),
    path.resolve(nome),
    path.resolve('models', nome),
    path.resolve('dados', 'models', nome),
    path.resolve('dados', nome)
  ];

  for (const candidato of candidatos) {
    if (
      candidato &&
      fs.existsSync(candidato) &&
      fs.statSync(candidato).isFile()
    ) {
      return path.resolve(candidato);
    }
  }

  return null;
}

function encontrarLlamaServer() {
  const candidatos = [
    process.env.KYARA_LLAMA_SERVER,
    'llama-server'
  ].filter(Boolean);

  for (const cmd of candidatos) {
    try {
      const r = spawnSync(
        cmd,
        ['--version'],
        {
          encoding: 'utf8',
          timeout: 5000
        }
      );

      if (
        !r.error &&
        r.status === 0
      ) {
        return cmd;
      }
    } catch {}
  }

  return null;
}

function servidorEstaRodando() {
  try {
    const r = spawnSync(
      'curl',
      [
        '-s',
        '--max-time',
        '2',
        LOCAL_AI_URL + '/health'
      ],
      {
        encoding: 'utf8',
        timeout: 3000
      }
    );

    return (
      !r.error &&
      r.status === 0 &&
      String(r.stdout || '').trim()
    );
  } catch {
    return false;
  }
}

function iniciarKyaraServer() {
  if (servidorEstaRodando()) {
    console.log('[LOCAL AI] ✅ llama-server já está rodando.');
    return Promise.resolve(true);
  }

  if (kyaraServerStarting) {
    return kyaraServerStarting;
  }

  kyaraServerStarting =
    new Promise((resolve) => {
      const modelo =
        encontrarModeloKyara();

      if (!modelo) {
        console.error(
          '[LOCAL AI] ❌ Modelo não encontrado:',
          LOCAL_AI_MODEL
        );

        kyaraServerStarting = null;
        resolve(false);
        return;
      }

      const server =
        encontrarLlamaServer();

      if (!server) {
        console.error(
          '[LOCAL AI] ❌ llama-server não encontrado.'
        );
        console.error(
          '[LOCAL AI] Instale/aponte KYARA_LLAMA_SERVER.'
        );

        kyaraServerStarting = null;
        resolve(false);
        return;
      }

      const url =
        new URL(LOCAL_AI_URL);

      const host =
        url.hostname || '127.0.0.1';

      const port =
        url.port || '8080';

      console.log(
        '[LOCAL AI] 🚀 Iniciando llama-server persistente...'
      );

      console.log(
        '[LOCAL AI] Modelo:',
        modelo
      );

      const logDir =
        path.join(
          process.cwd(),
          'logs'
        );

      fs.mkdirSync(
        logDir,
        { recursive: true }
      );

      const logFile =
        path.join(
          logDir,
          'kyara-llama-server.log'
        );

      const logFd =
        fs.openSync(
          logFile,
          'a'
        );

      const child =
        spawn(
          server,
          [
            '-m',
            modelo,
            '--host',
            host,
            '--port',
            String(port),
            '-c',
            '2048',
            '-t',
            '4',
            '--no-warmup'
          ],
          {
            detached: false,
            stdio: [
              'ignore',
              logFd,
              logFd
            ]
          }
        );

      try {
        fs.closeSync(logFd);
      } catch {}

      kyaraServerProcess = child;

      child.on(
        'exit',
        (code, signal) => {
          console.warn(
            '[LOCAL AI] ⚠️ llama-server encerrou.',
            { code, signal }
          );

          kyaraServerProcess = null;
        }
      );

      child.on(
        'error',
        (error) => {
          console.error(
            '[LOCAL AI] ❌ Erro no llama-server:',
            error?.message || error
          );

          kyaraServerProcess = null;
        }
      );

      const inicioEspera =
        Date.now();

      const verificar =
        () => {
          if (servidorEstaRodando()) {
            console.log(
              '[LOCAL AI] ✅ llama-server ONLINE.'
            );

            console.log(
              '[LOCAL AI] Log:',
              logFile
            );

            kyaraServerStarting = null;
            resolve(true);
            return;
          }

          if (
            Date.now() - inicioEspera >=
            AI_START_TIMEOUT
          ) {
            console.error(
              '[LOCAL AI] ❌ Timeout aguardando llama-server.'
            );

            console.error(
              '[LOCAL AI] Veja o log:',
              logFile
            );

            kyaraServerStarting = null;
            resolve(false);
            return;
          }

          setTimeout(
            verificar,
            1000
          );
        };

      verificar();
    });

  return kyaraServerStarting;
}

async function executarKyaraLocal(prompt) {
  try {
    const online =
      await iniciarKyaraServer();

    if (!online) {
      return '';
    }

    const url =
      LOCAL_AI_URL +
      LOCAL_AI_ENDPOINT;

    console.log(
      '[LOCAL AI] 🧠 Enviando prompt ao servidor persistente...'
    );

    const response =
      await axios.post(
        url,
        {
          model:
            LOCAL_AI_MODEL,

          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],

          temperature:
            AI_TEMPERATURE,

          max_tokens:
            AI_MAX_TOKENS,

          stream: false
        },
        {
          timeout:
            AI_TIMEOUT
        }
      );

    const texto =
      response?.data
        ?.choices?.[0]
        ?.message?.content || '';

    return normalizarKyaraTexto(
      texto
    );
  } catch (error) {
    console.warn(
      '[LOCAL AI] ⚠️ Falha:',
      error?.message || error
    );

    return '';
  }
}

async function executarKyaraHttp(prompt) {
  return executarKyaraLocal(prompt);
}

`;

s =
  s.slice(0, inicio) +
  novoExecutor +
  s.slice(fim);

/*
 * ============================================================
 * 2. EVITA PROMPT/HISTÓRICO DESNECESSARIAMENTE GRANDE
 * ============================================================
 */

s = s.replace(
  'const KYARA_MAX_HISTORY = 12;',
  'const KYARA_MAX_HISTORY = 6;'
);

/*
 * Limita os blocos dinâmicos.
 */

s = s.replace(
  /\.slice\(0,\s*3000\)/g,
  '.slice(0, 1000)'
);

s = s.replace(
  /\.slice\(0,\s*800\)/g,
  '.slice(0, 500)'
);

/*
 * ============================================================
 * 3. CORRIGE CHAMADA DO EXECUTOR
 *
 * O executor agora é async.
 * Portanto precisa de await.
 * ============================================================
 */

const antigoCall = `let respostaLocal =
    executarKyaraLocal(prompt);

  if (!respostaLocal) {
    respostaLocal =
      await executarKyaraHttp(prompt);
  }`;

const novoCall = `const respostaLocal =
    await executarKyaraLocal(prompt);`;

if (s.includes(antigoCall)) {
  s = s.replace(
    antigoCall,
    novoCall
  );
} else {
  /*
   * Fallback para pequenas diferenças de formatação.
   */
  const regex =
    /let respostaLocal\\s*=\\s*executarKyaraLocal\\(prompt\\);\\s*\\n\\s*if\\s*\\(!respostaLocal\\)\\s*\\{[\\s\\S]*?await executarKyaraHttp\\(prompt\\);\\s*\\n\\s*\\}/;

  if (regex.test(s)) {
    s = s.replace(
      regex,
      novoCall
    );
  } else {
    throw new Error(
      '[KYARA IA] Chamada executarKyaraLocal(prompt) não encontrada no formato esperado.'
    );
  }
}

/*
 * ============================================================
 * 4. VALIDAÇÕES
 * ============================================================
 */

if (
  s.includes(
    "import { spawnSync } from 'child_process';"
  )
) {
  throw new Error(
    '[KYARA IA] Import antigo spawnSync ainda existe.'
  );
}

if (
  s.includes("'llama-cli'") ||
  s.includes('"llama-cli"')
) {
  throw new Error(
    '[KYARA IA] llama-cli ainda aparece no arquivo.'
  );
}

if (
  !s.includes('llama-server')
) {
  throw new Error(
    '[KYARA IA] llama-server não foi inserido.'
  );
}

if (
  !s.includes('/v1/chat/completions')
) {
  throw new Error(
    '[KYARA IA] Endpoint novo não encontrado.'
  );
}

if (
  !s.includes(
    'await executarKyaraLocal(prompt)'
  )
) {
  throw new Error(
    '[KYARA IA] await do executor não encontrado.'
  );
}

/*
 * ============================================================
 * 5. SALVA
 * ============================================================
 */

fs.writeFileSync(
  file,
  s,
  'utf8'
);

console.log('');
console.log('============================================');
console.log('[KYARA IA] ✅ PATCH APLICADO');
console.log('============================================');
console.log('[KYARA IA] llama-cli por mensagem: REMOVIDO');
console.log('[KYARA IA] llama-server persistente: ATIVADO');
console.log('[KYARA IA] endpoint:', LOCAL_AI_ENDPOINT);
console.log('[KYARA IA] prompt/histórico: REDUZIDOS');
console.log('[KYARA IA] backup:', backup);
console.log('============================================');
