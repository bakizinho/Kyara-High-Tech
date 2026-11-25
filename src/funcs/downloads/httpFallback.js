import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';

const TMP_DIR = path.join(
  os.tmpdir(),
  'kyara-http-fallback'
);

const HTTP_TIMEOUT_MS = 30000;
const MAX_BYTES = 300 * 1024 * 1024;

const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36';

function limparTexto(valor = '') {
  return String(valor)
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .trim();
}

function pareceVideo(contentType = '', url = '') {
  return (
    /^video\//i.test(contentType) ||
    /\.(mp4|webm|m4v|mov)(?:$|[?#])/i.test(url)
  );
}

function extensaoVideo(url = '', contentType = '') {
  const porUrl = String(url)
    .split('?')[0]
    .split('#')[0]
    .match(/\.([a-z0-9]{2,5})$/i);

  if (porUrl) {
    const ext = porUrl[1].toLowerCase();

    if (['mp4', 'webm', 'm4v', 'mov'].includes(ext)) {
      return ext;
    }
  }

  if (/video\/webm/i.test(contentType)) return 'webm';
  if (/video\/quicktime/i.test(contentType)) return 'mov';

  return 'mp4';
}

function extrairCandidatosMidia(html, baseUrl) {
  const encontrados = new Set();

  const adicionar = valor => {
    let item = limparTexto(valor);

    if (!item) return;

    item = item
      .replace(/&amp;/gi, '&')
      .replace(/\\u0026/gi, '&');

    try {
      const absoluto = new URL(item, baseUrl);

      if (
        /^https?:$/i.test(absoluto.protocol) &&
        /\.(mp4|webm|m4v|mov)(?:$|[?#])/i.test(
          absoluto.href
        )
      ) {
        encontrados.add(absoluto.href);
      }
    } catch {}
  };

  /*
   * URLs absolutas encontradas no HTML.
   * Preserva ?secure=... e qualquer outro parâmetro.
   */
  const absolutas = html.match(
    /https?:\/\/[^"'<>\\\s]+?\.(?:mp4|webm|m4v|mov)(?:\?[^"'<>\\\s]*)?/gi
  ) || [];

  for (const item of absolutas) {
    adicionar(item);
  }

  /*
   * Caminhos relativos:
   * /videos/arquivo.mp4?token=...
   * ../media/video.webm?secure=...
   * video_360p.mp4?secure=...
   */
  const relativas = html.match(
    /(?:["'`]|\(|=)\s*((?:\/|\.{1,2}\/|[A-Za-z0-9_-])[A-Za-z0-9_./-]*\.(?:mp4|webm|m4v|mov)(?:\?[^"'`<>()\s]*)?)/gi
  ) || [];

  for (const item of relativas) {
    const limpo = item
      .replace(/^["'`(=]\s*/g, '')
      .trim();

    adicionar(limpo);
  }

  /*
   * Campos comuns em JSON/JS:
   * src, file, url, video_url, download_url...
   */
  const campos = html.match(
    /(?:src|file|url|video_url|download_url|videoUrl|downloadUrl)\s*[:=]\s*["'`]([^"'`]+?(?:\.mp4|\.webm|\.m4v|\.mov)(?:\?[^"'`]*)?)["'`]/gi
  ) || [];

  for (const trecho of campos) {
    const m = trecho.match(
      /["'`]([^"'`]+?(?:\.mp4|\.webm|\.m4v|\.mov)(?:\?[^"'`]*)?)["'`]/i
    );

    if (m?.[1]) {
      adicionar(m[1]);
    }
  }

  return [...encontrados];
}

async function fetchComTimeout(url, options = {}) {
  const timeoutMs =
    Number(options.timeoutMs) > 0
      ? Number(options.timeoutMs)
      : HTTP_TIMEOUT_MS;

  const signal = AbortSignal.timeout(timeoutMs);

  return fetch(url, {
    redirect: 'follow',
    signal,
    headers: {
      'user-agent': USER_AGENT,
      accept:
        options.accept ||
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
}

async function baixarArquivo(url, response) {
  const contentType =
    String(response.headers.get('content-type') || '').toLowerCase();

  const contentLength =
    Number(response.headers.get('content-length') || 0);

  const acceptRanges =
    String(response.headers.get('accept-ranges') || '').toLowerCase();

  console.log(
    `[KYARA HTTP] Resposta: ${response.status} ${contentType || '-'} ${contentLength || 0} bytes`
  );

  if (!response.ok) {
    try { await response.body?.cancel(); } catch {}
    throw new Error(`HTTP ${response.status}`);
  }

  if (!pareceVideo(url, contentType)) {
    try { await response.body?.cancel(); } catch {}
    throw new Error('Resposta não identificada como vídeo.');
  }

  if (contentLength > MAX_BYTES) {
    try { await response.body?.cancel(); } catch {}
    throw new Error(
      `Arquivo excede o limite de ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`
    );
  }

  await fs.promises.mkdir(TMP_DIR, { recursive: true });

  const ext = extensaoVideo(url, contentType);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const finalPath = path.join(TMP_DIR, `kyara-${id}${ext}`);

  /*
   * IMPORTANTE:
   * Accept-Ranges: bytes sozinho não prova que o servidor
   * aceita downloads paralelos.
   *
   * Só ativamos Range depois de uma requisição real
   * bytes=0-0 retornar 206 + Content-Range válido.
   */
  let podeParalelo = false;
  let total = contentLength;

  if (
    contentLength > 16 * 1024 * 1024 &&
    acceptRanges === 'bytes'
  ) {
    try {
      const probe = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': USER_AGENT,
          'Range': 'bytes=0-0'
        },
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
      });

      const contentRange =
        String(probe.headers.get('content-range') || '');

      const m = contentRange.match(
        /^bytes\s+0-0\/(\d+)$/i
      );

      if (
        probe.status === 206 &&
        m &&
        Number(m[1]) === contentLength
      ) {
        podeParalelo = true;
        total = Number(m[1]);

        console.log(
          `[KYARA HTTP] ⚡ Range REAL confirmado — 4 conexões (${total} bytes).`
        );
      } else {
        console.log(
          `[KYARA HTTP] ℹ️ Range anunciado, mas não confirmado (${probe.status}).`
        );
      }

      try {
        await probe.body?.cancel();
      } catch {}
    } catch (error) {
      console.log(
        '[KYARA HTTP] ℹ️ Falha no teste Range — usando conexão única.',
        error?.message || error
      );
    }
  }

  if (podeParalelo && total > 0) {
    const partsDir =
      path.join(TMP_DIR, `${id}-parts`);

    await fs.promises.mkdir(partsDir, { recursive: true });

    try {
      const partes = [];
      const quantidade = 4;

      const tamanhoParte =
        Math.ceil(total / quantidade);

      for (let i = 0; i < quantidade; i++) {
        const start =
          i * tamanhoParte;

        const end =
          Math.min(
            total - 1,
            start + tamanhoParte - 1
          );

        if (start > end) continue;

        partes.push({
          i,
          start,
          end,
          tamanho: end - start + 1,
          path: path.join(
            partsDir,
            `part-${i}`
          )
        });
      }

      await Promise.all(
        partes.map(async parte => {
          const r = await fetch(url, {
            redirect: 'follow',
            headers: {
              'User-Agent': USER_AGENT,
              'Range':
                `bytes=${parte.start}-${parte.end}`
            },
            signal: AbortSignal.timeout(
              HTTP_TIMEOUT_MS
            )
          });

          if (r.status !== 206) {
            try { await r.body?.cancel(); } catch {}
            throw new Error(
              `Range ${parte.i} retornou HTTP ${r.status}`
            );
          }

          const faixa =
            String(
              r.headers.get('content-range') || ''
            );

          if (
            !new RegExp(
              `^bytes\\s+${parte.start}-${parte.end}\\/\\d+$`,
              'i'
            ).test(faixa)
          ) {
            try { await r.body?.cancel(); } catch {}
            throw new Error(
              `Content-Range inválido na parte ${parte.i}: ${faixa}`
            );
          }

          const file =
            fs.createWriteStream(
              parte.path
            );

          let recebido = 0;

          try {
            for await (const chunk of r.body) {
              const buf = Buffer.from(chunk);
              recebido += buf.length;
              file.write(buf);
            }
          } finally {
            await new Promise(resolve =>
              file.end(resolve)
            );
          }

          if (recebido !== parte.tamanho) {
            throw new Error(
              `Parte ${parte.i} incompleta: ${recebido}/${parte.tamanho}`
            );
          }
        })
      );

      const destino =
        fs.createWriteStream(finalPath);

      try {
        for (const parte of partes.sort(
          (a, b) => a.i - b.i
        )) {
          const buffer =
            await fs.promises.readFile(
              parte.path
            );

          destino.write(buffer);
        }
      } finally {
        await new Promise(resolve =>
          destino.end(resolve)
        );
      }

      const stat =
        await fs.promises.stat(finalPath);

      if (stat.size !== total) {
        throw new Error(
          `Arquivo final inválido: ${stat.size}/${total} bytes`
        );
      }

    } catch (error) {
      console.log(
        '[KYARA HTTP] ⚠️ Paralelo falhou; refazendo em conexão única.',
        error?.message || error
      );

      try {
        await fs.promises.rm(
          finalPath,
          { force: true }
        );
      } catch {}

      try {
        await fs.promises.rm(
          partsDir,
          {
            recursive: true,
            force: true
          }
        );
      } catch {}

      return baixarArquivo(
        url,
        await fetch(url, {
          redirect: 'follow',
          headers: {
            'User-Agent': USER_AGENT
          },
          signal:
            AbortSignal.timeout(
              HTTP_TIMEOUT_MS
            )
        })
      );
    } finally {
      try {
        await fs.promises.rm(
          partsDir,
          {
            recursive: true,
            force: true
          }
        );
      } catch {}
    }
  } else {
    console.log(
      '[KYARA HTTP] 🚀 Download normal — conexão única.'
    );

    const file =
      fs.createWriteStream(finalPath);

    let recebido = 0;
    let ultimoLog = 0;

    try {
      for await (const chunk of response.body) {
        const buf = Buffer.from(chunk);

        recebido += buf.length;

        if (recebido > MAX_BYTES) {
          throw new Error(
            'Download ultrapassou o limite permitido.'
          );
        }

        file.write(buf);

        if (
          recebido - ultimoLog >=
          5 * 1024 * 1024
        ) {
          ultimoLog = recebido;

          console.log(
            `[KYARA HTTP] 📥 ${(recebido / 1024 / 1024).toFixed(2)} MB`
          );
        }
      }
    } finally {
      await new Promise(resolve =>
        file.end(resolve)
      );
    }

    if (
      contentLength > 0 &&
      recebido !== contentLength
    ) {
      throw new Error(
        `Download incompleto: ${recebido}/${contentLength} bytes`
      );
    }
  }

  const buffer =
    await fs.promises.readFile(finalPath);

  if (!buffer.length) {
    throw new Error(
      'Arquivo baixado está vazio.'
    );
  }

  console.log(
    `[KYARA HTTP] ✅ Download concluído: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
  );

  try {
    await fs.promises.unlink(finalPath);
  } catch {}

  return {
    ok: true,
    buffer,
    filename: `video${ext}`,
    mimetype:
      contentType.split(';')[0] ||
      'video/mp4'
  };
}

async function tentarArquivo(url, options = {}) {
  const response = await fetchComTimeout(
    url,
    {
      timeoutMs:
        options.downloadTimeoutMs || 180000,
      accept:
        'video/*,application/octet-stream,*/*;q=0.5'
    }
  );

  if (!response.ok || !response.body) {
    return {
      ok: false,
      msg: `HTTP ${response.status}`
    };
  }

  const contentType =
    response.headers.get('content-type') || '';

  if (
    !pareceVideo(
      contentType,
      url
    )
  ) {
    try {
      await response.body?.cancel();
    } catch {}

    return {
      ok: false,
      msg: 'Resposta não parece ser vídeo.'
    };
  }

  return baixarArquivo(
    response.url || url,
    response
  );
}

async function baixarHttp(url, options = {}) {
  try {
    if (
      !url ||
      !/^https?:\/\//i.test(String(url))
    ) {
      return {
        ok: false,
        msg: 'URL HTTP/HTTPS inválida.'
      };
    }

    /*
     * 1. Primeiro tenta a própria URL.
     * Se for MP4 direto, termina aqui.
     */
    const direto = await tentarArquivo(
      url,
      options
    );

    if (direto?.ok) {
      return direto;
    }

    /*
     * 2. A URL é uma página HTML.
     * Procuramos os arquivos de vídeo que
     * a própria página expõe.
     */
    const pagina = await fetchComTimeout(
      url,
      {
        timeoutMs:
          options.timeoutMs || HTTP_TIMEOUT_MS,
        accept:
          'text/html,application/xhtml+xml,*/*;q=0.8'
      }
    );

    if (!pagina.ok || !pagina.body) {
      return {
        ok: false,
        msg:
          `HTTP ${pagina.status} ao acessar a página.`
      };
    }

    const contentType =
      pagina.headers.get('content-type') || '';

    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      return {
        ok: false,
        msg:
          'A URL não retornou uma página HTML nem um vídeo direto.'
      };
    }

    const html = await pagina.text();

    const candidatos =
      extrairCandidatosMidia(
        html,
        pagina.url || url
      );

    if (!candidatos.length) {
      return {
        ok: false,
        msg:
          'Nenhum arquivo de vídeo público foi encontrado no HTML.'
      };
    }

    console.log(
      `[KYARA HTTP] ${candidatos.length} mídia(s) encontrada(s) na página.`
    );

    /*
     * 3. Testa os candidatos na ordem encontrada.
     * Mantém query strings como ?secure=...
     */
    let ultimoErro = null;

    for (const candidato of candidatos) {
      try {
        console.log(
          '[KYARA HTTP] Tentando mídia encontrada na página.'
        );

        const resultado =
          await tentarArquivo(
            candidato,
            options
          );

        if (resultado?.ok) {
          return resultado;
        }

        ultimoErro = resultado?.msg || null;

        console.log(
          '[KYARA HTTP] Candidato falhou:',
          resultado?.msg || 'erro desconhecido'
        );
      } catch (error) {
        ultimoErro =
          error?.message || null;
      }
    }

    return {
      ok: false,
      msg:
        ultimoErro ||
        'As mídias encontradas não puderam ser baixadas.'
    };
  } catch (error) {
    return {
      ok: false,
      msg:
        error?.name === 'AbortError'
          ? 'Tempo esgotado no download HTTP.'
          : (
              error?.message ||
              'Falha no fallback HTTP.'
            )
    };
  }
}

export {
  baixarHttp
};
