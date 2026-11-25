process.env.YTDLP_NO_PLUGINS = "1";

import ytSearch from 'yt-search';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';


/*
 * ============================================================
 * KYARA TED API — DIRECT PLAY
 * ============================================================
 *
 * Usa a API já configurada no config.json.
 *
 * Pesquisa:
 *   /api/pesquisa/youtube
 *
 * Áudio:
 *   /api/download/play_audio/v9
 *
 * Vídeo:
 *   /api/download/play_video/v5
 *
 * O áudio NÃO é baixado para o Termux.
 * A URL da API é entregue diretamente ao Baileys.
 * ============================================================
 */

const KYARA_TED_API_V5 = 'https://tedzinho.com.br';

function kyaraTedConfig() {

  try {

    const configPath =
      new URL(
        '../../config.json',
        import.meta.url
      );

    return JSON.parse(
      fs.readFileSync(
        configPath,
        'utf8'
      )
    );

  } catch {

    return {};

  }

}

function kyaraTedKey() {

  const cfg =
    kyaraTedConfig();

  return String(
    cfg.API_KEY_TED ||
    ''
  ).trim();

}

function kyaraTedUrl(url) {

  return (
    KYARA_TED_API_V5 +
    '/api/download/play_audio/v9' +
    '?apikey=' +
    encodeURIComponent(
      kyaraTedKey()
    ) +
    '&nome_url=' +
    encodeURIComponent(
      String(url || '').trim()
    )
  );

}

function kyaraTedExtractUrl(data) {

  const candidates = [

    data?.url,

    data?.download,

    data?.link,

    data?.result?.url,

    data?.result?.download,

    data?.resultado?.url,

    data?.resultado?.download,

    data?.resultado?.link,

    data?.data?.url,

    data?.data?.download

  ];

  for (const value of candidates) {

    if (
      typeof value === 'string' &&
      /^https?:\/\//i.test(value)
    ) {

      return value;

    }

  }

  return '';

}

async function kyaraTedSearch(query) {

  const key =
    kyaraTedKey();

  if (!key) {
    return null;
  }

  const termo =
    String(query || '').trim();

  if (!termo) {
    return null;
  }

  try {

    const endpoint =
      KYARA_TED_API_V5 +
      '/api/pesquisa/youtube' +
      '?apikey=' +
      encodeURIComponent(key) +
      '&query=' +
      encodeURIComponent(termo);

    const response =
      await fetch(
        endpoint,
        {
          signal:
            AbortSignal.timeout(6500),
          headers: {
            'User-Agent':
              'Mozilla/5.0'
          }
        }
      );

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    const lista =
      Array.isArray(
        data?.resultado
      )
        ? data.resultado
        : Array.isArray(data)
          ? data
          : [];

    const video =
      lista.find(
        item =>
          item &&
          (
            item.videoId ||
            item.id ||
            item.url
          )
      );

    if (!video) {
      return null;
    }

    const videoId =
      video.videoId ||
      video.id ||
      '';

    const url =
      video.url ||
      (
        videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : ''
      );

    if (!url) {
      return null;
    }

    return {
      ok: true,

      data: {

        videoId,

        title:
          video.title ||
          video.titulo ||
          'Sem título',

        url,

        thumbnail:
          video.thumbnail ||
          video.thumb ||
          video.image ||
          '',

        author: {

          name:
            video.author?.name ||
            video.author ||
            video.channel ||
            'Desconhecido'

        },

        seconds:
          Number(
            video.seconds ||
            video.duration ||
            video.duracao ||
            0
          ) || 0,

        timestamp:
          video.timestamp ||
          video.duration ||
          video.duracao ||
          '',

        views:
          Number(
            video.views ||
            video.visualizacoes ||
            0
          ) || 0,

        ago:
          video.ago ||
          ''

      }

    };

  } catch (error) {

    console.warn(
      '[TED API] Pesquisa falhou:',
      error?.message ||
      error
    );

    return null;

  }

}

async function kyaraTedAudio(url) {
  const key = kyaraTedKey();

  if (!key) {
    return null;
  }

  const source =
    String(url || '').trim();

  if (!/^https?:\/\//i.test(source)) {
    return null;
  }

  // ⚡ ULTRA:
  // Não faz HEAD antes do áudio.
  // A própria URL já pode ser entregue ao Baileys.
  return kyaraTedUrl(source);
}

async function kyaraTedVideo(url) {

  const key =
    kyaraTedKey();

  if (!key) {
    return null;
  }

  const source =
    String(url || '').trim();

  if (
    !/^https?:\/\//i.test(source)
  ) {
    return null;
  }

  try {

    const endpoint =
      KYARA_TED_API_V5 +
      '/api/download/play_video/v5' +
      '?apikey=' +
      encodeURIComponent(key) +
      '&url=' +
      encodeURIComponent(source);

    const response =
      await fetch(
        endpoint,
        {
          signal:
            AbortSignal.timeout(30000),
          headers: {
            'User-Agent':
              'Mozilla/5.0'
          }
        }
      );

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    const direct =
      kyaraTedExtractUrl(
        data
      );

    if (!direct) {
      return null;
    }

    return direct;

  } catch (error) {

    console.warn(
      '[TED API] Vídeo falhou:',
      error?.message ||
      error
    );

    return null;

  }

}


function limparNome(nome) {
  return String(nome || 'arquivo')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'arquivo';
}

function segundos(duracao) {
  const n = Number(duracao);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function formatarDuracao(valor) {
  const total = segundos(valor);

  if (!total) return '0:00';

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return `${m}:${String(s).padStart(2, '0')}`;
}

function executarComando(comando, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(comando, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', code => {
      if (code === 0) {
        resolve({
          code,
          stdout,
          stderr
        });

        return;
      }

      reject(
        new Error(
          stderr.trim() ||
          stdout.trim() ||
          `Processo encerrou com código ${code}`
        )
      );
    });
  });
}

const PLAY_STREAM_CACHE_TTL =
  75 * 1000;

const playStreamCache =
  new Map();

const playStreamInflight =
  new Map();

function limparPlayStreamCache() {

  const now =
    Date.now();

  for (
    const [key, value]
    of playStreamCache
  ) {

    if (
      !value ||
      value.expires <= now
    ) {
      playStreamCache.delete(key);
    }
  }

  while (
    playStreamCache.size > 128
  ) {

    const first =
      playStreamCache
        .keys()
        .next()
        .value;

    if (
      first === undefined
    ) {
      break;
    }

    playStreamCache.delete(
      first
    );
  }
}

