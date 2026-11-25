export function entenderIntencao(texto = "") {
  const t = String(texto).toLowerCase().trim();

  if (!t) return "VAZIO";

  if (
    t.includes("baixa") ||
    t.includes("download") ||
    t.includes("baixar") ||
    t.includes("youtube") ||
    t.includes("youtu.be") ||
    t.includes("tiktok") ||
    t.includes("instagram") ||
    t.includes("facebook")
  ) {
    return "TOOL_DOWNLOAD";
  }

  if (
    t.includes("lembra") ||
    t.includes("esqueceu") ||
    t.includes("falamos") ||
    t.includes("me conhece") ||
    t.includes("meu nome")
  ) {
    return "MEMORIA";
  }

  if (
    t.match(
      /\b(pesquisa|procura|pesquise|pesquisar|google|quem é|quem e|o que é|o que e)\b/
    )
  ) {
    return "PESQUISA";
  }

  return "CONVERSA";
}
