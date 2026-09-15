/*
 * KYARA — CONFIGURAÇÃO DE VOZ LOCAL
 *
 * Esta configuração NÃO ativa voz automaticamente.
 *
 * Objetivo futuro:
 * - voz local;
 * - sem créditos de API;
 * - sem depender do Gradium;
 * - voz brasileira feminina;
 * - geração somente quando solicitada.
 */

export const KYARA_VOICE_CONFIG = {
  enabled: false,

  provider: "local",

  engine: "kokoro",

  voice: "pf_dora",

  language: "pt-BR",

  autoSpeak: false,

  speakAIResponses: false,

  speakOnlyWhenRequested: true
};

export default KYARA_VOICE_CONFIG;
