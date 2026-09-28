import os
from pathlib import Path
from html import unescape
import json
import os
import re
import sys
import tempfile
import time
from urllib.parse import urljoin, urlparse, quote_plus
from concurrent.futures import ThreadPoolExecutor, as_completed


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


import requests
from bs4 import BeautifulSoup


# ============================================================
# YT-DLP LAZY LOADER
# ============================================================

_YTDLP_MODULE = None


def obter_yt_dlp():
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


BASE_DIR = Path(__file__).resolve().parent

ARQUIVO_SITES = BASE_DIR / "sites_videos.json"
ARQUIVO_SESSAO = BASE_DIR / "downloads_session.json"
PASTA_DOWNLOAD = BASE_DIR / "tmp" / "kyara-downloads"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Linux; Android 13) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/139.0 Mobile Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}

DOMINIOS_PERMITIDOS = {
    # Geral
    "youtube.com",
    "youtu.be",
    "tiktok.com",
    "instagram.com",
    "facebook.com",
    "vimeo.com",
    "dailymotion.com",
    "reddit.com",
    "twitch.tv",
    "streamable.com",
    "9gag.com",
    "ted.com",
    "x.com",
    "twitter.com",
    "bilibili.com",
    "vk.com",
    "tumblr.com",
    "soundcloud.com",
    "mixcloud.com",
    "bandcamp.com",
    "archive.org",
    "wikimedia.org",
    "vocaroo.com",

    # +18
    "eporner.com",
    "eroprofile.com",
    "pornbox.com",
    "pornerbros.com",
    "pornflip.com",
    "pornotube.com",
    "porntop.com",
    "pornhub.com",
    "redgifs.com",
    "redtube.com",
    "spankbang.com",
    "stripchat.com",
    "sunporno.com",
    "thisvid.com",
    "tnaflix.com",
    "drtuber.com",
    "4tube.com",
    "alphaporno.com",
    "xhamster.com",
    "xnxx.com",
    "xvideos.com",
    "xxxymovies.com",
    "youjizz.com",
    "youporn.com",

    # Hentai / anime 18+
    "hentaimama.io",
    "hstream.moe",
    "oppai.stream",
    "hentaihaven.com",
    "hanime.tv",
    "ohentai.org",
    "hanime.red",
}


def _dominios_catalogo():
    dominios = set(
        DOMINIOS_PERMITIDOS
    )

    try:

        dados = json.loads(
            Path(
                ARQUIVO_SITES
            ).read_text(
                encoding="utf-8"
            )
        )


        if isinstance(
            dados,
            dict
        ):

            for item in (
                dados.values()
            ):

                if not isinstance(
                    item,
                    dict
                ):
                    continue


                host = str(
                    item.get("host")
                    or
                    ""
                ).lower().strip(".")


                if not host:

                    raw = str(
                        item.get("url")
                        or
                        item.get("origem")
                        or
                        ""
                    ).strip()


                    host = (
                        urlparse(
                            raw
                        ).hostname
                        or
                        ""
                    ).lower().strip(".")


                if host:

                    dominios.add(
                        host
                    )


    except Exception:
        pass


    return dominios



def dominio_permitido(url):

    try:

        host = (
            urlparse(
                normalizar_url(url)
            ).hostname
            or
            ""
        ).lower().strip(".")


        permitidos = (
            _dominios_catalogo()
        )


        return any(
            host == dominio
            or
            host.endswith(
                "." + dominio
            )

            for dominio
            in permitidos
        )


    except Exception:

        return False


ULTIMA_PESQUISA = {}
ULTIMO_SITE = None


def carregar_sessao():
    global ULTIMA_PESQUISA
    global ULTIMO_SITE

    try:
        caminho = Path(ARQUIVO_SESSAO)

        if not caminho.exists():
            return

        dados = json.loads(
            caminho.read_text(
                encoding="utf-8"
            )
        )

        if not isinstance(dados, dict):
            return

        pesquisas = dados.get(
            "pesquisas",
            {}
        )

        ultimo_site = dados.get(
            "ultimo_site"
        )

        if isinstance(pesquisas, dict):
            ULTIMA_PESQUISA = pesquisas

        if isinstance(
            ultimo_site,
            str
        ):
            ULTIMO_SITE = ultimo_site

    except Exception as erro:
        print(
            f"[SESSAO] Erro ao carregar: {erro}"
        )


def salvar_sessao():
    try:
        Path(
            ARQUIVO_SESSAO
        ).write_text(
            json.dumps(
                {
                    "ultimo_site": ULTIMO_SITE,
                    "pesquisas": ULTIMA_PESQUISA,
                },
                ensure_ascii=False,
                indent=2
            ),
            encoding="utf-8"
        )

    except Exception as erro:
        print(
            f"[SESSAO] Erro ao salvar: {erro}"
        )


carregar_sessao()


def carregar_sites():
    if not os.path.exists(ARQUIVO_SITES):
        return {}

    try:
        with open(ARQUIVO_SITES, "r", encoding="utf-8") as f:
            dados = json.load(f)

        return dados if isinstance(dados, dict) else {}

    except Exception as erro:
        print(f"[SITES] Erro: {erro}")
        return {}


def salvar_sites(sites):
    with open(ARQUIVO_SITES, "w", encoding="utf-8") as f:
        json.dump(sites, f, ensure_ascii=False, indent=2)


def normalizar_url(url):
    v = str(url or "").strip()

    if not re.match(
        r"^https?://",
        v,
        re.I
    ):
        v = "https://" + v

    return v.rstrip("/")


SITES_BLOQUEADOS_MANUALMENTE = BASE_DIR / "sites_bloqueados.json"


def carregar_bloqueios_manuais():
    if not SITES_BLOQUEADOS_MANUALMENTE.exists():
        return []

    try:
        import json
        dados = json.loads(
            SITES_BLOQUEADOS_MANUALMENTE.read_text(
                encoding="utf-8"
            )
        )

        if isinstance(dados, list):
            return [
                str(x).strip().lower()
                for x in dados
                if str(x).strip()
            ]

    except Exception:
        pass

    return []


