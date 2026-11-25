import { handleAntiPayment } from "../features/antiPayment.js";

export default {
  name: "testeantipayment",

  commands: [
    "testeantipayment",
    "teste-anti-payment",
    "testepagamento",
  ],

  description:
    "Testa o detector Anti-Payment com uma mensagem de pagamento totalmente simulada.",

  usage:
    "testeantipayment",

  handle: async ({
    socket,
    sock,
    remoteJid,
    isGroup,
    message,
    info,
    sender,
    sendSuccessReply,
  }) => {
    const realSocket =
      socket ||
      sock;

    const jid =
      remoteJid ||
      message?.key?.remoteJid ||
      info?.key?.remoteJid;

    if (!jid || !jid.endsWith("@g.us")) {
      if (sendSuccessReply) {
        await sendSuccessReply(
          "❌ Este teste precisa ser executado dentro de um grupo!",
        );
      }

      return false;
    }

    /*
     * Autor do teste.
     *
     * Preferimos o sender que o próprio dispatcher
     * da Kyara já conhece.
     */
    const sourceMessage =
      message ||
      info;

    const author =
      sender ||
      sourceMessage?.key?.participant ||
      sourceMessage?.key?.participantAlt ||
      sourceMessage?.key?.participantPn ||
      `999999999999999@s.whatsapp.net`;

    const now =
      Date.now();

    const messageId =
      `KYARA-TESTE-PAYMENT-${now}`;

    /*
     * Mensagem de pagamento 100% simulada.
     */
    const fakeInfo = {
      key: {
        remoteJid: jid,
        id: messageId,
        fromMe: false,
        participant: author,
      },

      message: {
        paymentMessage: {
          amount1000: 1000,
          currency: "BRL",
          transactionStatus: "PENDING",
          referenceId: `KYARA-TESTE-${now}`,
          paymentMethod: "TEST",
          totalAmount: 1000,
        },
      },
    };

    /*
     * Socket isolado para o teste.
     *
     * O detector precisa consultar groupMetadata().
     * Em vez de consultar o WhatsApp, fornecemos
     * um grupo fictício contendo o autor simulado.
     *
     * Como enforce:false, nenhuma ação punitiva
     * deveria ser chamada.
     */
    const testSocket = {
      groupMetadata: async () => ({
        owner: null,

        participants: [
          {
            id: author,
            admin: undefined,
          },
        ],
      }),
    };

    console.log(
      "[KYARA TESTE ANTI-PAYMENT] Payload falso criado:",
      JSON.stringify(
        fakeInfo,
        null,
        2,
      ),
    );

    console.log(
      "[KYARA TESTE ANTI-PAYMENT] Autor simulado:",
      author,
    );

    console.log(
      "[KYARA TESTE ANTI-PAYMENT] Grupo:",
      jid,
    );

    const resultado =
      await handleAntiPayment({
        socket:
          testSocket,

        remoteJid:
          jid,

        webMessage:
          fakeInfo,

        isGroup:
          true,

        botLid:
          "KYARA-BOT-TEST-LID",

        ownerLid:
          "KYARA-OWNER-TEST-LID",

        enforce:
          false,
      });

    console.log(
      "[KYARA TESTE ANTI-PAYMENT] Resultado:",
      resultado,
    );

    if (sendSuccessReply) {
      await sendSuccessReply(
        resultado
          ? "🛡️ Teste Anti-Payment OK!\n\n✅ Mensagem de pagamento simulada foi detectada.\n✅ Autor simulado foi identificado.\n✅ Nenhuma mensagem foi apagada.\n✅ Grupo não foi fechado.\n✅ Ninguém foi removido.\n\nModo: DRY-RUN."
          : "⚠️ O detector ainda retornou false.\n\nVeja o terminal para descobrir em qual etapa ele parou.",
      );
    }

    return resultado;
  },
};