function prepararArgsYtDlp(args = []) {
  const lista = Array.isArray(args) ? [...args] : [];

  if (!lista.includes('--js-runtimes')) {
    lista.unshift(
      '--remote-components',
      'ejs:github',
      '--js-runtimes',
      `node:${process.execPath}`
    );
  }

  return lista;
}

async function executarYtDlp(args, options = {}) {
  try {
    return await executarComando('yt-dlp', prepararArgsYtDlp(args), options);
  } catch (error) {
    throw new Error(
      error?.message ||
      'Erro desconhecido do yt-dlp'
    );
  }
}

async function executarYtDlpComProgresso(args, onProgress) {
  const progress =
    typeof onProgress === 'function'
      ? onProgress
      : (
          onProgress &&
          typeof onProgress.onProgress === 'function'
            ? onProgress.onProgress
            : null
        );

  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', prepararArgsYtDlp(args), {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let ultimaPorcentagem = -1;

    const processarSaida = chunk => {
      const texto = chunk.toString();

      stdout += texto;

      const encontrados = [
        ...texto.matchAll(/(\d+(?:\.\d+)?)%/g)
      ];

      if (!encontrados.length || typeof progress !== 'function') {
        return;
      }

      const ultimo =
        encontrados[encontrados.length - 1][1];

      const porcentagem =
        Math.max(
          0,
          Math.min(
            100,
            Number(ultimo)
          )
        );

      if (
        Number.isFinite(porcentagem) &&
        Math.round(porcentagem) !== ultimaPorcentagem
      ) {
        ultimaPorcentagem =
          Math.round(porcentagem);

        Promise.resolve(
          progress(ultimaPorcentagem)
        ).catch(() => {});
      }
    };

    child.stdout?.on('data', processarSaida);

    child.stderr?.on('data', chunk => {
      const texto = chunk.toString();

      stderr += texto;

      processarSaida(chunk);
    });

    child.on('error', reject);

    child.on('close', code => {
      if (code === 0) {
        resolve({
          code,
          stdout,
          stderr
        });

        return;
      }

      reject(
        new Error(
          stderr.trim() ||
          stdout.trim() ||
          `yt-dlp encerrou com código ${code}`
        )
      );
    });
  });
}

function extrairJson(stdout) {
  const texto =
    String(stdout || '').trim();

  if (!texto) {
    throw new Error(
      'yt-dlp não retornou informações.'
    );
  }

  const linhas =
    texto
      .split('\n')
      .map(linha => linha.trim())
      .filter(Boolean);

  for (
    let i = linhas.length - 1;
    i >= 0;
    i--
  ) {
    try {
      return JSON.parse(linhas[i]);
    } catch {}
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(
      'yt-dlp não retornou informações válidas.'
    );
  }
}

function normalizarUrl(url) {
  return String(url || '')
    .trim()
    .replace(/[)\]}>.,]+$/g, '');
}

function plataformaUrl(url) {
  const endereco =
    normalizarUrl(url);

  if (
    !/^https?:\/\//i.test(endereco)
  ) {
    return '';
  }

  try {
    const host =
      new URL(endereco)
        .hostname
        .toLowerCase()
        .replace(/^www\./, '');

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be' ||
      host.endsWith('.youtube.com')
    ) {
      return 'YouTube';
    }

    if (
      host === 'tiktok.com' ||
      host.endsWith('.tiktok.com')
    ) {
      return 'TikTok';
    }

    if (
      host === 'instagram.com' ||
      host === 'instagr.am' ||
      host.endsWith('.instagram.com')
    ) {
      return 'Instagram';
    }

    if (
      host === 'facebook.com' ||
      host === 'fb.watch' ||
      host.endsWith('.facebook.com')
    ) {
      return 'Facebook';
    }

    if (
      host === 'kwai.com' ||
      host === 'kwai-video.com' ||
      host.endsWith('.kwai.com')
    ) {
      return 'Kwai';
    }

    if (
      host === 'x.com' ||
      host === 'twitter.com' ||
      host.endsWith('.x.com') ||
      host.endsWith('.twitter.com')
    ) {
      return 'Twitter/X';
    }

    if (
      host === 'pinterest.com' ||
      host === 'pin.it' ||
      host.endsWith('.pinterest.com')
    ) {
      return 'Pinterest';
    }

    return 'Outro';

  } catch {
    return '';
  }
}

function dadosNormalizados(
  dados,
  endereco
) {
  const duration =
    segundos(dados?.duration);

  const webpageUrl =
    dados?.webpage_url ||
    dados?.original_url ||
    endereco;

  const extractor =
    dados?.extractor_key ||
    dados?.extractor ||
    '';

  const platform =
    plataformaUrl(endereco) ||
    extractor ||
    'Mídia';

  return {
    id:
      dados?.id || '',

    videoId:
      dados?.id || '',

    title:
      dados?.title ||
      'Mídia',

    url:
      webpageUrl,

    originalUrl:
      endereco,

    sourceUrl:
      endereco,

    thumbnail:
      dados?.thumbnail ||
      '',

    author: {
      name:
        dados?.uploader ||
        dados?.channel ||
        dados?.creator ||
        dados?.artist ||
        dados?.uploader_id ||
        platform ||
        'Desconhecido'
    },

    channel:
      dados?.channel ||
      dados?.uploader ||
      '',

    uploader:
      dados?.uploader ||
      '',

    creator:
      dados?.creator ||
      '',

    seconds:
      duration,

    timestamp:
      formatarDuracao(duration),

    views:
      Number(dados?.view_count) ||
      0,

    ago:
      '',

    description:
      dados?.description ||
      '',

    extractor,

    platform,

    ext:
      dados?.ext ||
      '',

    webpageUrl
  };
}

/*
 * Pesquisa SOMENTE no YouTube.
 *
 * Nunca usar esta função para URL.
 */
function executarBuscaYtDlpRapida(
  termo,
  timeoutMs = 12000
) {

  return new Promise(
    (resolve, reject) => {

      const args =
        prepararArgsYtDlp([
          '--no-warnings',
          '--flat-playlist',
          '--dump-single-json',
          `ytsearch1:${termo}`
        ]);

      const child =
        spawn(
          'yt-dlp',
          args,
          {
            stdio: [
              'ignore',
              'pipe',
              'pipe'
            ]
          }
        );

      let stdout = '';
      let stderr = '';
      let terminou = false;

      let timer;

      const finalizar =
        (
          erro,
          valor
        ) => {

          if (
            terminou
          ) {
            return;
          }

          terminou = true;

          clearTimeout(
            timer
          );

          if (
            erro
          ) {
            reject(
              erro
            );
          } else {
            resolve(
              valor
            );
          }

        };

      child.stdout?.on(
        'data',
        chunk => {
          stdout +=
            chunk.toString();
        }
      );

      child.stderr?.on(
        'data',
        chunk => {
          stderr +=
            chunk.toString();
        }
      );

      child.on(
        'error',
        finalizar
      );

      child.on(
        'close',
        code => {

          if (
            code === 0
          ) {

            finalizar(
              null,
              {
                stdout,
                stderr
              }
            );

          } else {

            finalizar(
              new Error(
                stderr.trim() ||
                stdout.trim() ||
                `yt-dlp encerrou com código ${code}`
              )
            );

          }

        }
      );

      timer =
        setTimeout(
          () => {

            try {
              child.kill(
                'SIGTERM'
              );
            } catch {}

            finalizar(
              new Error(
                `Pesquisa excedeu ${timeoutMs}ms.`
              )
            );

          },
          timeoutMs
        );

    }
  );
}