def salvar_bloqueios_manuais(lista):
    import json

    lista = sorted(
        set(
            str(x).strip().lower()
            for x in lista
            if str(x).strip()
        )
    )

    SITES_BLOQUEADOS_MANUALMENTE.write_text(
        json.dumps(
            lista,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )


def dominio_normalizado(valor):
    valor = str(valor or "").strip().lower()

    if not valor:
        return ""

    try:
        if "://" not in valor:
            valor = "https://" + valor

        host = urlparse(valor).hostname or ""

        return host.lower().removeprefix("www.")

    except Exception:
        return ""


def site_bloqueado_manualmente(url):
    dominio = dominio_normalizado(url)

    if not dominio:
        return False

    bloqueados = carregar_bloqueios_manuais()

    return any(
        dominio == bloqueado
        or dominio.endswith("." + bloqueado)
        for bloqueado in bloqueados
    )


def bloquear_site_manual(url):
    dominio = dominio_normalizado(url)

    if not dominio:
        return {
            "ok": False,
            "erro": "Domínio inválido."
        }

    bloqueados = carregar_bloqueios_manuais()

    if dominio not in bloqueados:
        bloqueados.append(dominio)
        salvar_bloqueios_manuais(bloqueados)

    return {
        "ok": True,
        "dominio": dominio
    }


def desbloquear_site_manual(url):
    dominio = dominio_normalizado(url)

    if not dominio:
        return {
            "ok": False,
            "erro": "Domínio inválido."
        }

    bloqueados = carregar_bloqueios_manuais()

    encontrados = [
        item
        for item in bloqueados
        if item == dominio
        or dominio.endswith("." + item)
    ]

    if not encontrados:
        return {
            "ok": False,
            "erro": f"{dominio} não está na lista de bloqueios manuais."
        }

    bloqueados = [
        item
        for item in bloqueados
        if item not in encontrados
    ]

    salvar_bloqueios_manuais(bloqueados)

    return {
        "ok": True,
        "dominio": dominio,
        "removidos": encontrados
    }


TERMOS_SITE_BLOQUEADOS = (
)


def url_bloqueada(url):
    if site_bloqueado_manualmente(url):
        return True

    v = str(
        url or ""
    ).lower()

    try:
        p = urlparse(v)

        alvo = (
            f"{p.hostname or ''} "
            f"{p.path or ''} "
            f"{p.query or ''}"
        )

    except Exception:
        alvo = v

    return any(
        termo in alvo
        for termo in TERMOS_SITE_BLOQUEADOS
    )


def resolver_url_final(url):
    original = normalizar_url(url)

    if url_bloqueada(original):
        return None

    try:
        resposta = requests.get(
            original,
            headers=HEADERS,
            timeout=15,
            allow_redirects=True,
            stream=True
        )

        final = normalizar_url(
            resposta.url
            or original
        )

        try:
            resposta.close()
        except Exception:
            pass

        if url_bloqueada(final):
            return None

        return final

    except requests.RequestException:
        return original


def adicionar_site(nome, url):
    """
    Cadastra manualmente um site informado pelo dono.

    O dono escolhe quais sites públicos quer adicionar.
    A URL ainda precisa ser válida e resolvível.
    """

    nome = str(nome or "").strip().lower()
    original = normalizar_url(url)

    if not nome:
        return {
            "ok": False,
            "erro": "Informe um nome para o site."
        }

    if not original:
        return {
            "ok": False,
            "erro": "URL inválida."
        }

    # Mantém somente a proteção obrigatória para conteúdo
    # adulto/sexual; não exige whitelist de domínios.
    if url_bloqueada(original):
        return {
            "ok": False,
            "erro": "Este domínio não pode ser cadastrado."
        }

    try:
        final = resolver_url_final(original)
    except Exception as exc:
        return {
            "ok": False,
            "erro": f"Não foi possível resolver a URL: {exc}"
        }

    if not final:
        return {
            "ok": False,
            "erro": "A URL não pôde ser resolvida."
        }

    if url_bloqueada(final):
        return {
            "ok": False,
            "erro": "A URL final não pode ser cadastrada."
        }

    host = urlparse(final).hostname or ""

    sites = carregar_sites()

    sites[nome] = {
        "url": final,
        "origem": original,
        "hostname": host
    }

    salvar_sites(sites)

    return {
        "ok": True,
        "nome": nome,
        "url": final,
        "hostname": host
    }

def remover_site(nome):
    nome = nome.strip().lower()
    sites = carregar_sites()

    if nome not in sites:
        return f"❌ Site '{nome}' não está cadastrado."

    del sites[nome]
    salvar_sites(sites)

    ULTIMA_PESQUISA.pop(nome, None)

    return f"✅ Site '{nome}' removido."


def listar_sites():
    sites = carregar_sites()

    if not sites:
        return "📭 Nenhum site cadastrado."

    linhas = [
        "🌸 SITES CADASTRADOS",
        ""
    ]

    for nome, dados in sites.items():
        linhas.append(
            f"• {nome} → {dados.get('url', '')}"
        )

    return "\n".join(linhas)


def mesma_origem(base, url):
    try:
        a = urlparse(base).netloc.lower()
        b = urlparse(url).netloc.lower()

        return (
            a == b
            or b.endswith("." + a)
        )

    except Exception:
        return False


def obter_pagina(url):
    try:
        resposta = requests.get(
            url,
            headers=HEADERS,
            timeout=20,
            allow_redirects=True
        )

        if resposta.status_code != 200:
            print(
                f"[HTTP] {resposta.status_code}: {url}"
            )
            return None

        if not resposta.text:
            return None

        return resposta

    except requests.RequestException as erro:
        print(f"[HTTP] Erro: {erro}")
        return None


def encontrar_forms(soup):
    forms = []

    for form in soup.find_all("form"):
        action = form.get("action") or ""
        method = (
            form.get("method") or "get"
        ).lower()

        campos = []

        for campo in form.find_all(
            ["input", "textarea", "select"]
        ):
            nome = (
                campo.get("name")
                or campo.get("id")
                or ""
            ).strip()

            tipo = (
                campo.get("type")
                or ""
            ).lower()

            placeholder = (
                campo.get("placeholder")
                or ""
            ).lower()

            if nome:
                campos.append({
                    "nome": nome,
                    "tipo": tipo,
                    "placeholder": placeholder,
                    "valor": campo.get("value", ""),
                })

        forms.append({
            "action": action,
            "method": method,
            "campos": campos,
        })

    return forms


def campo_parece_busca(campo):
    nome = campo["nome"].lower()
    placeholder = campo["placeholder"].lower()

    palavras = (
        "search",
        "query",
        "keyword",
        "term",
        "title",
        "name",
        "pesquisa",
        "pesquisar",
        "busca",
        "buscar",
        "consulta",
    )

    return any(
        palavra in nome
        or palavra in placeholder
        for palavra in palavras
    )


def executar_form(base, form, termo):
    campos = form["campos"]

    candidatos = [
        campo
        for campo in campos
        if campo_parece_busca(campo)
        and campo["tipo"] not in (
            "submit",
            "button",
            "hidden",
        )
    ]

    if not candidatos:
        candidatos = [
            campo
            for campo in campos
            if campo["tipo"] not in (
                "submit",
                "button",
                "hidden",
            )
        ]

    if not candidatos:
        return None

    campo_busca = candidatos[0]["nome"]

    dados = {}

    for campo in campos:
        nome = campo["nome"]
        tipo = campo["tipo"]

        if tipo in (
            "submit",
            "button",
            "file",
        ):
            continue

        if nome == campo_busca:
            dados[nome] = termo

        elif campo["valor"]:
            dados[nome] = campo["valor"]

    action = urljoin(
        base + "/",
        form["action"]
    )

    try:
        if form["method"] == "post":
            resposta = requests.post(
                action,
                data=dados,
                headers=HEADERS,
                timeout=20,
                allow_redirects=True
            )
        else:
            resposta = requests.get(
                action,
                params=dados,
                headers=HEADERS,
                timeout=20,
                allow_redirects=True
            )

        if resposta.status_code != 200:
            return None

        return resposta

    except requests.RequestException as erro:
        print(f"[FORM] Erro: {erro}")
        return None


# Palavras que normalmente indicam páginas
# institucionais, e não vídeos.
PALAVRAS_BLOQUEADAS = {
    "dmca",
    "terms",
    "termsofuse",
    "privacy",
    "privacidade",
    "policy",
    "copyright",
    "contact",
    "contato",
    "login",
    "signin",
    "signup",
    "register",
    "account",
    "accounts",
    "support",
    "help",
    "faq",
    "about",
    "information",
    "legal",
    "logout",
}



def parece_conteudo(titulo, url, termo):
    titulo = normalizar_titulo(titulo)
    titulo_lower = titulo.lower()
    url_lower = (url or "").lower()
    parsed = urlparse(url)

    if not titulo:
        return False

    if not url_lower.startswith(
        ("http://", "https://")
    ):
        return False

    # --------------------------------------------------------
    # Nunca aceitar páginas de navegação.
    # --------------------------------------------------------

    paginas_bloqueadas = (
        "/search",
        "/video/search",
        "/videos/search",
        "/busca",
        "/buscar",
        "/results",
        "/channels/",
        "/channel/",
        "/users/",
        "/user/",
        "/profile/",
        "/profiles/",
        "/categories/",
        "/category/",
        "/playlist/",
        "/playlists/",
        "/tag/",
        "/tags/",
        "/topics/",
        "/topic/",
        "/page/",
    )

    if any(
        trecho in url_lower
        for trecho in paginas_bloqueadas
    ):
        return False

    # --------------------------------------------------------
    # Páginas institucionais.
    # --------------------------------------------------------

    palavras_bloqueadas = (
        "dmca",
        "terms",
        "termsofuse",
        "privacy",
        "policy",
        "copyright",
        "contact",
        "contato",
        "login",
        "signin",
        "signup",
        "register",
        "account",
        "support",
        "help",
        "faq",
        "about",
        "legal",
        "logout",
    )

    caminho = parsed.path.lower()

    for palavra in palavras_bloqueadas:
        if (
            palavra in titulo_lower
            or f"/{palavra}" in caminho
            or caminho == f"/{palavra}"
        ):
            return False

    # --------------------------------------------------------
    # Arquivos que não são páginas de conteúdo.
    # --------------------------------------------------------

    extensoes = (
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".css",
        ".js",
        ".json",
        ".xml",
        ".pdf",
        ".zip",
    )

    if caminho.endswith(extensoes):
        return False

    # --------------------------------------------------------
    # Relação com a pesquisa.
    # --------------------------------------------------------

    palavras = [
        palavra
        for palavra in re.findall(
            r"\w+",
            termo.lower()
        )
        if len(palavra) >= 2
    ]

    correspondencias = 0

    for palavra in palavras:
        if palavra in titulo_lower:
            correspondencias += 2
        elif palavra in url_lower:
            correspondencias += 1

    # --------------------------------------------------------
    # Indicadores fortes de conteúdo individual.
    # --------------------------------------------------------

    indicadores_fortes = (
        "/video/",
        "/videos/",
        "/watch/",
        "/episode/",
        "/episodio/",
        "/filme/",
        "/movie/",
        "/show/",
        "/serie/",
        "/series/",
        "/anime/",
        "/desenho/",
        "/cartoon/",
        "view_video",
        "viewkey=",
        "video_id=",
        "videoid=",
        "watch?v=",
    )

    forte = any(
        indicador in url_lower
        for indicador in indicadores_fortes
    )

    # IDs comuns em URLs de conteúdo.
    parametros_video = (
        "viewkey",
        "video_id",
        "videoid",
        "video",
        "episode",
        "ep",
        "id",
        "v",
    )

    tem_id = any(
        chave in parsed.query.lower()
        for chave in parametros_video
    )

    # --------------------------------------------------------
    # Regras finais.
    # --------------------------------------------------------

    if forte:
        return correspondencias > 0 or len(palavras) == 0

    if tem_id and correspondencias > 0:
        return True

    # Sites simples que usam /slug-do-video.
    if correspondencias >= 2:
        return True

    if (
        correspondencias >= 1
        and len(caminho.strip("/").split("/")) >= 1
        and len(titulo) >= 5
    ):
        return True

    return False



def normalizar_titulo(texto):
    if not texto:
        return ""

    texto = str(texto)
    texto = texto.replace("\xa0", " ")
    texto = re.sub(r"\s+", " ", texto)
    texto = texto.strip()

    # Remove excesso de caracteres de navegação.
    texto = texto.strip("•|·-–—_: ")

    if len(texto) > 220:
        texto = texto[:220].rstrip() + "..."

    return texto


def chave_url(url):
    try:
        parsed = urlparse(url)

        caminho = parsed.path.rstrip("/")
        consulta = parsed.query

        if consulta:
            return (
                caminho.lower()
                + "?"
                + consulta.lower()
            )

        return caminho.lower()

    except Exception:
        return url.lower().rstrip("/")


def titulo_parece_interface(titulo):
    titulo = normalizar_titulo(
        titulo
    ).lower()

    if not titulo:
        return True

    proibidos = {
        "home",
        "menu",
        "login",
        "sign in",
        "sign up",
        "register",
        "play",
        "watch",
        "next",
        "previous",
        "more",
        "search",
        "pesquisar",
        "buscar",
        "download",
        "subscribe",
        "follow",
        "share",
        "like",
        "dislike",

        # Interfaces/login comuns.
        "continuar com google",
        "continue with google",
        "continuar com telefone",
        "continue with phone",
        "continuar com o google",
        "continue with email",
        "sign in with google",
        "sign in with apple",
        "log in",
        "login",
    }

    if titulo in proibidos:
        return True

    return False


def coletar_titulos_jsonld(soup):
    mapa = {}

    scripts = soup.find_all(
        "script",
        attrs={
            "type": "application/ld+json"
        }
    )

    def registrar(nome, url):
        nome = normalizar_titulo(nome)
        url = (url or "").strip()

        if not nome or not url:
            return

        mapa[chave_url(url)] = nome

    def percorrer(obj):
        if isinstance(obj, list):
            for item in obj:
                percorrer(item)
            return

        if not isinstance(obj, dict):
            return

        tipos = obj.get("@type", [])

        if isinstance(tipos, str):
            tipos = [tipos]

        tipos_lower = {
            str(tipo).lower()
            for tipo in tipos
        }

        # VideoObject / Movie / TVEpisode etc.
        if (
            "videoobject" in tipos_lower
            or "movie" in tipos_lower
            or "tvepisode" in tipos_lower
        ):
            url = (
                obj.get("url")
                or obj.get("contentUrl")
                or obj.get("embedUrl")
            )

            registrar(
                obj.get("name"),
                url
            )

        # ItemList.
        if (
            "itemlist" in tipos_lower
            or "itemListElement" in obj
        ):
            elementos = obj.get(
                "itemListElement",
                []
            )

            if isinstance(
                elementos,
                dict
            ):
                elementos = [elementos]

            for elemento in elementos:
                if not isinstance(
                    elemento,
                    dict
                ):
                    continue

                item = elemento.get(
                    "item",
                    elemento
                )

                if isinstance(item, dict):
                    registrar(
                        item.get("name"),
                        item.get("url")
                        or item.get("@id")
                    )

        # Alguns sites escondem VideoObject
        # dentro de propriedades internas.
        for valor in obj.values():
            if isinstance(
                valor,
                (dict, list)
            ):
                percorrer(valor)

    for script in scripts:
        raw = script.string or script.get_text(
            strip=True
        )

        if not raw:
            continue

        try:
            dados = json.loads(raw)
        except Exception:
            continue

        percorrer(dados)

    return mapa


def extrair_titulos_do_card(a):
    candidatos = []

    def adicionar(valor, prioridade):
        valor = normalizar_titulo(valor)

        if not valor:
            return

        if titulo_parece_interface(valor):
            return

        candidatos.append(
            (
                prioridade,
                valor
            )
        )

    # Atributos diretamente no link.
    adicionar(
        a.get("title"),
        100
    )

    adicionar(
        a.get("aria-label"),
        95
    )

    adicionar(
        a.get("data-title"),
        95
    )

    adicionar(
        a.get("data-name"),
        90
    )

    adicionar(
        a.get("data-video-title"),
        100
    )

    # Texto direto do link.
    adicionar(
        a.get_text(
            " ",
            strip=True
        ),
        85
    )

    # Imagem dentro do link.
    for img in a.find_all("img"):
        adicionar(
            img.get("alt"),
            80
        )

        adicionar(
            img.get("title"),
            80
        )

    # Elementos internos que normalmente
    # carregam títulos.
    for elemento in a.find_all(
        limit=40
    ):
        nome = (
            elemento.name
            or ""
        ).lower()

        classes = " ".join(
            elemento.get("class", [])
        ).lower()

        ident = (
            elemento.get("id")
            or ""
        ).lower()

        if nome in (
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "strong",
            "b",
        ):
            adicionar(
                elemento.get_text(
                    " ",
                    strip=True
                ),
                75
            )

        if (
            "title" in classes
            or "title" in ident
            or "name" in classes
            or "name" in ident
            or "video-title" in classes
            or "video_title" in classes
        ):
            adicionar(
                elemento.get_text(
                    " ",
                    strip=True
                ),
                92
            )

        adicionar(
            elemento.get("data-title"),
            95
        )

    # Sobe alguns níveis no DOM procurando
    # o card que contém o link.
    pai = a

    for nivel in range(1, 6):
        pai = getattr(
            pai,
            "parent",
            None
        )

        if pai is None:
            break

        if not hasattr(
            pai,
            "find_all"
        ):
            continue

        classes = " ".join(
            pai.get("class", [])
        ).lower()

        ident = (
            pai.get("id")
            or ""
        ).lower()

        parece_card = (
            "card" in classes
            or "video" in classes
            or "result" in classes
            or "item" in classes
            or "thumb" in classes
            or "video" in ident
            or "result" in ident
        )

        if not parece_card:
            continue

        # Título por heading.
        for heading in pai.find_all(
            [
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
            ],
            limit=10
        ):
            adicionar(
                heading.get_text(
                    " ",
                    strip=True
                ),
                88
            )

        # Elementos marcados como title.
        for elemento in pai.find_all(
            limit=50
        ):
            classes2 = " ".join(
                elemento.get("class", [])
            ).lower()

            ident2 = (
                elemento.get("id")
                or ""
            ).lower()

            if (
                "title" in classes2
                or "title" in ident2
                or "video-title" in classes2
            ):
                adicionar(
                    elemento.get_text(
                        " ",
                        strip=True
                    ),
                    94
                )

            adicionar(
                elemento.get("data-title"),
                96
            )

    # Escolhe primeiro a maior prioridade.
    candidatos.sort(
        key=lambda item: (
            item[0],
            len(item[1])
        ),
        reverse=True
    )

    # Remove duplicados.
    vistos = set()

    for _, titulo in candidatos:
        chave = titulo.lower()

        if chave in vistos:
            continue

        vistos.add(chave)

        # Evita títulos que são só números,
        # símbolos ou textos muito pequenos.
        if len(re.sub(
            r"[^A-Za-zÀ-ÿ0-9]",
            "",
            titulo
        )) < 3:
            continue

        return titulo

    return ""


def pontuar_resultado(titulo, url, termo):
    titulo_lower = (
        titulo or ""
    ).lower()

    url_lower = (
        url or ""
    ).lower()

    termo_lower = (
        termo or ""
    ).lower()

    score = 0

    # Frase completa.
    if (
        termo_lower
        and termo_lower in titulo_lower
    ):
        score += 20

    palavras = [
        palavra
        for palavra in re.findall(
            r"\w+",
            termo_lower
        )
        if len(palavra) >= 2
    ]

    for palavra in palavras:
        if palavra in titulo_lower:
            score += 4
        elif palavra in url_lower:
            score += 2

    # Forte indicação de página individual.
    indicadores = (
        "/video/",
        "/videos/",
        "/watch/",
        "view_video",
        "/episode/",
        "/episodio/",
        "/filme/",
        "/movie/",
        "/show/",
        "/serie/",
        "/series/",
        "/anime/",
        "/desenho/",
        "/cartoon/",
    )

    for indicador in indicadores:
        if indicador in url_lower:
            score += 8
            break

    # Penalidades para páginas de listagem.
    penalidades = (
        "/search",
        "/results",
        "/channels/",
        "/channel/",
        "/playlist/",
        "/playlists/",
        "/category/",
        "/categories/",
        "/tags/",
        "/tag/",
        "/users/",
        "/user/",
        "/profile/",
        "/profiles/",
    )

    for penalidade in penalidades:
        if penalidade in url_lower:
            score -= 30
            break

    # Título informativo.
    if 8 <= len(titulo) <= 180:
        score += 3

    if len(titulo) > 200:
        score -= 2

    return score



def _normalizar_thumbnail_url(
    base,
    valor
):
    if not valor:
        return None

    valor = unescape(
        str(valor).strip()
    )

    valor = (
        valor
        .replace("\\u0026", "&")
        .replace("\\u003d", "=")
        .replace("\\/", "/")
    )

    if valor.startswith("//"):
        valor = "https:" + valor

    return urljoin(
        base,
        valor
    )


def _thumbnail_eh_imagem(url):
    if not url:
        return False

    valor = str(
        url
    ).strip().lower()

    if not re.match(
        r"^https?://",
        valor,
        re.I
    ):
        return False

    base = valor.split(
        "#",
        1
    )[0]

    caminho = base.split(
        "?",
        1
    )[0]

    if re.search(
        r"\.(mp4|webm|mov|m4v|mkv|m3u8)(?:/|$)",
        caminho,
        re.I
    ):
        return False

    if re.search(
        r"(?:^|[/_.-])(logo|favicon|avatar|gravatar|sprite)(?:[/_.-]|$)",
        caminho,
        re.I
    ):
        return False

    return True


def _coletar_srcset(
    valor
):
    if not valor:
        return []

    saida = []

    for parte in str(
        valor
    ).split(","):
        parte = parte.strip()

        if not parte:
            continue

        url = parte.split(
            None,
            1
        )[0]

        if url:
            saida.append(
                url
            )

    return saida


def extrair_thumbnail_do_link(
    base,
    ancora
):
    candidatos = []

    def adicionar(valor):
        if not valor:
            return

        url = _normalizar_thumbnail_url(
            base,
            valor
        )

        if url:
            candidatos.append(
                url
            )

    try:
        elementos = [
            ancora
        ]

        pai = ancora.parent

        for _ in range(3):
            if pai is None:
                break

            elementos.append(
                pai
            )

            pai = pai.parent

        for elemento in elementos:
            if not hasattr(
                elemento,
                "find_all"
            ):
                continue

            for atributo in (
                "poster",
                "data-poster",
                "data-thumbnail",
                "data-thumb",
                "data-image",
                "data-original",
                "data-src",
                "data-lazy-src",
                "data-original-src",
                "data-url",
                "src"
            ):
                try:
                    adicionar(
                        elemento.get(
                            atributo
                        )
                    )
                except Exception:
                    pass

            try:
                adicionar(
                    elemento.get(
                        "style"
                    )
                )

                style = str(
                    elemento.get(
                        "style"
                    ) or ""
                )

                for match in re.finditer(
                    r"url\(\s*[\"']?([^\"')]+)",
                    style,
                    re.I
                ):
                    adicionar(
                        match.group(1)
                    )
            except Exception:
                pass

            try:
                for video in elemento.find_all(
                    "video",
                    limit=10
                ):
                    adicionar(video.get("poster"))
                    adicionar(video.get("data-poster"))

                for srcset in elemento.find_all(
                    ["img", "source"],
                    limit=10
                ):
                    adicionar(
                        srcset.get(
                            "src"
                        )
                    )

                    adicionar(
                        srcset.get(
                            "data-src"
                        )
                    )

                    adicionar(
                        srcset.get(
                            "data-original"
                        )
                    )

                    for item in _coletar_srcset(
                        srcset.get(
                            "srcset"
                        )
                    ):
                        adicionar(
                            item
                        )
            except Exception:
                pass

    except Exception:
        pass

    vistos = set()

    for candidato in candidatos:
        if not _thumbnail_eh_imagem(
            candidato
        ):
            continue

        if candidato in vistos:
            continue

        vistos.add(
            candidato
        )

        return candidato

    return None


def extrair_resultados(base, resposta, termo):
    soup = BeautifulSoup(
        resposta.text,
        "html.parser"
    )

    # Títulos estruturados, quando o site fornece.
    titulos_jsonld = (
        coletar_titulos_jsonld(
            soup
        )
    )

    candidatos = []
    vistos = set()

    for a in soup.find_all(
        "a",
        href=True
    ):
        href = urljoin(
            resposta.url,
            a.get("href")
        )

        if not href.startswith(
            ("http://", "https://")
        ):
            continue

        if not mesma_origem(
            base,
            href
        ):
            continue

        chave = chave_url(href)

        if chave in vistos:
            continue

        # Primeiro tenta JSON-LD.
        titulo = titulos_jsonld.get(
            chave,
            ""
        )

        # Depois faz análise visual/HTML do card.
        if not titulo:
            titulo = (
                extrair_titulos_do_card(a)
            )

        # Nunca aceitar resultado sem título.
        if not titulo:
            continue

        # Reutiliza nosso filtro sem mexer nele.
        if not parece_conteudo(
            titulo,
            href,
            termo
        ):
            continue

        score = pontuar_resultado(
            titulo,
            href,
            termo
        )

        # Se a pontuação for muito baixa,
        # provavelmente não é conteúdo real.
        if score < 1:
            continue

        vistos.add(chave)

        candidatos.append({
            "titulo": titulo[:220],
            "url": href,
            "thumbnail": extrair_thumbnail_do_link(
                base,
                a
            ),
            "_score": score,
        })

    # Melhor primeiro.
    candidatos.sort(
        key=lambda item: (
            item["_score"],
            len(item["titulo"])
        ),
        reverse=True
    )

    resultados = []

    for item in candidatos[:10]:
        resultados.append({
            "titulo": item["titulo"],
            "url": item["url"],
            "thumbnail": item.get("thumbnail"),
        })

    print(
        f"[BUSCA] {len(resultados)} resultado(s) válidos"
    )

    return resultados




def formatar_duracao_segundos(valor):
    try:
        total = int(float(valor))
    except (TypeError, ValueError):
        return ""

    if total <= 0:
        return ""

    horas, resto = divmod(total, 3600)
    minutos, segundos = divmod(resto, 60)

    if horas:
        return f"{horas}:{minutos:02d}:{segundos:02d}"

    return f"{minutos}:{segundos:02d}"


def enriquecer_resultado_ytdlp(item):

    if not isinstance(item, dict):
        return item

    site_item = str(
        item.get("site") or ""
    ).strip().lower()

    tipo_item = str(
        item.get("tipo") or
        item.get("mediaType") or
        item.get("media_type") or
        ""
    ).strip().lower()

    # Sites de imagem não devem passar pelo yt-dlp.
    if (
        site_item in {
            "pinterest",
            "pin"
        }
        or tipo_item in {
            "image",
            "imagem",
            "photo",
            "foto"
        }
    ):
        item.setdefault(
            "duracao",
            ""
        )
        item.setdefault(
            "duracao_segundos",
            None
        )

        return item

    # Rule34 já retorna mídia direta, thumbnail e tipo.
    # Nunca chamar yt-dlp aqui.
    if str(item.get("site") or "").strip().lower() == "rule34":
        item.setdefault("thumbnail", item.get("url"))
        item.setdefault("duracao", None)
        item.setdefault("duracao_segundos", None)
        return item

    if (
        item.get("thumbnail")
        and item.get("duracao")
    ):
        return item

    meta = resultado_ytdlp_url(item.get("url"))

    if not meta:
        return item

    return {
        **item,
        "titulo": item.get("titulo") or meta.get("titulo") or "Vídeo sem título",
        "url": item.get("url") or meta.get("url"),
        "thumbnail": item.get("thumbnail") or meta.get("thumbnail"),
        "descricao": item.get("descricao") or meta.get("descricao") or "",
        "duracao": meta.get("duracao") or "",
        "duracao_segundos": meta.get("duracao_segundos"),
        "tipo": item.get("tipo") or "video",
        "mediaType": item.get("mediaType") or "video"
    }


def enriquecer_resultados(resultados, workers=4):
    if not resultados:
        return resultados

    saida = list(resultados)

    with ThreadPoolExecutor(max_workers=min(workers, len(saida))) as executor:
        futuros = {
            executor.submit(enriquecer_resultado_ytdlp, item): i
            for i, item in enumerate(saida)
        }

        for futuro in as_completed(futuros):
            i = futuros[futuro]
            try:
                saida[i] = futuro.result()
            except Exception as erro:
                print(f"[METADATA] Resultado {i + 1}: {erro}")

    return saida

def _melhor_thumbnail_ytdlp(info):
    principal = str(
        info.get("thumbnail")
        or ""
    ).strip()

    candidatos = []

    thumbs = info.get("thumbnails")

    if isinstance(thumbs, list):
        for item in thumbs:
            if not isinstance(item, dict):
                continue

            url = str(
                item.get("url")
                or ""
            ).strip()

            if not url:
                continue

            try:
                largura = int(
                    item.get("width")
                    or 0
                )
            except Exception:
                largura = 0

            try:
                altura = int(
                    item.get("height")
                    or 0
                )
            except Exception:
                altura = 0

            candidatos.append(
                (
                    largura * altura,
                    largura,
                    altura,
                    url
                )
            )

    if candidatos:
        candidatos.sort(
            reverse=True
        )
        return candidatos[0][3]

    return principal or None


def resultado_ytdlp_url(url):
    url = normalizar_url(
        url
    )

    if url_bloqueada(url):
        return None

    opcoes = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "ignoreerrors": True,
        "socket_timeout": 15,
        "extractor_retries": 2,
    }

    try:
        with obter_yt_dlp().YoutubeDL(
            opcoes
        ) as ydl:
            info = ydl.extract_info(
                url,
                download=False
            )

    except Exception as erro:
        print(
            f"[YTDLP URL] {erro}"
        )
        return None

    if not isinstance(
        info,
        dict
    ):
        return None

    if info.get(
        "_type"
    ) == "playlist":
        return None

    titulo = normalizar_titulo(
        info.get(
            "title"
        )
        or ""
    )

    pagina = str(
        info.get(
            "webpage_url"
        )
        or info.get(
            "original_url"
        )
        or url
    ).strip()

    if (
        not titulo
        or url_bloqueada(titulo)
        or url_bloqueada(pagina)
    ):
        return None

    if not (
        info.get("duration")
        or info.get("formats")
        or info.get("url")
        or info.get("ext")
    ):
        return None

    return {
        "titulo": titulo,
        "url": pagina,
        "thumbnail":
        _melhor_thumbnail_ytdlp(
            info
        ),

        "duracao_segundos": (
            int(float(info.get("duration")))
            if info.get("duration") is not None
            else None
        ),

        "duracao": formatar_duracao_segundos(
            info.get("duration")
        ),

        "descricao": normalizar_titulo(
            info.get(
                "description"
            )
            or ""
        )
    }


