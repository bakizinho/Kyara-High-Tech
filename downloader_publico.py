#!/usr/bin/env python3

import argparse
import concurrent.futures
import html
import ipaddress
import json
import mimetypes
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import (
    parse_qs,
    quote_plus,
    unquote,
    urlencode,
    urljoin,
    urlsplit,
)

import urllib.request
import urllib.error


# ============================================================
# KYARA — LAZY YT-DLP
# ============================================================

_YTDLP_MODULE = None


def obter_yt_dlp():
    """
    Importa yt-dlp somente quando uma operação realmente
    precisar dele.

    Isso mantém caminhos como Rule34/HTML rápidos e evita
    carregar plugins externos durante a inicialização.

    Plugins externos ficam desativados por padrão para impedir
    que um plugin incompatível derrube o processo.
    """
    global _YTDLP_MODULE

    if _YTDLP_MODULE is not None:
        return _YTDLP_MODULE

    os.environ.setdefault(
        "YTDLP_NO_PLUGINS",
        "1"
    )

    try:
        import yt_dlp
    except ImportError as error:
        raise RuntimeError(
            "yt-dlp não está instalado. "
            "Instale com: pip install -U yt-dlp"
        ) from error

    _YTDLP_MODULE = yt_dlp

    return _YTDLP_MODULE


# ============================================================
# CONFIGURAÇÃO
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

OUTPUT = BASE_DIR / "downloads"
TMP = BASE_DIR / "tmp" / "downloader-publico"
SITES_FILE = BASE_DIR / "sites.json"
ARCHIVE = OUTPUT / ".download-archive.txt"
YTDLP_CACHE_DIR = BASE_DIR / "dados" / "data" / "yt-dlp-cache"

MAX_RESULTS = 10
WORKERS = 4

RETRIES = 4
FRAGMENT_RETRIES = 3
TIMEOUT = 30

USER_AGENT = (
    "Mozilla/5.0 (Linux; Android 16; Mobile) "
    "AppleWebKit/537.36 "
    "(KHTML, like Gecko) "
    "Chrome/140.0 Mobile Safari/537.36"
)

MEDIA_EXTENSIONS = {
    ".mp4",
    ".m4v",
    ".webm",
    ".mov",
    ".mkv",
    ".avi",
    ".flv",
    ".ogv",
    ".mp3",
    ".m4a",
    ".aac",
    ".ogg",
    ".opus",
    ".wav",
    ".flac",

    # Imagens também são mídia baixável diretamente.
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".avif",
    ".bmp",
}

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".avif",
    ".bmp",
}

VIDEO_EXTENSIONS = {
    ".mp4",
    ".m4v",
    ".webm",
    ".mov",
    ".mkv",
    ".avi",
    ".flv",
    ".ogv",
}

AUDIO_EXTENSIONS = {
    ".mp3",
    ".m4a",
    ".aac",
    ".ogg",
    ".opus",
    ".wav",
    ".flac",
}

IGNORE_EXTENSIONS = {
    ".json",
    ".part",
    ".description",
    ".vtt",
    ".srt",
    ".ass",
    ".lrc",
}


# ============================================================
# DIRETÓRIOS
# ============================================================

OUTPUT.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)


# ============================================================
# UTILIDADES
# ============================================================

def log(msg):
    print(
        f"[KYARA-DL] {msg}",
        file=sys.stderr,
        flush=True,
    )

def sanitizar_nome(nome):
    nome = str(nome or "arquivo")
    nome = html.unescape(nome)

    nome = re.sub(r'[\\/:*?"<>|]+', "_", nome)
    nome = re.sub(r"\s+", " ", nome).strip()

    if not nome:
        nome = "arquivo"

    return nome[:180]


def normalizar_url(url):
    if not url:
        return None

    url = str(url).strip()

    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url

    return url


def host_url(url):
    try:
        return (urlsplit(url).hostname or "").lower().strip(".")
    except Exception:
        return ""


def extensao_url(url):
    try:
        path = unquote(urlsplit(url).path)
        return Path(path).suffix.lower()
    except Exception:
        return ""


def eh_imagem_url(url):
    return extensao_url(url) in IMAGE_EXTENSIONS


def eh_video_url(url):
    return extensao_url(url) in VIDEO_EXTENSIONS


def eh_audio_url(url):
    return extensao_url(url) in AUDIO_EXTENSIONS


def tipo_por_url(url):
    ext = extensao_url(url)

    if ext in IMAGE_EXTENSIONS:
        return "image"

    if ext in VIDEO_EXTENSIONS:
        return "video"

    if ext in AUDIO_EXTENSIONS:
        return "audio"

    return "unknown"


def formatar_duracao(segundos):
    if segundos is None:
        return None

    try:
        segundos = int(float(segundos))
    except Exception:
        return None

    if segundos < 0:
        return None

    horas, resto = divmod(segundos, 3600)
    minutos, segundos = divmod(resto, 60)

    if horas:
        return f"{horas}:{minutos:02d}:{segundos:02d}"

    return f"{minutos}:{segundos:02d}"


# ============================================================
# VALIDAÇÃO DE URL
# ============================================================

def validar_url(url, permitir_privado=False):
    try:
        parsed = urlsplit(url)

        if parsed.scheme.lower() not in {"http", "https"}:
            return False, "protocolo não permitido"

        host = parsed.hostname

        if not host:
            return False, "host inválido"

        if permitir_privado:
            return True, None

        try:
            ip = ipaddress.ip_address(host)

            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            ):
                return False, "endereço privado/reservado"
        except ValueError:
            pass

        if host.lower() in {
            "localhost",
            "localhost.localdomain",
        }:
            return False, "localhost bloqueado"

        return True, None

    except Exception as e:
        return False, str(e)


