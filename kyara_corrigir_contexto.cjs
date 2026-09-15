const fs = require('fs');
const path = require('path');

const file = path.resolve(
  'dados/src/funcs/private/ia.js'
);

if (!fs.existsSync(file)) {
  throw new Error('[KYARA] ia.js não encontrada.');
}

let s = fs.readFileSync(
  file,
  'utf8'
);

/*
 * ============================================================
 * BACKUP
 * ============================================================
 */

const backup =
  file +
  '.antes-contexto-4096-' +
  Date.now() +
  '.bak';

fs.copyFileSync(
  file,
  backup
);

console.log(
  '[KYARA] Backup:',
  backup
);

/*
 * ============================================================
 * 1. AUMENTA CONTEXTO DO LLAMA-SERVER
 *
 * Antes:
 *   -c 2048
 *
 * Depois:
 *   -c 4096
 * ============================================================
 */

const antigoContexto =
  `'-c',
            '2048'`;

const novoContexto =
  `'-c',
            '4096'`;

if (s.includes(antigoContexto)) {
  s = s.replace(
    antigoContexto,
    novoContexto
  );

  console.log(
    '[KYARA] ✅ Contexto do servidor: 2048 -> 4096'
  );
} else if (
  s.includes(novoContexto)
) {
  console.log(
    '[KYARA] ✅ Servidor já está em contexto 4096.'
  );
} else {
  throw new Error(
    '[KYARA] Não encontrei configuração -c 2048/4096.'
  );
}

/*
 * ============================================================
 * 2. REDUZ HISTÓRICO
 * ============================================================
 */

if (
  s.includes(
    'const KYARA_MAX_HISTORY = 6;'
  )
) {
  s = s.replace(
    'const KYARA_MAX_HISTORY = 6;',
    'const KYARA_MAX_HISTORY = 4;'
  );

  console.log(
    '[KYARA] ✅ Histórico reduzido para 4 mensagens.'
  );
} else if (
  s.includes(
    'const KYARA_MAX_HISTORY = 12;'
  )
) {
  s = s.replace(
    'const KYARA_MAX_HISTORY = 12;',
    'const KYARA_MAX_HISTORY = 4;'
  );

  console.log(
    '[KYARA] ✅ Histórico reduzido para 4 mensagens.'
  );
}

/*
 * ============================================================
 * 3. LIMITA A MENSAGEM FINAL
 *
 * Evita que uma mensagem enorme destrua o contexto.
 * ============================================================
 */

const antigoSlice =
  'const mensagemAtual = String(mensagem || \'\').trim();';

const novoSlice =
  `const mensagemAtual =
    String(mensagem || '')
      .trim()
      .slice(0, 1000);`;

if (s.includes(antigoSlice)) {
  s = s.replace(
    antigoSlice,
    novoSlice
  );

  console.log(
    '[KYARA] ✅ Mensagem limitada a 1000 caracteres.'
  );
}

/*
 * ============================================================
 * 4. VALIDAÇÕES
 * ============================================================
 */

if (!s.includes("'4096'")) {
  throw new Error(
    '[KYARA] Contexto 4096 não encontrado após alteração.'
  );
}

if (
  !s.includes(
    'await executarKyaraLocal(prompt)'
  )
) {
  throw new Error(
    '[KYARA] Executor assíncrono não encontrado.'
  );
}

if (
  !s.includes(
    '/v1/chat/completions'
  )
) {
  throw new Error(
    '[KYARA] Endpoint do llama-server não encontrado.'
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
console.log(
  '============================================'
);
console.log(
  '[KYARA IA] ✅ CONTEXTO CORRIGIDO'
);
console.log(
  '============================================'
);
console.log(
  '[KYARA IA] llama-server: 4096 tokens'
);
console.log(
  '[KYARA IA] histórico: 4 mensagens'
);
console.log(
  '[KYARA IA] mensagem máxima: 1000 caracteres'
);
console.log(
  '[KYARA IA] backup criado:'
);
console.log(
  backup
);
console.log(
  '============================================'
);
