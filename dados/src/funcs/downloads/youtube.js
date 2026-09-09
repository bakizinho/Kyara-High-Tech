import ytSearch from 'yt-search';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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

async function executarYtDlp(args) {
  try {
    return await executarComando('yt-dlp', args);
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
    const child = spawn('yt-dlp', args, {
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
async function search(query) {
  const termo =
    String(query || '').trim();

  if (!termo) {
    return {
      ok: false,
      msg: 'Digite algo para pesquisar.'
    };
  }

  try {
    const resultado =
      await ytSearch(termo);

    const video =
      resultado?.videos?.[0];

    if (video?.videoId) {
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
            segundos(video.seconds),

          timestamp:
            video.timestamp ||
            formatarDuracao(video.seconds),

          views:
            Number(video.views) ||
            0,

          ago:
            video.ago ||
            '',

          description:
            video.description ||
            ''
        }
      };
    }

  } catch (error) {
    console.warn(
      '[YOUTUBE SEARCH] yt-search falhou:',
      error?.message ||
      error
    );
  }

  /*
   * Fallback local com yt-dlp.
   */
  try {
    const resultado =
      await executarYtDlp([
        '--no-warnings',
        '--flat-playlist',
        '--dump-single-json',
        `ytsearch1:${termo}`
      ]);

    const dados =
      extrairJson(resultado.stdout);

    const entrada =
      dados?.entries?.[0] ||
      dados;

    if (!entrada?.id) {
      return {
        ok: false,
        msg: 'Nenhum resultado encontrado.'
      };
    }

    return {
      ok: true,
      data: {
        videoId:
          entrada.id,

        title:
          entrada.title ||
          'Sem título',

        url:
          entrada.webpage_url ||
          `https://www.youtube.com/watch?v=${entrada.id}`,

        thumbnail:
          entrada.thumbnail ||
          '',

        author: {
          name:
            entrada.uploader ||
            entrada.channel ||
            'Desconhecido'
        },

        seconds:
          segundos(
            entrada.duration
          ),

        timestamp:
          formatarDuracao(
            entrada.duration
          ),

        views:
          Number(
            entrada.view_count
          ) || 0,

        ago:
          '',

        description:
          entrada.description ||
          ''
      }
    };

  } catch (error) {
    console.error(
      '[YOUTUBE SEARCH] fallback falhou:',
      error?.message ||
      error
    );

    return {
      ok: false,
      msg: 'Nenhum resultado encontrado.'
    };
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
async function mp3(url, onProgress) {
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
        '0',

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

    const buffer =
      fs.readFileSync(caminho);

    return {
      ok: true,

      buffer,

      filename:
        `${limparNome(
          path.basename(
            arquivo,
            path.extname(arquivo)
          )
        )}.mp3`,

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
  const progress =
    typeof onProgress === 'function'
      ? onProgress
      : (
          onProgress &&
          typeof onProgress.onProgress === 'function'
            ? onProgress.onProgress
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
     * Instagram/TikTok/Facebook/Kwai/Pinterest
     * frequentemente disponibilizam um MP4 único.
     *
     * Forçar bv+ba ou codecs específicos pode gerar:
     * Requested format is not available
     *
     * Por isso esses sites usam o melhor MP4 disponível.
     *
     * YouTube e similares usam vídeo + áudio separados,
     * limitados a 1080p para equilibrar qualidade e velocidade.
     */

    const formato =
      plataforma === 'Instagram' ||
      plataforma === 'TikTok' ||
      plataforma === 'Facebook' ||
      plataforma === 'Kwai' ||
      plataforma === 'Twitter/X' ||
      plataforma === 'Pinterest'

        ? 'best[ext=mp4]/best'

        : 'bv*[height<=1080][vcodec^=avc1][ext=mp4]+ba[acodec^=mp4a]/bv*[height<=1080]+ba/b[height<=1080]/b';

    await executarYtDlpComProgresso(
      [
        '--no-playlist',
        '--no-warnings',

        '-f',
        formato,

        '--merge-output-format',
        'mp4',

        '--concurrent-fragments',
        '8',

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

export {
  search,
  info,
  mp3,
  mp4
};

export const ytmp3 = mp3;
