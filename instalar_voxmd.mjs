import fs from 'node:fs';

const file = 'dados/src/index.js';
let source = fs.readFileSync(file, 'utf8');

if (source.includes('[KYARA_VOXMD_BOTOES_V1]')) {
  console.log('O comando #voxmd já está instalado.');
  process.exit(0);
}

const switchMarker = 'switch (command) {';
const switchPos = source.indexOf(switchMarker);

if (switchPos < 0) {
  console.error('Switch principal não encontrado. Arquivo não alterado.');
  process.exit(1);
}

const recognizerPos = source.indexOf('const isKyaraHashMedia =');

if (recognizerPos < 0) {
  console.error('Reconhecedor de comandos não encontrado. Arquivo não alterado.');
  process.exit(1);
}

const recognizerEnd = source.indexOf(';', recognizerPos);

if (recognizerEnd < 0) {
  console.error('Reconhecedor incompleto. Arquivo não alterado.');
  process.exit(1);
}

let recognizer = source.slice(recognizerPos, recognizerEnd + 1);

if (!recognizer.includes('test(rawBody)')) {
  console.error('Formato do reconhecedor inesperado. Arquivo não alterado.');
  process.exit(1);
}

if (!recognizer.includes('canalbot|')) {
  console.error('Não encontrei o ponto correto para registrar #voxmd. Arquivo não alterado.');
  process.exit(1);
}

recognizer = recognizer.replace(
  'canalbot|',
  'canalbot|voxmd|respostavoxmd|'
);

const block = `
      // [KYARA_VOXMD_BOTOES_V1]
      case 'voxmd': {
        const opcoes = String(q || '')
          .split(',')
          .map(x => x.trim())
          .filter(Boolean);

        if (opcoes.length !== 2) {
          await reply('Use: #voxmd 1, 2  ou  #voxmd SIM, NÃO');
          break;
        }

        if (opcoes.some(x => x.length > 20)) {
          await reply('Cada opção pode ter no máximo 20 caracteres.');
          break;
        }

        const msg = generateWAMessageFromContent(
          from,
          {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2
                },
                interactiveMessage: {
                  body: {
                    text: 'Escolha uma opção:'
                  },
                  footer: {
                    text: 'VoxMD • KYARA'
                  },
                  nativeFlowMessage: {
                    buttons: opcoes.map((label, i) => ({
                      name: 'quick_reply',
                      buttonParamsJson: JSON.stringify({
                        display_text: label,
                        id: groupPrefix + 'respostavoxmd ' +
                          Buffer.from(label, 'utf8').toString('base64url')
                      })
                    })),
                    messageParamsJson: '{}'
                  }
                }
              }
            }
          },
          {
            userJid: nazu.user.id
          }
        );

        await nazu.relayMessage(
          from,
          msg.message,
          { messageId: msg.key.id }
        );

        break;
      }

      case 'respostavoxmd': {
        try {
          const escolhida = Buffer
            .from(String(q || '').trim(), 'base64url')
            .toString('utf8');

          if (!escolhida || escolhida.length > 20) {
            await reply('Não consegui identificar a opção escolhida.');
            break;
          }

          await reply('Você escolheu: ' + escolhida);
        } catch {
          await reply('Não consegui identificar a opção escolhida.');
        }

        break;
      }
`;

const backup = `${file}.backup-voxmd-${Date.now()}`;
const updated = source.slice(0, recognizerPos) +
  recognizer +
  source.slice(recognizerEnd + 1);

const finalSource = updated.slice(0, switchPos + switchMarker.length) +
  '\n' + block +
  updated.slice(switchPos + switchMarker.length);

fs.copyFileSync(file, backup);
fs.writeFileSync(file, finalSource, 'utf8');

console.log('Comando #voxmd instalado.');
console.log('Backup:', backup);
