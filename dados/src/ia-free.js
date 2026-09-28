const https = require('https');
class KyaraIAFree {
  constructor(){ this.groqKey = process.env.GROQ_KEY || ''; }
  async ask(prompt, userName) {
    if (!this.groqKey) return this.localAI(prompt, userName);
    return new Promise((resolve) => {
      const data = JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: `Você é Kyara, IA fofa e esperta. Usuário: ${userName}. Responda curto pt-BR.` },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200
      });
      const req = https.request({
        hostname: 'api.groq.com', path: '/openai/v1/chat/completions', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.groqKey}` }
      }, res => {
        let body = ''; res.on('data', d => body += d);
        res.on('end', () => { try { resolve(JSON.parse(body).choices[0].message.content); } catch { resolve(this.localAI(prompt, userName)); } });
      });
      req.on('error', () => resolve(this.localAI(prompt, userName)));
      req.write(data); req.end();
    });
  }
  localAI(prompt, userName) {
    const p = prompt.toLowerCase();
    if (p.includes('quem é você')) return `Eu sou a Kyara IA 🌸, sua assistente! Você é o ${userName}?`;
    if (p.includes('figurinha')) return `Manda a imagem com /s que eu crio figurinha na hora! ✨`;
    if (p.includes('piada')) return `Por que o bot foi ao médico? Porque tava com vírus! 😂`;
    return `Entendi: "${prompt.slice(0,60)}" 🤖\nSou a Kyara IA free! Pergunta: /ia cria uma piada`;
  }
}
module.exports = new KyaraIAFree();
