import {
  botNeedsAdminMessage
} from '../core/identity/kyara-identity.js'


import {
  isActiveGroupRestriction,
  updateIsActiveGroupRestriction,
} from "../utils/database.js";

export default {
  name: "anti-payment",

  description:
    "Ativa/desativa a proteção central contra payment, mensagens invisíveis, flood e spam oculto.",

  commands: [
    "anti-payment",
    "anti-pagamento",
  ],

  usage:
    "anti-payment (on/off)",

  handle: async ({
    remoteJid,
    isGroup,
    isGroupAdmin,
    isOwner,
    isBotAdmin,
    args,
    sendSuccessReply,
  }) => {
    if (!isGroup) {
      await sendSuccessReply(
        "❌ Este comando só pode ser usado em grupos!",
      );

      return false;
    }

    if (
      !isGroupAdmin &&
      !isOwner
    ) {
      await sendSuccessReply(
        "❌ Apenas administrador do grupo ou dono pode configurar o Anti-Payment.",
      );

      return false;
    }

    if (!isBotAdmin) {
      await sendSuccessReply(
        botNeedsAdminMessage(),
      );

      return false;
    }

    const value =
      String(
        args?.[0] || "",
      )
        .trim()
        .toLowerCase();

    if (
      !value ||
      value === "status"
    ) {
      const active =
        isActiveGroupRestriction(
          remoteJid,
          "anti-payment",
        );

      await sendSuccessReply(
        [
          "🛡️ *ANTI-PAYMENT*",
          "",
          `Status: ${active ? "🟢 ATIVO" : "🔴 DESATIVADO"}`,
          "",
          "Proteção central:",
          "💳 Payment",
          "👻 Mensagens invisíveis",
          "🫥 Unicode oculto",
          "🧬 Payload suspeito",
          "⚡ Flood",
          "🔁 Repetição",
          "💬 Quoted/Reply",
        ].join("\n"),
      );

      return active;
    }

    const antiPaymentOn =
      [
        "on",
        "ligar",
        "1",
      ].includes(value);

    const antiPaymentOff =
      [
        "off",
        "desligar",
        "0",
      ].includes(value);

    if (
      !antiPaymentOn &&
      !antiPaymentOff
    ) {
      await sendSuccessReply(
        "❌ Use *on* para ativar, *off* para desativar ou *status* para consultar.",
      );

      return false;
    }

    const active =
      isActiveGroupRestriction(
        remoteJid,
        "anti-payment",
      );

    if (
      antiPaymentOn &&
      active
    ) {
      await sendSuccessReply(
        "⚠️ O Anti-Payment já está ativado!",
      );

      return false;
    }

    if (
      antiPaymentOff &&
      !active
    ) {
      await sendSuccessReply(
        "⚠️ O Anti-Payment já está desativado!",
      );

      return false;
    }

    updateIsActiveGroupRestriction(
      remoteJid,
      "anti-payment",
      antiPaymentOn,
    );

    await sendSuccessReply(
      antiPaymentOn
        ? [
            "🛡️ *ANTI-PAYMENT ATIVADO!*",
            "",
            "💳 Payment",
            "👻 Spam invisível",
            "🫥 Unicode oculto",
            "⚡ Flood",
            "🔁 Repetição",
            "💬 Quoted/Reply",
            "",
            "A proteção central da Kyara está ativa.",
          ].join("\n")
        : "🛡️ Anti-Payment desativado com sucesso!",
    );

    return true;
  },
};