def pesquisar_youtube_com_ytdlp(
    termo,
    limite=10
):
    consulta = str(
        termo or ""
    ).strip()

    if (
        not consulta
        or url_bloqueada(consulta)
    ):
        return []

    opcoes = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": True,
        "noplaylist": True,
        "ignoreerrors": True,
        "socket_timeout": 15,
        "extractor_retries": 2,
    }

    try:
        with obter_yt_dlp().YoutubeDL(
            opcoes
        ) as ydl:

            info = ydl.extract_info(
                f"ytsearch{limite}:{consulta}",
                download=False
            )

    except Exception as erro:
        print(
            f"[BUSCA YTDLP] {erro}"
        )
        return []

    resultados = []
    vistos = set()

    for item in (
        info.get("entries")
        or []
    ):

        if not isinstance(
            item,
            dict
        ):
            continue

        video_id = str(
            item.get("id")
            or ""
        ).strip()

        url = str(
            item.get("webpage_url")
            or item.get("original_url")
            or ""
        ).strip()

        if (
            not url
            and video_id
        ):
            url = (
                "https://www.youtube.com/"
                f"watch?v={video_id}"
            )

        titulo = normalizar_titulo(
            item.get("title")
            or "Vídeo sem título"
        )

        if (
            not url.startswith(
                ("http://", "https://")
            )
            or not titulo
            or url_bloqueada(titulo)
            or url_bloqueada(url)
        ):
            continue

        chave = chave_url(
            url
        )

        if chave in vistos:
            continue

        vistos.add(
            chave
        )

        resultados.append({
            "titulo": titulo,
            "url": url,

            "thumbnail": str(
                item.get("thumbnail")
                or ""
            ).strip() or None,

            "descricao":
                normalizar_titulo(
                    item.get(
                        "description"
                    )
                    or ""
                )
        })

        if len(
            resultados
        ) >= limite:
            break

    return resultados