# ============================================================
# CATÁLOGO DE SITES
# ============================================================

def carregar_sites():
    if not SITES_FILE.exists():
        return {}

    try:
        with open(SITES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, dict):
            return {}

        return data

    except Exception as e:
        log(f"⚠️ Erro lendo sites.json: {e}")
        return {}


def salvar_sites(sites):
    temp = SITES_FILE.with_suffix(".tmp")

    with open(temp, "w", encoding="utf-8") as f:
        json.dump(
            sites,
            f,
            ensure_ascii=False,
            indent=2,
        )

    temp.replace(SITES_FILE)


def adicionar_site(nome, url):
    nome = str(nome).strip().lower()
    url = normalizar_url(url)

    if not nome:
        raise ValueError("nome do site vazio")

    ok, erro = validar_url(url)

    if not ok:
        raise ValueError(f"URL inválida: {erro}")

    sites = carregar_sites()

    sites[nome] = {
        "nome": nome,
        "url": url.rstrip("/"),
        "host": host_url(url),
        "criado_em": int(time.time()),
    }

    salvar_sites(sites)

    return sites[nome]


def remover_site(nome):
    sites = carregar_sites()

    if nome not in sites:
        return False

    del sites[nome]
    salvar_sites(sites)

    return True


def obter_site(nome):
    sites = carregar_sites()
    return sites.get(str(nome).strip().lower())


# ============================================================
# HTTP
# ============================================================

def criar_request(url, headers=None):
    h = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }

    if headers:
        h.update(headers)

    return urllib.request.Request(
        url,
        headers=h,
        method="GET",
    )


def baixar_http_bytes(url, max_bytes=5 * 1024 * 1024):
    request = criar_request(url)

    with urllib.request.urlopen(
        request,
        timeout=TIMEOUT,
    ) as response:

        data = response.read(max_bytes + 1)

        if len(data) > max_bytes:
            raise ValueError("resposta HTML grande demais")

        final_url = response.geturl()
        content_type = response.headers.get("Content-Type", "")

        return data, final_url, content_type


def obter_html(url):
    data, final_url, content_type = baixar_http_bytes(
        url,
        max_bytes=8 * 1024 * 1024,
    )

    charset = "utf-8"

    match = re.search(
        rb"charset\s*=\s*[\"']?([a-zA-Z0-9_-]+)",
        data[:10000],
        re.I,
    )

    if match:
        try:
            charset = match.group(1).decode("ascii")
        except Exception:
            pass

    try:
        texto = data.decode(charset, errors="replace")
    except Exception:
        texto = data.decode("utf-8", errors="replace")

    return texto, final_url, content_type


# ============================================================
# EXTRAÇÃO DE MÍDIA DO HTML
# ============================================================

def extrair_atributo(tag, atributo):
    pattern = rf'{re.escape(atributo)}\s*=\s*["\']([^"\']+)["\']'

    match = re.search(
        pattern,
        tag,
        re.I,
    )

    return html.unescape(match.group(1).strip()) if match else None