const PLAY_SEARCH_CACHE_TTL =
  5 * 60 * 1000;

const playSearchCache =
  new Map();

function executarBuscaYoutubeRapida(
  termo,
  timeoutMs = 12000
) {

  return new Promise(
    (resolve, reject) => {

      const child =
        spawn(
          'yt-dlp',
          prepararArgsYtDlp([
            '--no-warnings',
            '--flat-playlist',
            '--dump-single-json',
            `ytsearch1:${termo}`
          ]),
          {
            stdio: [
              'ignore',
              'pipe',
              'pipe'
            ]
          }
        );

      let stdout = '';
      let stderr = '';
      let encerrado = false;

      const timer =
        setTimeout(
          () => {

            if (
              encerrado
            ) {
              return;
            }

            encerrado = true;

            try {
              child.kill(
                'SIGTERM'
              );
            } catch {}

            reject(
              new Error(
                `yt-dlp excedeu ${timeoutMs}ms.`
              )
            );

          },
          timeoutMs
        );

      const finalizar =
        (
          fn,
          valor
        ) => {

          if (
            encerrado
          ) {
            return;
          }

          encerrado = true;

          clearTimeout(
            timer
          );

          fn(
            valor
          );

        };

      child.stdout?.on(
        'data',
        chunk => {

          stdout +=
            chunk.toString();

        }
      );

      child.stderr?.on(
        'data',
        chunk => {

          stderr +=
            chunk.toString();

        }
      );

      child.on(
        'error',
        error => {

          finalizar(
            reject,
            error
          );

        }
      );

      child.on(
        'close',
        code => {

          if (
            code === 0
          ) {

            finalizar(
              resolve,
              {
                stdout,
                stderr
              }
            );

          } else {

            finalizar(
              reject,
              new Error(
                stderr.trim() ||
                stdout.trim() ||
                `yt-dlp encerrou com código ${code}`
              )
            );

          }

        }
      );

    }
  );

}

const KYARA_PLAY_SEARCH_CACHE =
  new Map();

const KYARA_PLAY_SEARCH_INFLIGHT =
  new Map();

const KYARA_PLAY_SEARCH_TTL =
  10 * 60 * 1000;

async function searchLegacy(query) {
  const termo =
    String(query || '').trim();

  if (!termo) {
    return {
      ok: false,
      msg: 'Digite algo para pesquisar.'
    };
  }

  /*
   * ⚡ CORRIDA DE PESQUISA
   *
   * O primeiro resultado válido ganha.
   */

  const tedJob =
    (async () => {
      const resultado =
        await Promise.race([
          kyaraTedSearch(termo),

          new Promise((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    'TED search timeout'
                  )
                ),
              4500
            );
          })
        ]);

      if (
        !resultado?.ok ||
        !resultado?.data?.url
      ) {
        throw new Error(
          'TED sem resultado'
        );
      }

      console.log(
        '[YOUTUBE SEARCH] ⚡ TED API'
      );

      return resultado;
    })();

  const ytJob =
    (async () => {
      const resultado =
        await Promise.race([
          ytSearch(termo),

          new Promise((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    'yt-search timeout'
                  )
                ),
              4500
            );
          })
        ]);

      const video =
        resultado?.videos?.[0];

      if (!video?.videoId) {
        throw new Error(
          'yt-search sem resultado'
        );
      }

      console.log(
        '[YOUTUBE SEARCH] ⚡ yt-search'
      );

      return {
        ok: true,

        data: {
          videoId:
            video.videoId,

          title:
            video.title ||
            'Sem título',

          url:
            video.url ||
            `https://www.youtube.com/watch?v=${video.videoId}`,

          thumbnail:
            video.thumbnail ||
            video.image ||
            '',

          author: {
            name:
              video.author?.name ||
              video.author ||
              'Desconhecido'
          },

          seconds:
            segundos(
              video.seconds
            ),

          timestamp:
            video.timestamp ||
            formatarDuracao(
              video.seconds
            ),

          views:
            Number(
              video.views
            ) || 0,

          ago:
            video.ago ||
            '',

          description:
            video.description ||
            ''
        }
      };
    })();

  try {
    return await Promise.any([
      tedJob,
      ytJob
    ]);
  } catch (error) {
    console.warn(
      '[YOUTUBE SEARCH] ⚠️ TED/yt-search:',
      error?.message ||
      error
    );
  }

  /*
   * Fallback final.
   */
  try {
    const resultadoBruto =
      await executarBuscaYtDlpRapida(
        termo,
        4000
      );

    const informacoes =
      extrairJson(
        resultadoBruto?.stdout
      );

    const video =
      Array.isArray(
        informacoes?.entries
      )
        ? informacoes.entries[0]
        : informacoes;

    if (
      video?.id ||
      video?.videoId
    ) {
      const id =
        video.videoId ||
        video.id;

      const endereco =
        video.webpage_url ||
        `https://www.youtube.com/watch?v=${id}`;

      return {
        ok: true,

        data:
          dadosNormalizados(
            {
              ...video,
              id
            },
            endereco
          )
      };
    }

  } catch (error) {
    console.warn(
      '[YOUTUBE SEARCH] yt-dlp fallback:',
      error?.message ||
      error
    );
  }

  return {
    ok: false,
    msg:
      'Não foi possível encontrar o vídeo agora. Tente novamente em alguns segundos.'
  };
}



