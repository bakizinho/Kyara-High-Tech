const KYARA_API = "http://127.0.0.1:3000";

function getJid(message) {
  return (
    message?.key?.remoteJid ||
    message?.remoteJid ||
    message?.chatId ||
    null
  );
}

export async function handleKyaraSiteCommand({
  sock,
  message,
  command
}) {
  const cmd = String(command || "").toLowerCase().trim();

  if (
    cmd !== "/kyarasite" &&
    cmd !== "kyarasite" &&
    cmd !== "!kyarasite"
  ) {
    return false;
  }

  const jid = getJid(message);

  if (!jid) {
    throw new Error("Não foi possível identificar o chat.");
  }

  const browserUrl = `${KYARA_API}/browser`;

  await sock.sendMessage(jid, {
    text:
      "╭━━〔 🌐 KYARA SITE 〕━━╮\n" +
      "┃\n" +
      "┃ 🔎 Navegador Web da Kyara\n" +
      "┃\n" +
      "┃ Pesquise na Web, procure vídeos\n" +
      "┃ e navegue pelo KYARA Browser.\n" +
      "┃\n" +
      "╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
      "👇 Toque no botão abaixo para abrir.",
    buttons: [
      {
        buttonId: "kyarasite_open",
        buttonText: {
          displayText: "🌐 ABRIR KYARA SITE"
        },
        type: 1
      }
    ],
    headerType: 1
  });

  return true;
}