def extrair_midias_html(url, texto):
    resultados = []
    vistos = set()

    def adicionar(media_url, tipo="unknown", titulo=None):
        if not media_url:
            return

        media_url = html.unescape(media_url.strip())

        if media_url.startswith("//"):
            media_url = "https:" + media_url

        media_url = urljoin(url, media_url)

        if not re.match(r"^https?://", media_url, re.I):
            return

        chave = media_url.split("#", 1)[0]

        if chave in vistos:
            return

        vistos.add(chave)

        if tipo == "unknown":
            tipo = tipo_por_url(media_url)

        resultados.append({
            "url": media_url,
            "tipo": tipo,
            "titulo": titulo,
        })

    # --------------------------------------------------------
    # <video src="">
    # --------------------------------------------------------

    for match in re.finditer(
        r"<video\b[^>]*>",
        texto,
        re.I,
    ):
        tag = match.group(0)

        src = extrair_atributo(tag, "src")
        poster = extrair_atributo(tag, "poster")

        adicionar(
            src,
            "video",
        )

        if poster:
            adicionar(
                poster,
                "image",
            )

    # --------------------------------------------------------
    # <source src="">
    # --------------------------------------------------------

    for match in re.finditer(
        r"<source\b[^>]*>",
        texto,
        re.I,
    ):
        tag = match.group(0)

        src = extrair_atributo(tag, "src")

        if src:
            tipo = tipo_por_url(src)

            if tipo == "unknown":
                tipo = "video"

            adicionar(
                src,
                tipo,
            )

    # --------------------------------------------------------
    # og:video
    # --------------------------------------------------------

    for match in re.finditer(
        r"<meta\b[^>]*(?:property|name)\s*=\s*[\"'](?:og:video(?::url)?|twitter:player:stream)[\"'][^>]*>",
        texto,
        re.I,
    ):
        tag = match.group(0)

        content = extrair_atributo(tag, "content")

        adicionar(
            content,
            "video",
        )

    # --------------------------------------------------------
    # og:image
    # --------------------------------------------------------

    for match in re.finditer(
        r"<meta\b[^>]*(?:property|name)\s*=\s*[\"'](?:og:image|twitter:image)[\"'][^>]*>",
        texto,
        re.I,
    ):
        tag = match.group(0)

        content = extrair_atributo(tag, "content")

        adicionar(
            content,
            "image",
        )

    # --------------------------------------------------------
    # JSON / scripts com URLs de mídia
    # --------------------------------------------------------

    padrao_media = re.compile(
        r"""https?://[^"'\\\s<>]+?\.(?:mp4|webm|m4v|mov|m3u8|mpd|jpg|jpeg|png|webp|gif|avif)(?:\?[^"'\\\s<>]*)?""",
        re.I,
    )

    for match in padrao_media.finditer(texto):
        media_url = match.group(0)

        tipo = tipo_por_url(media_url)

        if media_url.lower().endswith(".m3u8"):
            tipo = "hls"

        elif media_url.lower().endswith(".mpd"):
            tipo = "dash"

        adicionar(
            media_url,
            tipo,
        )

    # --------------------------------------------------------
    # URLs em JSON/players sem extensão.
    # --------------------------------------------------------

    padroes_sem_extensao = (
        (
            r'"(?:contentUrl|content_url|'
            r'videoUrl|video_url|videoURL|'
            r'playbackUrl|playback_url|'
            r'streamUrl|stream_url|'
            r'fileUrl|file_url)"'
            r'\s*:\s*"([^"]+)"',
            "video"
        ),

        (
            r'"(?:hlsUrl|hls_url)"'
            r'\s*:\s*"([^"]+)"',
            "hls"
        ),

        (
            r'"(?:dashUrl|dash_url)"'
            r'\s*:\s*"([^"]+)"',
            "dash"
        ),

        (
            r'"(?:imageUrl|image_url|'
            r'thumbnailUrl|thumbnail_url)"'
            r'\s*:\s*"([^"]+)"',
            "image"
        ),
    )


    for padrao, tipo in (
        padroes_sem_extensao
    ):

        for match in re.finditer(
            padrao,
            texto,
            re.I
        ):

            valor = (
                html.unescape(
                    match.group(1)
                )
                .replace(
                    r'\/',
                    '/'
                )
                .replace(
                    r'\u002F',
                    '/'
                )
                .replace(
                    r'\u0026',
                    '&'
                )
            )

            adicionar(
                valor,
                tipo
            )


    # --------------------------------------------------------
    # data-* de players.
    # --------------------------------------------------------

    for tag in re.findall(
        r'<(?:video|source|img)\b[^>]+>',
        texto,
        re.I
    ):

        for atributo in (
            "src",
            "data-src",
            "data-source",
            "data-url",
            "data-video",
            "data-video-url",
            "data-file",
            "data-playback",
            "data-stream",
            "poster",
        ):

            valor = extrair_atributo(
                tag,
                atributo
            )

            if not valor:
                continue


            if (
                atributo == "poster"
                or
                tag.lower().startswith(
                    "<img"
                )
            ):

                tipo = "image"

            else:

                tipo = "video"


            low = valor.lower()


            if "m3u8" in low:

                tipo = "hls"

            elif (
                ".mpd" in low
                or
                "dash" in low
            ):

                tipo = "dash"

            elif (
                extensao_url(valor)
                in AUDIO_EXTENSIONS
            ):

                tipo = "audio"

            elif (
                extensao_url(valor)
                in IMAGE_EXTENSIONS
            ):

                tipo = "image"


            adicionar(
                valor,
                tipo
            )


    return resultados


# ============================================================
# BUSCA GENÉRICA
# ============================================================

def extrair_links_busca_html(texto, dominio):
    resultados = []
    vistos = set()

    # Links normais
    for match in re.finditer(
        r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
        texto,
        re.I | re.S,
    ):
        href = html.unescape(match.group(1))
        titulo = re.sub(
            r"<[^>]+>",
            " ",
            match.group(2),
        )

        titulo = re.sub(
            r"\s+",
            " ",
            html.unescape(titulo),
        ).strip()

        if href.startswith("//"):
            href = "https:" + href

        if not href.startswith("http"):
            continue

        try:
            host = host_url(href)
        except Exception:
            continue

        if dominio and not (
            host == dominio
            or host.endswith("." + dominio)
        ):
            continue

        if href in vistos:
            continue

        vistos.add(href)

        resultados.append({
            "url": href,
            "titulo": titulo or href,
        })

    return resultados


def buscar_generico(site, consulta, limite=MAX_RESULTS):
    dominio = site["host"]

    # Busca pública por domínio.
    query = f"site:{dominio} {consulta}"

    url = (
        "https://html.duckduckgo.com/html/?"
        + urlencode({"q": query})
    )

    log(f"🔎 Busca genérica: {query}")

    texto, _, _ = obter_html(url)

    resultados = extrair_links_busca_html(
        texto,
        dominio,
    )

    resultados = resultados[:limite]

    final = []

    def enriquecer(item):
        try:
            pagina = item["url"]

            meta = analisar_url(
                pagina,
                titulo=item.get("titulo"),
            )

            return meta

        except Exception as e:
            log(f"⚠️ Falha metadata {item['url']}: {e}")
            return None

    with concurrent.futures.ThreadPoolExecutor(
        max_workers=WORKERS
    ) as executor:

        futures = [
            executor.submit(
                enriquecer,
                item,
            )
            for item in resultados
        ]

        for future in concurrent.futures.as_completed(futures):
            result = future.result()

            if result:
                final.append(result)

    return final[:limite]


# ============================================================
# YOUTUBE / YT-DLP SEARCH
# ============================================================

def buscar_ytdlp(consulta, limite=MAX_RESULTS):
    log(f"🔎 yt-dlp search: {consulta}")

    opcoes = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": True,
        "noplaylist": True,
    }

    with obter_yt_dlp().YoutubeDL(opcoes) as ydl:
        info = ydl.extract_info(
            f"ytsearch{limite}:{consulta}",
            download=False,
        )

    entradas = info.get("entries") or []

    resultados = []

    for item in entradas:
        if not item:
            continue

        url = item.get("webpage_url") or item.get("url")

        if not url:
            video_id = item.get("id")

            if video_id:
                url = (
                    "https://www.youtube.com/watch?v="
                    + video_id
                )

        if not url:
            continue

        video_id = item.get("id")

        thumbnail = (
            item.get("thumbnail")
            or (
                f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                if video_id
                else None
            )
        )

        resultados.append({
            "url": url,
            "id": video_id,
            "titulo": item.get("title") or "Sem título",
            "thumbnail": thumbnail,
            "duracao_segundos": item.get("duration"),
            "duracao": formatar_duracao(
                item.get("duration")
            ),
            "tipo": "video",
            "site": "youtube",
        })

    return resultados


