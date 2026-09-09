import http from 'http';
import verificarAPI from '../API.js';

const LOCAL_API = 'http://127.0.0.1:3000';

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Resposta inválida da API local'));
        }
      });

    }).on('error', reject);
  });
}

async function getLyrics(topic) {

  const checkAPI = await verificarAPI();

  if (checkAPI !== true) {
    return checkAPI;
  }

  try {

    if (!topic || !topic.trim()) {
      throw new Error('Informe o nome da música.');
    }

    const url =
      `${LOCAL_API}/api/pesquisa/letra?query=` +
      encodeURIComponent(topic.trim());

    const data = await request(url);

    if (!data?.status) {
      throw new Error(
        data?.error || 'A API local retornou erro'
      );
    }

    const results = data.results?.resultados;

    if (!results || results.length === 0) {
      throw new Error('Música não encontrada');
    }

    const music = results[0];

    const title =
      music.txt || 'Título não disponível';

    const artist =
      music.art || 'Artista desconhecido';

    const album =
      music.album || 'Álbum não disponível';

    const link =
      music.link || '';

    const image =
      typeof music.img === 'string' &&
      music.img.trim() !== ''
        ? music.img
        : null;

    const text = `
🎵 *${title}*

👤 Artista: ${artist}
💿 Álbum: ${album}

📜 *Letra*

Por motivos de direitos autorais, a letra completa não é reproduzida aqui.

🔗 ${link}
`.trim();

    if (image) {
      return {
        text,
        image
      };
    }

    return {
      text
    };

  } catch (err) {
    throw new Error(`Erro: ${err.message}`);
  }
}

export default getLyrics;
