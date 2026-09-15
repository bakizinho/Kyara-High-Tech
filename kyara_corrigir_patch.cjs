const fs = require('fs');
const path = require('path');

const file = path.resolve('dados/src/funcs/private/ia.js');

if (!fs.existsSync(file)) {
  throw new Error('ia.js não encontrada.');
}

let s = fs.readFileSync(file, 'utf8');

/*
 * Corrige exclusivamente a regex quebrada
 * introduzida pelo patch anterior.
 */
const quebrado = ".replace(/\\\\/$/, '');";
const correto = ".replace(/\\/$/, '');";

if (!s.includes(quebrado)) {
  console.log('[KYARA IA] Regex quebrada não encontrada.');
  console.log('[KYARA IA] Verificando se a versão correta já existe...');
  
  if (s.includes(correto)) {
    console.log('[KYARA IA] ✅ Regex já está correta.');
  } else {
    throw new Error(
      '[KYARA IA] Não encontrei a regex esperada.'
    );
  }
} else {
  s = s.replace(
    quebrado,
    correto
  );

  fs.writeFileSync(
    file,
    s,
    'utf8'
  );

  console.log('[KYARA IA] ✅ Regex corrigida.');
}

/*
 * Validação estrutural.
 */
const checks = [
  [
    'llama-server',
    s.includes('llama-server')
  ],
  [
    '/v1/chat/completions',
    s.includes('/v1/chat/completions')
  ],
  [
    'await executarKyaraLocal(prompt)',
    s.includes('await executarKyaraLocal(prompt)')
  ],
  [
    'llama-cli removido',
    !s.includes("'llama-cli'") &&
    !s.includes('"llama-cli"')
  ]
];

console.log('');
console.log('============================================');
console.log('[KYARA IA] VERIFICAÇÃO');
console.log('============================================');

for (const [nome, ok] of checks) {
  console.log(
    ok ? '✅' : '❌',
    nome
  );
}

console.log('============================================');
