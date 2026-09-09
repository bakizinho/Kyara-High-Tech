import http from "http";
import { URL } from "url";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const HOST = "127.0.0.1";
const PORT = 3000;

const TMP_DIR = path.join(os.tmpdir(), "kyara-api");

fs.mkdirSync(TMP_DIR, { recursive: true });

function json(res, status, data) {
  const body = JSON.stringify(data, null, 2);

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });

  res.end(body);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizarCor(cor, padrao) {
  if (!cor) return padrao;

  const c = String(cor).trim();

  const permitidas = [
    "black",
    "white",
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "pink",
    "orange",
    "gray",
    "grey",
    "transparent"
  ];

  if (permitidas.includes(c.toLowerCase())) {
    return c;
  }

  if (/^#[0-9a-fA-F]{6}$/.test(c)) {
    return c;
  }

  if (/^[0-9a-fA-F]{6}$/.test(c)) {
    return `#${c}`;
  }

  return padrao;
}

function gerarSVG(texto, bg, textColor, blur, scale = 1) {
  const width = 1080;
  const height = 512;

  const textoSeguro = escapeXml(texto);

  const blurValor = Math.max(
    0,
    Math.min(20, Number.parseFloat(blur) || 0)
  );

  const filtro = blurValor > 0
    ? `
      <filter id="blur">
        <feGaussianBlur stdDeviation="${blurValor}"/>
      </filter>
    `
    : "";

  const filtroTexto = blurValor > 0
    ? `filter="url(#blur)"`
    : "";

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
>
  <defs>
    ${filtro}
  </defs>

  <rect
    width="100%"
    height="100%"
    fill="${bg}"
  />

  <text
    x="50%"
    y="50%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${82 * scale}"
    font-weight="700"
    fill="${textColor}"
    ${filtroTexto}
  >
    ${textoSeguro}
  </text>
</svg>
`;
}

async function gerarBrat(url) {
  const texto = url.searchParams.get("query");

  if (!texto) {
    return {
      erro: "O parâmetro query é obrigatório"
    };
  }

  const bg = normalizarCor(
    url.searchParams.get("bg"),
    "white"
  );

  const textColor = normalizarCor(
    url.searchParams.get("text_color"),
    "black"
  );

  const blur = url.searchParams.get("blur") || "0";

  const svg = gerarSVG(
    texto,
    bg,
    textColor,
    blur
  );

  return await sharp(Buffer.from(svg))
    .webp({
      quality: 90
    })
    .toBuffer();
}

/*
 * ==========================================================
 * BRAT VIDEO
 * ==========================================================
 */

async function gerarBratVideo(url) {
  const textoOriginal = url.searchParams.get("query");

  if (!textoOriginal) {
    throw new Error("O parâmetro query é obrigatório");
  }

  // Protege caracteres especiais para o SVG.
  const texto = textoOriginal
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const bg = normalizarCor(
    url.searchParams.get("bg"),
    "white"
  );

  const textColor = normalizarCor(
    url.searchParams.get("text_color"),
    "black"
  );

  const blur = url.searchParams.get("blur") || "0";

  let bpm = Number.parseFloat(
    url.searchParams.get("bpm") || "120"
  );

  if (!Number.isFinite(bpm)) bpm = 120;

  bpm = Math.max(40, Math.min(300, bpm));

  const id =
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const svgPath = path.join(TMP_DIR, `${id}.svg`);
  const pngPath = path.join(TMP_DIR, `${id}.png`);
  const outputPath = path.join(TMP_DIR, `${id}.mp4`);

  const svg = gerarSVG(
    texto,
    bg,
    textColor,
    blur
  );

  fs.writeFileSync(svgPath, svg, "utf8");

  try {
    await sharp(Buffer.from(svg, "utf8"))
      .png()
      .toFile(pngPath);

    if (!fs.existsSync(pngPath)) {
      throw new Error("PNG não foi criado pelo Sharp.");
    }

    const duration = 4;

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-loop", "1",
        "-framerate", "30",
        "-i", pngPath,
        "-t", String(duration),
        "-vf", "scale=1080:512:force_original_aspect_ratio=decrease,pad=1080:512:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-r", "30",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        outputPath
      ],
      {
        maxBuffer: 10 * 1024 * 1024
      }
    );

    if (!fs.existsSync(outputPath)) {
      throw new Error("O FFmpeg não gerou o vídeo.");
    }

    const stat = fs.statSync(outputPath);

    if (stat.size < 1000) {
      throw new Error("Vídeo MP4 gerado com tamanho inválido.");
    }

    return {
      file: outputPath,
      bpm,
      duration
    };

  } finally {
    try { fs.unlinkSync(svgPath); } catch {}
    try { fs.unlinkSync(pngPath); } catch {}
  }
}

/*
 * ==========================================================
 * LYRICS / PESQUISA MUSICAL
 * ==========================================================
 */

async function pesquisarMusica(query) {
  if (!query || !query.trim()) {
    throw new Error("Informe o nome da música.");
  }

  const termo = encodeURIComponent(query.trim());

  const apiUrl =
    `https://itunes.apple.com/search?term=${termo}` +
    `&media=music&entity=song&limit=10`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(
      `Serviço de pesquisa respondeu ${response.status}`
    );
  }

  const data = await response.json();

  if (!data?.results?.length) {
    return {
      status: true,
      resultados: []
    };
  }

  const resultados = data.results.map(item => ({
    txt: item.trackName || "Título não disponível",
    art: item.artistName || "Artista desconhecido",
    album: item.collectionName || "",
    img: item.artworkUrl100 || null,
    link: item.trackViewUrl || "",
    preview: item.previewUrl || null
  }));

  return {
    status: true,
    resultados
  };
}