async function search(query) {

  const termo =
    String(query || '').trim();

  if (!termo) {
    return {
      ok: false,
      msg:
        'Digite algo para pesquisar.'
    };
  }

  const key =
    termo
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const cached =
    KYARA_PLAY_SEARCH_CACHE.get(
      key
    );

  if (
    cached &&
    cached.expires >
      Date.now()
  ) {
    return cached.result;
  }

  const running =
    KYARA_PLAY_SEARCH_INFLIGHT.get(
      key
    );

  if (running) {
    return running;
  }

  const job =
    (async () => {

      const result =
        await searchLegacy(
          termo
        );

      if (result?.ok) {

        KYARA_PLAY_SEARCH_CACHE.set(
          key,
          {
            result,
            expires:
              Date.now() +
              KYARA_PLAY_SEARCH_TTL
          }
        );

      }

      return result;

    })();

  KYARA_PLAY_SEARCH_INFLIGHT.set(
    key,
    job
  );

  try {

    return await job;

  } finally {

    KYARA_PLAY_SEARCH_INFLIGHT.delete(
      key
    );

  }
}



/*
 * Obtém metadados de qualquer URL
 * compatível com yt-dlp.
 *
 * IMPORTANTE:
 * URL não passa por yt-search.
 */
async function info(url) {
  const endereco =
    normalizarUrl(url);

  if (
    !/^https?:\/\//i.test(endereco)
  ) {
    return {
      ok: false,
      msg: 'URL inválida.'
    };
  }

  try {
    const resultado =
      await executarYtDlp([
        '--no-warnings',
        '--no-playlist',
        '--dump-single-json',
        '--skip-download',
        endereco
      ]);

    const dados =
      extrairJson(resultado.stdout);

    return {
      ok: true,
      data:
        dadosNormalizados(
          dados,
          endereco
        )
    };

  } catch (error) {
    console.error(
      `[YTDLP INFO] ${plataformaUrl(endereco) || 'URL'}:`,
      error?.message ||
      error
    );

    return {
      ok: false,
      msg:
        'Não foi possível obter informações dessa URL.'
    };
  }
}

function prepararPasta(prefixo) {
  const baseTemp =
    path.join(
      process.cwd(),
      '.tmp-youtube'
    );

  fs.mkdirSync(
    baseTemp,
    {
      recursive: true
    }
  );

  return fs.mkdtempSync(
    path.join(
      baseTemp,
      `${prefixo}-`
    )
  );
}

/*
 * Download de áudio.
 *
 * bestaudio/b:
 * pega o melhor áudio disponível.
 *
 * audio-quality 0:
 * melhor qualidade do encoder MP3.
 */
async function mp3(url, onProgress, options = {}) {
  const progress =
    typeof onProgress === 'function'
      ? onProgress
      : (
          onProgress &&
          typeof onProgress.onProgress === 'function'
            ? onProgress.onProgress
            : null
        );

  const endereco =
    normalizarUrl(url);

  const pasta =
    prepararPasta('audio');
  let manterPasta = false;

  try {
    const saida =
      path.join(
        pasta,
        'audio.%(ext)s'
      );

    await executarYtDlpComProgresso(
      [
        '--no-playlist',
        '--no-warnings',

        '-f',
        'bestaudio/best',

        '--extract-audio',

        '--audio-format',
        'mp3',

        '--audio-quality',
        String(options?.bitrate || '0'),

        '--no-part',

        '--output',
        saida,

        endereco
      ],
      progress
    );

    if (
      typeof progress === 'function'
    ) {
      await progress(100);
    }

    const arquivo =
      fs
        .readdirSync(pasta)
        .find(nome =>
          nome
            .toLowerCase()
            .endsWith('.mp3')
        );

    if (!arquivo) {
      throw new Error(
        'O áudio não foi gerado pelo FFmpeg.'
      );
    }

    const caminho =
      path.join(
        pasta,
        arquivo
      );

    const nomeFinal = `${limparNome(
      path.basename(arquivo, path.extname(arquivo))
    )}.mp3`;

    if (options?.returnFile) {
      manterPasta = true;
      return {
        ok: true,
        path: caminho,
        filename: nomeFinal,
        mimetype: 'audio/mpeg',
        cleanup: () => {
          try {
            fs.rmSync(pasta, { recursive: true, force: true });
          } catch {}
        }
      };
    }

    const buffer =
      fs.readFileSync(caminho);

    return {
      ok: true,

      buffer,

      filename: nomeFinal,

      mimetype:
        'audio/mpeg'
    };

  } catch (error) {
    console.error(
      `[YOUTUBE MP3] ${plataformaUrl(endereco) || 'URL'}:`,
      error?.message ||
      error
    );

    return {
      ok: false,
      msg:
        error?.message ||
        'Erro ao baixar o áudio.'
    };

  } finally {
    if (!manterPasta) {
      try {
        fs.rmSync(pasta, { recursive: true, force: true });
      } catch {}
    }
  }
}

async function obterStreams(caminho) {
  try {
    const resultado =
      await executarComando(
        'ffprobe',
        [
          '-v',
          'error',

          '-show_entries',
          'stream=index,codec_type,codec_name,pix_fmt,width,height',

          '-of',
          'json',

          caminho
        ]
      );

    return (
      JSON.parse(
        resultado.stdout
      )?.streams ||
      []
    );

  } catch {
    return [];
  }
}

/*
 * Verifica compatibilidade básica
 * para evitar recodificação desnecessária.
 */
async function videoCompativel(caminho) {
  const streams =
    await obterStreams(caminho);

  const video =
    streams.find(
      stream =>
        stream.codec_type === 'video'
    );

  const audio =
    streams.find(
      stream =>
        stream.codec_type === 'audio'
    );

  if (!video) {
    return false;
  }

  const videoCodec =
    String(
      video.codec_name ||
      ''
    ).toLowerCase();

  const pixFmt =
    String(
      video.pix_fmt ||
      ''
    ).toLowerCase();

  const audioCodec =
    String(
      audio?.codec_name ||
      ''
    ).toLowerCase();

  return (
    videoCodec === 'h264' &&
    (
      pixFmt === 'yuv420p' ||
      pixFmt === 'yuvj420p'
    ) &&
    (
      !audio ||
      audioCodec === 'aac'
    )
  );
}

/*
 * Garante MP4 compatível com WhatsApp.
 *
 * REGRA:
 *
 * - não usa scale;
 * - não reduz resolução;
 * - preserva largura/altura;
 * - só recodifica quando realmente necessário.
 */
