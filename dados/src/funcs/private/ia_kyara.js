import { KYARA_PERSONA } from "../../core/persona.js";
import { entenderIntencao } from "../../core/orquestrador.js";

export function validateMessage(msg) {
  return msg;
}

export function shouldKyaraRespond(msg) {
  if (!msg?.texto) return false;

  const t = String(msg.texto).toLowerCase();

  // Privado: responde normalmente
  if (!msg.id_grupo) return true;

  // Grupo: responde somente quando chamada
  if (
    msg.tem_mencao ||
    msg.marcou_sua_mensagem ||
    t.includes("kyara")
  ) {
    return true;
  }

  return false;
}

export function getFormattedBrazilDateTime() {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo"
  });
}

export async function processUserMessages({ mensagens = [] }, tipo) {
  const ultima = mensagens[0]?.texto || "";
  const nome = mensagens[0]?.nome_enviou || "você";

  const intencao = entenderIntencao(ultima);

  if (intencao === "TOOL_DOWNLOAD") {
    return {
      resp: [
        {
          texto: "Manda o link que eu vejo o que consigo fazer 🌸"
        }
      ],
      intencao,
      persona: KYARA_PERSONA.nome
    };
  }

  if (intencao === "MEMORIA") {
    return {
      resp: [
        {
          texto: "Essa parte ainda tá sendo construída 😅 Quero guardar as coisas do jeito certo."
        }
      ],
      intencao,
      persona: KYARA_PERSONA.nome
    };
  }

  if (intencao === "PESQUISA") {
    return {
      resp: [
        {
          texto: "Posso pesquisar isso quando o módulo de pesquisa estiver conectado 🔎"
        }
      ],
      intencao,
      persona: KYARA_PERSONA.nome
    };
  }

  const respostas = [
    `Kkkk, ${nome}, me conta mais 😄`,
    `Sério? Quero saber melhor isso 👀`,
    `Tô aqui 🌸 fala comigo.`,
    `Kkkkk entendi 😅`,
    `Hmm... interessante. Continua 👀`
  ];

  const texto =
    respostas[Math.floor(Math.random() * respostas.length)];

  return {
    resp: [{ texto }],
    intencao,
    persona: KYARA_PERSONA.nome
  };
}
