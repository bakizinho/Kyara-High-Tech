const Fastify = require('fastify');

const app = Fastify({ logger: true });

app.get('/', async () => ({
  nome: 'Kyara API',
  status: 'online',
  versao: '1.0.0'
}));

app.get('/api/kyara', async (request) => {
  const mensagem = String(request.query.mensagem || '').trim();

  if (!mensagem) {
    return {
      erro: 'Envie uma mensagem usando ?mensagem=Oi'
    };
  }

  return {
    bot: 'Kyara',
    mensagem,
    resposta: 'Olá! Sou a Kyara. Minha inteligência artificial ainda será conectada.'
  };
});

app.listen({ port: 3000, host: '0.0.0.0' })
  .then(() => console.log('⚡ Kyara API rodando na porta 3000'))
  .catch(console.error);