async function garantirMp4Compativel(
  entrada,
  saida
) {
  const compativel =
    await videoCompativel(
      entrada
    );

  if (compativel) {
    const remux =
      `${saida}.remux.mp4`;

    try {
      await executarComando(
        'ffmpeg',
        [
          '-y',

          '-i',
          entrada,

          '-map',
          '0:v:0',

          '-map',
          '0:a:0?',

          '-c',
          'copy',

          '-movflags',
          '+faststart',

          remux
        ]
      );

      fs.renameSync(
        remux,
        saida
      );

      return;

    } catch {
      try {
        if (
          fs.existsSync(remux)
        ) {
          fs.unlinkSync(remux);
        }
      } catch {}

      fs.copyFileSync(
        entrada,
        saida
      );

      return;
    }
  }

  /*
   * Recodificação somente para compatibilidade.
   *
   * NÃO existe filtro scale.
   *
   * A resolução original é preservada.
   */
  await executarComando(
    'ffmpeg',
    [
      '-y',

      '-i',
      entrada,

      '-map',
      '0:v:0',

      '-map',
      '0:a:0?',

      '-c:v',
      'libx264',

      '-preset',
      'veryfast',

      '-crf',
      '18',

      '-pix_fmt',
      'yuv420p',

      '-c:a',
      'aac',

      '-b:a',
      '192k',

      '-movflags',
      '+faststart',

      saida
    ]
  );
}

/*
 * Download de vídeo na MAIOR QUALIDADE DISPONÍVEL.
 *
 * NÃO existe:
 *
 * height<=480
 * height<=360
 * height<=240
 * scale=854
 *
 * O yt-dlp escolhe o melhor vídeo + melhor áudio
 * disponíveis e faz fallback para o melhor formato único.
 */
async function mp4(url, onProgress) {
  // Um número como 360 significa limite de resolução.
  // Callbacks continuam funcionando como antes.
  const limiteAltura =
    typeof onProgress === 'number' &&
    Number.isFinite(onProgress) &&
    onProgress > 0
      ? Math.min(480, Math.max(144, Math.round(onProgress)))
      : 0;

  const callback = limiteAltura ? null : onProgress;

  const progress =
    typeof callback === 'function'
      ? callback
      : (
          callback &&
          typeof callback.onProgress === 'function'
            ? callback.onProgress
            : null
        );

  const endereco = normalizarUrl(url);
  const plataforma = plataformaUrl(endereco);
  const pasta = prepararPasta('video');

  try {
    const saida = path.join(
      pasta,
      'video.%(ext)s'
    );

    /*
     * DOWNLOADER UNIVERSAL
     *
     * Não escolhe formato baseado no nome da plataforma.
     * O yt-dlp tenta:
     *
     * 1. melhor vídeo + melhor áudio;
     * 2. melhor formato único disponível.
     *
     * O resultado será convertido/normalizado para MP4
     * pela etapa garantirMp4Compativel().
     */

    const formato = limiteAltura
      ? `bestvideo*[height<=${limiteAltura}]+bestaudio/best[height<=${limiteAltura}]`
      : 'bestvideo*+bestaudio/best';

    await executarYtDlpComProgresso(
      [
        '--no-playlist',
        '--no-warnings',

        '-f',
        formato,

        '--merge-output-format',
        'mp4',

        '--concurrent-fragments',
        String(limiteAltura ? 2 : 8),

        '--retries',
        '3',

        '--fragment-retries',
        '3',

        '--no-part',

        '--output',
        saida,

        endereco
      ],
      progress
    );

    if (
      typeof progress === 'function'
    ) {
      await progress(100);
    }

    const arquivos =
      fs.readdirSync(pasta);

    const bruto =
      arquivos.find(nome =>
        nome
          .toLowerCase()
          .endsWith('.mp4')
      ) ||
      arquivos.find(nome =>
        /\.(mkv|webm|mov|m4v)$/i.test(nome)
      );

    if (!bruto) {
      throw new Error(
        'O vídeo não foi gerado pelo yt-dlp.'
      );
    }

    const entrada =
      path.join(
        pasta,
        bruto
      );

    const final =
      path.join(
        pasta,
        'video-final.mp4'
      );

    await garantirMp4Compativel(
      entrada,
      final
    );

    if (
      !fs.existsSync(final)
    ) {
      throw new Error(
        'O MP4 final não foi gerado.'
      );
    }

    const buffer =
      fs.readFileSync(final);

    if (!buffer.length) {
      throw new Error(
        'O MP4 final está vazio.'
      );
    }

    return {
      ok: true,

      buffer,

      filename:
        'video.mp4',

      mimetype:
        'video/mp4'
    };

  } catch (error) {

    console.error(
      `[YOUTUBE MP4] ${plataforma || 'URL'}:`,
      error?.message ||
      error
    );

    return {
      ok: false,

      msg:
        error?.message ||
        'Erro ao baixar o vídeo.'
    };

  } finally {

    try {
      fs.rmSync(
        pasta,
        {
          recursive: true,
          force: true
        }
      );
    } catch {}
  }
}


/*
 * ============================================================
 * STREAM DIRETO DO YOUTUBE
 * ============================================================
 *
 * O PLAY2 usa esta função para obter o URL real do stream
 * de áudio sem precisar transformar o áudio em Base64.
 *
 * Isso permite que o HTML reproduza músicas maiores
 * sem aumentar absurdamente o tamanho da mensagem Rich HTML.
 */
async function stream(url) {

  const endereco =
    normalizarUrl(url);

  if (
    !/^https?:\/\//i.test(endereco)
  ) {

    return {
      ok: false,
      msg: 'URL inválida.'
    };
  }

  limparPlayStreamCache();

  /*
   * Cache curto.
   * URL do YouTube expira, então não mantemos por muito tempo.
   */
  const cached =
    playStreamCache.get(
      endereco
    );

  if (
    cached &&
    cached.expires > Date.now()
  ) {

    console.log(
      '[YOUTUBE STREAM] ⚡ CACHE'
    );

    return {
      ok: true,
      url: cached.url
    };
  }

  /*
   * Se duas pessoas pedirem a mesma música
   * ao mesmo tempo, apenas uma extração acontece.
   */
  const running =
    playStreamInflight.get(
      endereco
    );

  if (running) {
    console.log(
      '[YOUTUBE STREAM] ⚡ REUTILIZANDO EXTRAÇÃO'
    );

    return running;
  }

  const job =
    (async () => {

      const tentativas = [

        /*
         * Prioridade:
         * M4A/AAC -> melhor compatibilidade no WhatsApp
         * sem reencode.
         */
        {
          formato:
            'bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio/best',

          extractor:
            ''
        },

        {
          formato:
            'bestaudio/best',

          extractor:
            'youtube:player_client=android'
        },

        {
          formato:
            'bestaudio/best',

          extractor:
            'youtube:player_client=web_safari'
        }

      ];

      let ultimoErro =
        null;

      for (
        const tentativa
        of tentativas
      ) {

        try {

          const args = [

            '--quiet',

            '--no-warnings',

            '--no-playlist',

            '--no-check-formats',

            '--socket-timeout',
            '10',

            '--extractor-retries',
            '1',

            '-f',
            tentativa.formato,

            '--get-url'
          ];

          if (
            tentativa.extractor
          ) {

            args.push(
              '--extractor-args',
              tentativa.extractor
            );
          }

          args.push(
            endereco
          );

          const resultado =
            await executarYtDlp(
              args
            );

          const urls =
            String(
              resultado.stdout ||
              ''
            )
              .split(/\\r?\\n/)
              .map(
                linha =>
                  linha.trim()
              )
              .filter(
                linha =>
                  /^https?:\/\//i.test(
                    linha
                  )
              );

          const streamUrl =
            urls.at(-1) ||
            '';

          if (
            streamUrl
          ) {

            playStreamCache.set(
              endereco,
              {
                url:
                  streamUrl,

                expires:
                  Date.now() +
                  PLAY_STREAM_CACHE_TTL
              }
            );

            console.log(
              '[YOUTUBE STREAM] ✅ URL direta pronta'
            );

            return {
              ok: true,
              url:
                streamUrl
            };
          }

          ultimoErro =
            new Error(
              'yt-dlp não retornou URL de stream.'
            );

        } catch (error) {

          ultimoErro =
            error;

          console.warn(
            '[YOUTUBE STREAM] tentativa falhou:',
            error?.message ||
            error
          );
        }
      }

      return {
        ok: false,

        msg:
          ultimoErro?.message ||
          'Não foi possível obter o stream do YouTube.'
      };

    })();

  playStreamInflight.set(
    endereco,
    job
  );

  try {

    return await job;

  } finally {

    playStreamInflight.delete(
      endereco
    );
  }
}