def extrair_link_motor(
    href,
    pagina_url
):
    valor = str(
        href or ""
    ).strip()

    if not valor:
        return None

    valor = urljoin(
        pagina_url,
        valor
    )

    try:
        parsed = urlparse(
            valor
        )

        host = (
            parsed.hostname
            or ""
        ).lower()

        if "duckduckgo.com" in host:
            from urllib.parse import parse_qs

            alvo = parse_qs(
                parsed.query
            ).get(
                "uddg",
                [None]
            )[0]

            if alvo:
                return alvo

    except Exception:
        pass

    return valor
def urls_de_busca(
    base,
    termo
):
    q = quote_plus(
        termo
    )

    return [
        f"{base}/?s={q}",
        f"{base}/?q={q}",
        f"{base}/?search={q}",
        f"{base}/?query={q}",

        # Pinterest usa uma rota própria para Pins.
        f"{base}/search/pins/?q={q}",

        f"{base}/search?q={q}",
        f"{base}/search?query={q}",
        f"{base}/search?keyword={q}",
        f"{base}/search/{q}",

        f"{base}/s/{q}",
        f"{base}/find/{q}",

        f"{base}/buscar?q={q}",
        f"{base}/busca?q={q}",
        f"{base}/results?q={q}",

        f"{base}/search.php?q={q}",
        f"{base}/search.php?search={q}",

        f"{base}/video/search?search={q}",
        f"{base}/videos/search?q={q}",
    ]

def pesquisar_fallback_dominio(base, termo):
    dominio = urlparse(
        base
    ).netloc.lower()

    consultas = [
        f"site:{dominio} {termo}",
        f"site:{dominio} {termo} video",
    ]

    motores = [
        (
            "DuckDuckGo",
            "https://html.duckduckgo.com/html/?q={}"
        ),
        (
            "Bing",
            "https://www.bing.com/search?q={}"
        ),
    ]

    encontrados = []
    vistos = set()

    for nome_motor, modelo in motores:
        for consulta in consultas:

            print(
                f"[BUSCA] Fallback {nome_motor}: "
                f"{consulta}"
            )

            try:
                resposta = obter_pagina(
                    modelo.format(
                        quote_plus(consulta)
                    )
                )
            except Exception:
                resposta = None

            if not resposta:
                continue

            soup = BeautifulSoup(
                resposta.text,
                "html.parser"
            )

            links = soup.select(
                "a.result__a"
            )

            if not links:
                links = soup.select(
                    "li.b_algo h2 a"
                )

            if not links:
                links = soup.find_all(
                    "a",
                    href=True
                )

            for link in links:
                href = link.get(
                    "href"
                )

                if not href:
                    continue

                href = extrair_link_motor(
                    href,
                    resposta.url
                )

                if not href:
                    continue

                if not href.startswith(
                    ("http://", "https://")
                ):
                    continue

                if not mesma_origem(
                    base,
                    href
                ):
                    continue

                chave = chave_url(
                    href
                )

                if chave in vistos:
                    continue

                titulo = (
                    link.get_text(
                        " ",
                        strip=True
                    )
                    or link.get("title")
                    or ""
                )

                titulo = normalizar_titulo(
                    titulo
                )

                if not titulo:
                    continue

                if not parece_conteudo(
                    titulo,
                    href,
                    termo
                ):
                    continue

                vistos.add(chave)

                encontrados.append({
                    "titulo": titulo,
                    "url": href,
                })

                if len(encontrados) >= 10:
                    break

            if len(encontrados) >= 10:
                break

        if encontrados:
            break

    return encontrados[:10]


def pesquisar_youtube_com_ytdlp(
    termo,
    limite=8
):
    consulta = str(
        termo or ""
    ).strip()

    if not consulta:
        return []

    opcoes = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": True,
        "noplaylist": True,
        "ignoreerrors": True,
    }

    try:
        with obter_yt_dlp().YoutubeDL(
            opcoes
        ) as ydl:

            info = ydl.extract_info(
                f"ytsearch{limite}:{consulta}",
                download=False
            )

    except Exception as erro:
        print(
            f"[BUSCA YTDLP] YouTube: {erro}"
        )
        return []

    resultados = []
    vistos = set()

    for item in (
        info.get("entries") or []
    ):

        if not isinstance(
            item,
            dict
        ):
            continue

        url = (
            item.get("webpage_url")
            or item.get("original_url")
            or ""
        )

        if (
            not isinstance(url, str)
            or not url.startswith(
                ("http://", "https://")
            )
        ):
            item_url = (
                item.get("url")
                or ""
            )

            if (
                isinstance(
                    item_url,
                    str
                )
                and item_url.startswith(
                    ("http://", "https://")
                )
            ):
                url = item_url

        if (
            (
                not isinstance(
                    url,
                    str
                )
                or not url.startswith(
                    ("http://", "https://")
                )
            )
            and item.get("id")
        ):
            url = (
                "https://www.youtube.com/watch?v="
                + str(item["id"])
            )

        if (
            not isinstance(
                url,
                str
            )
            or not dominio_permitido(url)
        ):
            continue

        titulo = normalizar_titulo(
            item.get("title")
            or "Vídeo sem título"
        )

        if not titulo:
            continue

        chave = chave_url(url)

        if chave in vistos:
            continue

        vistos.add(chave)

        resultados.append({
            "titulo": titulo,
            "url": url,
            "thumbnail": str(
                item.get("thumbnail")
                or ""
            ).strip(),
            "tipo": "video",
            "mediaType": "video",
            "site": "youtube"
        })

        if len(resultados) >= limite:
            break

    return resultados[:limite]




# ============================================================
# KYARA RULE34 PRIME — CACHE LOCAL
# ============================================================

RULE34_MEDIA_CACHE_FILE = (
    Path(__file__).resolve().parent
    / "dados"
    / "data"
    / "rule34-media-cache.json"
)

RULE34_MEDIA_CACHE_MAX = 5000


def _rule34_load_media_cache():
    try:
        RULE34_MEDIA_CACHE_FILE.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        if not RULE34_MEDIA_CACHE_FILE.exists():
            return {}

        data = json.loads(
            RULE34_MEDIA_CACHE_FILE.read_text(
                encoding="utf-8"
            )
        )

        if not isinstance(data, dict):
            return {}

        return data

    except Exception as erro:
        print(
            "[RULE34 CACHE] "
            f"Falha ao carregar: {erro}"
        )
        return {}


def _rule34_save_media_cache(cache):
    try:
        RULE34_MEDIA_CACHE_FILE.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        if len(cache) > RULE34_MEDIA_CACHE_MAX:
            itens = list(
                cache.items()
            )[-RULE34_MEDIA_CACHE_MAX:]

            cache = dict(itens)

        tmp = RULE34_MEDIA_CACHE_FILE.with_suffix(
            ".tmp"
        )

        tmp.write_text(
            json.dumps(
                cache,
                ensure_ascii=False,
                indent=2
            ),
            encoding="utf-8"
        )

        tmp.replace(
            RULE34_MEDIA_CACHE_FILE
        )

    except Exception as erro:
        print(
            "[RULE34 CACHE] "
            f"Falha ao salvar: {erro}"
        )


def _rule34_cache_get(cache, post_id):
    if not post_id:
        return None

    item = cache.get(
        str(post_id)
    )

    if not isinstance(item, dict):
        return None

    url = item.get("url")

    if not isinstance(url, str):
        return None

    if not url.startswith(
        ("http://", "https://")
    ):
        return None

    return url


def _rule34_cache_put(cache, post_id, url):
    if not post_id or not url:
        return

    if not isinstance(url, str):
        return

    if not url.startswith(
        ("http://", "https://")
    ):
        return

    cache[str(post_id)] = {
        "url": url,
        "updated": int(
            time.time()
        )
    }