# ============================================================
# ANÁLISE DE URL
# ============================================================

def analisar_url(url, titulo=None):
    url = normalizar_url(url)

    ok, erro = validar_url(url)

    if not ok:
        raise ValueError(erro)

    tipo = tipo_por_url(url)

    if tipo in {
        "image",
        "video",
        "audio",
    }:
        return {
            "url": url,
            "titulo": titulo or Path(
                unquote(urlsplit(url).path)
            ).name or "Mídia",
            "thumbnail": url if tipo == "image" else None,
            "tipo": tipo,
            "duracao": None,
            "duracao_segundos": None,
        }

    # --------------------------------------------------------
    # Tenta metadata pelo yt-dlp primeiro.
    # --------------------------------------------------------

    try:
        opcoes = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
        }

        with obter_yt_dlp().YoutubeDL(opcoes) as ydl:
            info = ydl.extract_info(
                url,
                download=False,
            )

        if info:
            if info.get("_type") == "playlist":
                entries = info.get("entries") or []

                if entries:
                    info = entries[0]

            duracao_segundos = info.get("duration")

            thumb = info.get("thumbnail")

            tipo_info = "video"

            if info.get("vcodec") in {
                None,
                "none",
            } and info.get("acodec") not in {
                None,
                "none",
            }:
                tipo_info = "audio"

            return {
                "url": info.get("webpage_url")
                or url,
                "titulo": (
                    info.get("title")
                    or titulo
                    or "Sem título"
                ),
                "thumbnail": thumb,
                "tipo": tipo_info,
                "duracao_segundos": duracao_segundos,
                "duracao": formatar_duracao(
                    duracao_segundos
                ),
                "site": host_url(url),
            }

    except Exception:
        pass

    # --------------------------------------------------------
    # Fallback HTML.
    # --------------------------------------------------------

    texto, final_url, content_type = obter_html(url)

    midias = extrair_midias_html(
        final_url,
        texto,
    )

    videos = [
        x for x in midias
        if x["tipo"] in {
            "video",
            "hls",
            "dash",
        }
    ]

    imagens = [
        x for x in midias
        if x["tipo"] == "image"
    ]

    if videos:
        video = videos[0]

        thumbnail = (
            imagens[0]["url"]
            if imagens
            else None
        )

        return {
            "url": video["url"],
            "pagina": final_url,
            "titulo": titulo or "Vídeo",
            "thumbnail": thumbnail,
            "tipo": "video",
            "duracao": None,
            "duracao_segundos": None,
            "site": host_url(final_url),
        }

    if imagens:
        imagem = imagens[0]

        return {
            "url": imagem["url"],
            "pagina": final_url,
            "titulo": titulo or "Imagem",
            "thumbnail": imagem["url"],
            "tipo": "image",
            "duracao": None,
            "duracao_segundos": None,
            "site": host_url(final_url),
        }

    return {
        "url": final_url,
        "titulo": titulo or final_url,
        "thumbnail": None,
        "tipo": "unknown",
        "duracao": None,
        "duracao_segundos": None,
        "site": host_url(final_url),
    }


# ============================================================
# BUSCA DO SITE
# ============================================================

def buscar_site(nome, consulta, limite=MAX_RESULTS):
    site = obter_site(nome)

    if not site:
        raise ValueError(
            f"site '{nome}' não está cadastrado"
        )

    host = site["host"]

    # --------------------------------------------------------
    # Adaptador automático do YouTube.
    # --------------------------------------------------------

    if (
        host == "youtube.com"
        or host.endswith(".youtube.com")
        or host == "youtu.be"
    ):
        return buscar_ytdlp(
            consulta,
            limite,
        )

    # --------------------------------------------------------
    # Demais sites:
    # busca pública por domínio + análise
    # --------------------------------------------------------

    return buscar_generico(
        site,
        consulta,
        limite,
    )


# ============================================================
# DOWNLOAD DIRETO
# ============================================================

def download_direto(url, destino, referer=None):
    log(f"🚀 Download direto: {url}")

    headers = {
        "Accept": "*/*",
    }

    if referer:
        headers["Referer"] = str(
            referer
        )

    request = criar_request(
        url,
        headers,
    )

    with urllib.request.urlopen(
        request,
        timeout=TIMEOUT,
    ) as response:

        content_type = (
            response.headers.get(
                "Content-Type",
                "",
            )
            .lower()
        )

        final_url = response.geturl()

        if "text/html" in content_type:
            raise ValueError(
                "servidor retornou HTML"
            )

        total = response.headers.get(
            "Content-Length"
        )

        total = int(total) if total and total.isdigit() else None

        recebido = 0

        with open(destino, "wb") as f:
            while True:
                bloco = response.read(
                    1024 * 1024
                )

                if not bloco:
                    break

                f.write(bloco)
                recebido += len(bloco)

        if recebido <= 0:
            raise ValueError(
                "arquivo vazio"
            )

        log(
            f"✅ Download direto: "
            f"{recebido / 1024 / 1024:.2f} MiB"
        )

    return destino


# ============================================================
# VALIDAÇÃO FFPROBE
# ============================================================

