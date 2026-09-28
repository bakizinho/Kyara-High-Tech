import { sendHtmlGameFromOptions } from "../utils/htmlGame.js";
import * as youtube from "../funcs/downloads/youtube.js";
import fs from "node:fs";

const MAX_DURATION_SECONDS = 10 * 60;

function formatTime(seconds) {
  const value = Math.max(
    0,
    Math.floor(Number(seconds) || 0)
  );

  const minutes = Math.floor(value / 60);
  const secs = value % 60;

  return (
    minutes +
    ":" +
    String(secs).padStart(2, "0")
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function youtubeVideoId(url) {
  try {
    const value = String(url || "").trim();

    if (value.includes("youtu.be/")) {
      return value
        .split("youtu.be/")[1]
        .split(/[?&#]/)[0];
    }

    return (
      new URL(value)
        .searchParams
        .get("v") || ""
    );
  } catch {
    return "";
  }
}

function getCover(video) {
  const direct =
    String(video?.thumbnail || "").trim();

  if (/^https?:\/\//i.test(direct)) {
    return direct;
  }

  const id =
    youtubeVideoId(
      video?.url
    );

  if (!id) {
    return "";
  }

  return (
    "https://i.ytimg.com/vi/" +
    encodeURIComponent(id) +
    "/hqdefault.jpg"
  );
}


function getPublicUrl() {

  const env =
    String(
      process.env.KYARA_BROWSER_PUBLIC_URL ||
      ""
    )
      .trim()
      .replace(/\/+$/, "");

  if (
    /^https?:\/\//i.test(
      env
    )
  ) {
    return env;
  }

  try {

    const fileUrl =
      fs.readFileSync(
        "dados/.kyara-browser-public-url",
        "utf8"
      )
        .trim()
        .replace(/\/+$/, "");

    if (
      /^https?:\/\//i.test(
        fileUrl
      )
    ) {
      return fileUrl;
    }

  } catch {}

  return "";
}

async function imageUrlToDataUrl(value) {
  const original =
    String(value || "").trim();

  if (!original) {
    return "";
  }

  const variants = [
    original,
    original.replace(
      "/hqdefault.jpg",
      "/mqdefault.jpg"
    ),
    original.replace(
      "/hqdefault.jpg",
      "/sddefault.jpg"
    ),
    original.replace(
      "/hqdefault.jpg",
      "/default.jpg"
    )
  ];

  for (
    const url
    of [...new Set(variants)]
  ) {
    try {
      const response =
        await fetch(url);

      if (!response.ok) {
        continue;
      }

      const contentType =
        String(
          response.headers.get(
            "content-type"
          ) || ""
        )
          .split(";")[0]
          .trim();

      if (
        !contentType.startsWith(
          "image/"
        )
      ) {
        continue;
      }

      const buffer =
        Buffer.from(
          await response.arrayBuffer()
        );

      if (!buffer.length) {
        continue;
      }

      return (
        "data:" +
        contentType +
        ";base64," +
        buffer.toString("base64")
      );
    } catch {}
  }

  return "";
}

function buildPlayerHtml(data) {

  const cover =
    escapeHtml(
      String(
        data.cover || ""
      ).trim()
    );

  const title =
    escapeHtml(
      String(
        data.title || "Música"
      )
    );

  const artist =
    escapeHtml(
      String(
        data.artist || "Desconhecido"
      )
    );

  const duration =
    formatTime(
      Number(data.duration) || 0
    );

  const audioUrl =
    String(
      data.audioUrl || ""
    ).trim();

  const audioSrc =
    escapeHtml(
      audioUrl
    );

  return `<!doctype html>
<html lang="pt-BR">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>PLAY2 • ${title}</title>

<style>

*{
  box-sizing:border-box;
}

html,
body{
  margin:0;
  padding:0;
  width:100%;
  min-height:100%;
  background:#080808;
  color:#fff;
  font-family:Arial,sans-serif;
}

body{
  padding:16px;
}

.player{
  width:100%;
  max-width:520px;
  margin:0 auto;
  padding:16px;
  border-radius:22px;
  background:#151515;
  overflow:hidden;
}

.cover{
  position:relative;
  width:100%;
  aspect-ratio:1/1;
  border-radius:18px;
  overflow:hidden;
  background:#222;
}

.cover img{
  display:block;
  width:100%;
  height:100%;
  object-fit:cover;
}

.overlay{
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  padding:48px 16px 16px;
  background:linear-gradient(
    transparent,
    rgba(0,0,0,.94)
  );
}

.title{
  font-size:20px;
  font-weight:700;
  line-height:1.2;
}

.artist{
  margin-top:6px;
  font-size:14px;
  opacity:.8;
}

.info{
  margin-top:14px;
  font-size:13px;
  opacity:.75;
}

audio{
  display:block !important;
  width:100% !important;
  height:54px !important;
  margin-top:16px;
}

.playButton{
  display:block;
  width:100%;
  margin-top:12px;
  padding:14px;
  border:0;
  border-radius:14px;
  background:#fff;
  color:#000;
  font-size:15px;
  font-weight:700;
}

.status{
  margin-top:10px;
  text-align:center;
  font-size:12px;
  opacity:.65;
}

</style>

</head>

<body>

<div class="player">

  <div class="cover">

    <img
      src="${cover}"
      alt="${title}"
    >

    <div class="overlay">

      <div class="title">
        ${title}
      </div>

      <div class="artist">
        ${artist}
      </div>

    </div>

  </div>

  <div class="info">
    🎵 ${artist} · ⏱️ ${duration}
  </div>

  <audio
    id="kyaraAudio"
    controls
    preload="metadata"
    playsinline
    src="${audioSrc}"
  ></audio>

  <button
    class="playButton"
    type="button"
    onclick="playKyaraAudio()"
  >
    ▶️ Reproduzir música
  </button>

  <div
    id="kyaraStatus"
    class="status"
  >
    🎧 Player KYARA pronto
  </div>

</div>

<script>

function playKyaraAudio(){

  const audio =
    document.getElementById(
      "kyaraAudio"
    );

  const status =
    document.getElementById(
      "kyaraStatus"
    );

  if(!audio){

    if(status){
      status.textContent =
        "❌ Áudio indisponível";
    }

    return;
  }

  try{

    audio.play();

    if(status){
      status.textContent =
        "▶️ Reproduzindo...";
    }

  }catch(error){

    if(status){
      status.textContent =
        "⚠️ Use o botão ▶️ do áudio";
    }

  }

}

(function(){

  const audio =
    document.getElementById(
      "kyaraAudio"
    );

  const status =
    document.getElementById(
      "kyaraStatus"
    );

  if(!audio){
    return;
  }

  audio.addEventListener(
    "play",
    function(){

      if(status){
        status.textContent =
          "▶️ Reproduzindo...";
      }

    }
  );

  audio.addEventListener(
    "pause",
    function(){

      if(status){
        status.textContent =
          "⏸️ Pausado";
      }

    }
  );

  audio.addEventListener(
    "ended",
    function(){

      if(status){
        status.textContent =
          "✅ Música finalizada";
      }

    }
  );

  audio.addEventListener(
    "error",
    function(){

      if(status){
        status.textContent =
          "❌ Falha ao reproduzir o áudio";
      }

    }
  );

})();

</script>

</body>

</html>`;
}


export async function handlePlay2(
  options = {}
) {

  const q =
    String(
      options.q ||
      options.query ||
      options.text ||
      ""
    ).trim();

  const reply =
    typeof options.reply === "function"
      ? options.reply
      : null;

  const prefix =
    String(
      options.prefix || "/"
    ).trim() || "/";

  if (!q) {

    if(reply){

      await reply(
        `❌ Use ${prefix}play2 <nome da música>.`
      );

    }

    return true;

  }

  try {

    console.log(
      "[PLAY2] 🔎 Pesquisa:",
      q
    );

    const result =
      await youtube.search(
        q
      );

    if(
      !result?.ok ||
      !result?.data
    ){

      throw new Error(
        result?.msg ||
        "Música não encontrada."
      );

    }

    const video =
      result.data;

    const youtubeUrl =
      String(
        video.url || ""
      ).trim();

    if(
      !/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i.test(
        youtubeUrl
      )
    ){

      throw new Error(
        "URL do YouTube inválida."
      );

    }

    let seconds =
      Number(
        video.seconds
      ) || 0;

    if(
      seconds <= 0
    ){

      const info =
        await youtube.info(
          youtubeUrl
        );

      seconds =
        Number(
          info?.data?.seconds
        ) || 0;

    }

    if(
      seconds <= 0
    ){

      throw new Error(
        "Não foi possível identificar a duração."
      );

    }

    if(
      seconds >
      MAX_DURATION_SECONDS
    ){

      throw new Error(
        "Esta música possui mais de 10 minutos."
      );

    }

    const title =
      String(
        video.title ||
        "SEM TÍTULO"
      )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    const artist =
      String(
        video.author?.name ||
        video.author ||
        video.channel ||
        "DESCONHECIDO"
      )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    /*
     * BLOCO EXATAMENTE NO ESTILO DO PRINT.
     */
    if(reply){

      await reply(
        "🎵 *Encontrando a música...*\n\n" +
        `🎵 *Título:* ${title}\n` +
        `👤 *Artista:* ${artist}\n` +
        `⏱️ *Duração:* ${formatTime(seconds)}\n` +
        "🔗 *Carregando player...*"
      );

    }

    const coverSource =
      getCover(
        video
      );

    let cover =
      await imageUrlToDataUrl(
        coverSource
      );

    if(!cover){
      cover =
        coverSource;
    }


    /*
     * PLAY2 — áudio EMBUTIDO dentro do Rich HTML.
     *
     * O MP3 é baixado pelo próprio bot e convertido
     * para Data URL Base64. Assim o HTML não depende
     * de servidor externo para reproduzir o áudio.
     *
     * Limite: 10 minutos.
     */

    const MAX_PLAY2_SECONDS = 10 * 60;

    if (
      Number.isFinite(seconds) &&
      seconds > MAX_PLAY2_SECONDS
    ) {
      throw new Error(
        "O PLAY2 aceita músicas de até 10 minutos."
      );
    }


    if (reply) {
      try {
        await reply(
          "⏳ *PLAY2 recebido!*\\n" +
          "🎧 Preparando o áudio dentro do HTML..."
        );
      } catch (e) {
        console.warn(
          "[PLAY2] aviso inicial:",
          e?.message || e
        );
      }
    }

console.log(
      "[PLAY2] 🎧 Baixando áudio para embutir no HTML..."
    );

    let audio;

    audio = await Promise.race([
      youtube.mp3(
        youtubeUrl,
        null,
        { bitrate: "48K" }
      ),

      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Tempo limite de 90 segundos excedido ao baixar o áudio."
              )
            ),
          90 * 1000
        )
      )
    ]);

    if (
      !audio?.ok ||
      !Buffer.isBuffer(audio.buffer) ||
      !audio.buffer.length
    ) {
      throw new Error(
        audio?.msg ||
        "O YouTube não retornou um áudio reproduzível."
      );
    }

    /*
     * 48K por 10 minutos fica normalmente abaixo
     * de aproximadamente 3,6 MB.
     *
     * Se ficar maior que 4 MB, tentamos 32K.
     */
    const MAX_EMBEDDED_AUDIO_BYTES =
      4 * 1024 * 1024;

    if (
      audio.buffer.length >
      MAX_EMBEDDED_AUDIO_BYTES
    ) {
      console.log(
        "[PLAY2] 🔄 Áudio grande; tentando 32K..."
      );

      audio = await Promise.race([
        youtube.mp3(
          youtubeUrl,
          null,
          { bitrate: "32K" }
        ),

        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Tempo limite de 90 segundos excedido no áudio compacto."
                )
              ),
            90 * 1000
          )
        )
      ]);

      if (
        !audio?.ok ||
        !Buffer.isBuffer(audio.buffer) ||
        !audio.buffer.length
      ) {
        throw new Error(
          audio?.msg ||
          "Não foi possível gerar o áudio compacto."
        );
      }
    }

    if (
      audio.buffer.length >
      MAX_EMBEDDED_AUDIO_BYTES
    ) {
      throw new Error(
        "O áudio ficou grande demais para ser embutido no HTML."
      );
    }

    const audioMime = String(
      audio.mimetype || "audio/mpeg"
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

    const safeAudioMime =
      /^audio\/[a-z0-9.+-]+$/i.test(audioMime)
        ? audioMime
        : "audio/mpeg";

    const audioDataUrl =
      "data:" +
      safeAudioMime +
      ";base64," +
      audio.buffer.toString("base64");

    console.log(
      "[PLAY2] ✅ Áudio embutido:",
      audio.buffer.length,
      "bytes"
    );

    const html =
      buildPlayerHtml({
        title,
        artist,
        duration:
          seconds,
        cover,
        audioUrl:
          audioDataUrl,
        videoId:
          youtubeVideoId(
            youtubeUrl
          )
      });

    const coverHost =
      (() => {
        try {
          return new URL(
            cover
          ).hostname;
        } catch {
          return "";
        }
      })();

    const trustedSources =
      [
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
        "ytimg.com",
        "i.ytimg.com",
        coverHost
      ].filter(Boolean);

    await sendHtmlGameFromOptions(
      options,
      html,
      {
        submessageText:
          `🎵 ${title} • PLAY2`,

        url:
          youtubeUrl,

        trustedSources
      }
    );

    if(reply){

      await reply(
        "🎧 *Música enviada com sucesso!*\n" +
        `Use ${prefix}play2 <nome da música> para outras.`
      );

    }

    console.log(
      "[PLAY2] ✅ Player enviado:",
      title
    );

    return true;

  } catch(error){

    console.error(
      "[PLAY2] ❌",
      error?.stack ||
      error?.message ||
      error
    );

    if(reply){

      await reply(
        "❌ PLAY2 não conseguiu abrir o player.\n\n" +
        String(
          error?.message ||
          error ||
          "Erro desconhecido."
        )
      );

    }

    return true;

  }

}
