from pathlib import Path
from datetime import datetime
import subprocess
import sys

file = Path("dados/src/index.js")

if not file.is_file():
    sys.exit("ERRO: index.js não encontrado. Execute de dentro da pasta do bot.")

src = file.read_text(encoding="utf-8")

start_marker = "      case 'rvisu':"
end_marker = "      case 'limpardb':"

if src.count(start_marker) != 1:
    sys.exit("ERRO: não foi possível identificar exclusivamente o comando.")

start = src.index(start_marker)
end = src.find(end_marker, start)

if end == -1:
    sys.exit("ERRO: final do bloco não encontrado.")

replacement = """      case 'rvisu':
      case 'open':
      case 'revelar': {
        try {
          const contextInfo = msg?.message?.extendedTextMessage?.contextInfo;
          const quoted = contextInfo?.quotedMessage;
          const quotedKey = contextInfo?.stanzaId;

          if (!quoted || !quotedKey) {
            await reply('📎 Responda à mensagem de visualização única com /revelar');
            break;
          }

          // Desempacota viewOnce / viewOnceV2 / Extension / ephemeral
          const unwrap = (node, depth = 0) => {
            if (!node || typeof node !== 'object' || depth > 6) return null;
            if (node.viewOnceMessage?.message) return node.viewOnceMessage.message;
            if (node.viewOnceMessageV2?.message) return node.viewOnceMessageV2.message;
            if (node.viewOnceMessageV2Extension?.message) return node.viewOnceMessageV2Extension.message;
            if (node.ephemeralMessage?.message) return unwrap(node.ephemeralMessage.message, depth + 1);
            return null;
          };

          let mediaNode = unwrap(quoted) || quoted;

          const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
          let type = mediaTypes.find(t => mediaNode?.[t]);

          if (!type) {
            const unwrapped = unwrap(mediaNode);
            if (unwrapped) {
              mediaNode = unwrapped;
              type = mediaTypes.find(t => mediaNode?.[t]);
            }
          }

          if (!type) {
            await reply('❌ Não encontrei mídia de visualização única nessa mensagem.');
            break;
          }

          const media = mediaNode[type];

          let buffer;
          try {
            buffer = await downloadMediaMessage(
              {
                key: { remoteJid: from, id: quotedKey, fromMe: false },
                message: mediaNode
              },
              'buffer',
              {},
              { reuploadRequest: sock.updateMediaMessage }
            );
          } catch (e) {
            const stream = await downloadContentFromMessage(media, type.replace('Message', ''));
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            buffer = Buffer.concat(chunks);
          }

          if (!buffer || buffer.length < 50) {
            await reply('❌ Não consegui baixar a mídia. Ela pode ter expirado.');
            break;
          }

          const options = { quoted: msg };

          if (type === 'imageMessage') {
            options.image = buffer;
            options.caption = media.caption || '🔓 Revelado';
          } else if (type === 'videoMessage') {
            options.video = buffer;
            options.caption = media.caption || '🔓 Revelado';
          } else if (type === 'audioMessage') {
            options.audio = buffer;
            options.mimetype = media.mimetype || 'audio/ogg; codecs=opus';
            options.ptt = !!media.ptt;
          } else if (type === 'stickerMessage') {
            options.sticker = buffer;
          } else {
            options.document = buffer;
            options.fileName = media.fileName || 'revelado.bin';
            options.mimetype = media.mimetype || 'application/octet-stream';
          }

          await sock.sendMessage(from, options);
          console.log('[REVELAR] Mídia de visualização única reenviada com sucesso.');

        } catch (err) {
          console.error('[REVELAR] Erro:', err);
          await reply('❌ Falha ao revelar a mídia. Ela pode não estar mais disponível.').catch(() => {});
        }
        break;
      }

"""

backup = file.with_name(
    file.name + ".backup-revelar-" + datetime.now().strftime("%Y%m%d-%H%M%S")
)

backup.write_text(src, encoding="utf-8")
file.write_text(src[:start] + replacement + src[end:], encoding="utf-8")

check = subprocess.run(
    ["node", "--check", str(file)],
    capture_output=True,
    text=True
)

if check.returncode != 0:
    file.write_text(backup.read_text(encoding="utf-8"), encoding="utf-8")
    print("ERRO DE SINTAXE. Backup restaurado.")
    print(check.stderr)
    sys.exit(1)

print("✅ COMANDO REVELAR ATUALIZADO (agora extrai view-once)")
print("Sintaxe JavaScript: OK")
print("Backup criado em:", backup)
print("Reinicie o bot para carregar a alteração.")