def validar_media(caminho):
    caminho = Path(caminho)

    if not caminho.exists():
        return False, None

    if caminho.stat().st_size <= 0:
        return False, None

    try:
        processo = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=format_name,duration,size",
                "-show_entries",
                "stream=codec_type,codec_name,width,height",
                "-of",
                "json",
                str(caminho),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if processo.returncode != 0:
            return False, None

        dados = json.loads(
            processo.stdout or "{}"
        )

        streams = dados.get(
            "streams",
            [],
        )

        tem_media = any(
            x.get("codec_type")
            in {
                "video",
                "audio",
            }
            for x in streams
        )

        if not tem_media:
            return False, None

        return True, dados

    except Exception:
        return False, None



def _ffmpeg_disponivel():

    try:

        return subprocess.run(
            [
                "ffmpeg",
                "-version"
            ],

            stdout=subprocess.DEVNULL,

            stderr=subprocess.DEVNULL,

            timeout=5,
        ).returncode == 0

    except Exception:

        return False



def _baixar_stream_ffmpeg(
    url,
    destino,
    referer=None
):

    if not _ffmpeg_disponivel():

        raise RuntimeError(
            "ffmpeg não disponível"
        )


    headers = (
        f"User-Agent: {USER_AGENT}\r\n"
    )


    if referer:

        headers += (
            f"Referer: {referer}\r\n"
        )


    processo = subprocess.run(

        [
            "ffmpeg",

            "-hide_banner",

            "-loglevel",
            "error",

            "-y",

            "-headers",
            headers,

            "-i",
            url,

            "-c",
            "copy",

            str(destino),
        ],

        stdout=subprocess.DEVNULL,

        stderr=subprocess.PIPE,

        text=True,

        timeout=max(
            TIMEOUT,
            120
        ),
    )


    destino = Path(
        destino
    )


    if (
        processo.returncode != 0
        or not destino.exists()
        or destino.stat().st_size <= 0
    ):

        raise RuntimeError(
            (
                processo.stderr
                or
                "ffmpeg falhou"
            ).strip()[-1200:]
        )


    return destino



def _baixar_midia_html_publica(
    url,
    pasta
):

    try:

        texto, final_url, _ = (
            obter_html(url)
        )

    except Exception as erro:

        log(
            f"⚠️ HTML adaptive: {erro}"
        )

        return None


    candidatos = (
        extrair_midias_html(
            final_url,
            texto
        )
    )


    if not candidatos:

        return None


    prioridade = {
        "video": 0,
        "hls": 1,
        "dash": 2,
        "audio": 3,
        "image": 4,
        "unknown": 9,
    }


    candidatos.sort(
        key=lambda x:
            prioridade.get(
                x.get("tipo"),
                9
            )
    )


    for item in candidatos[:40]:

        media_url = str(
            item.get("url")
            or
            ""
        ).strip()


        tipo = str(
            item.get("tipo")
            or
            "unknown"
        ).lower()


        if not media_url:
            continue


        try:

            ext = extensao_url(
                media_url
            )


            if tipo in {
                "hls",
                "dash"
            }:

                ext = ".mp4"


            elif not ext:

                ext = {
                    "video": ".mp4",
                    "audio": ".mp3",
                    "image": ".jpg",
                }.get(
                    tipo,
                    ".bin"
                )


            destino = (
                pasta /
                (
                    "kyara-html-"
                    f"{int(time.time() * 1000)}"
                    f"{ext}"
                )
            )


            if tipo in {
                "hls",
                "dash"
            }:

                arquivo = (
                    _baixar_stream_ffmpeg(
                        media_url,
                        destino,
                        final_url
                    )
                )

            else:

                arquivo = (
                    download_direto(
                        media_url,
                        destino,
                        referer=final_url
                    )
                )


            ok, _ = (
                validar_media(
                    arquivo
                )
            )


            if ok:

                log(
                    "✅ HTML adaptive encontrou "
                    f"{tipo}: {media_url}"
                )

                return Path(
                    arquivo
                )


        except Exception as erro:

            log(
                "⚠️ candidato HTML falhou: "
                f"{erro}"
            )


    return None


# ============================================================
# DOWNLOAD VIA YT-DLP
# ============================================================

def _tem_curl_cffi():
    try:
        import curl_cffi
        return True
    except Exception:
        return False


def criar_opcoes_ytdlp(pasta, url=None):
    return {
        "format": (
            "bv*+ba/"
            "b"
        ),

        "outtmpl": str(
            pasta / "%(title).150B [%(id)s].%(ext)s"
        ),

        "noplaylist": True,

        "continuedl": True,

        "retries": max(RETRIES, 8),
        "fragment_retries": max(FRAGMENT_RETRIES, 8),
        "file_access_retries": max(RETRIES, 8),

        "socket_timeout": max(TIMEOUT, 45),

        "extractor_retries": 3,

        "concurrent_fragment_downloads": 4,

                "buffersize": 1024 * 1024,

        "cachedir": str(YTDLP_CACHE_DIR),

        # Impersonation automático DESATIVADO.
        #
        # O ambiente atual do Termux está apresentando
        # incompatibilidade entre yt-dlp/curl_cffi ao
        # transformar "chrome" em ImpersonateTarget.
        #
        # O yt-dlp continua usando seus handlers normais.

        **(
            {
                "cookiefile": (
                    os.environ.get(
                        "REDDIT_COOKIES_FILE"
                    )
                    or str(
                        BASE_DIR /
                        "dados" /
                        "data" /
                        "reddit-cookies.txt"
                    )
                )
            }
            if (
                url
                and (
                    urlsplit(url).hostname
                    or ""
                ).lower().strip(".") in {
                    "reddit.com",
                    "www.reddit.com",
                    "old.reddit.com",
                }
                and Path(
                    os.environ.get(
                        "REDDIT_COOKIES_FILE"
                    )
                    or str(
                        BASE_DIR /
                        "dados" /
                        "data" /
                        "reddit-cookies.txt"
                    )
                ).is_file()
            )
            else {}
        ),

        "restrictfilenames": False,

        "overwrites": False,

        "quiet": True,

        "no_warnings": False,

        "ignoreerrors": False,

        "http_headers": {
            "User-Agent": USER_AGENT,
        },

        "merge_output_format": "mp4",

        "writethumbnail": False,
        "writeinfojson": False,

    }



