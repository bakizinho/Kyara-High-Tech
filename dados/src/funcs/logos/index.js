import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FLAMINGTEXT = new Set([
  'fluffy-logo',
  'lava-logo',
  'cool-logo',
  'comic-logo',
  'fire-logo',
  'water-logo',
  'ice-logo',
  'elegant-logo',
  'gold-logo',
  'fortune-logo',
  'blue-logo',
  'silver-logo',
  'neon-logo',
  'skate-name',
  'retro-logo',
  'candy-logo',
  'glossy-logo'
]);

function lerChaveArquivo(arquivo, origem) {
  try {
    if (!fs.existsSync(arquivo)) return null;

    const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    const chave = String(
      dados.API_KEY_LOGOS || dados.API_KEY_TED || dados.APIKEY_TED || ''
    ).trim();

    if (!chave) return null;

    return { chave, origem };
  } catch {
    return null;
  }
}

function obterChave() {
  const ambiente = String(process.env.API_KEY_LOGOS || process.env.API_KEY_TED || '').trim();

  if (ambiente) {
    return { chave: ambiente, origem: 'variável de ambiente' };
  }

  const kyaraConfig = path.resolve(__dirname, '../../config.json');
  return lerChaveArquivo(
    kyaraConfig,
    'configuração da KYARA-SYSTΞM'
  ) || null;
}

function detectarMime(buffer, contentType = '') {
  if (!buffer || !buffer.length) return null;

  if (buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return 'image/png';
  }
  if (buffer.length >= 3 &&
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  if (buffer.toString('ascii', 0, 3) === 'GIF') return 'image/gif';

  // Arquivo MP4: assinatura ftyp.
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return 'video/mp4';
  }

  const mime = String(contentType).split(';')[0].trim().toLowerCase();
  return mime.startsWith('image/') || mime.startsWith('video/') ? mime : null;
}

function explicarResposta(buffer) {
  const texto = Buffer.from(buffer).toString('utf8').trim();

  try {
    const json = JSON.parse(texto);
    return String(
      json.message || json.mensagem || json.error ||
      json.erro || json.msg || texto
    ).slice(0, 240);
  } catch {
    return texto.replace(/\s+/g, ' ').slice(0, 240);
  }
}