def pesquisar_rule34(
    base,
    termo,
    limite=10
):
    """
    RULE34 PRIME — NO API + CACHE LOCAL

    • Sem API.
    • Sem conta.
    • Sem api_key.
    • Sem user_id.
    • Busca pública controlada.
    • Requests sequenciais.
    • Cache post_id -> mídia.
    • Reaproveita resultados já resolvidos.
    """

    from bs4 import BeautifulSoup
    from urllib.parse import urljoin

    try:
        termo = str(
            termo or ""
        ).strip()

        # ====================================================
        # PAGINAÇÃO KYARA
        # ====================================================

        pagina_inicial = 0

        marcador = re.search(
            r"(?:^|\s)__KYARA_RULE34_PAGE=(\d+)\s*$",
            termo,
            re.I
        )

        if marcador:
            try:
                pagina_inicial = max(
                    0,
                    int(
                        marcador.group(1)
                    )
                )
            except Exception:
                pagina_inicial = 0

            termo = termo[
                :marcador.start()
            ].strip()

        quantidade = max(
            1,
            min(
                20,
                int(
                    limite or 10
                )
            )
        )

        if not termo:
            return []

        # ====================================================
        # CACHE
        # ====================================================

        cache = _rule34_load_media_cache()

        cache_hits = 0
        cache_misses = 0

        # ====================================================
        # HEADERS
        # ====================================================

        headers = {
            "User-Agent": (
                "Mozilla/5.0 "
                "(Linux; Android 13) "
                "AppleWebKit/537.36 "
                "(KHTML, like Gecko) "
                "Chrome/140.0 Mobile Safari/537.36"
            ),
            "Accept": (
                "text/html,"
                "application/xhtml+xml,"
                "application/xml;q=0.9,"
                "*/*;q=0.8"
            ),
            "Accept-Language":
                "pt-BR,pt;q=0.9,en;q=0.8",
            "Connection":
                "keep-alive"
        }

        sessao = requests.Session()

        sessao.headers.update(
            headers
        )

        # ====================================================
        # REQUEST CONTROLADO
        # ====================================================

        def requisicao(
            url,
            params=None,
            tentativas=2
        ):
            for tentativa in range(
                tentativas
            ):

                try:
                    resposta = sessao.get(
                        url,
                        params=params,
                        timeout=(4, 7)
                    )

                    if (
                        resposta.status_code
                        != 429
                    ):
                        return resposta

                    retry_after = (
                        resposta.headers.get(
                            "Retry-After"
                        )
                    )

                    try:
                        espera = float(
                            retry_after
                        )
                    except Exception:
                        espera = (
                            1.5
                            +
                            (
                                tentativa
                                * 1.5
                            )
                        )

                    espera = max(
                        1.0,
                        min(
                            espera,
                            5.0
                        )
                    )

                    print(
                        "[RULE34 PRIME] "
                        f"429 → aguardando "
                        f"{espera:.1f}s"
                    )

                    time.sleep(
                        espera
                    )

                except Exception as erro:

                    if (
                        tentativa
                        >= tentativas - 1
                    ):
                        raise

                    print(
                        "[RULE34 PRIME] "
                        f"request retry: {erro}"
                    )

                    time.sleep(
                        0.8
                    )

            return None

        # ====================================================
        # CANDIDATOS
        # ====================================================

        links_posts = []
        paginas_lidas = 0
        pagina = pagina_inicial

        alvo_candidatos = min(
            30,
            max(
                quantidade * 2,
                quantidade + 5
            )
        )

        while (
            len(links_posts)
            < alvo_candidatos
            and
            paginas_lidas < 3
        ):

            resposta = requisicao(
                "https://rule34.xxx/index.php",
                params={
                    "page": "post",
                    "s": "list",
                    "tags": termo,
                    "pid": str(
                        pagina * 42
                    )
                }
            )

            if resposta is None:
                break

            if (
                resposta.status_code
                != 200
            ):
                print(
                    "[RULE34 PRIME] "
                    f"Busca HTTP "
                    f"{resposta.status_code}"
                )
                break

            soup = BeautifulSoup(
                resposta.text,
                "html.parser"
            )

            encontrados = 0

            for a in soup.find_all(
                "a",
                href=True
            ):

                href = urljoin(
                    resposta.url,
                    a["href"]
                )

                if not re.search(
                    r"page=post.*?s=view.*?id=\d+",
                    href,
                    re.I
                ):
                    continue

                if href in links_posts:
                    continue

                links_posts.append(
                    href
                )

                encontrados += 1

                if (
                    len(links_posts)
                    >= alvo_candidatos
                ):
                    break

            paginas_lidas += 1

            if encontrados == 0:
                break

            pagina += 1

        print(
            "[RULE34 PRIME] "
            f"candidatos={len(links_posts)}"
        )

        if not links_posts:
            return []

        # ====================================================
        # EXTRATOR
        # ====================================================

        def construir_resultado(
            post_id,
            media,
            thumbnail=None
        ):

            media_key = media.split(
                "?",
                1
            )[0]

            extensao = ""

            if "." in media_key:
                extensao = (
                    media_key
                    .rsplit(
                        ".",
                        1
                    )[-1]
                    .lower()
                )

            tipo = (
                "video"
                if extensao in (
                    "mp4",
                    "webm",
                    "mov",
                    "m4v",
                    "avi"
                )
                else
                "imagem"
            )

            return {
                "url": media,
                "tipo": tipo,
                "thumbnail": (
                    thumbnail
                    or
                    media
                ),
                "duracao": None,
                "titulo":
                    f"Rule34 • Post #{post_id}",
                "id": post_id,
                "pagina":
                    f"https://rule34.xxx/index.php"
                    f"?page=post&s=view&id={post_id}",
                "site": "rule34",
                "_media_key": media_key
            }

        def extrair_post(
            numero,
            pagina_post
        ):

            try:

                time.sleep(
                    0.35
                )

                resposta = requisicao(
                    pagina_post,
                    tentativas=2
                )

                if resposta is None:
                    return None

                if (
                    resposta.status_code
                    != 200
                ):
                    print(
                        "[RULE34 PRIME] "
                        f"post={numero} "
                        f"HTTP={resposta.status_code}"
                    )
                    return None

                soup = BeautifulSoup(
                    resposta.text,
                    "html.parser"
                )

                media = None

                # ==================================================
                # ID
                # ==================================================

                match_id = re.search(
                    r"[?&]id=(\d+)",
                    pagina_post,
                    re.I
                )

                post_id = (
                    match_id.group(1)
                    if match_id
                    else str(numero)
                )

                # ==================================================
                # IMAGEM PRINCIPAL
                # ==================================================

                imagem_principal = (
                    soup.select_one(
                        "img#image"
                    )
                )

                if imagem_principal:

                    src = (
                        imagem_principal.get(
                            "src"
                        )
                        or
                        imagem_principal.get(
                            "data-src"
                        )
                    )

                    if src:
                        src = urljoin(
                            resposta.url,
                            src
                        )

                        if re.match(
                            r"^https?://",
                            src,
                            re.I
                        ):
                            media = src

                # ==================================================
                # VÍDEO
                # ==================================================

                if not media:

                    video = soup.find(
                        "video"
                    )

                    if video:

                        candidatos = []

                        source = video.find(
                            "source"
                        )

                        if source:
                            candidatos.append(
                                source.get(
                                    "src"
                                )
                            )

                        candidatos.append(
                            video.get(
                                "src"
                            )
                        )

                        for src in candidatos:

                            if not src:
                                continue

                            src = urljoin(
                                resposta.url,
                                src
                            )

                            if re.match(
                                r"^https?://",
                                src,
                                re.I
                            ):
                                media = src
                                break

                # ==================================================
                # LINK DIRETO
                # ==================================================

                if not media:

                    for a in soup.find_all(
                        "a",
                        href=True
                    ):

                        href = urljoin(
                            resposta.url,
                            a["href"]
                        )

                        if re.search(
                            r"https?://wimg\.rule34\.xxx/.*/images/",
                            href,
                            re.I
                        ):
                            media = href
                            break

                # ==================================================
                # FALLBACK IMG
                # ==================================================

                if not media:

                    for img in soup.find_all(
                        "img"
                    ):

                        src = (
                            img.get("src")
                            or
                            img.get("data-src")
                        )

                        if not src:
                            continue

                        src = urljoin(
                            resposta.url,
                            src
                        )

                        if (
                            "wimg.rule34.xxx"
                            in src.lower()
                            and
                            "/thumbnails/"
                            not in src.lower()
                        ):
                            media = src
                            break

                if not media:
                    return None

                thumbnail = media

                thumb = soup.select_one(
                    "img#image"
                )

                if thumb:

                    thumb_src = (
                        thumb.get("src")
                        or
                        thumb.get("data-src")
                    )

                    if thumb_src:
                        thumbnail = urljoin(
                            resposta.url,
                            thumb_src
                        )

                return construir_resultado(
                    post_id,
                    media,
                    thumbnail
                )

            except Exception as erro:

                print(
                    "[RULE34 PRIME] "
                    f"Falha post={numero}: "
                    f"{erro}"
                )

                return None

        # ====================================================
        # PROCESSAMENTO
        # ====================================================

        resultados = []
        vistos = set()

        for numero, pagina_post in enumerate(
            links_posts,
            1
        ):

            match_id = re.search(
                r"[?&]id=(\d+)",
                pagina_post,
                re.I
            )

            post_id = (
                match_id.group(1)
                if match_id
                else None
            )

            # ==================================================
            # CACHE HIT
            # ==================================================

            cached_url = _rule34_cache_get(
                cache,
                post_id
            )

            if cached_url:

                cache_hits += 1

                item = construir_resultado(
                    post_id,
                    cached_url,
                    cached_url
                )

                print(
                    "[RULE34 PRIME] "
                    f"cache HIT post={post_id}"
                )

            else:

                cache_misses += 1

                item = extrair_post(
                    numero,
                    pagina_post
                )

                if not item:
                    continue

                _rule34_cache_put(
                    cache,
                    item.get("id"),
                    item.get("url")
                )

            # ==================================================
            # DEDUPLICAÇÃO
            # ==================================================

            if not item:
                continue

            media_key = item.pop(
                "_media_key",
                ""
            )

            if (
                not media_key
                or
                media_key in vistos
            ):
                continue

            vistos.add(
                media_key
            )

            resultados.append(
                item
            )

            print(
                "[RULE34 PRIME] "
                f"mídia {len(resultados)}/"
                f"{quantidade} "
                f"post={item.get('id')}"
            )

            if (
                len(resultados)
                >= quantidade
            ):
                break

        # ====================================================
        # SALVA CACHE UMA ÚNICA VEZ
        # ====================================================

        if cache:
            _rule34_save_media_cache(
                cache
            )

        print(
            "[RULE34 PRIME] "
            f"cache_hit={cache_hits} "
            f"web={cache_misses}"
        )

        print(
            "[RULE34 PRIME] "
            f"cache_total={len(cache)}"
        )

        print(
            "[RULE34 PRIME] "
            f"resultados={len(resultados)}"
        )

        return resultados

    except Exception as erro:

        print(
            "[RULE34 PRIME] ERRO:",
            erro
        )

        return []