/*
 * ============================================================
 * PLAY ULTRA — STREAM DE VÍDEO DIRETO
 * ============================================================
 *
 * Retorna uma URL MP4 progressiva/muxada:
 *
 * YouTube -> URL MP4 -> Baileys -> WhatsApp
 *
 * Não:
 *   - baixa arquivo
 *   - cria Buffer
 *   - usa FFmpeg
 *   - espera download completo
 *
 * O formato precisa conter vídeo + áudio juntos, pois o
 * Baileys não fará a muxagem das duas URLs.
 */

const playVideoStreamCache = new Map();
const playVideoStreamInflight = new Map();

const PLAY_VIDEO_STREAM_CACHE_TTL = 75 * 1000;

function limparPlayVideoStreamCache() {
  const agora = Date.now();

  for (
    const [chave, item]
    of playVideoStreamCache
  ) {
    if (
      !item ||
      item.expires <= agora
    ) {
      playVideoStreamCache.delete(chave);
    }
  }
}


/* KYARA_TED_DIRECT_V1 */

const KYARA_TED_BASE =
  'https://tedzinho.com.br';

async function kyaraTedVideoDirect(
  youtubeUrl
) {
  const apiKey =
    String(
      process.env.TED_API_KEY ||
      process.env.API_KEY_TED ||
      process.env.APIKEY_SYS ||
      ''
    ).trim();

  if (!apiKey) {
    return {
      ok: false,
      msg: 'API_KEY_TED não configurada.'
    };
  }

  const endpoint =
    new URL(
      `${KYARA_TED_BASE}/api/download/play_video/v5`
    );

  endpoint.searchParams.set(
    'apikey',
    apiKey
  );

  endpoint.searchParams.set(
    'url',
    youtubeUrl
  );

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      5000
    );

  try {
    const response =
      await fetch(
        endpoint.toString(),
        {
          method: 'GET',

          signal:
            controller.signal,

          headers: {
            'user-agent':
              'Mozilla/5.0',

            accept:
              'application/json,text/plain,*/*'
          }
        }
      );

    const text =
      await response.text();

    let data = null;

    try {
      data =
        JSON.parse(text);
    } catch {}

    if (!response.ok) {
      throw new Error(
        data?.message ||
        data?.error ||
        `TED HTTP ${response.status}`
      );
    }

    function procurarUrl(
      value,
      depth = 0
    ) {
      if (
        !value ||
        depth > 6
      ) {
        return '';
      }

      if (
        typeof value === 'string'
      ) {
        return /^https?:\/\//i.test(
          value.trim()
        )
          ? value.trim()
          : '';
      }

      if (
        Array.isArray(value)
      ) {
        for (
          const item
          of value
        ) {
          const found =
            procurarUrl(
              item,
              depth + 1
            );

          if (found) {
            return found;
          }
        }

        return '';
      }

      if (
        typeof value !== 'object'
      ) {
        return '';
      }

      const prioridade = [
        'url',
        'video',
        'video_url',
        'videoUrl',
        'download',
        'download_url',
        'downloadUrl',
        'link'
      ];

      for (
        const chave
        of prioridade
      ) {
        const found =
          procurarUrl(
            value[chave],
            depth + 1
          );

        if (found) {
          return found;
        }
      }

      for (
        const valueItem
        of Object.values(data)
      ) {
        const found =
          procurarUrl(
            valueItem,
            depth + 1
          );

        if (found) {
          return found;
        }
      }

      return '';
    }

    const directUrl =
      procurarUrl(data);

    if (!directUrl) {
      throw new Error(
        'TED não retornou URL direta de vídeo.'
      );
    }

    console.log(
      '[TED DIRECT] ⚡ Vídeo resolvido'
    );

    return {
      ok: true,
      url: directUrl,
      mimetype: 'video/mp4',
      source: 'ted-play_video-v5'
    };

  } finally {
    clearTimeout(timer);
  }
}