/*
 * ==========================================================
 * SERVIDOR
 * ==========================================================
 */

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host || `${HOST}:${PORT}`}`
    );

    /*
     * STATUS
     */

    if (url.pathname === "/") {
      return json(res, 200, {
        status: true,
        api: "Kyara API",
        version: "1.3.0",
        gratuita: true,
        local: true,

        endpoints: [
          "/",
          "/api/teste",
          "/api/verificarkey",
          "/api/canvas/brat",
          "/api/canvas/bratvideo",
          "/api/pesquisa/letra"
        ]
      });
    }

    /*
     * VERIFICAR API
     */

    if (url.pathname === "/api/verificarkey") {
      return json(res, 200, {
        status: true,
        valid: true,
        message: "API própria funcionando!"
      });
    }

    /*
     * TESTE
     */

    if (url.pathname === "/api/teste") {
      return json(res, 200, {
        status: true,
        message: "Kyara API funcionando perfeitamente 🚀",
        timestamp: new Date().toISOString()
      });
    }

    /*
     * BRAT
     */

    if (url.pathname === "/api/canvas/brat") {
      try {
        const imagem = await gerarBrat(url);

        if (imagem?.erro) {
          return json(res, 400, {
            status: false,
            error: imagem.erro
          });
        }

        res.writeHead(200, {
          "Content-Type": "image/webp",
          "Content-Length": imagem.length,
          "Cache-Control": "public, max-age=1800",
          "Access-Control-Allow-Origin": "*"
        });

        return res.end(imagem);

      } catch (err) {
        console.error("[BRAT] Erro:", err);

        return json(res, 500, {
          status: false,
          error: "Erro ao gerar Brat",
          details: err.message
        });
      }
    }

    /*
     * BRAT VIDEO
     */

    if (url.pathname === "/api/canvas/bratvideo") {
      try {
        const resultado = await gerarBratVideo(url);

        const video = fs.readFileSync(
          resultado.file
        );

        res.writeHead(200, {
          "Content-Type": "video/mp4",
          "Content-Length": video.length,
          "Cache-Control": "public, max-age=1800",
          "Access-Control-Allow-Origin": "*"
        });

        res.end(video);

        /*
         * Limpeza automática depois do envio.
         */

        setTimeout(() => {
          try {
            fs.unlinkSync(resultado.file);
          } catch {}
        }, 5000);

        return;

      } catch (err) {
        console.error("[BRATVID] Erro:", err);

        return json(res, 500, {
          status: false,
          error: "Erro ao gerar Bratvid",
          details: err.message
        });
      }
    }

    /*
     * PESQUISA MUSICAL
     */

    if (url.pathname === "/api/pesquisa/letra") {
      try {
        const query = url.searchParams.get("query");

        if (!query) {
          return json(res, 400, {
            status: false,
            error: "O parâmetro query é obrigatório"
          });
        }

        const resultado = await pesquisarMusica(query);

        return json(res, 200, {
          status: true,
          results: {
            resultados: resultado.resultados
          }
        });

      } catch (err) {
        console.error("[LYRICS] Erro:", err);

        return json(res, 500, {
          status: false,
          error: "Erro ao pesquisar música",
          details: err.message
        });
      }
    }

    /*
     * 404
     */

    return json(res, 404, {
      status: false,
      error: "Endpoint não encontrado"
    });

  } catch (err) {
    console.error("[API] Erro:", err);

    return json(res, 500, {
      status: false,
      error: "Erro interno da API"
    });
  }
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n⚠️ A porta ${PORT} já está em uso.\n` +
      `A API provavelmente já está rodando.\n`
    );
    return;
  }

  console.error(
    "[API] Erro do servidor:",
    err
  );
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("================================");
  console.log("🚀 KYARA API");
  console.log("================================");
  console.log(`📡 http://${HOST}:${PORT}`);
  console.log("💰 Gratuita");
  console.log("🔒 Local");
  console.log("🎨 Canvas/Brat: ATIVO");
  console.log("🎬 Bratvid: ATIVO");
  console.log("🎵 Pesquisa musical: ATIVA");
  console.log("================================");
  console.log("");
});