def pesquisar_site(
    site,
    termo,
    limite=10
):
    if not isinstance(
        site,
        dict
    ):
        return []

    inicial = str(
        site.get("url")
        or site.get("origem")
        or ""
    ).strip()

    if (
        not inicial
        or url_bloqueada(inicial)
    ):
        return []

    # ------------------------------------------------------
    # RULE34: nunca passa pelo yt-dlp/fallback.
    # ------------------------------------------------------

    host_inicial = (
        urlparse(inicial).hostname
        or ""
    ).lower()

    if host_inicial in (
        "rule34.xxx",
        "www.rule34.xxx"
    ):
        return pesquisar_rule34(
            inicial,
            termo,
            limite
        )

    # URL direta no #baixar: pula a pesquisa textual.
    termo_url = str(termo or "").strip()

    if re.match(
        r"^https?://",
        termo_url,
        re.I
    ):
        direto_url = resultado_ytdlp_url(
            termo_url
        )

        if direto_url:
            return [direto_url]

        meta_direta = _extrair_midia_direta_pagina(
            termo_url
        )

        if (
            meta_direta
            and meta_direta.get("url")
        ):
            return [meta_direta]

    base_resolvida = (
        resolver_url_final(
            inicial
        )
    )

    if (
        not base_resolvida
        or url_bloqueada(
            base_resolvida
        )
    ):
        return []

    parsed = urlparse(
        base_resolvida
    )

    host = (
        parsed.hostname
        or ""
    ).lower()

    base = (
        f"{parsed.scheme}://"
        f"{parsed.netloc}"
    )

    print(
        f"[BUSCA] Base resolvida: "
        f"{base_resolvida}"
    )

    # ------------------------------------------------------
    # 2. YouTube: busca própria.
    # ------------------------------------------------------

    if (
        host == "youtu.be"
        or "youtube.com" in host
        or "youtube-nocookie.com" in host
    ):

        resultados = (
            pesquisar_youtube_com_ytdlp(
                termo,
                limite
            )
        )

        if resultados:
            print(
                "[BUSCA YTDLP] "
                f"{len(resultados)} resultado(s)"
            )

            return resultados

    # ------------------------------------------------------
    # 3. Página inicial + formulários.
    # ------------------------------------------------------

    pagina = obter_pagina(
        base
    )

    if pagina:

        soup = BeautifulSoup(
            pagina.text,
            "html.parser"
        )

        forms = encontrar_forms(
            soup
        )

        candidatos = []

        for numero, form in enumerate(
            forms,
            start=1
        ):

            pontos = sum(
                10
                for campo
                in form["campos"]
                if campo_parece_busca(
                    campo
                )
            )

            if form["method"] == "get":
                pontos += 2

            candidatos.append(
                (
                    pontos,
                    numero,
                    form
                )
            )

        candidatos.sort(
            key=lambda x: x[0],
            reverse=True
        )

        print(
            "[BUSCA] "
            f"{len(forms)} formulário(s) encontrado(s)"
        )

        for _, numero, form in candidatos:

            print(
                f"[BUSCA] "
                f"Testando formulário {numero}"
            )

            resposta = executar_form(
                base,
                form,
                termo
            )

            if not resposta:
                continue

            resultados = extrair_resultados(
                base,
                resposta,
                termo
            )

            if resultados:
                return resultados[:limite]

    # ------------------------------------------------------
    # 4. Rotas comuns.
    # ------------------------------------------------------

    for url in urls_de_busca(
        base,
        termo
    ):

        print(
            f"[BUSCA] Tentando {url}"
        )

        resposta = obter_pagina(
            url
        )

        if not resposta:
            continue

        resultados = extrair_resultados(
            base,
            resposta,
            termo
        )

        if resultados:
            return resultados[:limite]

    # ------------------------------------------------------
    # 5. Fallback por domínio.
    # ------------------------------------------------------

    print(
        "[BUSCA] Busca interna sem resultados."
    )

    print(
        "[BUSCA] Fallback por domínio..."
    )

    return pesquisar_fallback_dominio(
        base,
        termo
    )[:limite]

def salvar_ultima_pesquisa(
    site,
    termo,
    resultados
):
    global ULTIMO_SITE

    ULTIMO_SITE = site

    ULTIMA_PESQUISA[site] = {
        "termo": termo,
        "resultados": resultados,
    }

    salvar_sessao()



def obter_resultado(site, numero):
    pesquisa = ULTIMA_PESQUISA.get(site)

    if not pesquisa:
        return None

    resultados = pesquisa["resultados"]

    if numero < 1 or numero > len(resultados):
        return None

    return resultados[numero - 1]


def _limpar_downloads_antigos(
    idade_maxima=2 * 60 * 60
):
    pasta = Path(
        PASTA_DOWNLOAD
    )

    pasta.mkdir(
        parents=True,
        exist_ok=True
    )

    agora = time.time()

    for item in list(
        pasta.iterdir()
    ):
        try:
            if not item.is_file():
                continue

            if (
                agora
                - item.stat().st_mtime
                > idade_maxima
            ):
                item.unlink()

        except Exception:
            pass


def _remover_arquivos_novos(
    pasta,
    antes
):
    try:
        atuais = {
            item.resolve()
            for item in Path(
                pasta
            ).iterdir()
            if item.is_file()
        }
    except Exception:
        return

    for item in (
        atuais - antes
    ):
        try:
            item.unlink()
        except Exception:
            pass


def _limpar_downloads_temporarios(
    idade_maxima=7200
):
    pasta = Path(
        PASTA_DOWNLOAD
    )

    pasta.mkdir(
        parents=True,
        exist_ok=True
    )

    agora = time.time()

    for item in list(
        pasta.iterdir()
    ):
        try:
            if (
                item.is_file()
                and agora
                - item.stat().st_mtime
                > idade_maxima
            ):
                item.unlink()

        except Exception:
            pass


def _remover_arquivos_novos(
    pasta,
    antes
):
    try:
        atuais = {
            str(
                item.resolve()
            )
            for item
            in Path(pasta).iterdir()
            if item.is_file()
        }

    except Exception:
        return

    for nome in (
        atuais - antes
    ):
        try:
            Path(
                nome
            ).unlink()

        except Exception:
            pass


def _formatar_duracao(valor):
    try:
        total = int(float(valor))
    except (TypeError, ValueError):
        return ""

    if total <= 0:
        return ""

    h, resto = divmod(total, 3600)
    m, sec = divmod(resto, 60)

    return (
        f"{h}:{m:02d}:{sec:02d}"
        if h
        else f"{m}:{sec:02d}"
    )


def _ext_midia(url):
    caminho = urlparse(str(url or "")).path.lower()

    for ext in (
        ".mp4", ".m4v", ".webm", ".mov", ".mkv",
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    ):
        if caminho.endswith(ext):
            return ext

    return ""


def _score_midia(url, contexto="", tipo="video"):
    texto = f"{url} {contexto}".lower()
    ext = _ext_midia(url)

    score = 0

    if tipo == "video":
        score += {
            ".mp4": 700,
            ".m4v": 620,
            ".webm": 560,
            ".mov": 520,
            ".mkv": 500,
        }.get(ext, 0)

        if ".m3u8" in texto:
            score -= 500

    else:
        score += {
            ".jpg": 650,
            ".jpeg": 650,
            ".webp": 620,
            ".png": 560,
            ".gif": 400,
        }.get(ext, 0)

    dimensoes = re.search(
        r"(\d{3,5})\s*[x×]\s*(\d{3,5})",
        texto
    )

    if dimensoes:
        largura = int(dimensoes.group(1))
        altura = int(dimensoes.group(2))
        score += min(
            1800,
            (largura * altura) // 1000
        )

    if "original" in texto:
        score += 450

    if "full" in texto:
        score += 350

    if "source" in texto:
        score -= 180

    if "hd" in texto:
        score += 120

    if "done" in texto:
        score += 80

    tamanho = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:mb|mib)",
        texto,
        re.I
    )

    if tamanho:
        try:
            score -= min(
                300,
                int(float(tamanho.group(1)) * 2)
            )
        except Exception:
            pass

    return score


def _extrair_midia_direta_pagina(pagina_url):
    try:
        resposta = requests.get(
            pagina_url,
            headers={
                **HEADERS,
                "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"
            },
            timeout=(6, 12),
            allow_redirects=True
        )

        if not resposta.ok:
            return None

        ctype = (
            resposta.headers.get(
                "content-type",
                ""
            ).lower()
        )

        if ctype.startswith("video/"):
            return {
                "url": resposta.url,
                "tipo": "video",
                "thumbnail": None,
                "duracao": ""
            }

        if ctype.startswith("image/"):
            return {
                "url": resposta.url,
                "tipo": "imagem",
                "thumbnail": resposta.url,
                "duracao": ""
            }

        soup = BeautifulSoup(
            resposta.text,
            "html.parser"
        )

        videos = []
        imagens = []
        thumbnails = []
        duracao = ""

        def adicionar_video(valor, contexto=""):
            if not valor:
                return

            url = urljoin(
                resposta.url,
                str(valor).strip()
            )

            ext = urlparse(url).path.lower()

            if not any(
                x in ext
                for x in (
                    ".mp4",
                    ".m4v",
                    ".webm",
                    ".mov",
                    ".mkv"
                )
            ):
                return

            score = 0

            if ".mp4" in ext:
                score += 1000
            elif ".m4v" in ext:
                score += 900
            elif ".webm" in ext:
                score += 800
            else:
                score += 700

            contexto = str(
                contexto
            ).lower()

            if "hd" in contexto:
                score += 250

            if "1280" in contexto:
                score += 250

            if "1920" in contexto:
                score += 400

            if "original" in contexto:
                score += 350

            if "source" in contexto:
                score -= 200

            videos.append(
                (score, url)
            )

        def adicionar_imagem(valor, contexto=""):
            if not valor:
                return

            url = urljoin(
                resposta.url,
                str(valor).strip()
            )

            ext = urlparse(url).path.lower()

            if not any(
                x in ext
                for x in (
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".webp"
                )
            ):
                return

            score = 0
            texto = (
                f"{url} {contexto}"
            ).lower()

            if "original" in texto:
                score += 700

            if "full" in texto:
                score += 600

            if "large" in texto:
                score += 500

            if "1280" in texto:
                score += 250

            if "1920" in texto:
                score += 400

            if "thumbnail" in texto:
                score -= 250

            if "avatar" in texto:
                score -= 700

            if "logo" in texto:
                score -= 700

            imagens.append(
                (score, url)
            )

        # VIDEO HTML5
        for video in soup.find_all("video"):
            poster = (
                video.get("poster")
                or video.get("data-poster")
            )

            if poster:
                thumbnails.append(
                    urljoin(
                        resposta.url,
                        poster
                    )
                )

            contexto = (
                " ".join(
                    video.get("class") or []
                )
                + " "
                + str(video)
            )

            bruto = (
                video.get("data-duration")
                or video.get("duration")
                or ""
            )

            import re

            if not duracao:
                m = re.search(
                    r"duration[_-](\d+(?:\.\d+)?)",
                    contexto,
                    re.I
                )
                if m:
                    bruto = m.group(1)

            if bruto:
                try:
                    total = int(
                        float(bruto)
                    )
                    h, resto = divmod(
                        total,
                        3600
                    )
                    m, sec = divmod(
                        resto,
                        60
                    )

                    duracao = (
                        f"{h}:{m:02d}:{sec:02d}"
                        if h
                        else
                        f"{m}:{sec:02d}"
                    )
                except Exception:
                    pass

            adicionar_video(
                video.get("src"),
                contexto
            )

            for source in video.find_all("source"):
                adicionar_video(
                    source.get("src"),
                    str(source)
                )

        # LINKS DIRETOS
        for link in soup.find_all(
            "a",
            href=True
        ):
            texto = (
                link.get("title", "")
                + " "
                + link.get_text(
                    " ",
                    strip=True
                )
            )

            href = link.get("href")

            adicionar_video(
                href,
                texto
            )

            adicionar_imagem(
                href,
                texto
            )

        # JSON-LD: thumbnail real do vídeo
        if not thumbnails:
            for script in soup.find_all(
                "script",
                type="application/ld+json"
            ):
                try:
                    texto = script.string or script.get_text()
                    if not texto:
                        continue

                    dados = json.loads(texto)

                    objetos = (
                        dados
                        if isinstance(dados, list)
                        else [dados]
                    )

                    for obj in objetos:
                        if not isinstance(obj, dict):
                            continue

                        imagem = (
                            obj.get("thumbnailUrl")
                            or obj.get("thumbnailURL")
                            or obj.get("image")
                        )

                        if isinstance(imagem, list):
                            imagem = imagem[0] if imagem else None

                        if isinstance(imagem, dict):
                            imagem = (
                                imagem.get("url")
                                or imagem.get("contentUrl")
                            )

                        if imagem:
                            thumbnails.append(
                                urljoin(
                                    resposta.url,
                                    str(imagem)
                                )
                            )
                            break

                except Exception:
                    continue

        # THUMBNAIL DO PLAYER
        if not thumbnails:
            for meta in soup.find_all("meta"):
                nome = (
                    meta.get("property")
                    or meta.get("name")
                    or ""
                ).lower()

                valor = meta.get("content")

                if nome in (
                    "og:image",
                    "og:image:url",
                    "twitter:image",
                    "twitter:image:src"
                ):
                    adicionar_imagem(
                        valor,
                        nome
                    )

        # IMAGENS DA PÁGINA
        for img in soup.find_all("img"):
            contexto = (
                " ".join(
                    str(x or "")
                    for x in (
                        img.get("alt"),
                        img.get("title"),
                        img.get("class"),
                        img.get("width"),
                        img.get("height")
                    )
                )
            )

            for chave in (
                "data-original",
                "data-full",
                "data-large",
                "data-src",
                "src"
            ):
                adicionar_imagem(
                    img.get(chave),
                    contexto
                )

        if not videos:
            return None

        videos.sort(
            key=lambda x: x[0],
            reverse=True
        )

        imagens.sort(
            key=lambda x: x[0],
            reverse=True
        )

        return {
            "url": videos[0][1],
            "tipo": "video",

            # Nunca usar uma imagem aleatória da página.
            # Sem poster/thumbnail real do player,
            # deixa None para evitar logo/avatar do site.
            "thumbnail": (
                thumbnails[0]
                if thumbnails
                else None
            ),

            "duracao": duracao
        }

    except Exception as erro:
        print(
            f"[DIRETO] Descoberta falhou: {erro}"
        )
        return None