async function solicitarLogo({ query, query2, type }) {
  const texto = String(query ?? '').trim();
  const texto2 = String(query2 ?? '').trim();
  const comando = String(type ?? '').toLowerCase().trim();

  if (!texto) {
    return { ok: false, msg: 'Digite o texto do logotipo.' };
  }

  if (!comando) {
    return { ok: false, msg: 'Comando de logo não identificado.' };
  }

  const credencial = obterChave();

  if (!credencial) {
    return {
      ok: false,
      msg: 'Chave do serviço de logos não encontrada. Verifique a configuração da KYARA-SYSTΞM.'
    };
  }

  const encodedText = encodeURIComponent(texto);
  const apiComando = ({ pubvideo: 'pubgvideo', pornhub: 'phlogo' })[comando] || comando;
  const encodedCommand = encodeURIComponent(apiComando);
  const encodedKey = encodeURIComponent(credencial.chave);

  let url;
  if (FLAMINGTEXT.has(comando)) {
    url = `https://tedzinho.com.br/api/flamingtext?command=${encodedCommand}&text=${encodedText}&apikey=${encodedKey}`;
  } else {
    const params = new URLSearchParams({
      apikey: credencial.chave,
      text: texto
    });
    if (texto2) params.set('text2', texto2);
    url = `https://tedzinho.com.br/api/ephoto/${encodedCommand}?${params.toString()}`;
  }

  try {
    console.log(`[KYARA-SYSTΞM LOGOS] ${comando} — usando ${FLAMINGTEXT.has(comando) ? 'FlamingText' : 'Ephoto'}`);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      validateStatus: () => true,
      headers: {
        'Accept': 'image/*, application/json',
        'User-Agent': 'Mozilla/5.0 Kyara-OS'
      }
    });

    let buffer = Buffer.from(response.data || []);
    let mime = detectarMime(buffer, response.headers?.['content-type']);

    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        msg: response.status === 404
          ? 'A rota deste efeito não existe no serviço (HTTP 404).'
          : response.status === 401 || response.status === 403
            ? 'A chave do serviço foi recusada (HTTP ' + response.status + ').'
            : response.status === 429
              ? 'O limite de requisições do serviço foi atingido (HTTP 429).'
              : 'O serviço de logos respondeu com HTTP ' + response.status + '.'
      };
    }

    // O serviço Ephoto pode devolver a imagem codificada em Base64.
    // Também aceita respostas JSON com a imagem dentro de um campo.
    if (!mime) {
      const textoResposta = buffer.toString('utf8').trim();
      const candidatos = [];

      function coletar(valor, profundidade = 0) {
        if (profundidade > 6 || valor == null) return;
        if (typeof valor === 'string') {
          candidatos.push(valor);
          return;
        }
        if (Array.isArray(valor)) {
          for (const item of valor) coletar(item, profundidade + 1);
          return;
        }
        if (typeof valor === 'object') {
          for (const [chave, item] of Object.entries(valor)) {
            if (/image|imagem|base64|result|resultado|data|buffer|output/i.test(chave)) {
              coletar(item, profundidade + 1);
            }
          }
        }
      }

      try {
        coletar(JSON.parse(textoResposta));
      } catch {
        candidatos.push(textoResposta);
      }

      for (const item of candidatos) {
        const valor = String(item || '').trim();
        const dataUri = valor.match(/^data:image\/[a-z0-9.+-]+;base64,([\s\S]+)$/i);
        const base64 = (dataUri ? dataUri[1] : valor).replace(/\s+/g, '');

        if (base64.length < 80 || !/^[A-Za-z0-9+/_=-]+$/.test(base64)) continue;

        const tentativa = Buffer.from(
          base64.replace(/-/g, '+').replace(/_/g, '/'),
          'base64'
        );
        const mimeTentativa = detectarMime(tentativa);

        if (mimeTentativa) {
          buffer = tentativa;
          mime = mimeTentativa;
          break;
        }
      }
    }

    if (!mime) {
      const detalhe = explicarResposta(buffer);
      console.error(
        `[KYARA-SYSTΞM LOGOS] HTTP ${response.status}; não foi possível decodificar o retorno como imagem.`
      );
      return {
        ok: false,
        msg: `A API respondeu, mas não retornou imagem reconhecível. ${detalhe || 'Confira o formato da resposta Ephoto.'}`
      };
    }

    return {
      ok: true,
      criador: 'KYARA-SYSTΞM',
      type: mime.startsWith('video/') ? 'video' : 'image',
      mime,
      buffer
    };
  } catch (error) {
    console.error('[KYARA-SYSTΞM LOGOS]', error.message);

    return {
      ok: false,
      msg: `Não consegui acessar o serviço de logos: ${
        error.code === 'ECONNABORTED'
          ? 'tempo de espera esgotado.'
          : error.message
      }`
    };
  }
}

async function gerarLogo({ query, type }) {
  return solicitarLogo({ query, type });
}

async function gerarLogo2({ query, query2, type }) {
  const texto1 = String(query ?? '').trim();
  const texto2 = String(query2 ?? '').trim();

  if (!texto1 || !texto2) {
    return {
      ok: false,
      msg: 'Digite os dois textos separados por /. Exemplo: KYARA/BOT'
    };
  }

  // A API recebe os dois textos no mesmo parâmetro, separados por /.
  return solicitarLogo({
    query: texto1,
    query2: texto2,
    type
  });
}

function verificarConfiguracao() {
  const credencial = obterChave();

  return {
    chaveConfigurada: Boolean(credencial?.chave),
    origem: credencial?.origem || 'nenhuma',
    flamingText: [...FLAMINGTEXT]
  };
}

export {
  gerarLogo,
  gerarLogo2,
  verificarConfiguracao
};
