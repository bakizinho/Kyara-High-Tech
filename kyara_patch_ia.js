const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const file = 'dados/src/funcs/private/ia.js';

if (!fs.existsSync(file)) {
  console.error('[KYARA PATCH] ❌ Arquivo não encontrado:', file);
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');

const inicio = s.indexOf(
  "import { spawnSync } from 'child_process';"
);

const marcador = s.indexOf(
  'function extrairMensagemAssistente'
);

if (inicio !== 0) {
  throw new Error(
    '[KYARA PATCH] Estrutura inicial inesperada. Nenhuma alteração feita.'
  );
}

if (marcador === -1) {
  throw new Error(
    '[KYARA PATCH] Marcador extrairMensagemAssistente não encontrado. Nenhuma alteração feita.'
  );
}

/*
 * Preserva tudo depois do executor local.
 */

const restante = s.slice(marcador);

const novoInicio = `import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import crypto from 'crypto';
import userContextDB from '../../utils/userContextDB.js';

// ============================================================================
// KYARA CORE — LOCAL AI
// ============================================================================

const LOCAL_AI_URL =
  (process.env.KYARA_AI_URL ||
    'http://127.0.0.1:8080').replace(/\\/$/, '');

const LOCAL_AI_MODEL =
  process.env.KYARA_AI_MODEL ||
  'qwen2.5-0.5b-instruct-q4_k_m.gguf';

const LOCAL_AI_ENDPOINT =
  '/v1/chat/completions';

const AI_TIMEOUT =
  Number(process.env.KYARA_AI_TIMEOUT || 90000);

const AI_START_TIMEOUT =
  Number(process.env.KYARA_AI_START_TIMEOUT || 60000);

const AI_MAX_TOKENS =
  Math.min(
    Number(process.env.KYARA_AI_MAX_TOKENS || 256),
    256
  );

const AI_TEMPERATURE = 0.55;


// ============================================================================
// KYARA — MODELO
// ============================================================================

function encontrarModeloKyara() {
  const nome =
    process.env.KYARA_AI_MODEL ||
    'qwen2.5-0.5b-instruct-q4_k_m.gguf';

  const home =
    process.env.HOME || '';

  const candidatos = [
    nome,

    path.join(
      home,
      'kyara-ai',
      'models',
      nome
    ),

    path.join(
      home,
      'models',
      nome
    ),

    path.join(
      process.cwd(),
      nome
    ),

    path.join(
      process.cwd(),
      'models',
      nome
    ),

    path.join(
      process.cwd(),
      'dados',
      'models',
      nome
    ),

    path.join(
      process.cwd(),
      'dados',
      nome
    )
  ];

  for (const candidato of candidatos) {
    try {
      if (fs.existsSync(candidato)) {
        return candidato;
      }
    } catch {}
  }

  return null;
}


// ============================================================================
// KYARA — LLAMA SERVER
// ============================================================================

function encontrarLlamaServer() {
  const candidatos = [
    process.env.KYARA_LLAMA_SERVER,
    'llama-server'
  ].filter(Boolean);

  for (const cmd of candidatos) {
    try {
      const teste =
        require('child_process').spawnSync(
          cmd,
          ['--version'],
          {
            encoding: 'utf8',
            timeout: 5000
          }
        );

      if (
        !teste.error &&
        teste.status === 0
      ) {
        return cmd;
      }
    } catch {}
  }

  return null;
}


async function servidorKyaraOnline() {
  try {
    const response =
      await axios.get(
        \`\${LOCAL_AI_URL}/health\`,
        {
          timeout: 1500,
          validateStatus: () => true
        }
      );

    return (
      response.status >= 200 &&
      response.status < 300
    );

  } catch {
    return false;
  }
}


let kyaraServerProcess = null;
let kyaraServerStarting = null;


async function iniciarServidorKyara() {

  /*
   * Se já existe servidor, não cria outro.
   */

  if (
    await servidorKyaraOnline()
  ) {
    return true;
  }


  /*
   * Evita dois starts simultâneos.
   */

  if (kyaraServerStarting) {
    return kyaraServerStarting;
  }


  kyaraServerStarting =
    (async () => {

      const server =
        encontrarLlamaServer();

      if (!server) {
        console.error(
          '[LOCAL AI] ❌ llama-server não encontrado.'
        );

        console.error(
          '[LOCAL AI] O llama-cli antigo não será usado.'
        );

        return false;
      }


      const modelo =
        encontrarModeloKyara();

      if (!modelo) {
        console.error(
          '[LOCAL AI] ❌ Modelo não encontrado:',
          LOCAL_AI_MODEL
        );

        return false;
      }


      console.log(
        '[LOCAL AI] 🚀 Iniciando llama-server...'
      );

      console.log(
        '[LOCAL AI] Modelo:',
        modelo
      );

      const url =
        new URL(LOCAL_AI_URL);

      const host =
        url.hostname ||
        '127.0.0.1';

      const port =
        url.port ||
        '8080';

      const threads =
        String(
          Number(
            process.env.KYARA_AI_THREADS || 4
          )
        );

      const context =
        String(
          Number(
            process.env.KYARA_AI_CONTEXT || 2048
          )
        );


      const logPath =
        path.join(
          process.cwd(),
          'kyara-llama-server.log'
        );


      let log;

      try {
        log =
          fs.openSync(
            logPath,
            'a'
          );
      } catch (error) {
        console.error(
          '[LOCAL AI] ⚠️ Não foi possível criar log:',
          error.message
        );
        log = 'ignore';
      }


      try {

        kyaraServerProcess =
          spawn(
            server,
            [
              '-m',
              modelo,

              '--host',
              host,

              '--port',
              port,

              '-c',
              context,

              '--threads',
              threads,

              '--threads-batch',
              threads,

              '-np',
              '1',

              '--no-warmup'
            ],
            {
              detached: true,
              stdio: [
                'ignore',
                log,
                log
              ]
            }
          );


        kyaraServerProcess.unref();


        const inicio =
          Date.now();


        while (
          Date.now() - inicio <
          AI_START_TIMEOUT
        ) {

          if (
            kyaraServerProcess &&
            kyaraServerProcess.exitCode !== null
          ) {
            console.error(
              '[LOCAL AI] ❌ llama-server encerrou durante a inicialização.'
            );

            return false;
          }


          if (
            await servidorKyaraOnline()
          ) {
            console.log(
              '[LOCAL AI] ✅ llama-server online.'
            );

            return true;
          }


          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                1000
              )
          );
        }


        console.error(
          '[LOCAL AI] ❌ Timeout aguardando llama-server.'
        );

        console.error(
          '[LOCAL AI] Log:',
          logPath
        );

        return false;

      } catch (error) {

        console.error(
          '[LOCAL AI] ❌ Erro ao iniciar servidor:',
          error.message
        );

        return false;

      } finally {

        if (
          typeof log === 'number'
        ) {
          try {
            fs.closeSync(log);
          } catch {}
        }
      }

    })();


  try {
    return await kyaraServerStarting;
  } finally {
    kyaraServerStarting = null;
  }
}


// ============================================================================
// KYARA — EXECUTOR LOCAL PERSISTENTE
// ============================================================================

async function executarKyaraLocal(prompt) {

  if (
    !prompt ||
    typeof prompt !== 'string'
  ) {
    return '';
  }


  const pronto =
    await iniciarServidorKyara();

  if (!pronto) {
    return '';
  }


  console.log(
    '[LOCAL AI] 🧠 Consultando modelo persistente...'
  );


  try {

    const response =
      await axios.post(
        LOCAL_AI_URL + LOCAL_AI_ENDPOINT,

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

          top_p:
            0.92,

          repeat_penalty:
            1.10,

          stream:
            false
        },

        {
          timeout:
            AI_TIMEOUT
        }
      );


    let resposta =
      String(
        response
          ?.data
          ?.choices?.[0]
          ?.message
          ?.content ||
        ''
      ).trim();


    resposta =
      normalizarKyaraTexto(
        resposta
      );


    if (!resposta) {
      console.error(
        '[LOCAL AI] ⚠️ Modelo retornou resposta vazia.'
      );

      return '';
    }


    console.log(
      \`[LOCAL AI] ✅ Resposta recebida: \${resposta.length} caracteres\`
    );


    return resposta.slice(
      0,
      1800
    );


  } catch (error) {

    console.error(
      '[LOCAL AI] ❌ Erro HTTP:',
      error?.message ||
      error
    );

    return '';
  }
}


// ============================================================================
// COMPATIBILIDADE HTTP
// ============================================================================

async function executarKyaraHttp(prompt) {
  return executarKyaraLocal(prompt);
}


`;

s =
  novoInicio +
  restante;


/*
 * Validações antes de gravar.
 */

if (
  s.includes(
    'function encontrarLlamaCLI'
  )
) {
  throw new Error(
    '[KYARA PATCH] encontrarLlamaCLI ainda existe.'
  );
}

if (
  s.includes(
    "import { spawnSync }"
  )
) {
  throw new Error(
    '[KYARA PATCH] spawnSync ainda está importado.'
  );
}

if (
  s.includes(
    "const LOCAL_AI_ENDPOINT = '/completion'"
  )
) {
  throw new Error(
    '[KYARA PATCH] endpoint antigo ainda existe.'
  );
}

if (
  !s.includes(
    "const LOCAL_AI_ENDPOINT =\n  '/v1/chat/completions';"
  )
) {
  throw new Error(
    '[KYARA PATCH] endpoint novo não foi instalado.'
  );
}

if (
  !s.includes(
    'async function executarKyaraLocal(prompt)'
  )
) {
  throw new Error(
    '[KYARA PATCH] executarKyaraLocal não encontrado.'
  );
}

if (
  !s.includes(
    'async function iniciarServidorKyara()'
  )
) {
  throw new Error(
    '[KYARA PATCH] servidor persistente não encontrado.'
  );
}


/*
 * Backup SOMENTE da ia.js atual.
 * Não apagamos nada.
 */

const backup =
  file +
  '.antes-llama-server-' +
  Date.now() +
  '-' +
  crypto.randomBytes(3).toString('hex') +
  '.bak';

fs.copyFileSync(
  file,
  backup
);

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
console.log('[KYARA IA] backup da ia.js:', backup);
console.log('============================================');