def _baixar_midia_publica_direta(url):
    meta = _extrair_midia_direta_pagina(
        url
    )

    if not meta:
        return None

    endereco = meta.get("url")

    if not endereco:
        return None

    pasta = (
        Path(PASTA_DOWNLOAD)
        / "direto"
    )

    pasta.mkdir(
        parents=True,
        exist_ok=True
    )

    ext = (
        Path(
            urlparse(endereco).path
        ).suffix.lower()
    )

    if ext not in (
        ".mp4",
        ".m4v",
        ".webm",
        ".mov",
        ".mkv"
    ):
        ext = ".mp4"

    nome = (
        "kyara-direto-"
        + str(
            int(
                time.time() * 1000
            )
        )
        + ext
    )

    saida = pasta / nome

    print(
        "[DIRETO] 🚀 Arquivo direto:",
        endereco
    )

    try:
        with requests.get(
            endereco,
            headers=HEADERS,
            stream=True,
            timeout=(8, 30),
            allow_redirects=True
        ) as resposta:

            resposta.raise_for_status()

            tipo = (
                resposta.headers.get(
                    "content-type",
                    ""
                ).lower()
            )

            if (
                "text/html" in tipo
                or "application/xhtml+xml" in tipo
            ):
                raise RuntimeError(
                    "Servidor devolveu HTML em vez de mídia."
                )

            with open(
                saida,
                "wb"
            ) as arquivo:
                for bloco in resposta.iter_content(
                    chunk_size=1024 * 1024
                ):
                    if bloco:
                        arquivo.write(
                            bloco
                        )

        tamanho = saida.stat().st_size

        if tamanho <= 0:
            raise RuntimeError(
                "Arquivo vazio."
            )

        # Validação rápida da assinatura MP4.
        if ext == ".mp4":
            with open(
                saida,
                "rb"
            ) as arquivo:
                cabecalho = arquivo.read(
                    64
                )

            if b"ftyp" not in cabecalho:
                raise RuntimeError(
                    "Arquivo não parece ser um MP4 válido."
                )

        print(
            f"[DIRETO] ✅ Download: "
            f"{tamanho / 1024 / 1024:.2f} MiB"
        )

        return {
            "ok": True,
            "titulo": (
                Path(
                    urlparse(endereco).path
                ).stem
                or "Mídia"
            ),
            "arquivo": str(saida),
            "tamanho": tamanho,
            "tipo": meta.get(
                "tipo",
                "video"
            ),
            "thumbnail": meta.get(
                "thumbnail"
            ),
            "duracao": meta.get(
                "duracao",
                ""
            )
        }

    except Exception as erro:
        try:
            saida.unlink(
                missing_ok=True
            )
        except Exception:
            pass

        print(
            f"[DIRETO] ❌ {erro}"
        )

        return None



def baixar_url(url):
    url = normalizar_url(
        url
    )

    if not url.startswith(
        ("http://", "https://")
    ):
        return {
            "ok": False,
            "erro": "URL inválida."
        }

    if url_bloqueada(url):
        return {
            "ok": False,
            "erro": (
                "Domínio bloqueado "
                "pelo modo seguro."
            )
        }

    pasta = Path(
        PASTA_DOWNLOAD
    )

    pasta.mkdir(
        parents=True,
        exist_ok=True
    )

    _limpar_downloads_temporarios()

    print(
        f"[DOWNLOAD] ⚡ Tentando mídia direta primeiro: {url}"
    )

    direto = _baixar_midia_publica_direta(
        url
    )

    if direto and direto.get("ok"):
        return direto

    antes = {
        str(
            item.resolve()
        )
        for item
        in pasta.iterdir()
        if item.is_file()
    }

    opcoes = {
        "outtmpl": str(
            pasta
            / "%(title).120s [%(id)s].%(ext)s"
        ),

        # Melhor combinação compatível
        # sem recompressão.
        "format": (
            "bestvideo*[ext=mp4]"
            "+bestaudio[ext=m4a]/"
            "best[ext=mp4]/"
            "bestvideo*+bestaudio/best"
        ),

        "merge_output_format":
            "mp4",

        "noplaylist":
            True,

        "continuedl":
            True,

        "overwrites":
            True,

        # Paralelismo.
        "concurrent_fragment_downloads":
            8,

        "retries":
            4,

        "fragment_retries":
            4,

        "file_access_retries":
            5,

        "socket_timeout":
            20,

        "extractor_retries":
            2,

        "quiet":
            False,

        "no_warnings":
            False,

        "http_headers":
            HEADERS,
    }

    try:

        print(
            f"[DOWNLOAD] Iniciando: "
            f"{url}"
        )

        with obter_yt_dlp().YoutubeDL(
            opcoes
        ) as ydl:

            info = ydl.extract_info(
                url,
                download=True
            )

        titulo = (
            normalizar_titulo(
                info.get("title")
                if isinstance(
                    info,
                    dict
                )
                else ""
            )
            or "Vídeo"
        )

        depois = {
            str(
                item.resolve()
            )
            for item
            in pasta.iterdir()
            if item.is_file()
        }

        novos = [
            Path(nome)
            for nome
            in (
                depois - antes
            )
            if (
                Path(nome).is_file()
                and Path(nome).stat().st_size > 0
                and not Path(nome).name.endswith(
                    (
                        ".part",
                        ".ytdl"
                    )
                )
            )
        ]

        if not novos:
            return {
                "ok": False,
                "erro": (
                    "O downloader terminou "
                    "sem produzir um arquivo "
                    "de mídia."
                )
            }

        arquivo = max(
            novos,
            key=lambda x:
                x.stat().st_mtime
        )

        tamanho = (
            arquivo.stat().st_size
        )

        print(
            f"[DOWNLOAD] "
            f"Arquivo temporário: "
            f"{arquivo}"
        )

        print(
            "[DOWNLOAD] Tamanho: "
            f"{tamanho / 1024 / 1024:.2f} MiB"
        )

        return {
            "ok": True,
            "titulo": titulo,
            "arquivo": str(
                arquivo
            ),
            "tamanho": tamanho,
        }

    except Exception as erro:

        _remover_arquivos_novos(
            pasta,
            antes
        )

        print(
            f"[DOWNLOAD] Erro: "
            f"{erro}"
        )

        return {
            "ok": False,
            "erro": str(
                erro
            )
        }

def formatar_resultados(
    site,
    termo,
    resultados
):
    linhas = [
        f"🔎 RESULTADOS PARA: {termo}",
        ""
    ]

    for numero, resultado in enumerate(
        resultados,
        start=1
    ):
        titulo = normalizar_titulo(
            resultado.get("titulo")
        )

        if not titulo:
            continue

        linhas.append(
            f"{numero}. {titulo}"
        )

    linhas.extend([
        "",
        "⬇️ Para baixar:",
        f"1",
        f"2",
        f"3",
        "",
        "Ou use #baixar "
        f"{site} número"
    ])

    return "\n".join(linhas)


def selecionar_resultado(numero):
    global ULTIMO_SITE

    carregar_sessao()

    if not ULTIMO_SITE:
        return (
            "❌ Nenhuma pesquisa disponível."
        )

    resultado = obter_resultado(
        ULTIMO_SITE,
        numero
    )

    if not resultado:
        pesquisa = ULTIMA_PESQUISA.get(
            ULTIMO_SITE
        )

        quantidade = (
            len(
                pesquisa["resultados"]
            )
            if pesquisa
            else 0
        )

        if quantidade:
            return (
                f"❌ Resultado {numero} inválido.\n\n"
                f"Escolha entre 1 e {quantidade}."
            )

        return (
            "❌ A pesquisa anterior "
            "não possui resultados."
        )

    titulo = normalizar_titulo(
        resultado.get("titulo")
    )

    url = resultado.get("url")

    if not titulo or not url:
        return (
            "❌ Resultado inválido."
        )

    print(
        f"\n⬇️ Selecionado #{numero}"
    )
    print(
        f"🎬 {titulo}"
    )
    print(
        f"🔗 {url}"
    )

    download = baixar_url(
        url
    )

    if not download.get("ok"):
        return (
            "❌ Não foi possível baixar "
            "este resultado.\n\n"
            f"{download.get('erro', 'Erro desconhecido.')}"
        )

    return (
        "✅ DOWNLOAD CONCLUÍDO!\n\n"
        f"🎬 {download.get('titulo', titulo)}\n"
        f"📁 {download.get('arquivo', '')}"
    )



def _kyara_extrair_arquivo_saida(texto):
    for linha in reversed(
        str(texto or "").splitlines()
    ):
        if "📁" not in linha:
            continue

        caminho = (
            linha
            .split("📁", 1)[1]
            .strip()
        )

        if caminho and os.path.isfile(caminho):
            return caminho

    return None


def _kyara_arquivo_mais_recente():
    pasta = Path(PASTA_DOWNLOAD)

    if not pasta.exists():
        return None

    arquivos = [
        item
        for item in pasta.iterdir()
        if item.is_file()
    ]

    if not arquivos:
        return None

    arquivos.sort(
        key=lambda item: item.stat().st_mtime,
        reverse=True
    )

    return str(
        arquivos[0]
    )