def _reddit_host_permitido(url):
    try:
        host = (
            urlsplit(url).hostname or ""
        ).lower().strip(".")
    except Exception:
        return False

    return host in {
        "i.redd.it",
        "v.redd.it",
        "preview.redd.it",
        "external-preview.redd.it",
        "external-i.redd.it",
    }


def _reddit_normalizar_url(valor):
    if not valor:
        return ""

    valor = html.unescape(
        str(valor)
    ).strip()

    valor = (
        valor
        .replace("\\/", "/")
        .replace("\\u002F", "/")
        .replace("\\u0026", "&")
        .replace("&amp;", "&")
    )

    if not re.match(
        r"^https?://",
        valor,
        re.I
    ):
        return ""

    return valor


def _reddit_extrair_midia_html(texto):
    videos = []
    imagens = []

    # Meta tags.
    for tag in re.findall(
        r"<meta\b[^>]*>",
        texto,
        flags=re.I | re.S
    ):

        atributo = re.search(
            r'(?:property|name)\s*=\s*["\']([^"\']+)["\']',
            tag,
            flags=re.I
        )

        conteudo = re.search(
            r'content\s*=\s*["\']([^"\']+)["\']',
            tag,
            flags=re.I
        )

        if not atributo or not conteudo:
            continue

        nome = (
            atributo.group(1)
            .strip()
            .lower()
        )

        valor = _reddit_normalizar_url(
            conteudo.group(1)
        )

        if not valor:
            continue

        if nome in {
            "og:video",
            "og:video:url",
            "og:video:secure_url",
            "twitter:player:stream",
        }:
            videos.append(valor)

        elif nome in {
            "og:image",
            "og:image:url",
            "og:image:secure_url",
            "twitter:image",
            "twitter:image:src",
        }:
            imagens.append(valor)

    # JSON embutido.
    padroes = [
        r'"fallback_url"\s*:\s*"([^"]+)"',
        r'"fallbackUrl"\s*:\s*"([^"]+)"',
        r'"dash_url"\s*:\s*"([^"]+)"',
        r'"dashUrl"\s*:\s*"([^"]+)"',
        r'"hls_url"\s*:\s*"([^"]+)"',
        r'"hlsUrl"\s*:\s*"([^"]+)"',
    ]

    for padrao in padroes:

        for encontrado in re.findall(
            padrao,
            texto,
            flags=re.I
        ):

            valor = _reddit_normalizar_url(
                encontrado
            )

            if valor:
                videos.append(valor)

    # CDN Reddit explícito.
    cdns = re.findall(
        r'https?://(?:'
        r'v\.redd\.it|'
        r'i\.redd\.it|'
        r'preview\.redd\.it|'
        r'external-preview\.redd\.it|'
        r'external-i\.redd\.it'
        r')[^"\'<>\s\\]+',
        texto,
        flags=re.I
    )

    for encontrado in cdns:

        valor = _reddit_normalizar_url(
            encontrado
        )

        if not valor:
            continue

        if (
            "v.redd.it"
            in valor.lower()
        ):
            videos.append(valor)
        else:
            imagens.append(valor)

    def unique(lista):
        saida = []
        vistos = set()

        for item in lista:

            item = item.strip()

            if not item:
                continue

            if item in vistos:
                continue

            vistos.add(item)
            saida.append(item)

        return saida

    return (
        unique(videos),
        unique(imagens)
    )


def tentar_baixar_reddit_html(url, pasta):
    try:

        host = host_url(url)

        if host not in {
            "reddit.com",
            "www.reddit.com",
        }:
            return None

        log(
            f"🌐 Reddit HTML PRIME: {url}"
        )

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent":
                    USER_AGENT,
                "Accept":
                    "text/html,application/xhtml+xml",
                "Accept-Language":
                    "pt-BR,pt;q=0.9,en;q=0.8",
            }
        )

        with urllib.request.urlopen(
            request,
            timeout=20
        ) as resposta:

            corpo = resposta.read(
                4 * 1024 * 1024
            )

            charset = (
                resposta.headers.get_content_charset()
                or "utf-8"
            )

        texto = corpo.decode(
            charset,
            errors="replace"
        )

        log(
            f"✅ Reddit HTML: {len(corpo)} bytes"
        )

        videos, imagens = (
            _reddit_extrair_midia_html(
                texto
            )
        )

        candidatos = []

        for item in videos:

            if _reddit_host_permitido(item):
                candidatos.append(
                    ("video", item)
                )

        for item in imagens:

            if _reddit_host_permitido(item):
                candidatos.append(
                    ("image", item)
                )

        vistos = set()

        for tipo, origem in candidatos:

            if origem in vistos:
                continue

            vistos.add(origem)

            try:

                ext = extensao_url(
                    origem
                )

                if not ext:
                    ext = (
                        ".mp4"
                        if tipo == "video"
                        else ".jpg"
                    )

                destino = (
                    pasta /
                    (
                        "reddit-" +
                        str(
                            int(
                                time.time() * 1000
                            )
                        ) +
                        ext
                    )
                )

                log(
                    f"⬇️ Reddit {tipo}: {origem}"
                )

                arquivo = download_direto(
                    origem,
                    destino
                )

                if not arquivo:
                    continue

                caminho = Path(
                    arquivo
                )

                if (
                    caminho.exists()
                    and caminho.is_file()
                    and caminho.stat().st_size > 0
                ):

                    log(
                        "✅ Reddit mídia pronta: "
                        f"{caminho}"
                    )

                    return caminho

            except Exception as erro:

                log(
                    "⚠️ Reddit candidato: "
                    f"{erro}"
                )

        return None

    except urllib.error.HTTPError as erro:

        log(
            f"⚠️ Reddit HTML HTTP {erro.code}"
        )

        return None

    except Exception as erro:

        log(
            f"⚠️ Reddit HTML: {erro}"
        )

        return None