async function streamVideo(url) {
  const endereco = normalizarUrl(url);

  if (!/^https?:\/\//i.test(endereco)) {
    return {
      ok: false,
      msg: 'URL inválida.'
    };
  }

  limparPlayVideoStreamCache();

  const cached = playVideoStreamCache.get(endereco);

  if (
    cached &&
    cached.expires > Date.now() &&
    cached.url
  ) {
    console.log('[PLAY VIDEO] ⚡ CACHE');

    return {
      ok: true,
      url: cached.url,
      mimetype: cached.mimetype || 'video/mp4'
    };
  }

  const running = playVideoStreamInflight.get(endereco);

  if (running) {
    console.log('[PLAY VIDEO] ⚡ INFLIGHT');
    return running;
  }

  const job = (async () => {
    const started = Date.now();

    console.log(
      '[PLAY VIDEO] 🔎 Resolvendo vídeo direto via yt-dlp...'
    );

    /*
     * ==========================================================
     * 🎬 YT-DLP DIRECT
     * ==========================================================
     *
     * Não usa TED.
     *
     * Não baixa arquivo.
     * Não usa Buffer.
     * Não usa FFmpeg.
     *
     * Procuramos somente um formato MP4 progressivo,
     * ou seja:
     *
     *   vídeo + áudio no mesmo endereço.
     *
     * Isso é importante porque o WhatsApp precisa receber
     * uma única URL de mídia.
     */

    const formatos = [
      // Preferência: MP4 H.264/AAC progressivo.
      'best[ext=mp4][vcodec^=avc1][acodec^=mp4a]',

      // Aceita outros codecs quando AVC1/AAC não estiver disponível.
      'best[ext=mp4][vcodec!=none][acodec!=none]',

      // Última tentativa direta: qualquer MP4 progressivo.
      'best[ext=mp4]'
    ];

    let ultimoErro = null;

    for (const formato of formatos) {
      try {
        console.log(
          `[PLAY VIDEO] 🔎 formato: ${formato}`
        );

        const args = [
          '--quiet',
          '--no-warnings',
          '--no-playlist',

          '--socket-timeout',
          '8',

          '--extractor-retries',
          '1',

          '--fragment-retries',
          '1',

          '--retries',
          '1',

          '-f',
          formato,

          '--get-url',

          endereco
        ];

        const resultado = await executarYtDlp(args, { timeout: 15000, killSignal: 'SIGKILL' });

        const streamUrl = String(
          resultado?.stdout || ''
        )
          .split(/\r?\n/)
          .map(item => item.trim())
          .filter(item => /^https?:\/\//i.test(item))
          .at(-1) || '';

        if (!streamUrl) {
          throw new Error(
            'yt-dlp não retornou URL direta.'
          );
        }

        console.log(
          `[PLAY VIDEO] ✅ URL encontrada em ${Date.now() - started}ms`
        );

        const resposta = {
          ok: true,
          url: streamUrl,
          mimetype: 'video/mp4'
        };

        playVideoStreamCache.set(
          endereco,
          {
            url: streamUrl,
            mimetype: 'video/mp4',
            expires:
              Date.now() +
              PLAY_VIDEO_STREAM_CACHE_TTL
          }
        );

        return resposta;

      } catch (error) {
        ultimoErro = error;

        console.warn(
          '[PLAY VIDEO] ⚠️ tentativa falhou:',
          error?.message || error
        );
      }
    }


    /*
     * FALLBACK PLAY VIDEO:
     * Quando não existe URL progressiva, baixa para arquivo
     * temporário, evitando guardar o vídeo inteiro num Buffer.
     */
    const pastaFallback = prepararPasta('playvideo');
    const saidaFallback = path.join(
      pastaFallback,
      'video.%(ext)s'
    );

    try {
      console.log(
        '[PLAY VIDEO] 💾 Tentando arquivo temporário em até 360p...'
      );

      await executarYtDlp(
        [
          '--quiet',
          '--no-warnings',
          '--no-playlist',
          '--socket-timeout',
          '12',
          '--retries',
          '2',
          '--fragment-retries',
          '2',
          '--concurrent-fragments',
          '4',
          '-f',
          'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/best',
          '--merge-output-format',
          'mp4',
          '--output',
          saidaFallback,
          endereco
        ],
        {
          timeout: 600000,
          killSignal: 'SIGKILL'
        }
      );

      const nomes = fs.readdirSync(pastaFallback);
      const arquivo =
        nomes.find(nome => /^video\.(mp4|m4v|webm|mkv)$/i.test(nome)) ||
        nomes.find(nome => /\.(mp4|m4v|webm|mkv)$/i.test(nome));

      if (!arquivo) {
        throw new Error('O yt-dlp não gerou o arquivo de vídeo.');
      }

      const caminhoVideo = path.join(pastaFallback, arquivo);
      const extensao = path.extname(arquivo).toLowerCase();

      if (!fs.existsSync(caminhoVideo) || fs.statSync(caminhoVideo).size === 0) {
        throw new Error('O arquivo de vídeo ficou vazio.');
      }

      console.log(
        `[PLAY VIDEO] ✅ Arquivo pronto: ${(fs.statSync(caminhoVideo).size / 1048576).toFixed(1)} MB`
      );

      // Limpeza automática caso o envio não remova o temporário.
      const temporizadorLimpeza = setTimeout(() => {
        try {
          fs.rmSync(pastaFallback, { recursive: true, force: true });
        } catch {}
      }, 10 * 60 * 1000);

      temporizadorLimpeza.unref?.();

      return {
        ok: true,
        url: caminhoVideo,
        local: true,
        mimetype: extensao === '.webm' ? 'video/webm' : 'video/mp4'
      };

    } catch (erroFallback) {
      try {
        fs.rmSync(pastaFallback, {
          recursive: true,
          force: true
        });
      } catch {}

      console.warn(
        '[PLAY VIDEO] ⚠️ Fallback local falhou:',
        erroFallback?.message || erroFallback
      );

      ultimoErro = erroFallback || ultimoErro;
    }

    console.error(
      '[PLAY VIDEO] ❌ Nenhum formato progressivo disponível.'
    );

    return {
      ok: false,
      msg:
        ultimoErro?.message ||
        'Não foi possível obter um vídeo MP4 direto.'
    };

  })();

  playVideoStreamInflight.set(
    endereco,
    job
  );

  try {
    return await job;
  } finally {
    playVideoStreamInflight.delete(endereco);
  }
}




/* KYARA_VOICE_CACHE_V1 */

const __kyaraVoiceCache = new Map();
const __kyaraVoiceInflight = new Map();

async function prefetchVoiceFile(url) {
  const source = String(url || '').trim();

  if (!source) {
    throw new Error('URL do YouTube vazia.');
  }

  const now = Date.now();
  const cached = __kyaraVoiceCache.get(source);

  if (cached && cached.expiresAt > now) {
    console.log('[PLAY VOICE] ⚡ CACHE HIT');
    return cached.path;
  }

  const running = __kyaraVoiceInflight.get(source);

  if (running) {
    console.log('[PLAY VOICE] 🔄 aguardando download já iniciado');
    return await running;
  }

  const job = (async () => {
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const crypto = await import('node:crypto');
    const { spawn } = await import('node:child_process');

    const dir = path.join(
      os.tmpdir(),
      'kyara-play-voice'
    );

    await fs.mkdir(dir, { recursive: true });

    const key = crypto
      .createHash('sha1')
      .update(source)
      .digest('hex');

    const m4aPath = path.join(dir, `${key}.m4a`);
    const m4aPart = `${m4aPath}.part`;
    const oggPath = path.join(dir, `${key}.ogg`);
    const oggPart = `${oggPath}.part`;

    try {
      const started = Date.now();

      console.log('[PLAY VOICE] 🔎 obtendo stream...');

      const streamResult = await stream(source);

      if (!streamResult?.url) {
        throw new Error('URL direta de áudio não encontrada.');
      }

      console.log(
        `[PLAY VOICE] ⚡ stream obtido em ${Date.now() - started}ms`
      );

      console.log('[PLAY VOICE] ⬇️ download iniciado...');

      const response = await fetch(streamResult.url);

      if (!response.ok || !response.body) {
        throw new Error(
          `Download de áudio falhou: HTTP ${response.status}`
        );
      }

      const fileHandle = await fs.open(m4aPart, 'w');

      try {
        const reader = response.body.getReader();

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          if (value && value.length) {
            await fileHandle.write(value);
          }
        }
      } finally {
        await fileHandle.close();
      }

      await fs.rename(m4aPart, m4aPath);

      console.log(
        `[PLAY VOICE] ⬇️ download concluído em ${Date.now() - started}ms`
      );

      console.log('[PLAY VOICE] 🎙️ convertendo para OGG/Opus...');

      await new Promise((resolve, reject) => {
        const ff = spawn(
          'ffmpeg',
          [
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            m4aPath,
            '-vn',
            '-c:a',
            'libopus',
            '-b:a',
            '64k',
            '-vbr',
            'on',
            '-application',
            'voip',
            '-ac',
            '1',
            '-ar',
            '48000',
            '-f',
            'ogg',
            oggPart
          ],
          {
            stdio: ['ignore', 'ignore', 'pipe']
          }
        );

        let stderr = '';

        ff.stderr.on('data', chunk => {
          stderr += chunk.toString();
        });

        ff.once('error', reject);

        ff.once('close', code => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `FFmpeg falhou (${code}): ${stderr.slice(-1000)}`
              )
            );
          }
        });
      });

      await fs.rename(oggPart, oggPath);

      await fs.unlink(m4aPath).catch(() => {});

      const result = {
        path: oggPath,
        expiresAt: Date.now() + (10 * 60 * 1000)
      };

      __kyaraVoiceCache.set(source, result);

      console.log(
        `[PLAY VOICE] ✅ OGG/Opus pronto em ${Date.now() - started}ms`
      );

      return oggPath;

    } finally {
      await fs.unlink(m4aPart).catch(() => {});
      await fs.unlink(oggPart).catch(() => {});
    }
  })();

  __kyaraVoiceInflight.set(source, job);

  try {
    return await job;
  } finally {
    __kyaraVoiceInflight.delete(source);
  }
}