def processar_comando_estruturado(texto):
    texto = str(texto or "").strip()

    if not texto:
        return {
            "ok": False,
            "type": "error",
            "output": "❌ Digite um comando."
        }

    # Aceita # ou /
    if texto.startswith(("#", "/")):
        texto = "/" + texto[1:].strip()

    texto_lower = texto.lower()

    # ========================================================
    # SITES
    # ========================================================

    if texto_lower in (
        "/sites",
        "/listasites",
        "/listsites",
    ):
        sites = carregar_sites()

        linhas = [
            "🌸 SITES CADASTRADOS",
            ""
        ]

        for nome, dados in sites.items():
            if isinstance(dados, dict):
                url = dados.get("url", "")
            else:
                url = str(dados)

            linhas.append(
                f"• {nome} → {url}"
            )

        return {
            "ok": True,
            "type": "sites",
            "output": "\n".join(linhas),
            "sites": sites
        }

    # ========================================================
    # DOWNLOAD DIRETO
    # ========================================================

    if texto_lower.startswith("/baixarurl"):
        partes = texto.split(maxsplit=1)

        if len(partes) < 2:
            return {
                "ok": False,
                "type": "download",
                "output":
                    "⚠️ Uso correto:\n"
                    "#baixarurl https://url-do-video"
            }

        url = partes[1].strip()

        if not re.match(
            r"^https?://",
            url,
            re.I
        ):
            return {
                "ok": False,
                "type": "download",
                "output": "❌ URL inválida."
            }

        try:
            resultado = baixar_url(url)

            if isinstance(resultado, dict):
                ok = bool(
                    resultado.get("ok")
                )

                erro = resultado.get(
                    "erro"
                )

                arquivo = (
                    resultado.get("arquivo")
                    if ok
                    else None
                )

                return {
                    "ok": ok,
                    "type": "download",
                    "output":
                        (
                            "❌ " + str(erro)
                            if erro and not ok
                            else "✅ Download concluído!"
                        ),
                    "filePath": arquivo,
                    "arquivo": arquivo,
                    "url": url
                }

            return {
                "ok": False,
                "type": "download",
                "output": "❌ Resultado de download inválido.",
                "filePath": None,
                "arquivo": None,
                "url": url
            }

        except Exception as erro:
            return {
                "ok": False,
                "type": "download",
                "output":
                    f"❌ Erro no download: {erro}",
                "filePath": None,
                "url": url
            }

    # ========================================================
    # PESQUISA
    # ========================================================

    if texto_lower.startswith("/baixar"):
        partes = texto.split(
            maxsplit=2
        )

        if len(partes) < 3:
            return {
                "ok": False,
                "type": "search",
                "output":
                    "⚠️ Uso correto:\n"
                    "baixar site nome do vídeo",
                "results": []
            }

        nome_site = (
            partes[1]
            .lower()
            .strip()
        )

        argumento = (
            partes[2]
            .strip()
        )

        quantidade = 10

        if argumento:
            m = re.match(
                r"^(\d+)\s+(.+)$",
                argumento
            )
            if m:
                quantidade = max(
                    1,
                    min(50, int(m.group(1)))
                )
                argumento = m.group(2).strip()

        sites = carregar_sites()

        if nome_site not in sites:
            return {
                "ok": False,
                "type": "search",
                "output":
                    f"❌ Site '{nome_site}' não está cadastrado.\n\n"
                    "Use #sites.",
                "results": []
            }

        if len(argumento) < 2:
            return {
                "ok": False,
                "type": "search",
                "output":
                    "❌ Digite pelo menos 2 caracteres.",
                "results": []
            }

        try:
            resultados = pesquisar_site(
                sites[nome_site],
                argumento,
                limite=quantidade
            )

            resultados = [
                item
                for item in resultados
                if item.get("url")
                and normalizar_titulo(
                    item.get("titulo")
                )
            ][:quantidade]

            # --------------------------------------------------
            # Identidade do site + tipo da mídia.
            # --------------------------------------------------

            for item in resultados:
                if not isinstance(item, dict):
                    continue

                item.setdefault(
                    "site",
                    nome_site
                )

                # Pinterest: quando temos thumbnail e nenhum
                # indicador explícito de vídeo, tratamos como imagem.
                if nome_site in (
                    "pinterest",
                    "pin"
                ):
                    possui_video = any(
                        item.get(chave)
                        for chave in (
                            "video",
                            "video_url",
                            "videoUrl",
                            "video_url_hd",
                            "videoUrlHd"
                        )
                    )

                    if (
                        item.get("thumbnail")
                        and not possui_video
                        and item.get("tipo")
                        not in (
                            "video",
                            "videoclip",
                            "mp4"
                        )
                    ):
                        item.setdefault(
                            "tipo",
                            "image"
                        )
                        item.setdefault(
                            "mediaType",
                            "image"
                        )

            if resultados:

                # ==================================================
                # IDENTIDADE DA MÍDIA
                # ==================================================

                for item in resultados:
                    if not isinstance(item, dict):
                        continue

                    item.setdefault(
                        "site",
                        nome_site
                    )

                    if nome_site in {
                        "pinterest",
                        "pin"
                    }:
                        item["tipo"] = "image"
                        item["mediaType"] = "image"
                        item["media_type"] = "image"
                        item["duracao"] = ""
                        item["duracao_segundos"] = None

                # ==================================================
                # RULE34 PRIME: já possui mídia direta.
                # Não executar enriquecimento/yt-dlp.
                # ==================================================
                if nome_site == "rule34":
                    print(
                        f"[METADATA] Rule34: metadata externa ignorada "
                        f"({len(resultados)} resultado(s))"
                    )

                    for item in resultados:
                        if isinstance(item, dict):
                            item.setdefault(
                                "thumbnail",
                                item.get("url")
                            )
                            item.setdefault(
                                "duracao",
                                None
                            )
                            item.setdefault(
                                "duracao_segundos",
                                None
                            )
                else:
                    print(
                        f"[METADATA] Obtendo thumbnail + duração de {len(resultados)} resultado(s)..."
                    )
                    resultados = enriquecer_resultados(
                        resultados,
                        workers=4
                    )

            if not resultados:
                return {
                    "ok": False,
                    "type": "search",
                    "output":
                        "❌ Nenhum resultado encontrado.",
                    "site": nome_site,
                    "query": argumento,
                    "results": []
                }

            salvar_ultima_pesquisa(
                nome_site,
                argumento,
                resultados
            )

            return {
                "ok": True,
                "type": "search",
                "site": nome_site,
                "query": argumento,
                "results": resultados,
                "output":
                    f"🔎 {len(resultados)} resultado(s) encontrado(s)."
            }

        except Exception as erro:
            return {
                "ok": False,
                "type": "search",
                "output":
                    f"❌ Erro na pesquisa: {erro}",
                "results": []
            }

    return {
        "ok": False,
        "type": "error",
        "output": "❌ Comando desconhecido."
    }


def processar_comando(texto):
    texto = str(texto or "").strip()

    if not texto:
        return "❌ Digite um comando."

    # Aceita os dois prefixos do Kyara: # e /
    # Mantém compatibilidade com o parser antigo baseado em /.
    if texto.startswith(("#", "/")):
        comando_sem_prefixo = texto[1:].strip()

        # Também aceita #1, #2, #3 e /1, /2, /3...
        if comando_sem_prefixo.isdigit():
            return selecionar_resultado(
                int(comando_sem_prefixo)
            )

        texto = "/" + comando_sem_prefixo

    texto_lower = texto.lower()

    # --------------------------------------------------------
    # Seleção rápida: 1 / 2 / 3
    # --------------------------------------------------------

    if texto.isdigit():
        return selecionar_resultado(
            int(texto)
        )

    # --------------------------------------------------------
    # /siteadd
    # --------------------------------------------------------

    if texto_lower.startswith(
        "/siteadd"
    ):
        partes = texto.split(
            maxsplit=2
        )

        if len(partes) < 3:
            return (
                "⚠️ Uso correto:\n"
                "/siteadd nome https://site.com"
            )

        return adicionar_site(
            partes[1],
            partes[2]
        )

    # --------------------------------------------------------
    # /sitedel
    # --------------------------------------------------------

    if texto_lower.startswith(
        "/sitedel"
    ):
        partes = texto.split(
            maxsplit=1
        )

        if len(partes) < 2:
            return (
                "⚠️ Uso correto:\n"
                "/sitedel nome"
            )

        return remover_site(
            partes[1]
        )

    # --------------------------------------------------------
    # /sites + alias /listasites
    # --------------------------------------------------------

    if texto_lower in (
        "/sites",
        "/listasites",
        "/listsites",
    ):
        return listar_sites()

    # --------------------------------------------------------
    # /baixarurl
    # TEM QUE FICAR ANTES DE /baixar
    # --------------------------------------------------------

    if texto_lower.startswith(
        "/baixarurl"
    ):
        partes = texto.split(
            maxsplit=1
        )

        if len(partes) < 2:
            return (
                "⚠️ Uso correto:\n"
                "/baixarurl https://url-do-video"
            )

        url = partes[1].strip()

        if not re.match(
            r"^https?://",
            url,
            re.I
        ):
            return (
                "❌ URL inválida. Use http:// ou https://"
            )

        return baixar_url(url)

    # --------------------------------------------------------
    # /baixar
    #
    # /baixar site termo
    # /baixar site 1
    # --------------------------------------------------------

    if texto_lower.startswith(
        "/baixar"
    ):
        partes = texto.split(
            maxsplit=2
        )

        if len(partes) < 3:
            return (
                "⚠️ Uso correto:\n"
                "/baixar site nome do vídeo\n\n"
                "Depois escolha 1, 2, 3..."
            )

        nome_site = partes[1].lower()
        argumento = partes[2].strip()

        quantidade = 10

        if argumento:
            m = re.match(
                r"^(\d+)\s+(.+)$",
                argumento
            )
            if m:
                quantidade = max(
                    1,
                    min(50, int(m.group(1)))
                )
                argumento = m.group(2).strip()

        sites = carregar_sites()

        if nome_site not in sites:
            return (
                f"❌ Site '{nome_site}' "
                "não está cadastrado.\n\n"
                "Use /sites."
            )

        # Seleção.
        if argumento.isdigit():
            return selecionar_resultado(
                int(argumento)
            )

        # Pesquisa.
        if len(argumento) < 2:
            return (
                "❌ Digite pelo menos "
                "2 caracteres para pesquisar."
            )

        print(
            f"\n🔎 Pesquisando "
            f"'{argumento}' em '{nome_site}'..."
        )

        resultados = pesquisar_site(
            sites[nome_site],
            argumento,
            limite=quantidade
        )

        # Remove qualquer resultado sem título
        # que tenha escapado do extractor.
        resultados = [
            item
            for item in resultados
            if normalizar_titulo(
                item.get("titulo")
            )
            and item.get("url")
        ]

        if not resultados:
            return (
                "❌ Nenhum resultado de conteúdo "
                "foi encontrado.\n\n"
                "O site pode exigir JavaScript, "
                "ter uma busca própria ou não expor "
                "os resultados por HTML."
            )

        salvar_ultima_pesquisa(
            nome_site,
            argumento,
            resultados
        )

        return formatar_resultados(
            nome_site,
            argumento,
            resultados
        )

    return (
        "❌ Comando desconhecido.\n\n"
        "Comandos disponíveis:\n"
        "/siteadd nome URL\n"
        "/sites\n"
        "/listasites\n"
        "/sitedel nome\n"
        "/baixar site nome\n"
        "1 / 2 / 3 para selecionar"
    )




# ============================================================
# COMANDOS DE BLOQUEIO MANUAL
# ============================================================

def comando_siteblock(valor):
    resultado = bloquear_site_manual(valor)

    if not resultado["ok"]:
        return "❌ " + resultado["erro"]

    return (
        "🚫 *DOMÍNIO BLOQUEADO*\n\n"
        f"🌐 {resultado['dominio']}\n\n"
        "Use `#siteunblock "
        f"{resultado['dominio']}` para desbloquear."
    )


def comando_siteunblock(valor):
    resultado = desbloquear_site_manual(valor)

    if not resultado["ok"]:
        return "❌ " + resultado["erro"]

    return (
        "✅ *DOMÍNIO DESBLOQUEADO*\n\n"
        f"🌐 {resultado['dominio']}\n\n"
        "O domínio foi removido da sua lista de bloqueios manuais."
    )


def comando_siteblocks():
    bloqueados = carregar_bloqueios_manuais()

    if not bloqueados:
        return (
            "📋 *BLOQUEIOS MANUAIS*\n\n"
            "Nenhum domínio bloqueado manualmente."
        )

    linhas = "\n".join(
        f"{i}. {dominio}"
        for i, dominio in enumerate(bloqueados, 1)
    )

    return (
        "📋 *BLOQUEIOS MANUAIS*\n\n"
        + linhas
        + "\n\n"
        "Use `#siteunblock domínio.com` para remover."
    )


if __name__ == "__main__":

    # ------------------------------------------------------
    # Modo comando único.
    #
    # Permite ao Node/Kyara chamar:
    #
    # python3 bot_videos.py "/baixar site Naruto"
    #
    # ------------------------------------------------------

    if len(sys.argv) > 1:
        comando = " ".join(
            sys.argv[1:]
        ).strip()

        if os.environ.get(
            "KYARA_JSON"
        ) == "1":
            resultado = (
                processar_comando_estruturado(
                    comando
                )
            )

            print(
                "@@KYARA_JSON@@" +
                json.dumps(
                    resultado,
                    ensure_ascii=False,
                    separators=(",", ":")
                )
            )
        else:
            print(
                processar_comando(
                    comando
                )
            )

        raise SystemExit(0)

    # ------------------------------------------------------
    # Modo terminal interativo.
    # ------------------------------------------------------

    print(
        "🌸 BKkyara Universal Downloader"
    )
    print(
        "Digite 'sair' para fechar.\n"
    )

    while True:
        try:
            mensagem = input(
                "WhatsApp > "
            ).strip()

        except (KeyboardInterrupt, EOFError):
            print("\n👋 Encerrado.")
            break

        if mensagem.lower() == "sair":
            print("👋 Encerrado.")
            break

        print()
        print(
            processar_comando(mensagem)
        )
        print()