def baixar_ytdlp(url, pasta):

    # ------------------------------------------------------
    # URL que já aponta diretamente para um arquivo.
    # ------------------------------------------------------

    if (
        extensao_url(url)
        in MEDIA_EXTENSIONS
    ):

        log(
            f"⚡ Mídia direta: {url}"
        )

        ext = (
            extensao_url(url)
            or ".bin"
        )

        destino = (
            pasta /
            (
                "kyara-direct-" +
                str(
                    int(
                        time.time() * 1000
                    )
                ) +
                ext
            )
        )

        arquivo = download_direto(
            url,
            destino
        )

        if arquivo:

            caminho = Path(
                arquivo
            )

            if (
                caminho.exists()
                and caminho.is_file()
                and caminho.stat().st_size > 0
            ):

                return [caminho]

    # ------------------------------------------------------
    # Reddit PRIME.
    # ------------------------------------------------------

    reddit = (
        host_url(url)
        in {
            "reddit.com",
            "www.reddit.com",
            "old.reddit.com",
        }
    )

    if reddit:

        direto = (
            tentar_baixar_reddit_html(
                url,
                pasta
            )
        )

        if direto:
            return [direto]

    log(
        f"⬇️ yt-dlp: {url}"
    )

    opcoes = criar_opcoes_ytdlp(
        pasta,
        url
    )

    with obter_yt_dlp().YoutubeDL(opcoes) as ydl:
        ydl.download([url])

    arquivos = []

    for arquivo in pasta.rglob("*"):
        if not arquivo.is_file():
            continue

        if arquivo.suffix.lower() in IGNORE_EXTENSIONS:
            continue

        if arquivo.stat().st_size <= 0:
            continue

        arquivos.append(arquivo)

    if not arquivos:
        raise RuntimeError(
            "yt-dlp terminou sem gerar mídia"
        )

    return arquivos


# ============================================================
# DOWNLOAD UNIVERSAL
# ============================================================

def baixar(url):
    url = normalizar_url(url)

    ok, erro = validar_url(url)

    if not ok:
        raise ValueError(
            f"URL recusada: {erro}"
        )

    inicio = time.time()

    log("=" * 60)
    log(f"DOWNLOAD: {url}")

    ext = extensao_url(url)

    # --------------------------------------------------------
    # 1. ARQUIVO DIRETO
    # --------------------------------------------------------

    if (
        ext in MEDIA_EXTENSIONS
        and not ext in {
            ".m3u8",
            ".mpd",
        }
    ):
        try:
            pasta = Path(
                tempfile.mkdtemp(
                    prefix="direto-",
                    dir=TMP,
                )
            )

            nome = (
                Path(
                    unquote(
                        urlsplit(url).path
                    )
                ).name
                or f"kyara-{int(time.time())}{ext}"
            )

            nome = sanitizar_nome(
                nome
            )

            destino = pasta / nome

            arquivo = download_direto(
                url,
                destino,
            )

            valido, probe = validar_media(
                arquivo
            )

            if valido:
                final = OUTPUT / arquivo.name

                shutil.move(
                    str(arquivo),
                    str(final),
                )

                shutil.rmtree(
                    pasta,
                    ignore_errors=True,
                )

                return {
                    "ok": True,
                    "arquivo": str(final),
                    "url": url,
                    "tipo": tipo_por_url(url),
                    "probe": probe,
                    "tempo": round(
                        time.time() - inicio,
                        2,
                    ),
                }

            shutil.rmtree(
                pasta,
                ignore_errors=True,
            )

            log(
                "⚠️ Arquivo direto não passou no FFprobe."
            )

        except Exception as e:
            log(
                f"⚠️ Direto falhou: {e}"
            )

            try:
                shutil.rmtree(
                    pasta,
                    ignore_errors=True,
                )
            except Exception:
                pass

    # --------------------------------------------------------
    # 2. HTML / PLAYER ADAPTIVE
    # --------------------------------------------------------

    pasta = Path(
        tempfile.mkdtemp(
            prefix="html-",
            dir=TMP,
        )
    )

    try:

        arquivo_html = (
            _baixar_midia_html_publica(
                url,
                pasta,
            )
        )


        if arquivo_html:

            valido, probe = (
                validar_media(
                    arquivo_html
                )
            )


            if valido:

                final = (
                    OUTPUT /
                    sanitizar_nome(
                        arquivo_html.name
                    )
                )


                if final.exists():

                    final = (
                        OUTPUT /
                        (
                            f"{final.stem}-"
                            f"{int(time.time())}"
                            f"{final.suffix}"
                        )
                    )


                shutil.move(
                    str(arquivo_html),
                    str(final)
                )


                return {
                    "ok": True,
                    "arquivo": str(final),
                    "url": url,
                    "tipo": tipo_por_url(
                        str(final)
                    ),
                    "probe": probe,
                    "tempo": round(
                        time.time() - inicio,
                        2
                    ),
                }

    finally:

        shutil.rmtree(
            pasta,
            ignore_errors=True
        )


    # --------------------------------------------------------
    # 3. YT-DLP
    # --------------------------------------------------------

    pasta = Path(
        tempfile.mkdtemp(
            prefix="ytdlp-",
            dir=TMP,
        )
    )

    try:
        arquivos = baixar_ytdlp(
            url,
            pasta,
        )

        validos = []

        for arquivo in arquivos:
            valido, probe = validar_media(
                arquivo
            )

            if valido:
                validos.append(
                    (
                        arquivo,
                        probe,
                    )
                )

        if not validos:
            raise RuntimeError(
                "nenhum arquivo de mídia válido"
            )

        arquivo, probe = validos[0]

        final = OUTPUT / sanitizar_nome(
            arquivo.name
        )

        if final.exists():
            final = OUTPUT / (
                f"{final.stem}-"
                f"{int(time.time())}"
                f"{final.suffix}"
            )

        shutil.move(
            str(arquivo),
            str(final),
        )

        return {
            "ok": True,
            "arquivo": str(final),
            "url": url,
            "tipo": (
                "video"
                if any(
                    x.get("codec_type")
                    == "video"
                    for x in probe.get(
                        "streams",
                        [],
                    )
                )
                else "audio"
            ),
            "probe": probe,
            "tempo": round(
                time.time() - inicio,
                2,
            ),
        }

    finally:
        shutil.rmtree(
            pasta,
            ignore_errors=True,
        )