/* KYARA_REAL_AUDIO_CACHE_V3_DIRECT_URL */

const __kyaraRealAudioCache = new Map();
const __kyaraRealAudioInflight = new Map();

const KYARA_REAL_AUDIO_TTL = 3 * 60 * 1000;

/*
 * ============================================================
 * ⚡ PREFETCH DE ÁUDIO DIRETO
 * ============================================================
 *
 * NÃO baixa o arquivo.
 *
 * NÃO cria arquivo em /tmp.
 *
 * NÃO usa FFmpeg.
 *
 * NÃO converte para OGG/Opus.
 *
 * Apenas:
 *
 *   1. resolve a URL direta do áudio;
 *   2. guarda essa URL por poucos segundos;
 *   3. reutiliza a mesma Promise para chamadas simultâneas.
 *
 * O WhatsApp/Baileys recebe a URL quando o botão é clicado.
 * ============================================================
 */

async function prefetchAudioFile(url) {
  const source = String(url || '').trim();

  if (!source) {
    throw new Error(
      'URL do YouTube vazia.'
    );
  }

  const now = Date.now();

  const cached =
    __kyaraRealAudioCache.get(source);

  if (
    cached &&
    cached.expiresAt > now &&
    cached.url
  ) {
    console.log(
      '[PLAY AUDIO] ⚡ CACHE HIT'
    );

    return cached.url;
  }

  const running =
    __kyaraRealAudioInflight.get(source);

  if (running) {
    console.log(
      '[PLAY AUDIO] 🔄 REUTILIZANDO PREFETCH'
    );

    return running;
  }

  const job = (async () => {
    const started = Date.now();

    console.log(
      '[PLAY AUDIO] 🔎 Resolvendo áudio direto via yt-dlp...'
    );

    /*
     * ==========================================================
     * 🎵 YT-DLP DIRECT AUDIO
     * ==========================================================
     *
     * NÃO usa TED.
     *
     * NÃO baixa MP3.
     * NÃO usa FFmpeg.
     * NÃO cria arquivo temporário.
     * NÃO cria Buffer.
     *
     * Apenas resolve a URL direta do stream de áudio.
     */

    const formatos = [
      'bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio',
      'bestaudio/best'
    ];

    let ultimoErro = null;

    for (const formato of formatos) {
      try {
        console.log(
          `[PLAY AUDIO] 🔎 formato: ${formato}`
        );

        const args = [
          '--quiet',
          '--no-warnings',
          '--no-playlist',

          '--socket-timeout',
          '8',

          '--extractor-retries',
          '1',

          '--fragment-retries',
          '1',

          '--retries',
          '1',

          '-f',
          formato,

          '--get-url',

          source
        ];

        const resultado =
          await executarYtDlp(args);

        const streamUrl =
          String(
            resultado?.stdout || ''
          )
            .split(/\r?\n/)
            .map(
              item => item.trim()
            )
            .filter(
              item =>
                /^https?:\/\//i.test(item)
            )
            .at(-1) || '';

        if (!streamUrl) {
          throw new Error(
            'yt-dlp não retornou URL direta de áudio.'
          );
        }

        __kyaraRealAudioCache.set(
          source,
          {
            url: streamUrl,
            expiresAt:
              Date.now() +
              KYARA_REAL_AUDIO_TTL
          }
        );

        console.log(
          `[PLAY AUDIO] ✅ URL encontrada em ${Date.now() - started}ms`
        );

        return streamUrl;

      } catch (error) {
        ultimoErro = error;

        console.warn(
          '[PLAY AUDIO] ⚠️ tentativa falhou:',
          error?.message || error
        );
      }
    }

    throw (
      ultimoErro ||
      new Error(
        'Não foi possível obter o áudio diretamente.'
      )
    );

  })();

  __kyaraRealAudioInflight.set(
    source,
    job
  );

  try {
    return await job;
  } finally {
    __kyaraRealAudioInflight.delete(
      source
    );
  }
}



export {
  search,
  info,
  mp3,
  stream,
  streamVideo,
  prefetchAudioFile,
  mp4,
  prefetchVoiceFile,
  kyaraTedSearch,
  kyaraTedAudio,
  kyaraTedVideo
};

export async function mp3Rich(
  url,
  onProgress
) {
  return mp3(
    url,
    onProgress,
    {
      bitrate: '64K'
    }
  );
}

export const ytmp3 = mp3;