# ============================================================
# JSON
# ============================================================

def imprimir_json(data):
    print(
        "@@KYARA_JSON@@" +
        json.dumps(
            data,
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        flush=True,
    )


# ============================================================
# CLI
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Kyara Universal Downloader"
        )
    )

    sub = parser.add_subparsers(
        dest="comando"
    )

    # --------------------------------------------------------
    # siteadd
    # --------------------------------------------------------

    p_siteadd = sub.add_parser(
        "siteadd"
    )

    p_siteadd.add_argument(
        "nome"
    )

    p_siteadd.add_argument(
        "url"
    )

    # --------------------------------------------------------
    # sites
    # --------------------------------------------------------

    sub.add_parser(
        "sites"
    )

    # --------------------------------------------------------
    # siteremove
    # --------------------------------------------------------

    p_siteremove = sub.add_parser(
        "siteremove"
    )

    p_siteremove.add_argument(
        "nome"
    )

    # --------------------------------------------------------
    # search
    # --------------------------------------------------------

    p_search = sub.add_parser(
        "search"
    )

    p_search.add_argument(
        "site"
    )

    p_search.add_argument(
        "consulta",
        nargs="+",
    )

    p_search.add_argument(
        "--limit",
        type=int,
        default=MAX_RESULTS,
    )

    # --------------------------------------------------------
    # analyze
    # --------------------------------------------------------

    p_analyze = sub.add_parser(
        "analyze"
    )

    p_analyze.add_argument(
        "url"
    )

    # --------------------------------------------------------
    # download
    # --------------------------------------------------------

    p_download = sub.add_parser(
        "download"
    )

    p_download.add_argument(
        "url"
    )

    args = parser.parse_args()

    # ========================================================
    # SITEADD
    # ========================================================

    if args.comando == "siteadd":
        try:
            resultado = adicionar_site(
                args.nome,
                args.url,
            )

            print(
                "✅ Cadastrado"
            )

            imprimir_json(
                resultado
            )

            return

        except Exception as e:
            print(
                f"❌ Erro: {e}"
            )

            sys.exit(1)

    # ========================================================
    # SITES
    # ========================================================

    if args.comando == "sites":
        sites = carregar_sites()

        if not sites:
            print(
                "📭 Nenhum site cadastrado."
            )
            return

        for nome, site in sites.items():
            print(
                f"🌐 {nome} → {site['url']}"
            )

        return

    # ========================================================
    # SITEREMOVE
    # ========================================================

    if args.comando == "siteremove":
        if remover_site(args.nome):
            print(
                f"✅ Site removido: {args.nome}"
            )
        else:
            print(
                f"❌ Site não encontrado: {args.nome}"
            )

        return

    # ========================================================
    # SEARCH
    # ========================================================

    if args.comando == "search":
        consulta = " ".join(
            args.consulta
        ).strip()

        try:
            resultados = buscar_site(
                args.site,
                consulta,
                max(
                    1,
                    min(
                        args.limit,
                        20,
                    )
                ),
            )

            imprimir_json(
                {
                    "ok": True,
                    "site": args.site,
                    "consulta": consulta,
                    "total": len(resultados),
                    "resultados": resultados,
                }
            )

        except Exception as e:
            imprimir_json(
                {
                    "ok": False,
                    "erro": str(e),
                }
            )

            sys.exit(1)

        return

    # ========================================================
    # ANALYZE
    # ========================================================

    if args.comando == "analyze":
        try:
            resultado = analisar_url(
                args.url
            )

            imprimir_json(
                resultado
            )

        except Exception as e:
            imprimir_json(
                {
                    "ok": False,
                    "erro": str(e),
                }
            )

            sys.exit(1)

        return

    # ========================================================
    # DOWNLOAD
    # ========================================================

    if args.comando == "download":
        try:
            resultado = baixar(
                args.url
            )

            imprimir_json(
                resultado
            )

        except Exception as e:
            import traceback

            detalhe = (
                str(e).strip()
                or repr(e)
                or e.__class__.__name__
            )

            imprimir_json(
                {
                    "ok": False,
                    "erro": detalhe,
                    "tipo_erro": e.__class__.__name__,
                    "detalhes": (
                        traceback.format_exc()
                    ),
                }
            )

            sys.exit(1)

        return

    parser.print_help()


if __name__ == "__main__":
    main()
