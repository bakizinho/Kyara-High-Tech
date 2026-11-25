import {
  getConfiguredBotName,
  getKyaraEmoji
} from '../core/identity/kyara-identity.js'

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';
import os from 'os';
import {
  sendKyaraMediaAlbum
} from '../core/mediaAlbum/index.js';

import {
  proto,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  isJidGroup
} from 'baileys';

import {
  MAX_IMAGES as RULE34_MAX_IMAGES,
  pickFreshRule34,
  sendRule34Album
} from '../core/rule34/index.js';

/* =========================================================
   KYARA VIDEO FLOW • CAROUSEL AVANÇADO
   ========================================================= */

const TTL_MS = 5 * 60 * 1000;
const MAX_RESULTS = 10;
const MAX_CARDS = 10;
const THUMB_CONCURRENCY = 4;

const SESSION_PREFIX = 'kyara:video:';

const PROJECT_ROOT =
  process.env.KYARA_ROOT ||
  process.cwd();

const SESSIONS =
  global.kyaraVideoFlowSessions ||
  new Map();

global.kyaraVideoFlowSessions = SESSIONS;

/* =========================================================
   KYARA VIDEO HISTORY • ROTAÇÃO DE RESULTADOS
   Chave: JID + SITE + CONSULTA EXATA
   ========================================================= */

const KYARA_GENERIC_HISTORY_FILE =
  path.join(
    PROJECT_ROOT,
    'dados',
    'data',
    'kyara-video-seen.json'
  );

const KYARA_GENERIC_SEARCH_POOL = 30;

const KYARA_GENERIC_HISTORY_MAX =
  500;

const KYARA_GENERIC_HISTORY =
  new Map();

let KYARA_GENERIC_HISTORY_LOADED =
  false;

function normalizarHistoricoVideo(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function chaveHistoricoVideo(
  jid,
  site,
  consulta
) {
  return [
    normalizarHistoricoVideo(jid),
    normalizarHistoricoVideo(site),
    normalizarHistoricoVideo(consulta)
  ].join('::');
}

function carregarHistoricoVideo() {
  if (KYARA_GENERIC_HISTORY_LOADED) {
    return;
  }

  KYARA_GENERIC_HISTORY_LOADED = true;

  try {
    if (
      !fs.existsSync(
        KYARA_GENERIC_HISTORY_FILE
      )
    ) {
      return;
    }

    const bruto =
      fs.readFileSync(
        KYARA_GENERIC_HISTORY_FILE,
        'utf8'
      );

    const dados =
      JSON.parse(bruto);

    if (
      !dados ||
      typeof dados !== 'object' ||
      Array.isArray(dados)
    ) {
      return;
    }

    for (
      const [chave, valores]
      of Object.entries(dados)
    ) {
      if (!Array.isArray(valores)) {
        continue;
      }

      KYARA_GENERIC_HISTORY.set(
        chave,
        new Set(
          valores
            .map(v =>
              normalizarHistoricoVideo(v)
            )
            .filter(Boolean)
        )
      );
    }

  } catch (erro) {
    console.warn(
      '[KYARA VIDEO HISTORY] Falha ao carregar:',
      erro?.message || erro
    );
  }
}

function salvarHistoricoVideo() {
  try {
    fs.mkdirSync(
      path.dirname(
        KYARA_GENERIC_HISTORY_FILE
      ),
      {
        recursive: true
      }
    );

    const objeto =
      Object.fromEntries(
        [...KYARA_GENERIC_HISTORY.entries()]
          .map(([chave, set]) => [
            chave,
            [...set]
          ])
      );

    fs.writeFileSync(
      KYARA_GENERIC_HISTORY_FILE,
      JSON.stringify(
        objeto,
        null,
        2
      ),
      'utf8'
    );

  } catch (erro) {
    console.warn(
      '[KYARA VIDEO HISTORY] Falha ao salvar:',
      erro?.message || erro
    );
  }
}

function identidadeHistoricoVideo(
  item
) {
  if (!item || typeof item !== 'object') {
    return '';
  }

  return normalizarHistoricoVideo(
    item.id ||
    item.videoId ||
    item.video_id ||
    item.postId ||
    item.post_id ||
    item.webpage_url ||
    item.original_url ||
    item.url ||
    item.link ||
    item.video_url ||
    ''
  );
}

function quantidadeHistoricoVideo(
  jid,
  site,
  consulta
) {
  carregarHistoricoVideo();

  const chave =
    chaveHistoricoVideo(
      jid,
      site,
      consulta
    );

  return (
    KYARA_GENERIC_HISTORY.get(
      chave
    )?.size || 0
  );
}

function selecionarResultadosNovosVideo(
  jid,
  site,
  consulta,
  candidatos,
  limite
) {
  carregarHistoricoVideo();

  const chave =
    chaveHistoricoVideo(
      jid,
      site,
      consulta
    );

  const vistos =
    KYARA_GENERIC_HISTORY.get(
      chave
    ) ||
    new Set();

  const local =
    new Set();

  const saida = [];

  for (
    const item
    of (
      Array.isArray(candidatos)
        ? candidatos
        : []
    )
  ) {
    const identidade =
      identidadeHistoricoVideo(
        item
      );

    if (!identidade) {
      continue;
    }

    if (
      vistos.has(
        identidade
      )
    ) {
      continue;
    }

    if (
      local.has(
        identidade
      )
    ) {
      continue;
    }

    local.add(
      identidade
    );

    saida.push(
      item
    );

    if (
      saida.length >=
      Math.max(
        1,
        Number(limite) || 10
      )
    ) {
      break;
    }
  }

  console.log(
    '[KYARA VIDEO HISTORY]',
    JSON.stringify({
      site,
      consulta,
      vistos: vistos.size,
      candidatos:
        Array.isArray(candidatos)
          ? candidatos.length
          : 0,
      novos: saida.length
    })
  );

  return saida;
}

function lembrarResultadosVideo(
  jid,
  site,
  consulta,
  resultados
) {
  carregarHistoricoVideo();

  const chave =
    chaveHistoricoVideo(
      jid,
      site,
      consulta
    );

  const set =
    KYARA_GENERIC_HISTORY.get(
      chave
    ) ||
    new Set();

  for (
    const item
    of (
      Array.isArray(resultados)
        ? resultados
        : []
    )
  ) {
    const identidade =
      identidadeHistoricoVideo(
        item
      );

    if (identidade) {
      set.add(
        identidade
      );
    }
  }

  while (
    set.size >
    KYARA_GENERIC_HISTORY_MAX
  ) {
    const primeiro =
      set.values()
        .next()
        .value;

    if (
      primeiro ===
      undefined
    ) {
      break;
    }

    set.delete(
      primeiro
    );
  }

  KYARA_GENERIC_HISTORY.set(
    chave,
    set
  );

  salvarHistoricoVideo();
}


/* =========================================================
   UTILS
   ========================================================= */

function agora() {
  return Date.now();
}

function limparTexto(valor, max = 500) {
  return String(valor || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function limitar(valor, max) {
  const texto = limparTexto(valor, max);

  if (texto.length <= max) {
    return texto;
  }

  return `${texto.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function escaparRegExp(texto) {
  return String(texto || '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* =========================================================
   PREFIXO DINÂMICO
   ========================================================= */

function obterPrefixosConfigurados() {
  const valores = [
    globalThis.__KYARA_PREFIX__,
    global.prefix,
    global.prefixo,
    global.pref,
    global.PREFIX,
    global.PREFIXO,
    process.env.BOT_PREFIX,
    process.env.PREFIX
  ];

  const saida = [];

  for (const valor of valores) {
    if (typeof valor !== 'string') continue;

    const p = valor.trim();

    if (!p) continue;

    if (!saida.includes(p)) {
      saida.push(p);
    }
  }

  return saida;
}

function obterSitesVideoConfigurados() {
  const arquivo =
    path.join(PROJECT_ROOT, 'sites_videos.json');

  try {
    const dados =
      JSON.parse(fs.readFileSync(arquivo, 'utf8'));

    return (
      dados &&
      typeof dados === 'object' &&
      !Array.isArray(dados)
    )
      ? dados
      : {};
  } catch {
    return {};
  }
}

function obterSitePadraoBaixar() {
  const sites =
    obterSitesVideoConfigurados();

  const arquivoSessao =
    path.join(
      PROJECT_ROOT,
      'downloads_session.json'
    );

  try {
    const sessao =
      JSON.parse(
        fs.readFileSync(
          arquivoSessao,
          'utf8'
        )
      );

    const ultimoSite =
      limparTexto(
        sessao?.ultimo_site,
        80
      ).toLowerCase();

    if (
      ultimoSite &&
      sites[ultimoSite]
    ) {
      return ultimoSite;
    }
  } catch {}

  return null;
}


const KYARA_VIDEO_SITE_CACHE = {
  expiresAt: 0,
  aliases: new Map()
};

function normalizarAliasSiteVideo(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

function aliasSiteVideoValido(valor = '') {
  return /^[a-z0-9][a-z0-9_-]{1,31}$/.test(
    String(valor || '')
  );
}

function urlSiteVideoValida(valor = '') {
  return /^https?:\/\//i.test(
    String(valor || '').trim()
  );
}

function adicionarAliasSiteVideo(
  aliases,
  nome,
  url
) {
  const alias =
    normalizarAliasSiteVideo(nome);

  const endereco =
    String(url || '').trim();

  if (
    !aliasSiteVideoValido(alias) ||
    !urlSiteVideoValida(endereco)
  ) {
    return;
  }

  aliases.set(
    alias,
    endereco
  );
}

function varrerRegistroSitesVideo(
  valor,
  aliases,
  chaveAtual = '',
  visitados = new Set()
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return;
  }

  if (
    typeof valor === 'object' &&
    valor !== null
  ) {
    if (visitados.has(valor)) {
      return;
    }

    visitados.add(valor);
  }

  if (
    typeof valor === 'string'
  ) {
    if (
      urlSiteVideoValida(valor) &&
      chaveAtual
    ) {
      adicionarAliasSiteVideo(
        aliases,
        chaveAtual,
        valor
      );
    }

    return;
  }

  if (Array.isArray(valor)) {
    for (const item of valor) {
      varrerRegistroSitesVideo(
        item,
        aliases,
        chaveAtual,
        visitados
      );
    }

    return;
  }

  if (
    typeof valor !== 'object'
  ) {
    return;
  }

  const possivelNome =
    valor.alias ||
    valor.nome ||
    valor.name ||
    valor.site ||
    valor.id ||
    '';

  const possivelUrl =
    valor.url ||
    valor.link ||
    valor.href ||
    valor.endereco ||
    valor.address ||
    '';

  if (
    possivelNome &&
    possivelUrl
  ) {
    adicionarAliasSiteVideo(
      aliases,
      possivelNome,
      possivelUrl
    );
  }

  for (
    const [chave, conteudo]
    of Object.entries(valor)
  ) {
    if (
      typeof conteudo === 'string' &&
      urlSiteVideoValida(conteudo)
    ) {
      adicionarAliasSiteVideo(
        aliases,
        chave,
        conteudo
      );
    }

    varrerRegistroSitesVideo(
      conteudo,
      aliases,
      chave,
      visitados
    );
  }
}

function carregarAliasesSitesVideo() {
  const agoraMs =
    Date.now();

  if (
    KYARA_VIDEO_SITE_CACHE.expiresAt >
    agoraMs
  ) {
    return KYARA_VIDEO_SITE_CACHE.aliases;
  }

  const aliases =
    new Map();

  const raiz =
    path.join(
      process.cwd(),
      'dados'
    );

  const ignorarDiretorios =
    new Set([
      'node_modules',
      '.git',
      'tmp',
      'temp',
      'sessions',
      'auth',
      'backups'
    ]);

  const limiteArquivos =
    250;

  let arquivosLidos = 0;

  function visitarDiretorio(
    diretorio,
    profundidade = 0
  ) {
    if (
      profundidade > 6 ||
      arquivosLidos >= limiteArquivos
    ) {
      return;
    }

    let entradas;

    try {
      entradas =
        fs.readdirSync(
          diretorio,
          {
            withFileTypes: true
          }
        );
    } catch {
      return;
    }

    for (
      const entrada of entradas
    ) {
      if (
        arquivosLidos >= limiteArquivos
      ) {
        break;
      }

      const nome =
        entrada.name;

      const caminho =
        path.join(
          diretorio,
          nome
        );

      if (
        entrada.isDirectory()
      ) {
        if (
          ignorarDiretorios.has(
            nome.toLowerCase()
          )
        ) {
          continue;
        }

        visitarDiretorio(
          caminho,
          profundidade + 1
        );

        continue;
      }

      if (
        !entrada.isFile() ||
        !nome.toLowerCase().endsWith('.json')
      ) {
        continue;
      }

      try {
        const texto =
          fs.readFileSync(
            caminho,
            'utf8'
          );

        if (
          !texto.trim()
        ) {
          continue;
        }

        const dados =
          JSON.parse(texto);

        varrerRegistroSitesVideo(
          dados,
          aliases
        );

        arquivosLidos++;
      } catch {}
    }
  }

  visitarDiretorio(
    raiz
  );

  KYARA_VIDEO_SITE_CACHE.aliases =
    aliases;

  KYARA_VIDEO_SITE_CACHE.expiresAt =
    agoraMs + 5000;

  return aliases;
}

function siteAliasCadastradoVideo(
  alias
) {
  const nome =
    normalizarAliasSiteVideo(
      alias
    );

  if (
    !aliasSiteVideoValido(nome)
  ) {
    return false;
  }

  const aliases =
    carregarAliasesSitesVideo();

  return aliases.has(nome);
}

function extrairComandoBaixar(texto = '') {
  const original =
    String(texto || '').trim();

  if (!original) {
    return null;
  }

  const configurados =
    obterPrefixosConfigurados();

  /*
   * Se existe prefixo configurado,
   * SOMENTE ele é aceito.
   *
   * Exemplo:
   *
   * prefixo = #
   *
   * #baixar rule34 20 nami  ✅
   * /baixar rule34 20 nami  ❌
   */

  const prefixos =
    configurados.length
      ? configurados
      : ['#', '/'];

  for (
    const prefixo
    of prefixos
  ) {

    const regex =
      new RegExp(
        `^\\s*${escaparRegExp(prefixo)}baixar\\s+(.+?)\\s*$`,
        'iu'
      );

    const match =
      original.match(
        regex
      );

    if (!match) {
      continue;
    }

    const resto =
      String(
        match[1] || ''
      ).trim();

    /*
     * =======================================================
     * URL DIRETA
     * =======================================================
     *
     * Exemplos:
     *
     * #baixar https://site.com/video.mp4
     * #baixar https://site.com/imagem.jpg
     * #baixar https://www.reddit.com/r/.../s/...
     *
     * O prefixo configurado continua obrigatório.
     * Portanto, com prefixo "#":
     *
     * #baixar URL  ✅
     * /baixar URL  ❌
     */

    if (
      /^https?:\/\/\S+$/iu.test(
        resto
      )
    ) {

      console.log(
        '[KYARA VIDEO FLOW] URL DIRETA:',
        resto
      );

      return {
        modo:
          'url-direta',

        site:
          'url',

        consulta:
          resto,

        urlDireta:
          resto,

        quantidade:
          1,

        comandoPython:
          null
      };
    }

    const partes =
      resto
        .split(/\s+/)
        .filter(Boolean);

    if (
      partes.length < 2
    ) {
      return null;
    }

    const site =
      normalizarAliasSiteVideo(
        partes[0]
      );

    if (
      !siteAliasCadastradoVideo(
        site
      )
    ) {
      continue;
    }

    let quantidade = 10;

    let inicioConsulta = 1;

    if (
      /^\d+$/.test(
        partes[1] || ''
      )
    ) {

      quantidade =
        Math.max(
          1,
          Math.min(
            site === 'rule34'
              ? RULE34_MAX_IMAGES
              : 50,
            Number(
              partes[1]
            )
          )
        );

      inicioConsulta = 2;
    }

    const consulta =
      partes
        .slice(
          inicioConsulta
        )
        .join(' ')
        .trim();

    if (!consulta) {
      return null;
    }

    console.log(
      '[KYARA VIDEO FLOW] PRIME:',
      JSON.stringify({
        prefixo,
        site,
        quantidade,
        consulta
      })
    );

    return {
      site,

      consulta,

      quantidade,

      comandoPython:
        `${prefixo}baixar ` +
        `${site} ` +
        `${quantidade} ` +
        `${consulta}`
    };
  }

  return extrairComandoBaixarLegado(
    original
  );
}

function extrairComandoBaixarLegado(texto) {
  const bruto = String(texto || '')
    .trim();

  if (!bruto) return null;

  const prefixosConfigurados =
    obterPrefixosConfigurados();

  /*
   * Aceita:
   * /baixar pesquisa
   * /baixar site pesquisa
   * /baixar pesquisa
   * /baixar site pesquisa
   *
   * Também preserva os outros prefixos
   * já configurados.
   */
  const padroes = [];

  for (const prefixo of prefixosConfigurados) {
    padroes.push(
      new RegExp(
        `^\\s*${escaparRegExp(prefixo)}baixar\\s+(.+?)\\s*$`,
        'iu'
      )
    );
  }

  /*
   * Não existe mais regex universal para
   * /baixar ou #baixar.
   *
   * O prefixo configurado manda.
   */
  if (!prefixosConfigurados.length) {
    padroes.push(
      /^\s*[/#]baixar\s+(.+?)\s*$/iu
    );
  }

  for (const regex of padroes) {
    const match = bruto.match(regex);

    if (!match) continue;

    const payload =
      limparTexto(match[1], 580);

    if (!payload) {
      return null;
    }

    const partes =
      payload.split(/\s+/);

    let site = '';
    let consulta = '';
    let quantidade = 10;

    /*
     * Se o primeiro argumento for realmente
     * um site cadastrado, preserva:
     *
     * /baixar site pesquisa
     */
    if (partes.length >= 2) {
      const candidatoSite =
        limparTexto(
          partes[0],
          80
        ).toLowerCase();

      const sites =
        obterSitesVideoConfigurados();

      if (
        candidatoSite &&
        sites[candidatoSite]
      ) {
        site =
          candidatoSite;

        let inicioConsulta = 1;

        if (
          /^\d+$/.test(partes[1] || '')
        ) {
          quantidade =
            Math.max(
              1,
              Math.min(
                50,
                Number(partes[1])
              )
            );

          inicioConsulta = 2;
        }

        consulta =
          limparTexto(
            partes.slice(inicioConsulta).join(' '),
            500
          );
      }
    }

    /*
     * Sem site explícito:
     *
     * /baixar pesquisa
     *
     * Usa o ultimo_site que o
     * bot_videos.py já mantém.
     */
    if (!site) {
      site =
        obterSitePadraoBaixar();

      consulta =
        limparTexto(
          payload,
          500
        );
    }

    if (!site || !consulta) {
      return null;
    }

    return {
      site,
      consulta,
      quantidade,
      comandoPython:
        `/baixar ${site} ${quantidade} ${consulta}`
    };
  }

  return null;
}

/* =========================================================
   COMANDO
   ========================================================= */

export function isKyaraVideoSearchCommand(texto) {
  return !!extrairComandoBaixar(texto);
}

/* =========================================================
   IDENTIDADE / JID
   ========================================================= */

function jidBase(jid) {
  return String(jid || '')
    .trim()
    .split(':')[0];
}

function mesmaIdentidade(a, b) {
  if (!a || !b) return false;

  const A = jidBase(a);
  const B = jidBase(b);

  return A === B;
}

/* =========================================================
   TOKEN
   ========================================================= */

function gerarToken() {
  return Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase();
}

/* =========================================================
   FLOW ID
   ========================================================= */

function criarFlowId(token, acao, numero) {
  return `${SESSION_PREFIX}${token}:${acao}:${numero}`;
}

function lerFlowId(id) {
  const valor = String(id || '');

  if (!valor.startsWith(SESSION_PREFIX)) {
    return null;
  }

  const partes = valor.split(':');

  if (partes.length !== 5) {
    return null;
  }

  const [
    ,
    ,
    token,
    acao,
    numeroTexto
  ] = partes;

  const numero = Number(numeroTexto);

  if (!token || !acao || !Number.isInteger(numero)) {
    return null;
  }

  return {
    token,
    acao,
    numero
  };
}

/* =========================================================
   EXTRAÇÃO DE CLICK
   ========================================================= */

function extrairIdInterativo(info) {
  const message = info?.message;

  if (!message) {
    return null;
  }

  const candidatos = [
    message?.interactiveResponseMessage
      ?.nativeFlowResponseMessage
      ?.paramsJson,

    message?.interactiveResponseMessage
      ?.paramsJson,

    message?.nativeFlowResponseMessage
      ?.paramsJson
  ];

  for (const paramsJson of candidatos) {
    if (!paramsJson) continue;

    try {
      const obj =
        typeof paramsJson === 'string'
          ? JSON.parse(paramsJson)
          : paramsJson;

      if (obj?.id) {
        return String(obj.id).trim();
      }

      if (obj?.selectedId) {
        return String(obj.selectedId).trim();
      }

      if (obj?.buttonId) {
        return String(obj.buttonId).trim();
      }
    } catch {}
  }

  const outros = [
    message?.templateButtonReplyMessage?.selectedId,
    message?.buttonsResponseMessage?.selectedButtonId,
    message?.listResponseMessage
      ?.singleSelectReply
      ?.selectedRowId,
    info?.buttonId
  ];

  for (const valor of outros) {
    if (valor) {
      return String(valor).trim();
    }
  }

  return null;
}

export function isKyaraVideoFlowId(id) {
  return String(id || '')
    .startsWith(SESSION_PREFIX);
}

/* =========================================================
   THUMBNAILS
   ========================================================= */

function thumbnailValida(url) {
  if (!url) {
    return false;
  }

  const valor =
    String(url)
      .trim();

  if (!/^https?:\/\//i.test(valor)) {
    return false;
  }

  const base =
    valor
      .split('#', 1)[0]
      .split('?', 1)[0]
      .toLowerCase();

  /*
   * Rejeita:
   * .mp4
   * .webm
   * .mov
   * .m4v
   * .mkv
   * .m3u8
   *
   * inclusive:
   * /arquivo.mp4/plain/...
   */
  if (
    /\.(mp4|webm|mov|m4v|mkv|m3u8)(?:[/?]|$)/i.test(base)
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   RESULTADOS
   ========================================================= */

function normalizarTitulo(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensTitulo(valor) {
  return new Set(
    normalizarTitulo(valor)
      .split(' ')
      .filter(Boolean)
  );
}

function similaridadeTitulo(a, b) {
  const A = tokensTitulo(a);
  const B = tokensTitulo(b);

  if (!A.size || !B.size) {
    return 0;
  }

  let inter = 0;

  for (const item of A) {
    if (B.has(item)) {
      inter++;
    }
  }

  return (
    (2 * inter) /
    (A.size + B.size)
  );
}




function extrairResultadosDoJson(dados) {

  if (!dados) {
    return [];
  }


  console.log(
    "[KYARA JSON DEBUG KEYS]",
    Object.keys(dados)
  );


  const candidatos = [

    dados.resultados,

    dados.results,

    dados.items,

    dados.videos,

    dados.posts,

    dados.media,

    dados.data,

    dados.dados,

    dados.result,

    dados.response,

    dados

  ];


  for (const candidato of candidatos) {


    if (
      Array.isArray(candidato)
    ) {

      console.log(
        "[KYARA JSON ARRAY ENCONTRADO]",
        candidato.length
      );

      return candidato;

    }


    if (
      candidato &&
      typeof candidato === "object"
    ) {


      for (
        const valor of Object.values(candidato)
      ) {


        if (
          Array.isArray(valor)
        ) {


          console.log(
            "[KYARA JSON ARRAY INTERNO]",
            valor.length
          );


          return valor;

        }

      }

    }


  }


  console.log(
    "[KYARA JSON] Nenhum array de resultados encontrado"
  );


  console.log(
    JSON.stringify(
      dados,
      null,
      2
    ).slice(0,3000)
  );


  return [];

}



function normalizarUrlDedupe(valor) {
  const bruto =
    String(valor || '').trim();

  if (!bruto) {
    return '';
  }

  try {
    const absoluta =
      /^[a-z][a-z0-9+.-]*:\/\//i.test(bruto);

    const url =
      new URL(
        bruto,
        'https://kyara.invalid'
      );

    url.hash = '';

    /*
     * Remove somente parâmetros conhecidos
     * de rastreamento.
     *
     * NÃO remove a query inteira, porque
     * ela pode conter o ID real do vídeo.
     */
    for (
      const chave of
        Array.from(
          url.searchParams.keys()
        )
    ) {
      if (
        /^(utm_[^=]+|fbclid|gclid|dclid|msclkid|ref_src)$/i
          .test(chave)
      ) {
        url.searchParams.delete(chave);
      }
    }

    url.searchParams.sort();

    const caminho =
      `${url.pathname || '/'}${url.search || ''}`;

    if (!absoluta) {
      return (
        caminho
          .replace(/\/$/, '') ||
        '/'
      );
    }

    return (
      `${url.protocol.toLowerCase()}//` +
      `${url.host.toLowerCase()}` +
      caminho
    ).replace(/\/$/, '');

  } catch {
    return bruto
      .replace(/#.*/, '')
      .trim()
      .replace(/\/$/, '');
  }
}

function obterIdentidadeResultado(item) {
  if (
    !item ||
    typeof item !== 'object'
  ) {
    return '';
  }

  const campos = [
    'videoId',
    'video_id',
    'viewkey',
    'viewKey',
    'mediaId',
    'media_id',
    'contentId',
    'content_id',
    'id'
  ];

  for (const campo of campos) {
    const valor =
      String(
        item[campo] || ''
      ).trim();

    if (valor) {
      return (
        `${campo}:` +
        `${valor.toLowerCase()}`
      );
    }
  }

  return '';
}

function formatarDuracaoResultado(item) {
  const direta =
    item?.duracao ||
    item?.duration ||
    '';

  if (direta) {
    return String(direta).trim();
  }

  const segundos = Number(
    item?.duracao_segundos ??
    item?.duration_seconds ??
    item?.seconds ??
    0
  );

  if (!Number.isFinite(segundos) || segundos <= 0) {
    return 'indisponível';
  }

  const total = Math.floor(segundos);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  return horas
    ? `${horas}:${String(minutos).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutos}:${String(secs).padStart(2, '0')}`;
}

function deduplicarResultados(itens) {
  if (!Array.isArray(itens)) {
    return [];
  }

  const resultado = [];
  const chaves = new Set();

  for (const item of itens) {
    if (
      !item ||
      typeof item !== 'object'
    ) {
      continue;
    }

    const url =
      String(
        item.url ||
        item.link ||
        item.href ||
        ''
      ).trim();

    if (!url) {
      continue;
    }

    const urlKey =
      normalizarUrlDedupe(
        url
      );

    const identidade =
      obterIdentidadeResultado(
        item
      );

    /*
     * Se o Python fornece um ID do vídeo,
     * ele tem prioridade sobre a URL.
     *
     * Caso contrário, usa a URL normalizada.
     */
    const chave =
      identidade
        ? `id:${identidade}`
        : `url:${urlKey}`;

    if (
      chaves.has(chave)
    ) {
      continue;
    }

    chaves.add(chave);

    resultado.push({
      ...item,

      titulo:
        limparTexto(
          item.titulo ||
          item.title ||
          item.nome ||
          'Vídeo sem título',
          220
        ),

      url,

      thumbnail:
        String(
          item.thumbnail ||
          item.thumb ||
          item.thumbnailUrl ||
          item.image ||
          item.imagem ||
          ''
        ).trim(),

      descricao:
        limparTexto(
          item.descricao ||
          item.description ||
          item.desc ||
          '',
          220
        ),

      duracao:
        String(
          item.duracao ||
          item.duration ||
          ''
        ).trim(),

      duracao_segundos:
        Number(
          item.duracao_segundos ??
          item.duration_seconds ??
          item.seconds
        ) || null
    });

    if (
      resultado.length >= MAX_RESULTS
    ) {
      break;
    }
  }

  return resultado;
}

/* =========================================================
   LOCALIZAÇÃO DO PYTHON
   ========================================================= */

function localizarDownloaderPublico() {
  const candidatos = [
    path.join(PROJECT_ROOT, 'downloader_publico.py'),
    path.join(PROJECT_ROOT, 'dados', 'downloader_publico.py'),
    path.join(PROJECT_ROOT, 'scripts', 'downloader_publico.py')
  ];

  for (const arquivo of candidatos) {
    try {
      if (fs.existsSync(arquivo)) {
        return arquivo;
      }
    } catch {}
  }

  throw new Error(
    'downloader_publico.py não encontrado.'
  );
}

function localizarBotVideos() {
  const candidatos = [
    path.join(PROJECT_ROOT, 'bot_videos.py'),
    path.join(PROJECT_ROOT, 'dados', 'bot_videos.py'),
    path.join(PROJECT_ROOT, 'dados', 'src', 'bot_videos.py'),
    path.join(PROJECT_ROOT, 'dados', 'src', 'features', 'bot_videos.py'),
    path.join(PROJECT_ROOT, 'scripts', 'bot_videos.py'),
    path.join(PROJECT_ROOT, 'src', 'bot_videos.py')
  ];

  for (const arquivo of candidatos) {
    try {
      if (fs.existsSync(arquivo)) {
        return arquivo;
      }
    } catch {}
  }

  throw new Error(
    'bot_videos.py não encontrado.'
  );
}

/* =========================================================
   PYTHON JSON
   ========================================================= */



function extrairJsonSaida(...fontes) {

  const marcador =
    '@@KYARA_JSON@@';


  for (const fonte of fontes) {

    const texto =
      String(fonte || '');


    const pos =
      texto.lastIndexOf(
        marcador
      );


    if (pos === -1) {
      continue;
    }


    const bruto =
      texto
        .slice(
          pos + marcador.length
        )
        .trim();


    try {

      const json =
        JSON.parse(
          bruto
        );


      console.log(
        '[KYARA JSON] retorno oficial encontrado'
      );


      return json;


    } catch (erro) {

      console.error(
        '[KYARA JSON] retorno inválido:',
        erro.message
      );

    }

  }


  console.error(
    '[KYARA JSON] Nenhum retorno oficial encontrado'
  );


  return null;
}


function executarComPython(
  binario,
  script,
  argumentos,
  timeoutMs
) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,

      KYARA_JSON:
        '1',

      PYTHONUNBUFFERED:
        '1',

      PYTHONIOENCODING:
        'utf-8',

      PYTHONDONTWRITEBYTECODE:
        '1',

      YTDLP_NO_PLUGINS:
        '1'
    };

    const args =
      Array.isArray(argumentos)
        ? argumentos
        : [argumentos];

    console.log(
      '[KYARA PYTHON]',
      binario,
      script,
      args.join(' ')
    );

    const child =
      spawn(
        binario,
        [
          '-u',
          script,
          ...args
        ],
        {
          cwd:
            PROJECT_ROOT,

          env,

          shell:
            false,

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

    let timer = null;
    let killTimer = null;

    function finalizarErro(erro) {
      if (encerrado) {
        return;
      }

      encerrado = true;

      if (timer) {
        clearTimeout(timer);
      }

      if (killTimer) {
        clearTimeout(killTimer);
      }

      reject(erro);
    }

    function finalizarOk(valor) {
      if (encerrado) {
        return;
      }

      encerrado = true;

      if (timer) {
        clearTimeout(timer);
      }

      if (killTimer) {
        clearTimeout(killTimer);
      }

      resolve(valor);
    }

    timer =
      setTimeout(() => {
        if (encerrado) {
          return;
        }

        console.warn(
          `[KYARA PYTHON] Timeout após ${Math.round(
            timeoutMs / 1000
          )}s`
        );

        try {
          child.kill('SIGTERM');
        } catch {}

        killTimer =
          setTimeout(() => {
            if (encerrado) {
              return;
            }

            try {
              child.kill('SIGKILL');
            } catch {}
          }, 1500);

        finalizarErro(
          new Error(
            `Python excedeu o limite de ${Math.round(
              timeoutMs / 1000
            )}s.`
          )
        );
      }, timeoutMs);

    child.stdout.on(
      'data',
      chunk => {
        stdout +=
          chunk.toString('utf8');
      }
    );

    child.stderr.on(
      'data',
      chunk => {
        stderr +=
          chunk.toString('utf8');
      }
    );

    child.on(
      'error',
      error => {
        finalizarErro(error);
      }
    );

    child.on(
      'close',
      code => {
        if (encerrado) {
          return;
        }

        const dados =
          extrairJsonSaida(
            stdout,
            stderr
          );

        if (dados) {
          console.log(
            '[KYARA PYTHON] ✅ JSON recebido'
          );

          finalizarOk(dados);
          return;
        }

        const mensagem =
          limparTexto(
            stderr ||
            stdout ||
            `Python encerrou com código ${code}`,
            1500
          );

        finalizarErro(
          new Error(
            mensagem
          )
        );
      }
    );
  });
}

async function executarDownloaderPublico(
  url,
  timeoutMs = 10 * 60 * 1000
) {
  const script =
    localizarDownloaderPublico();

  const binarios = [
    process.env.PYTHON_BIN,
    'python3',
    'python'
  ].filter(Boolean);

  let ultimoErro = null;

  for (
    const binario
    of binarios
  ) {
    try {
      return await executarComPython(
        binario,
        script,
        ['download', url],
        timeoutMs
      );

    } catch (erro) {

      ultimoErro = erro;

      if (
        !/ENOENT|not found|spawn .* ENOENT/i.test(
          String(
            erro?.message || ''
          )
        )
      ) {
        throw erro;
      }
    }
  }

  throw (
    ultimoErro ||
    new Error(
      'Nenhum interpretador Python disponível.'
    )
  );
}

function aumentarQuantidadeBuscaKyara(
  comandoPython,
  quantidade
) {
  const texto =
    String(
      comandoPython || ''
    ).trim();

  const limite =
    Math.max(
      MAX_RESULTS,
      Number(quantidade) ||
        MAX_RESULTS
    );

  const partes =
    texto.match(
      /^(\S+\s+\S+\s+)(\d+)(\s+[\s\S]*)$/u
    );

  if (!partes) {
    return texto;
  }

  return (
    partes[1] +
    String(limite) +
    partes[3]
  );
}

async function executarPythonJson(argumento, timeoutMs) {
  const argumentoNormalizado =
    String(argumento || '').trim();

  /*
   * KYARA SITE PRIME
   *
   * Comandos no formato:
   *   search SITE LIMITE CONSULTA
   *
   * não pertencem ao bot_videos.py.
   * Eles precisam entrar diretamente no router.py
   * do Site PRIME.
   */
  const ehSitePrime =
    /^search(?:\s|$)/i.test(
      argumentoNormalizado
    );

  const script =
    ehSitePrime
      ? path.resolve(
          process.cwd(),
          'dados/src/core/sitePrime/router.py'
        )
      : localizarBotVideos();

  if (ehSitePrime) {
    console.log(
      '[KYARA SITE PRIME] Router:',
      script
    );
  }

  const binarios =
    [
      process.env.PYTHON_BIN,
      'python3',
      'python'
    ].filter(Boolean);

  let ultimoErro = null;

  for (const binario of binarios) {
    try {
      return await executarComPython(
        binario,
        script,
        argumento,
        timeoutMs
      );
    } catch (erro) {
      ultimoErro = erro;

      /*
       * Se o Python existe, não faz sentido
       * tentar o próximo em erros normais do script.
       */
      if (
        !/ENOENT|not found|spawn .* ENOENT/i.test(
          String(erro?.message || '')
        )
      ) {
        throw erro;
      }
    }
  }

  throw (
    ultimoErro ||
    new Error('Python não encontrado.')
  );
}

/* =========================================================
   PRESENÇA
   ========================================================= */

async function presence(Kyara, jid, estado) {
  try {
    if (
      Kyara &&
      typeof Kyara.sendPresenceUpdate === 'function'
    ) {
      await Kyara.sendPresenceUpdate(
        estado,
        jid
      );
    }
  } catch {}
}

/* =========================================================
   CAROUSEL BIZ NODES
   ========================================================= */

const PRIVACY_MODE_TS_OFFSET = 77980457;

function getPrivacyModeTs() {
  return String(
    Math.floor(Date.now() / 1000) -
    PRIVACY_MODE_TS_OFFSET
  );
}

function buildAdditionalNodes(jid) {
  const qualityContent = {
    tag: 'quality_control',
    attrs: {
      decision_id: crypto.randomBytes(20).toString('hex'),
      source_type: 'third_party'
    },
    content: [
      {
        tag: 'decision_source',
        attrs: {
          value: 'df'
        }
      }
    ]
  };

  const bizNode = {
    tag: 'biz',
    attrs: {
      actual_actors: '2',
      host_storage: '2',
      privacy_mode_ts: String(Math.floor(Date.now() / 1000))
    },
    content: [
      {
        tag: 'interactive',
        attrs: {
          type: 'native_flow',
          v: '1'
        },
        content: [
          {
            tag: 'native_flow',
            attrs: {
              v: '9',
              name: 'mixed'
            }
          }
        ]
      },
      qualityContent
    ]
  };

  if (isJidGroup(jid)) {
    return [bizNode];
  }

  return [
    {
      tag: 'bot',
      attrs: {
        biz_bot: '1'
      }
    },
    bizNode
  ];
}

/* =========================================================
   BOTÃO
   ========================================================= */

function criarNativeButton(name, params) {
  return {
    name: String(name || ''),
    buttonParamsJson: JSON.stringify(params || {})
  };
}

/* =========================================================
   PREPARAR THUMBNAILS
   ========================================================= */

function kyaraVideoUrlDireta(url) {
  const valor =
    String(url || '').trim();

  return (
    /^https?:\/\//i.test(valor) &&
    /\.(mp4|m4v|webm|mov|mkv)(?:[?#]|$)/i.test(valor)
  );
}


function kyaraVideoMimePorUrl(url) {
  const valor =
    String(url || '').toLowerCase();

  if (
    /\.webm(?:[?#]|$)/i.test(
      valor
    )
  ) {
    return 'video/webm';
  }

  if (
    /\.mov(?:[?#]|$)/i.test(
      valor
    )
  ) {
    return 'video/quicktime';
  }

  if (
    /\.mkv(?:[?#]|$)/i.test(
      valor
    )
  ) {
    return 'video/x-matroska';
  }

  return 'video/mp4';
}


function ehPreviewVideo(url) {
  const valor =
    String(url || '')
      .trim()
      .toLowerCase();

  return (
    /^https?:\/\//i.test(valor) &&
    /\.(mp4|webm|mov|m4v|mkv|m3u8)(?:[/?#]|$)/i.test(valor)
  );
}

function thumbnailPareceAvatar(url) {
  const v = String(url || '').toLowerCase();

  return [
    'avatar',
    'gravatar',
    'favicon',
    'default-avatar',
    'userpic',
    'profile-photo',
    'profile_photo',
    '/logo.',
    '/logo/',
    '/icon.',
    '/icon/'
  ].some(
    item => v.includes(item)
  );
}

function imagemProvavel(url) {
  const valor =
    String(url || '').trim();

  if (!/^https?:\/\//i.test(valor)) {
    return false;
  }

  return !ehPreviewVideo(valor);
}

function decodificarHtml(valor) {
  return String(valor || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      try {
        return String.fromCodePoint(
          parseInt(n, 16)
        );
      } catch {
        return '';
      }
    })
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/')
    .trim();
}

function normalizarImagemUrl(
  valor,
  paginaUrl = ''
) {
  let candidato =
    decodificarHtml(valor);

  if (!candidato) {
    return null;
  }

  candidato =
    candidato
      .replace(/^['"]+|['"]+$/g, '')
      .trim();

  if (
    candidato.startsWith('//')
  ) {
    candidato =
      `https:${candidato}`;
  }

  try {
    const url =
      new URL(
        candidato,
        paginaUrl || undefined
      );

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function extrairSrcsetMelhor(
  valor,
  paginaUrl
) {
  if (!valor) {
    return [];
  }

  const itens =
    String(valor)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const partes =
          item.split(/\s+/);

        return {
          url:
            normalizarImagemUrl(
              partes[0],
              paginaUrl
            ),
          peso:
            Number(
              String(
                partes[1] || ''
              )
                .replace(/[^\d.]/g, '')
            ) || 0
        };
      })
      .filter(item => item.url)
      .sort(
        (a, b) =>
          b.peso - a.peso
      );

  return itens.map(
    item => item.url
  );
}


function atributoHtml(tag, nome) {
  const rx =
    new RegExp(
      `${nome}\\s*=\\s*["']([^"']+)["']`,
      'i'
    );

  return (
    tag.match(rx)?.[1] ||
    ''
  );
}

function extrairImagemMeta(
  html,
  paginaUrl
) {
  const candidatos = [];
  const vistos = new Set();

  function adicionar(valor) {
    const normalizado =
      normalizarImagemUrl(
        valor,
        paginaUrl
      );

    if (!normalizado) {
      return;
    }

    if (
      !imagemProvavel(
        normalizado
      )
    ) {
      return;
    }

    if (
      thumbnailPareceAvatar(
        normalizado
      )
    ) {
      return;
    }

    if (
      vistos.has(
        normalizado
      )
    ) {
      return;
    }

    vistos.add(
      normalizado
    );

    candidatos.push(
      normalizado
    );
  }

  const texto =
    String(html || '');

  /*
   * VIDEO POSTER — prioridade máxima
   */
  for (const match of texto.matchAll(
    /<video\\b[^>]*>/gi
  )) {
    const tag = match[0];
    adicionar(atributoHtml(tag, 'poster'));
    adicionar(atributoHtml(tag, 'data-poster'));
  }

  /*
   * META TAGS
   */
  for (
    const match of texto.matchAll(
      /<meta\b[^>]*>/gi
    )
  ) {
    const tag =
      match[0];

    const nome =
      (
        atributoHtml(
          tag,
          'property'
        ) ||
        atributoHtml(
          tag,
          'name'
        ) ||
        ''
      )
        .trim()
        .toLowerCase();

    const content =
      atributoHtml(
        tag,
        'content'
      );

    if (
      [
        'og:image',
        'og:image:url',
        'og:image:secure_url',
        'twitter:image',
        'twitter:image:src',
        'image'
      ].includes(nome)
    ) {
      adicionar(content);
    }
  }

  /*
   * VIDEO POSTER — prioridade máxima
   */
  for (const match of texto.matchAll(
    /<video\b[^>]*>/gi
  )) {
    const tag = match[0];

    for (const atributo of [
      'poster',
      'data-poster'
    ]) {
      adicionar(
        atributoHtml(
          tag,
          atributo
        )
      );
    }
  }

  /*
   * IMG / SOURCE
   */
  const tags =
    [
      ...texto.matchAll(
        /<(img|source)\b[^>]*>/gi
      )
    ];

  for (
    const match of tags
  ) {
    const tag =
      match[0];

    const atributos =
      [
        'data-thumbnail',
        'data-thumb',
        'data-image',
        'data-original',
        'data-original-src',
        'data-src',
        'data-lazy-src',
        'src',
        'data-url'
      ];

    for (
      const nome of atributos
    ) {
      adicionar(
        atributoHtml(
          tag,
          nome
        )
      );
    }

    const srcset =
      atributoHtml(
        tag,
        'srcset'
      );

    for (
      const url of extrairSrcsetMelhor(
        srcset,
        paginaUrl
      )
    ) {
      adicionar(url);
    }
  }

  /*
   * JSON-LD / JS EMBUTIDO
   */
  const jsonRegex =
    /["'](?:thumbnailUrl|thumbnail|contentUrl|image|poster|imageUrl)["']\s*:\s*["']([^"']+)["']/gi;

  for (
    const match of texto.matchAll(
      jsonRegex
    )
  ) {
    adicionar(
      match[1]
    );
  }

  /*
   * Alguns sites escapam barras.
   */
  const cdnRegex =
    /https?:\\?\/\\?\/[^"'\\\s<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/gi;

  for (
    const match of texto.matchAll(
      cdnRegex
    )
  ) {
    adicionar(
      match[0]
    );
  }

  return (
    candidatos[0] ||
    null
  );
}


async function buscarImagemPagina(
  paginaUrl
) {
  if (
    !paginaUrl ||
    !/^https?:\/\//i.test(
      paginaUrl
    )
  ) {
    return null;
  }

  try {
    const parsed =
      new URL(
        paginaUrl
      );

    const resposta =
      await fetch(
        paginaUrl,
        {
          redirect: 'follow',

          signal:
            AbortSignal.timeout(
              15000
            ),

          headers: {
            'User-Agent':
              'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',

            'Accept':
              'text/html,application/xhtml+xml,application/json,text/plain,*/*',

            'Accept-Language':
              'pt-BR,pt;q=0.9,en;q=0.8',

            'Referer':
              `${parsed.origin}/`
          }
        }
      );

    if (
      !resposta.ok
    ) {
      return null;
    }

    const html =
      await resposta.text();

    return extrairImagemMeta(
      html,
      resposta.url ||
      paginaUrl
    );

  } catch {
    return null;
  }
}


function variantesImagemPreview(
  url
) {
  const valor =
    String(url || '').trim();

  const variantes = [];

  const base =
    valor.split(
      '?',
      1
    )[0];

  const match =
    base.match(
      /^(https?:\/\/.+?\/original_([^/]+))\.(mp4|webm|mov|m4v|mkv)(?:\/.*)?$/i
    );

  if (match) {
    const prefixo =
      match[1];

    variantes.push(
      `${prefixo}.jpg`,
      `${prefixo}.jpeg`,
      `${prefixo}.webp`
    );
  }

  /*
   * Remove /plain/... mantendo a URL original.
   */
  const semPlain =
    valor.replace(
      /\/plain\/.*$/i,
      ''
    );

  if (
    semPlain !== valor
  ) {
    variantes.push(
      `${semPlain}.jpg`,
      `${semPlain}.jpeg`,
      `${semPlain}.webp`
    );
  }

  return [
    ...new Set(
      variantes
    )
  ];
}

async function baixarImagemBuffer(
  url,
  timeoutMs = 12000,
  paginaUrl = ''
) {
  try {
    let origin = '';

    try {
      origin =
        paginaUrl
          ? new URL(
              paginaUrl
            ).origin
          : '';
    } catch {}

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',

      'Accept':
        'image/avif,image/webp,image/jpeg,image/png,image/gif,*/*',

      'Accept-Language':
        'pt-BR,pt;q=0.9,en;q=0.8'
    };

    if (paginaUrl) {
      headers.Referer =
        paginaUrl;
    }

    if (origin) {
      headers.Origin =
        origin;
    }

    const resposta =
      await fetch(
        url,
        {
          redirect: 'follow',

          signal:
            AbortSignal.timeout(
              timeoutMs
            ),

          headers
        }
      );

    if (
      !resposta.ok
    ) {
      return null;
    }

    const tipo =
      String(
        resposta.headers.get(
          'content-type'
        ) || ''
      ).toLowerCase();

    if (
      tipo &&
      !tipo.includes(
        'image/'
      )
    ) {
      return null;
    }

    const buffer =
      Buffer.from(
        await resposta.arrayBuffer()
      );

    if (
      buffer.length < 1000 ||
      buffer.length >
        12 * 1024 * 1024
    ) {
      return null;
    }

    return buffer;

  } catch {
    return null;
  }
}


async function extrairFrameFFmpeg(
  url,
  paginaUrl = '',
  timeoutMs = 25000
) {
  if (
    !ehPreviewVideo(url)
  ) {
    return null;
  }

  return new Promise(
    resolve => {

      let finalizado =
        false;

      const partes = [];
      let total = 0;

      let timer = null;

      function terminar(
        resultado
      ) {
        if (finalizado) {
          return;
        }

        finalizado = true;

        if (timer) {
          clearTimeout(
            timer
          );
        }

        resolve(
          resultado || null
        );
      }

      let child;

      try {
        const argumentos = [
          '-hide_banner',
          '-loglevel',
          'error',

          /*
           * Pequeno avanço para evitar frames vazios.
           */
          '-ss',
          '1',

          '-i',
          url,

          '-frames:v',
          '1',

          '-vf',
          'scale=w=640:h=-1:force_original_aspect_ratio=decrease',

          '-f',
          'image2pipe',

          '-vcodec',
          'mjpeg',

          '-q:v',
          '5',

          'pipe:1'
        ];

        if (paginaUrl) {
          argumentos.splice(
            2,
            0,
            '-headers',
            `Referer: ${paginaUrl}\r\nUser-Agent: Mozilla/5.0\r\n`
          );
        }

        child =
          spawn(
            'ffmpeg',
            argumentos,
            {
              cwd:
                PROJECT_ROOT,

              stdio: [
                'ignore',
                'pipe',
                'pipe'
              ]
            }
          );

      } catch {
        terminar(null);
        return;
      }

      timer =
        setTimeout(
          () => {
            try {
              child.kill(
                'SIGKILL'
              );
            } catch {}

            terminar(null);
          },
          timeoutMs
        );

      child.stdout.on(
        'data',
        chunk => {
          if (finalizado) {
            return;
          }

          const buffer =
            Buffer.from(
              chunk
            );

          total +=
            buffer.length;

          if (
            total >
            8 * 1024 * 1024
          ) {
            try {
              child.kill(
                'SIGKILL'
              );
            } catch {}

            terminar(null);
            return;
          }

          partes.push(
            buffer
          );
        }
      );

      child.on(
        'error',
        () => {
          terminar(null);
        }
      );

      child.on(
        'close',
        code => {
          if (
            code !== 0 ||
            !partes.length
          ) {
            terminar(null);
            return;
          }

          const buffer =
            Buffer.concat(
              partes
            );

          terminar(
            buffer.length > 1000
              ? buffer
              : null
          );
        }
      );
    }
  );
}

async function prepararImagem(
  Kyara,
  bufferOuUrl
) {
  if (
    !Kyara ||
    typeof Kyara.waUploadToServer !==
      'function'
  ) {
    throw new Error(
      'Kyara.waUploadToServer não está disponível.'
    );
  }

  const origem =
    Buffer.isBuffer(
      bufferOuUrl
    )
      ? {
          image:
            bufferOuUrl
        }
      : {
          image:
            {
              url:
                bufferOuUrl
            }
        };

  const media =
    await prepareWAMessageMedia(
      origem,
      {
        upload:
          Kyara.waUploadToServer
      }
    );

  return (
    media?.imageMessage ||
    null
  );
}


function thumbnailYoutubeFallback(url) {
  const valor =
    String(url || '').trim();

  if (!valor) {
    return null;
  }

  try {
    const parsed =
      new URL(valor);

    let videoId = '';

    if (
      parsed.hostname === 'youtu.be' ||
      parsed.hostname === 'www.youtu.be'
    ) {
      videoId =
        parsed.pathname
          .split('/')
          .filter(Boolean)[0] || '';
    } else if (
      parsed.hostname.includes('youtube.com')
    ) {
      videoId =
        parsed.searchParams.get('v') || '';

      if (
        !videoId &&
        parsed.pathname.startsWith('/shorts/')
      ) {
        videoId =
          parsed.pathname
            .split('/')
            .filter(Boolean)[1] || '';
      }

      if (
        !videoId &&
        parsed.pathname.startsWith('/embed/')
      ) {
        videoId =
          parsed.pathname
            .split('/')
            .filter(Boolean)[1] || '';
      }
    }

    if (
      !/^[A-Za-z0-9_-]{11}$/.test(videoId)
    ) {
      return null;
    }

    return (
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    );
  } catch {
    return null;
  }
}

async function prepararThumbnail(
  Kyara,
  thumbnailUrl,
  paginaUrl
) {
  console.log(
    '[KYARA THUMB DEBUG]',
    JSON.stringify({
      thumbnailUrl:
        thumbnailUrl || null,
      paginaUrl:
        paginaUrl || null
    })
  );
  const pagina =
    String(paginaUrl || '').trim();

  const youtubeFallback =
    thumbnailYoutubeFallback(
      pagina
    );

  const thumbnailRecebida =
    String(
      thumbnailUrl || ''
    ).trim();

  const original =
    (
      thumbnailRecebida &&
      !thumbnailPareceAvatar(
        thumbnailRecebida
      )
    )
      ? thumbnailRecebida
      : String(
          youtubeFallback || ''
        ).trim();

  console.log(
    '[KYARA THUMB SOURCE]',
    JSON.stringify({
      original:
        thumbnailUrl || null,
      youtube:
        youtubeFallback || null,
      pagina:
        pagina || null
    })
  );

  /*
   * CAMINHO 1 — THUMBNAIL DIRETA
   */
  if (
    imagemProvavel(
      original
    )
  ) {
    const buffer =
      await baixarImagemBuffer(
        original,
        12000,
        paginaUrl
      );

    if (buffer) {
      try {
        const imagem =
          await prepararImagem(
            Kyara,
            buffer
          );

        if (imagem) {
          return imagem;
        }
      } catch {}
    }

    /*
     * Último recurso da URL direta:
     * deixar o Baileys resolver.
     */
    try {
      const imagem =
        await prepararImagem(
          Kyara,
          original
        );

      if (imagem) {
        return imagem;
      }
    } catch {}
  }

  /*
   * CAMINHO 2 — IMAGEM DA PÁGINA
   */
  if (paginaUrl) {
    const meta =
      await buscarImagemPagina(
        paginaUrl
      );

    if (meta) {
      const buffer =
        await baixarImagemBuffer(
          meta,
          12000,
          paginaUrl
        );

      if (buffer) {
        try {
          const imagem =
            await prepararImagem(
              Kyara,
              buffer
            );

          if (imagem) {
            return imagem;
          }
        } catch {}
      }

      try {
        const imagem =
          await prepararImagem(
            Kyara,
            meta
          );

        if (imagem) {
          return imagem;
        }
      } catch {}
    }
  }

  /*
   * CAMINHO 3 — VARIANTES DO CDN
   */
  if (
    original &&
    ehPreviewVideo(
      original
    )
  ) {
    for (
      const variante of
        variantesImagemPreview(
          original
        )
    ) {
      const buffer =
        await baixarImagemBuffer(
          variante,
          10000,
          paginaUrl
        );

      if (!buffer) {
        continue;
      }

      try {
        const imagem =
          await prepararImagem(
            Kyara,
            buffer
          );

        if (imagem) {
          return imagem;
        }
      } catch {}
    }
  }

  /*
   * CAMINHO 4 — FRAME VIA FFMPEG
   */
  if (
    original &&
    ehPreviewVideo(
      original
    )
  ) {
    const frame =
      await extrairFrameFFmpeg(
        original,
        paginaUrl
      );

    if (frame) {
      try {
        const imagem =
          await prepararImagem(
            Kyara,
            frame
          );

        if (imagem) {
          return imagem;
        }
      } catch {}
    }
  }

  /*
   * CAMINHO 5 — FALLBACK LOCAL
   *
   * O resultado NÃO é descartado só porque
   * o servidor externo recusou a imagem.
   */
  const fallback =
    path.join(
      PROJECT_ROOT,
      'dados',
      'midias',
      'menu.jpg'
    );

  try {
    if (
      fs.existsSync(
        fallback
      )
    ) {
      const buffer =
        fs.readFileSync(
          fallback
        );

      const imagem =
        await prepararImagem(
          Kyara,
          buffer
        );

      if (imagem) {
        console.log(
          '[KYARA THUMB] Fallback local utilizado.'
        );

        return imagem;
      }
    }
  } catch {}

  return null;
}

/* =========================================================
   CONCORRÊNCIA
   ========================================================= */


async function mapLimit(
  items,
  limit,
  worker
) {
  const saida =
    new Array(items.length);

  let cursor = 0;

  async function loop() {
    while (true) {
      const index = cursor++;

      if (index >= items.length) {
        return;
      }

      try {
        saida[index] =
          await worker(
            items[index],
            index
          );
      } catch (erro) {
        saida[index] = {
          __erro: erro
        };
      }
    }
  }

  const workers =
    Array.from(
      {
        length:
          Math.min(
            limit,
            items.length
          )
      },
      () => loop()
    );

  await Promise.all(workers);

  return saida;
}

/* =========================================================
   ENVIAR CAROUSEL
   ========================================================= */


function kyaraResultadoEhVideo(
  resultado,
  site = ''
) {
  if (!resultado || typeof resultado !== 'object') {
    return false;
  }

  const normalizar = valor =>
    String(valor || '')
      .trim()
      .toLowerCase();

  const tipo = normalizar(
    resultado.tipo ||
    resultado.mediaType ||
    resultado.media_type ||
    resultado.type
  );

  const mime = normalizar(
    resultado.mimetype ||
    resultado.mime ||
    resultado.contentType ||
    resultado.content_type
  );

  /*
   * 1. Tipo/MIME explícito.
   */
  if (
    [
      'video',
      'videoclip',
      'mp4',
      'video/mp4'
    ].includes(tipo) ||
    mime.startsWith('video/')
  ) {
    return true;
  }

  /*
   * 2. Campos explicitamente relacionados a vídeo.
   */
  const fontesVideo = [
    resultado.video,
    resultado.video_url,
    resultado.videoUrl,
    resultado.video_url_hd,
    resultado.videoUrlHd,
    resultado.video_hd,
    resultado.videoHd,
    resultado.download_video,
    resultado.downloadVideo
  ]
    .filter(Boolean)
    .map(String);

  if (
    fontesVideo.some(url =>
      /\.(?:mp4|webm|mov|m4v|mkv)(?:[?#/]|$)/i.test(url)
    )
  ) {
    return true;
  }

  /*
   * 3. Duração é um forte indicador de resultado de vídeo.
   */
  if (
    resultado.duracao ||
    resultado.duration ||
    resultado.duracao_segundos ||
    resultado.duration_seconds
  ) {
    return true;
  }

  const urls = [
    resultado.url,
    resultado.link,
    resultado.video_url,
    resultado.videoUrl,
    resultado.download,
    resultado.contentUrl,
    resultado.content_url
  ]
    .filter(Boolean)
    .map(String);

  const nomeSite =
    normalizar(site);

  /*
   * 4. YouTube é vídeo por natureza nesse fluxo.
   *
   * Thumbnail não altera isso.
   */
  if (
    nomeSite.includes('youtube')
  ) {
    const youtube =
      urls.some(url =>
        /(?:^|\/\/)(?:www\.)?youtube\.com\//i.test(url) ||
        /(?:^|\/\/)youtu\.be\//i.test(url)
      );

    if (youtube) {
      return true;
    }
  }

  /*
   * 5. Indicadores de episódio / vídeo na página.
   */
  const textoResultado = [
    resultado.titulo,
    resultado.title,
    resultado.nome,
    resultado.name,
    ...urls
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    /\b(?:s\d{1,2}e\d{1,3})\b/i.test(
      textoResultado
    ) ||
    /\b(?:ep|episodio|episódio)\s*\.?\s*\d+\b/i.test(
      textoResultado
    ) ||
    /\b(?:temporada|season)\s*\d+\b/i.test(
      textoResultado
    )
  ) {
    return true;
  }

  /*
   * 6. URL direta de vídeo.
   */
  if (
    urls.some(url =>
      /\.(?:mp4|webm|mov|m4v|mkv)(?:[?#/]|$)/i.test(url)
    )
  ) {
    return true;
  }

  /*
   * 7. Páginas claramente de vídeo.
   */
  if (
    urls.some(url =>
      /\/(?:video|videos|watch|episode|episodio|episódio|filme|movie|show|serie|series)\//i.test(url) ||
      /view_video|viewkey=|watch\?v=/i.test(url)
    )
  ) {
    return true;
  }

  return false;
}


function kyaraResultadoEhImagem(
  resultado,
  site = ''
) {
  if (!resultado || typeof resultado !== 'object') {
    return false;
  }

  /*
   * REGRA ABSOLUTA:
   * se é vídeo, NÃO é imagem.
   *
   * Isso impede thumbnail de vídeo entrar
   * no álbum.
   */
  if (
    kyaraResultadoEhVideo(
      resultado,
      site
    )
  ) {
    return false;
  }

  const normalizar = valor =>
    String(valor || '')
      .trim()
      .toLowerCase();

  const tipo = normalizar(
    resultado.tipo ||
    resultado.mediaType ||
    resultado.media_type ||
    resultado.type
  );

  const mime = normalizar(
    resultado.mimetype ||
    resultado.mime ||
    resultado.contentType ||
    resultado.content_type
  );

  /*
   * 1. Imagem explícita.
   */
  if (
    [
      'image',
      'imagem',
      'photo',
      'foto',
      'picture'
    ].includes(tipo) ||
    mime.startsWith('image/')
  ) {
    return true;
  }

  const fontesImagem = [
    resultado.image_url,
    resultado.imageUrl,
    resultado.original_image,
    resultado.originalImage,
    resultado.original_image_url,
    resultado.originalImageUrl,
    resultado.pinterest_image,
    resultado.pinterestImage,
    resultado.pin_image,
    resultado.pinImage,
    resultado.contentUrl,
    resultado.content_url,
    resultado.image,
    resultado.imagem,
    resultado.photo,
    resultado.photo_url,
    resultado.media_url,
    resultado.mediaUrl,
    resultado.thumbnail,
    resultado.thumbnail_url,
    resultado.thumbnailUrl,
    resultado.thumb,
    resultado.preview
  ]
    .filter(Boolean)
    .map(String);

  const nomeSite =
    normalizar(site);

  /*
   * 2. Pinterest.
   *
   * O URL principal do Pin é uma página.
   * A imagem verdadeira normalmente está no
   * image/image_url/thumbnail.
   */
  if (
    nomeSite.includes('pinterest') ||
    nomeSite === 'pin'
  ) {
    const possuiImagem =
      fontesImagem.length > 0;

    const possuiVideo = [
      resultado.video,
      resultado.video_url,
      resultado.videoUrl,
      resultado.video_url_hd,
      resultado.videoUrlHd
    ]
      .some(Boolean);

    /*
     * Todo resultado textual do Pinterest neste fluxo
     * representa um Pin/imagem.
     *
     * A URL pode ser somente:
     * https://br.pinterest.com/pin/...
     *
     * Nesse caso a imagem será descoberta na página
     * pelo OpenGraph/JSON/img.
     */
    if (
      !possuiVideo
    ) {
      return true;
    }
  }

  /*
   * 3. URL direta de imagem.
   */
  if (
    fontesImagem.some(url =>
      /\.(?:jpe?g|png|webp|gif|bmp|avif)(?:[?#/]|$)/i.test(url)
    )
  ) {
    return true;
  }

  /*
   * 4. Sites de imagem que só entregam thumbnail.
   *
   * Como o resultado já passou pelo teste
   * de vídeo, thumbnail pode ser usada.
   */
  if (
    fontesImagem.length > 0
  ) {
    return true;
  }

  return false;
}

function kyaraResultadosSaoSomenteImagens(
  resultados,
  site = ''
) {
  const lista = Array.isArray(resultados)
    ? resultados.filter(Boolean)
    : [];

  if (lista.length < 2) {
    return false;
  }

  return lista.every(resultado =>
    kyaraResultadoEhImagem(resultado, site)
  );
}

function normalizarFonteBaileys(source) {
  if (typeof source === 'string') {
    return { url: source };
  }

  return source;
}

async function enviarAlbumImagensKyara(
  Kyara,
  jid,
  session,
  resultados,
  info = null
) {
  const candidatos =
    Array.isArray(resultados)
      ? resultados
          .slice(0, 10)
          .filter(Boolean)
      : [];

  const imagens =
    candidatos.filter(item =>
      kyaraResultadoEhImagem(
        item,
        session?.site
      )
    );

  if (!imagens.length) {
    return false;
  }

  function detectarMimeImagem(url) {
    const valor =
      String(url || '')
        .trim()
        .toLowerCase();

    if (/\.png(?:[?#/]|$)/i.test(valor)) {
      return 'image/png';
    }

    if (/\.(?:jpe?g)(?:[?#/]|$)/i.test(valor)) {
      return 'image/jpeg';
    }

    if (/\.webp(?:[?#/]|$)/i.test(valor)) {
      return 'image/webp';
    }

    if (/\.gif(?:[?#/]|$)/i.test(valor)) {
      return 'image/gif';
    }

    if (/\.avif(?:[?#/]|$)/i.test(valor)) {
      return 'image/avif';
    }

    return 'image/jpeg';
  }

  function obterFontesDiretas(resultado) {
    return [
      resultado?.url,
      resultado?.link,

      resultado?.image_url,
      resultado?.imageUrl,

      resultado?.original_image,
      resultado?.originalImage,

      resultado?.original_image_url,
      resultado?.originalImageUrl,

      resultado?.pinterest_image,
      resultado?.pinterestImage,

      resultado?.pin_image,
      resultado?.pinImage,

      resultado?.contentUrl,
      resultado?.content_url,

      resultado?.image,
      resultado?.imagem,

      resultado?.photo,
      resultado?.photo_url,

      resultado?.media_url,
      resultado?.mediaUrl,

      resultado?.thumbnail,
      resultado?.thumbnail_url,
      resultado?.thumbnailUrl,

      resultado?.thumb,
      resultado?.preview
    ]
      .map(v =>
        String(v || '').trim()
      )
      .filter(v =>
        /^https?:\/\//i.test(v)
      );
  }

  const preparados =
    await mapLimit(
      imagens,
      Math.max(
        1,
        THUMB_CONCURRENCY
      ),
      async (
        resultado,
        index
      ) => {
        try {
          const fontes =
            obterFontesDiretas(
              resultado
            );

          /*
           * PRIME:
           *
           * Pinterest -> i.pinimg.com
           * Wallhaven -> w.wallhaven.cc
           *
           * Essas já são URLs de imagem.
           *
           * Não baixar para Buffer antes do
           * Baileys. O próprio sendMessage pode
           * receber a URL diretamente.
           */
          const fonteDireta =
            fontes.find(url =>
              /\.(?:jpe?g|png|webp|gif|avif|bmp|jfif|tiff?)(?:[?#/]|$)/i.test(
                url
              )
            ) ||
            (
              fontes.find(url =>
                /(?:i\.pinimg\.com|w\.wallhaven\.cc)\//i.test(
                  url
                )
              )
            );

          if (fonteDireta) {
            console.log(
              `[KYARA MEDIA ALBUM] ✅ Fonte direta ${index + 1}:`,
              fonteDireta
            );

            return {
              resultado,
              source:
                fonteDireta,
              mimetype:
                resultado?.mimetype ||
                resultado?.mimeType ||
                detectarMimeImagem(
                  fonteDireta
                )
            };
          }

          /*
           * Fallback:
           *
           * somente quando o resultado não possui
           * uma URL direta de imagem.
           */
          if (
            typeof baixarImagemBuffer ===
            'function'
          ) {
            for (
              const origem
              of fontes
            ) {
              const buffer =
                await baixarImagemBuffer(
                  origem,
                  12_000,
                  resultado?.pageUrl ||
                  resultado?.page_url ||
                  ''
                );

              if (buffer) {
                console.log(
                  `[KYARA MEDIA ALBUM] ✅ Buffer ${index + 1}`
                );

                return {
                  resultado,
                  source:
                    buffer,
                  mimetype:
                    resultado?.mimetype ||
                    resultado?.mimeType ||
                    detectarMimeImagem(
                      origem
                    )
                };
              }
            }
          }

          console.error(
            `[KYARA MEDIA ALBUM] ❌ Imagem ${index + 1} sem fonte válida.`
          );

          return null;

        } catch (error) {
          console.error(
            `[KYARA MEDIA ALBUM] Falha ${index + 1}:`,
            error?.message ||
            error
          );

          return null;
        }
      }
    );

  const prontos =
    preparados.filter(Boolean);

  if (!prontos.length) {
    return false;
  }

  /*
   * Uma única imagem:
   *
   * não tenta carousel e não tenta álbum.
   * Envia a imagem normalmente.
   */
  if (prontos.length === 1) {
    const item =
      prontos[0];

    session.resultados = [
      {
        ...item.resultado,

        __kyaraAlbumSource:
          item.source,

        __kyaraAlbumMime:
          item.mimetype
      }
    ];

    session.modo =
      'album-imagens';

    session.albumTotal =
      1;

    session.sentAt =
      agora();

    await Kyara.sendMessage(
      jid,
      {
        image:
          item.source,

        mimetype:
          item.mimetype ||
          'image/jpeg',

        caption:
          `🌸 *KYARA DOWNLOADER*\n` +
          `🔎 ${limitar(
            session.consulta,
            140
          )}\n` +
          `🖼️ 1 imagem`
      },
      info
        ? {
            quoted: info
          }
        : {}
    );

    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `🖼️ *1 imagem* enviada.\n` +
          `⬇️ Responda com *1* para reenviar.`
      }
    );

    return true;
  }

  /*
   * Duas ou mais:
   * álbum nativo WhatsApp.
   */
  const itens =
    prontos.map(
      (
        item,
        index
      ) => ({
        type:
          'image',

        source:
          item.source,

        mimetype:
          item.mimetype,

        caption:
          index === 0
            ? (
                `🌸 KYARA DOWNLOADER\n` +
                `🔎 ${limitar(
                  session.consulta,
                  140
                )}\n` +
                `🖼️ ${prontos.length} imagem(ns)`
              )
            : ''
      })
    );

  console.log(
    `[KYARA MEDIA ALBUM] Enviando ${itens.length} imagem(ns)`
  );

  const retorno =
    await sendKyaraMediaAlbum(
      Kyara,
      jid,
      itens,
      {
        parentOptions:
          info
            ? {
                quoted: info
              }
            : {}
      }
    );

  session.resultados =
    prontos.map(
      item => ({
        ...item.resultado,

        __kyaraAlbumSource:
          item.source,

        __kyaraAlbumMime:
          item.mimetype
      })
    );

  session.modo =
    'album-imagens';

  session.albumTotal =
    prontos.length;

  session.messageId =
    retorno.parentKey?.id ||
    null;

  session.sentAt =
    agora();

  await Kyara.sendMessage(
    jid,
    {
      text:
        `🌸 *KYARA DOWNLOADER*\n\n` +
        `🖼️ *${itens.length} imagem(ns)* enviadas.\n` +
        `⬇️ Responda com o número da mídia.`
    }
  );

  return true;
}



function extrairNumeroAlbum(text) {
  const valor =
    String(text || '').trim();

  if (!/^\d{1,2}$/.test(valor)) {
    return null;
  }

  const numero =
    Number(valor);

  return Number.isInteger(numero)
    ? numero
    : null;
}


function encontrarSessaoAlbum(
  jid,
  requesterId
) {
  const agoraMs =
    agora();

  let bloqueado =
    false;

  let encontrado =
    null;

  const entradas =
    Array.from(
      SESSIONS.entries()
    );

  for (
    let pos =
      entradas.length - 1;
    pos >= 0;
    pos -= 1
  ) {

    const [
      token,
      session
    ] = entradas[pos];

    if (!session) {
      continue;
    }

    if (
      agoraMs -
      Number(
        session.createdAt ||
        0
      ) >
      TTL_MS
    ) {
      SESSIONS.delete(
        token
      );

      continue;
    }

    if (
      session.modo !==
      'album-imagens'
    ) {
      continue;
    }

    if (
      !mesmaIdentidade(
        session.jid,
        jid
      )
    ) {
      continue;
    }

    if (
      session.requesterId &&
      requesterId &&
      !mesmaIdentidade(
        session.requesterId,
        requesterId
      )
    ) {
      bloqueado =
        true;

      continue;
    }

    if (!encontrado) {
      encontrado = {
        token,
        session
      };
    }
  }

  return (
    encontrado ||
    (
      bloqueado
        ? {
            bloqueado: true
          }
        : null
    )
  );
}


export async function handleKyaraVideoFlowNumber({
  Kyara,
  jid,
  requesterId,
  text,
  info
}) {
  const numero =
    extrairNumeroAlbum(
      text
    );

  /*
   * Não é número puro:
   * deixa o resto do bot trabalhar.
   */
  if (
    numero === null
  ) {
    return false;
  }

  const encontrado =
    encontrarSessaoAlbum(
      jid,
      requesterId
    );

  /*
   * Não existe álbum:
   * fluxo normal.
   */
  if (!encontrado) {
    return false;
  }

  /*
   * Existe um álbum deste chat,
   * mas pertence a outro autor.
   *
   * Não expõe a sessão.
   */
  if (
    encontrado.bloqueado
  ) {
    return true;
  }

  const {
    token,
    session
  } = encontrado;

  if (
    !sessionValida(
      session
    )
  ) {
    SESSIONS.delete(
      token
    );

    return true;
  }

  const resultados =
    Array.isArray(
      session.resultados
    )
      ? session.resultados
      : [];

  if (
    numero < 1 ||
    numero > resultados.length
  ) {

    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `❌ Número inválido.\n\n` +
          `📸 Escolha uma mídia entre ` +
          `*1* e *${resultados.length}*.`
      },
      info
        ? {
            quoted: info
          }
        : {}
    );

    return true;
  }

  const resultado =
    resultados[
      numero - 1
    ];

  const source =
    resultado?.__kyaraAlbumSource;

  if (!source) {

    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `❌ A fonte da mídia *${numero}* ` +
          `não está mais disponível.`
      },
      info
        ? {
            quoted: info
          }
        : {}
    );

    return true;
  }

  try {

    await presence(
      Kyara,
      jid,
      'composing'
    );

    await Kyara.sendMessage(
      jid,
      {
        image:
          (typeof source === "string" ? { url: source } : source),

        mimetype:
          resultado.__kyaraAlbumMime ||
          'image/jpeg'
      },
      info
        ? {
            quoted: info
          }
        : {}
    );

    return true;

  } catch (error) {

    console.error(
      '[KYARA ALBUM NUMBER]',
      error?.stack ||
      error
    );

    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `❌ Não consegui enviar a imagem *${numero}*.\n\n` +
          `⚠️ ${limitar(
            error?.message ||
            'Erro desconhecido',
            300
          )}`
      },
      info
        ? {
            quoted: info
          }
        : {}
    );

    return true;

  } finally {

    await presence(
      Kyara,
      jid,
      'paused'
    );
  }
}


async function enviarCarousel(
  Kyara,
  jid,
  session,
  resultados
) {

  /* KYARA_CAROUSEL_VIDEO_ONLY */
  const listaCarousel =
    Array.isArray(resultados)
      ? resultados.filter(Boolean)
      : [];

  const carouselSomenteVideos =
    listaCarousel.length > 0 &&
    listaCarousel.every(item =>
      kyaraResultadoEhVideo(
        item,
        session?.site
      )
    );

  if (!carouselSomenteVideos) {
    console.log(
      '[KYARA VIDEO CAROUSEL] Ignorado: resultado não é exclusivamente vídeo.'
    );
    return false;
  }

  console.log(
    `[KYARA VIDEO CAROUSEL] Preparando ${resultados.length} resultado(s)`
  );

  const quantidade =
    Math.min(
      resultados.length,
      MAX_CARDS
    );

  const base =
    resultados.slice(
      0,
      quantidade
    );

  const cardsPreparados =
    await mapLimit(
      base,
      THUMB_CONCURRENCY,
      async (resultado, index) => {
        try {
          const imageMessage =
            await prepararThumbnail(
              Kyara,
              resultado.thumbnail,
              resultado.url
            );

          if (!imageMessage) {
            console.error(
              `[KYARA THUMB] Resultado ${index + 1}: nenhuma imagem disponível.`
            );

            return null;
          }

          return {
            resultado,
            imageMessage
          };
        } catch (erro) {
          console.error(
            `[KYARA THUMB] Resultado ${index + 1}:`,
            erro?.message ||
            erro
          );

          return null;
        }
      }
    );

  resultados =
    resultados.map(item => {

      const url =
        item.url ||
        item.link ||
        item.video_url ||
        item.media ||
        item.src ||
        item.download ||
        '';


      const thumbnail =
        item.thumbnail ||
        item.thumb ||
        item.image ||
        item.preview ||
        '';


      const titulo =
        item.titulo ||
        item.title ||
        item.name ||
        item.nome ||
        'Resultado';


      return {
        ...item,
        url,
        thumbnail,
        titulo,
        descricao:
          item.descricao ||
          item.description ||
          '',
      };

    })
    .filter(
      item =>
        item.url ||
        item.thumbnail
    );



  const cardsFinais =
    cardsPreparados
      .filter(Boolean)
      .map(
        (item, index) => {
          const numero =
            index + 1;

          const resultado =
            item.resultado;

          const ehRule34 =
            String(
              resultado.site ||
              ''
            ).toLowerCase() === 'rule34';

          const ehImagem =
            kyaraResultadoEhImagem(
              resultado,
              session.site
            );

          const downloadId =
            criarFlowId(
              session.token,
              'download',
              numero
            );

          const downloadButton =
            criarNativeButton(
              'quick_reply',
              {
                display_text:
                  (
                    ehRule34 ||
                    ehImagem
                  )
                    ? '⬇️ BAIXAR MÍDIA'
                    : '⬇️ BAIXAR VÍDEO',
                id:
                  downloadId
              }
            );

          const duracao =
            ehRule34
              ? ''
              : formatarDuracaoResultado(
                  resultado
                );

          const descricaoBase =
            resultado.descricao ||
            (
              ehRule34
                ? `🔞 RULE34\\n🆔 Post #${resultado.id || numero}`
                : `🌐 ${session.site}\\n📌 Resultado ${numero}`
            );

          const descricao =
            ehRule34
              ? descricaoBase
              : `${descricaoBase}\\n⏱️ Duração: ${duracao}`;

          const card =
            proto
              .Message
              .InteractiveMessage
              .fromObject({
                header: {
                  title:
                    limitar(
                      ehRule34
                        ? `🔞 ${resultado.titulo}`
                        : (
                            ehImagem
                              ? `🖼️ ${resultado.titulo}`
                              : `🎬 ${resultado.titulo}`
                          ),
                      180
                    ),

                  hasMediaAttachment:
                    true,

                  imageMessage:
                    item.imageMessage
                },

                body: {
                  text:
                    limitar(
                      descricao,
                      500
                    )
                },

                footer: {
                  text:
                    `🌸 KYARA • ${numero}/${base.length}`
                },

                nativeFlowMessage: {
                  buttons: [
                    downloadButton
                  ],

                  messageParamsJson:
                    '{}',

                  messageVersion:
                    1
                }
              });

          return {
            resultado,
            card
          };
        }
      );

  console.log(
    `[KYARA VIDEO CAROUSEL] Thumbnails: ${cardsFinais.length}/${base.length}`
  );

  if (!cardsFinais.length) {
    throw new Error(
      'Não foi possível preparar nenhum card.'
    );
  }

  session.resultados =
    cardsFinais.map(
      item =>
        item.resultado
    );

  session.modo =
    'download';

  console.log(
    `[KYARA VIDEO CAROUSEL] Enviando UMA mensagem com ${cardsFinais.length} card(s)`
  );

  const carouselMessage =
    proto
      .Message
      .InteractiveMessage
      .CarouselMessage
      .fromObject({
        cards:
          cardsFinais.map(
            item =>
              item.card
          ),

        messageVersion:
          1,

        carouselCardType:
          proto
            .Message
            .InteractiveMessage
            .CarouselMessage
            .CarouselCardType
            .HSCROLL_CARDS
      });

  const interactiveMessage =
    proto
      .Message
      .InteractiveMessage
      .fromObject({
        header: {
          title:
            '🌸 KYARA DOWNLOADER',

          hasMediaAttachment:
            false
        },

        body: {
          text:
            `🔎 *Resultados encontrados*\n\n` +
            `🎬 *${limitar(session.consulta, 140)}*\n` +
            `📦 ${session.resultados.length} resultado(s)\n\n` +
            `⬇️ Toque em *BAIXAR VÍDEO* no resultado desejado.`
        },

        footer: {
          text:
            `${getKyaraEmoji('brand')} ${getConfiguredBotName()} • Downloader`
        },

        carouselMessage:
          carouselMessage
      });

  /*
   * IMPORTANTE:
   * O carousel é encapsulado como viewOnceMessage.
   * O messageContextInfo ajuda na compatibilidade
   * de clientes WhatsApp com InteractiveMessage.
   */
  const waMessage =
    generateWAMessageFromContent(
      jid,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },

            interactiveMessage:
              interactiveMessage
          }
        }
      },
      {
        userJid:
          Kyara.user?.id ||
          jid
      }
    );

  /*
   * IMPORTANTE:
   * Native Flow/Carousel precisa dos nós adicionais.
   * A função buildAdditionalNodes() já existe neste arquivo.
   */
  const additionalNodes =
    buildAdditionalNodes(jid);

  console.log(
    '[KYARA VIDEO CAROUSEL] Relay:',
    JSON.stringify({
      jid,
      messageId:
        waMessage.key?.id || null,
      cards:
        cardsFinais.length,
      additionalNodes:
        additionalNodes.map(
          node =>
            node?.tag || null
        )
    })
  );

  await Kyara.relayMessage(
    jid,
    waMessage.message,
    {
      messageId:
        waMessage.key.id,

      additionalNodes
    }
  );

  console.log(
    '[KYARA VIDEO CAROUSEL] Carousel relay concluído:',
    waMessage.key.id
  );

  session.messageId =
    waMessage.key.id;

  session.sentAt =
    agora();

  return waMessage;
}


/* =========================================================
   SESSION CLEANUP
   ========================================================= */

function agendarLimpeza(token) {
  setTimeout(() => {
    const sessao =
      SESSIONS.get(token);

    if (!sessao) return;

    if (
      agora() -
        sessao.createdAt <
      TTL_MS
    ) {
      agendarLimpeza(token);
      return;
    }

    SESSIONS.delete(token);
  }, TTL_MS + 1000);
}

function sessionValida(session) {
  if (!session) {
    return false;
  }

  return (
    agora() -
      session.createdAt <=
    TTL_MS
  );
}

/* =========================================================
   PAINÉIS DE SELEÇÃO
   ========================================================= */

function criarFlowButton(
  texto,
  id
) {
  return criarNativeButton(
    'quick_reply',
    {
      display_text:
        texto,
      id
    }
  );
}

async function enviarPainelSelecao(
  Kyara,
  jid,
  session
) {
  const selecionados =
    Array.isArray(
      session.selecionados
    )
      ? session.selecionados
      : [];

  session.modo =
    'selecao';

  const linhas =
    selecionados.length
      ? selecionados
          .map(
            numero => {
              const item =
                session.resultados[
                  numero - 1
                ];

              if (!item) {
                return null;
              }

              return (
                `${numero}. ` +
                `${limitar(
                  item.titulo ||
                  `Resultado ${numero}`,
                  120
                )}`
              );
            }
          )
          .filter(Boolean)
          .join('\n')
      : 'Nenhum resultado selecionado.';

  const buttons = [];

  if (selecionados.length) {
    buttons.push(
      criarFlowButton(
        'CONTINUAR',
        criarFlowId(
          session.token,
          'continue',
          0
        )
      )
    );
  }

  buttons.push(
    criarFlowButton(
      'LIMPAR SELEÇÃO',
      criarFlowId(
        session.token,
        'clear',
        0
      )
    )
  );

  const interactiveMessage =
    proto
      .Message
      .InteractiveMessage
      .fromObject({
        header: {
          title:
            '🌸 KYARA • SELEÇÃO',
          hasMediaAttachment:
            false
        },

        body: {
          text:
            `🎬 *${limitar(
              session.consulta,
              140
            )}*\n\n` +
            `☑️ *Selecionados:* ` +
            `${selecionados.length}/3\n\n` +
            `${linhas}\n\n` +
            `Selecione os resultados no carousel ` +
            `ou continue para escolher a ação.`
        },

        footer: {
          text:
            `${getKyaraEmoji('brand')} ${getConfiguredBotName()} • Seleção`
        },

        nativeFlowMessage: {
          buttons,
          messageParamsJson:
            '{}',
          messageVersion:
            1
        }
      });

  const waMessage =
    generateWAMessageFromContent(
      jid,
      {
        interactiveMessage
      },
      {
        userJid:
          Kyara.user?.id ||
          jid
      }
    );

  await Kyara.relayMessage(
    jid,
    waMessage.message,
    {
      messageId:
        waMessage.key.id
    }
  );

  session.messageId =
    waMessage.key.id;

  session.sentAt =
    agora();
}

async function enviarPainelAcoes(
  Kyara,
  jid,
  session
) {
  const selecionados =
    Array.isArray(
      session.selecionados
    )
      ? session.selecionados
      : [];

  if (!selecionados.length) {
    await enviarPainelSelecao(
      Kyara,
      jid,
      session
    );

    return;
  }

  session.modo =
    'acoes';

  const linhas =
    selecionados
      .map(
        numero => {
          const item =
            session.resultados[
              numero - 1
            ];

          if (!item) {
            return null;
          }

          return (
            `🎬 *${numero}.* ` +
            `${limitar(
              item.titulo ||
              `Resultado ${numero}`,
              140
            )}`
          );
        }
      )
      .filter(Boolean)
      .join('\n\n');

  /*
   * Um botão por ação.
   *
   * IMPORTANTE:
   * Não cortamos a lista com slice().
   * Com 3 selecionados teremos:
   *
   * ASSISTIR 1
   * BAIXAR 1
   * ASSISTIR 2
   * BAIXAR 2
   * ASSISTIR 3
   * BAIXAR 3
   * EDITAR SELEÇÃO
   *
   * O limite de seleção continua sendo 3.
   */
  const buttons = [];

  for (
    const numero of selecionados
  ) {
    buttons.push(
      criarFlowButton(
        `▶️ ASSISTIR ${numero}`,
        criarFlowId(
          session.token,
          'open',
          numero
        )
      )
    );

    buttons.push(
      criarFlowButton(
        `⬇️ BAIXAR ${numero}`,
        criarFlowId(
          session.token,
          'download',
          numero
        )
      )
    );
  }

  buttons.push(
    criarFlowButton(
      '✏️ EDITAR SELEÇÃO',
      criarFlowId(
        session.token,
        'editSelection',
        0
      )
    )
  );

  const interactiveMessage =
    proto
      .Message
      .InteractiveMessage
      .fromObject({
        header: {
          title:
            '🌸 KYARA • RESULTADOS SELECIONADOS',
          hasMediaAttachment:
            false
        },

        body: {
          text:
            `📦 *${selecionados.length} resultado(s)*\n\n` +
            `${linhas}\n\n` +
            `Escolha uma ação para cada resultado.`
        },

        footer: {
          text:
            `${getKyaraEmoji('brand')} ${getConfiguredBotName()} • Downloader`
        },

        nativeFlowMessage: {
          buttons,
          messageParamsJson:
            '{}',
          messageVersion:
            1
        }
      });

  const waMessage =
    generateWAMessageFromContent(
      jid,
      {
        interactiveMessage
      },
      {
        userJid:
          Kyara.user?.id ||
          jid
      }
    );

  const additionalNodes =
    buildAdditionalNodes(jid);

  console.log(
    `[KYARA VIDEO ACTIONS] ` +
    `Enviando painel com ` +
    `${selecionados.length} selecionado(s) ` +
    `e ${buttons.length} botão(ões).`
  );

  await Kyara.relayMessage(
    jid,
    waMessage.message,
    {
      messageId:
        waMessage.key.id,
      additionalNodes
    }
  );

  session.messageId =
    waMessage.key.id;

  session.sentAt =
    agora();
}

/* =========================================================
   COMANDO DE BUSCA
   ========================================================= */

/* =========================================================
   RULE34 PRIME
   ========================================================= */

function ehRule34Resultado(site) {
  return String(
    site || ''
  )
    .trim()
    .toLowerCase() === 'rule34';
}


async function pesquisarRule34Prime({
  jid,
  consulta,
  quantidade
}) {

  const wanted =
    Math.max(
      1,
      Math.min(
        RULE34_MAX_IMAGES,
        Number(
          quantidade
        ) || 10
      )
    );

  const coletados = [];

  const local =
    new Set();

  /*
   * Cada rodada pede 50 resultados
   * começando numa página diferente.
   *
   * Isso permite atravessar os primeiros
   * 50 resultados já vistos e continuar.
   */

  for (
    let pagina = 0;
    pagina < 20 &&
    coletados.length < wanted;
    pagina++
  ) {

    const restante =
      wanted -
      coletados.length;

    const comando =
      `#baixar rule34 20 ` +
      `${consulta} ` +
      `__KYARA_RULE34_PAGE=${pagina}`;

    console.log(
      '[KYARA RULE34 PRIME] Página:',
      pagina,
      'restante:',
      restante
    );

    const dados =
      await executarPythonJson(
        comando,
        60_000
      );

    const brutos =
      deduplicarResultados(
        extrairResultadosDoJson(
          dados
        )
      );

    if (!brutos.length) {
      break;
    }

    const frescos =
      await pickFreshRule34(
        jid,
        consulta,
        brutos,
        restante
      );

    for (
      const item
      of frescos
    ) {

      const identidade =
        String(
          item?.id ||
          item?.url ||
          ''
        ).trim();

      if (
        !identidade
        ||
        local.has(
          identidade
        )
      ) {
        continue;
      }

      local.add(
        identidade
      );

      coletados.push({
        ...item,
        site: 'rule34'
      });

      if (
        coletados.length >=
        wanted
      ) {
        break;
      }
    }

    /*
     * IMPORTANTE:
     *
     * O Python pode retornar menos de 50 itens
     * por página porque o Rule34 PRIME trabalha
     * com lotes controlados.
     *
     * Portanto:
     *   brutos < 50 NÃO significa fim da fonte.
     *
     * Se esta página só trouxe itens já vistos,
     * avançamos para a próxima página.
     *
     * Só paramos quando a fonte realmente
     * não retornar nenhum resultado.
     */

    if (
      brutos.length === 0
    ) {
      break;
    }

    console.log(
      '[KYARA RULE34 PRIME] Avançando página:',
      pagina + 1,
      'novos nesta página:',
      frescos.length
    );
  }

  return coletados.slice(
    0,
    wanted
  );
}


async function enviarRule34Prime({
  Kyara,
  jid,
  consulta,
  resultados,
  info
}) {

  const frescos =
    await pickFreshRule34(
      jid,
      consulta,
      resultados,
      RULE34_MAX_IMAGES
    );

  if (
    !frescos.length
  ) {
    return {
      ok: false,
      reason: 'no-new-results'
    };
  }

  console.log(
    '[KYARA RULE34 PRIME] ÁLBUM:',
    frescos.length
  );

  /*
   * URL direta.
   *
   * NÃO:
   * - yt-dlp
   * - downloader_publico.py
   * - /downloads
   * - Buffer local
   *
   * O Baileys pega a URL e envia a mídia.
   */

  return sendRule34Album(
    Kyara,
    jid,
    frescos,
    {
      quoted:
        info,

      historyJid:
        jid,

      historyQuery:
        consulta,

      maxImages:
        RULE34_MAX_IMAGES,

      concurrency:
        8,

      mediaUploadTimeoutMs:
        45_000
    }
  );
}




async function tentarSelecaoNumericaAlbum({
  Kyara,
  jid,
  requesterId,
  text,
  info
}) {
  const bruto =
    String(text || '').trim();

  if (
    !/^\d{1,2}$/.test(bruto)
  ) {
    return false;
  }

  const numero =
    Number(bruto);

  if (
    numero < 1 ||
    numero > 99
  ) {
    return false;
  }

  let melhor = null;

  for (
    const session
    of SESSIONS.values()
  ) {
    if (!sessionValida(session)) {
      continue;
    }

    if (
      !mesmaIdentidade(
        session.jid,
        jid
      )
    ) {
      continue;
    }

    if (
      session.modo !==
      'album-imagens'
    ) {
      continue;
    }

    if (
      session.requesterId &&
      requesterId &&
      !mesmaIdentidade(
        session.requesterId,
        requesterId
      )
    ) {
      continue;
    }

    if (
      !melhor ||
      session.createdAt >
      melhor.createdAt
    ) {
      melhor = session;
    }
  }

  if (!melhor) {
    return false;
  }

  const resultado =
    melhor.resultados?.[
      numero - 1
    ];

  if (
    !resultado
  ) {
    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `❌ Não encontrei a mídia nº ${numero} ` +
          `nesta pesquisa.`
      },
      info
        ? { quoted: info }
        : {}
    );

    return true;
  }

  const url =
    String(
      resultado.media_url ||
      resultado.mediaUrl ||
      resultado.image ||
      resultado.imagem ||
      resultado.url ||
      ''
    ).trim();

  if (
    !/^https?:\/\//i.test(url)
  ) {
    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `❌ A mídia nº ${numero} não possui uma URL válida.`
      },
      info
        ? { quoted: info }
        : {}
    );

    return true;
  }

  try {

    await presence(
      Kyara,
      jid,
      'composing'
    );

    await Kyara.sendMessage(
      jid,
      {
        image: {
          url
        },
        caption:
          `🌸 *KYARA DOWNLOADER*\n` +
          `🖼️ Mídia ${numero}/${melhor.resultados.length}`
      },
      info
        ? { quoted: info }
        : {}
    );

  } catch (erro) {

    console.error(
      '[KYARA NUMERIC SELECTION]',
      erro?.stack ||
      erro
    );

    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `❌ Falha ao enviar a mídia nº ${numero}.\n\n` +
          `⚠️ ${limitar(
            erro?.message ||
            'Erro desconhecido',
            300
          )}`
      },
      info
        ? { quoted: info }
        : {}
    );

  } finally {

    await presence(
      Kyara,
      jid,
      'paused'
    );
  }

  return true;
}


/* ==========================================================
 * KYARA — DOWNLOAD POR URL DIRETA
 * ==========================================================
 *
 * Reutiliza:
 *   executarDownloaderPublico()
 *   encontrarArquivo()
 *   caminhoNormalizado()
 *   enviarArquivoBaixado()
 *   apagarArquivoSeguro()
 *
 * Não cria um segundo sistema de download.
 * ========================================================== */

async function processarUrlDiretaKyara({
  Kyara,
  jid,
  url,
  info,
  titulo = 'Mídia'
}) {

  await presence(
    Kyara,
    jid,
    'composing'
  );

  try {

    console.log(
      '[KYARA URL DIRETA] Download:',
      url
    );

    const dados =
      await executarDownloaderPublico(
        url,
        10 * 60 * 1000
      );

    if (
      dados?.ok === false
    ) {
      throw new Error(
        dados?.erro ||
        'O downloader recusou a URL.'
      );
    }

    const arquivoInformado =
      dados?.arquivo ||
      dados?.filePath ||
      dados?.filepath ||
      dados?.path ||
      null;

    const arquivo =
      arquivoInformado ||
      encontrarArquivo(
        dados
      );

    console.log(
      '[KYARA URL DIRETA] Retorno:',
      JSON.stringify({
        arquivoInformado:
          arquivoInformado || null,

        arquivoResolvido:
          arquivo || null
      })
    );

    if (
      !arquivo
    ) {
      throw new Error(
        'O download foi processado, mas nenhum arquivo foi gerado.'
      );
    }

    const caminho =
      caminhoNormalizado(
        arquivo
      );

    if (
      !caminho ||
      !fs.existsSync(caminho)
    ) {
      throw new Error(
        'O arquivo baixado não foi encontrado no armazenamento.'
      );
    }

    try {

      await enviarArquivoBaixado(
        Kyara,
        jid,
        caminho,
        titulo
      );

    } finally {

      await apagarArquivoSeguro(
        caminho
      );
    }

    console.log(
      '[KYARA URL DIRETA] ✅ Enviado:',
      url
    );

    return true;

  } catch (erro) {

    const bruto =
      String(
        erro?.message ||
        erro ||
        ''
      ).trim();

    console.error(
      '[KYARA URL DIRETA]',
      erro?.stack ||
      erro
    );

    let mensagem =
      bruto ||
      'Erro desconhecido no download.';

    /*
     * Reddit:
     * o extractor atual pode receber 403 e exigir
     * autenticação para o post.
     */
    if (
      /account authentication is required/i.test(
        mensagem
      ) ||
      /\\[Reddit\\]/i.test(
        mensagem
      ) &&
      /403|authentication|auth/i.test(
        mensagem
      )
    ) {

      mensagem =
        'O Reddit recusou o acesso a este post e exigiu autenticação. ' +
        'Esse link não pode ser baixado pela Kyara sem uma sessão autenticada.';
    }

    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\\n\\n` +
          `❌ Não consegui baixar esta URL.\\n\\n` +
          `⚠️ ${limitar(
            mensagem,
            700
          )}`
      },
      info
        ? { quoted: info }
        : {}
    );

    return true;

  } finally {

    await presence(
      Kyara,
      jid,
      'paused'
    );
  }
}



import {
  isKyaraImageSite,
  construirComandoBuscaSitePrime
} from '../core/sitePrime/index.js';

export async function handleKyaraVideoFlowCommand({
  Kyara,
  jid,
  requesterId,
  text,
  info
}) {

  const selecaoNumerica =
    await tentarSelecaoNumericaAlbum({
      Kyara,
      jid,
      requesterId,
      text,
      info
    });

  if (selecaoNumerica) {
    return true;
  }

  const comando =
    extrairComandoBaixar(
      text
    );

  if (!comando) {
    return false;
  }

  console.log(
    '[KYARA VIDEO FLOW] Comando:',
    limparTexto(
      text,
      300
    )
  );

  /*
   * =======================================================
   * URL DIRETA
   * =======================================================
   *
   * Este caminho é separado da pesquisa por site.
   *
   * #baixar https://...
   *
   * não vira:
   *
   * site = "https://..."
   *
   * Ele entra diretamente no downloader.
   */

  if (
    comando.modo ===
    'url-direta'
  ) {

    return processarUrlDiretaKyara({
      Kyara,
      jid,
      url:
        comando.urlDireta,
      info,
      titulo:
        '🌸 KYARA DOWNLOADER'
    });
  }

  /*
   * =======================================================
   * RULE34 PRIME
   * =======================================================
   */

  if (
    ehRule34Resultado(
      comando.site
    )
  ) {

    await presence(
      Kyara,
      jid,
      'composing'
    );

    try {

      const resultados =
        await pesquisarRule34Prime({
          jid,
          consulta:
            comando.consulta,
          quantidade:
            comando.quantidade
        });

      console.log(
        '[KYARA RULE34 PRIME] Novos:',
        resultados.length
      );

      if (
        !resultados.length
      ) {

        await Kyara.sendMessage(
          jid,
          {
            text:
              `🌸 *KYARA RULE34 PRIME*\n\n` +
              `🔎 Pesquisa: *${comando.consulta}*\n\n` +
              `♻️ Não encontrei novas imagens para esta pesquisa.`
          },
          info
            ? { quoted: info }
            : {}
        );

        return true;
      }

      const album =
        await enviarRule34Prime({
          Kyara,
          jid,
          consulta:
            comando.consulta,
          resultados,
          info
        });

      console.log(
        '[KYARA RULE34 PRIME] Resultado:',
        JSON.stringify({
          ok:
            !!album?.ok,

          enviados:
            album?.sent?.length || 0,

          falhas:
            album?.failed?.length || 0,

          parent:
            album?.parentKey?.id || null
        })
      );

      if (
        !album?.ok
      ) {

        await Kyara.sendMessage(
          jid,
          {
            text:
              `🌸 *KYARA RULE34 PRIME*\n\n` +
              `❌ Não consegui montar o álbum.`
          },
          info
            ? { quoted: info }
            : {}
        );
      }

      return true;

    } catch (erro) {

      console.error(
        '[KYARA RULE34 PRIME]',
        erro?.stack ||
        erro
      );

      await Kyara.sendMessage(
        jid,
        {
          text:
            `🌸 *KYARA RULE34 PRIME*\n\n` +
            `❌ Falha ao pesquisar/enviar.\n\n` +
            `⚠️ ${limitar(
              erro?.message ||
              'Erro desconhecido',
              500
            )}`
        },
        info
          ? { quoted: info }
          : {}
      );

      return true;

    } finally {

      await presence(
        Kyara,
        jid,
        'paused'
      );
    }
  }

  /*
   * =======================================================
   * OUTROS SITES
   * =======================================================
   */

  console.log(
    '[KYARA VIDEO FLOW] Python:',
    comando.comandoPython
  );

  await presence(
    Kyara,
    jid,
    'composing'
  );

  try {

    const comandoBusca =
      aumentarQuantidadeBuscaKyara(
        comando.comandoPython,
        KYARA_GENERIC_SEARCH_POOL
      );

    console.log(
      '[KYARA VIDEO FLOW] Busca ampliada:',
      comandoBusca
    );

    const kyaraImagePrimeAtivo =
      isKyaraImageSite(comando.site);

    const comandoBuscaSitePrime =
      kyaraImagePrimeAtivo
        ? construirComandoBuscaSitePrime(
            comando.site,
            comando.consulta,
            MAX_RESULTS
          )
        : null;

    const dados =
      await executarPythonJson(
        comandoBuscaSitePrime || comandoBusca,
        kyaraImagePrimeAtivo
          ? 75_000
          : 180_000
      );

    const brutos =
      extrairResultadosDoJson(
        dados
      );

    const deduplicados =
      deduplicarResultados(
        brutos
      );

    const resultadosBrutosNormalizados =
      deduplicados
        .map(item => {

          if (!item) {
            return null;
          }

          const url =
            item.url ||
            item.link ||
            item.video_url ||
            item.videoUrl ||
            item.download ||
            item.media_url ||
            item.mediaUrl ||
            item.media ||
            item.src ||
            item.image_url ||
            item.imageUrl ||
            item.image ||
            item.imagem ||
            '';

          return {
            ...item,
            url
          };
        })
        .filter(
          item =>
            item &&
            item.url
        );

    const resultadosNovos =
      selecionarResultadosNovosVideo(
        jid,
        comando.site,
        comando.consulta,
        resultadosBrutosNormalizados,
        MAX_RESULTS
      );

    const resultados =
      resultadosNovos.slice(
        0,
        MAX_RESULTS
      );


    if (
      !resultados.length
    ) {

      await Kyara.sendMessage(
        jid,
        {
          text:
            `🌸 *KYARA DOWNLOADER*\n\n` +
            `❌ Não encontrei resultados compatíveis.\n\n` +
            `🔎 Pesquisa: *${comando.consulta}*`
        },
        info
          ? { quoted: info }
          : {}
      );

      return true;
    }

    const token =
      gerarToken();

    const session = {
      token,
      jid,
      requesterId,
      site:
        comando.site,
      consulta:
        comando.consulta,
      resultados,
      modo:
        'download',
      createdAt:
        agora(),
      messageId:
        null,
      sentAt:
        null
    };

    SESSIONS.set(
      token,
      session
    );

    try {

      const albumEnviado =
        await enviarAlbumImagensKyara(
          Kyara,
          jid,
          session,
          resultados,
          info
        );

      if (albumEnviado) {
        lembrarResultadosVideo(
          jid,
          comando.site,
          comando.consulta,
          resultados
        );

        agendarLimpeza(token);
        return true;
      }

      await enviarCarousel(
        Kyara,
        jid,
        session,
        resultados
      );

      lembrarResultadosVideo(
        jid,
        comando.site,
        comando.consulta,
        resultados
      );

    } catch (erroCarousel) {

      SESSIONS.delete(
        token
      );

      console.error(
        '[KYARA VIDEO CAROUSEL]',
        erroCarousel?.stack ||
        erroCarousel
      );

      await Kyara.sendMessage(
        jid,
        {
          text:
            `🌸 *KYARA DOWNLOADER*\n\n` +
            `⚠️ Não foi possível preparar as thumbnails.\n\n` +
            `🔎 *${comando.consulta}*`
        },
        info
          ? { quoted: info }
          : {}
      );

      return true;
    }

    agendarLimpeza(
      token
    );

    return true;

  } finally {

    await presence(
      Kyara,
      jid,
      'paused'
    );
  }
}

/* =========================================================
   BUSCA DE ARQUIVO NO JSON DO DOWNLOAD
   ========================================================= */

function encontrarArquivo(dados) {
  const chaves =
    [
      'arquivo',
      'file',
      'filepath',
      'file_path',
      'path',
      'caminho',
      'output',
      'output_path',
      'filename',
      'nome_arquivo'
    ];

  function visitar(obj) {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const achado =
          visitar(item);

        if (achado) {
          return achado;
        }
      }

      return null;
    }

    for (const chave of chaves) {
      const valor =
        obj[chave];

      if (
        typeof valor === 'string' &&
        valor.trim()
      ) {
        return valor.trim();
      }
    }

    for (const valor of Object.values(obj)) {
      if (
        valor &&
        typeof valor === 'object'
      ) {
        const achado =
          visitar(valor);

        if (achado) {
          return achado;
        }
      }
    }

    return null;
  }

  return visitar(dados);
}

/* =========================================================
   MIME
   ========================================================= */

function mimePorExtensao(arquivo) {
  const ext =
    path
      .extname(arquivo)
      .toLowerCase();

  const mapa = {
    '.mp4': 'video/mp4',
    '.m4v': 'video/x-m4v',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.3gp': 'video/3gpp',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/ogg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };

  return (
    mapa[ext] ||
    'application/octet-stream'
  );
}

function extensaoEhVideo(arquivo) {
  return /\.(mp4|m4v|webm|mov|mkv|avi|3gp)$/i.test(
    arquivo
  );
}

/* =========================================================
   ARQUIVO SEGURO
   ========================================================= */

function caminhoNormalizado(arquivo) {
  try {
    return path.resolve(
      String(arquivo)
    );
  } catch {
    return '';
  }
}

function arquivoDoBot(arquivo) {
  const alvo =
    caminhoNormalizado(
      arquivo
    );

  if (!alvo) {
    return false;
  }

  const roots = [
    path.resolve(PROJECT_ROOT),
    path.resolve(
      PROJECT_ROOT,
      'midias_whatsapp'
    ),
    path.resolve(
      PROJECT_ROOT,
      'downloads'
    ),
    path.resolve(
      PROJECT_ROOT,
      'tmp'
    ),
    path.resolve(
      process.env.KYARA_TEMP_DIR ||
      path.join(
        os.tmpdir(),
        'kyara-downloads'
      )
    )
  ];

  return roots.some(
    root =>
      alvo === root ||
      alvo.startsWith(
        root + path.sep
      )
  );
}

/* =========================================================
   LIMPEZA
   ========================================================= */

async function apagarArquivoSeguro(
  arquivo
) {
  if (!arquivo) return;

  if (!arquivoDoBot(arquivo)) {
    return;
  }

  try {
    await fs.promises.rm(
      arquivo,
      {
        force: true
      }
    );
  } catch {}
}

/* =========================================================
   ENVIO DE VÍDEO
   ========================================================= */

async function enviarArquivoBaixado(
  Kyara,
  jid,
  arquivo,
  titulo
) {
  const caminho =
    caminhoNormalizado(
      arquivo
    );

  if (!caminho) {
    throw new Error(
      'Caminho de arquivo inválido.'
    );
  }

  if (!fs.existsSync(caminho)) {
    throw new Error(
      'O arquivo baixado não existe.'
    );
  }

  const stat =
    await fs.promises.stat(
      caminho
    );

  if (!stat.isFile()) {
    throw new Error(
      'O caminho do download não é um arquivo.'
    );
  }

  if (stat.size <= 0) {
    throw new Error(
      'O arquivo baixado está vazio.'
    );
  }

  const nomeArquivo =
    path.basename(
      caminho
    );

  const extensao =
    path.extname(
      caminho
    ).toLowerCase();

  const ehVideo =
    [
      '.mp4',
      '.m4v',
      '.webm',
      '.mov',
      '.mkv',
      '.avi',
      '.3gp'
    ].includes(
      extensao
    );

  const ehImagem =
    [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
      '.avif',
      '.bmp'
    ].includes(
      extensao
    );

  const ehAudio =
    [
      '.mp3',
      '.m4a',
      '.aac',
      '.ogg',
      '.opus',
      '.wav',
      '.flac'
    ].includes(
      extensao
    );

  const mime =
    ehVideo
      ? (
          extensao === '.webm'
            ? 'video/webm'
            : extensao === '.mov'
              ? 'video/quicktime'
              : extensao === '.mkv'
                ? 'video/x-matroska'
                : 'video/mp4'
        )
      : mimePorExtensao(
          caminho
        );

  console.log(
    '[KYARA VIDEO SEND] Preparando envio:',
    JSON.stringify({
      caminho,
      nomeArquivo,
      tamanho: stat.size,
      tamanhoMB:
        Number(
          stat.size /
          1024 /
          1024
        ).toFixed(2),
      extensao,
      mime,
      ehVideo
    })
  );

  const caption =
    ehVideo
      ? (
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `✅ *Download concluído!*\n\n` +
          `🎬 ${limitar(titulo, 180)}`
        )
      : (
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `✅ *Arquivo baixado!*\n\n` +
          `📄 ${limitar(titulo, 180)}`
        );

  /*
   * IMPORTANTE:
   *
   * Não carregamos mais o vídeo inteiro em Buffer.
   *
   * O Baileys recebe o caminho do arquivo e cria
   * o stream de leitura durante o upload.
   *
   * Isso reduz bastante o uso de RAM em vídeos grandes.
   */

  let ultimoErro = null;

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      console.log(
        `[KYARA VIDEO SEND] 📤 Tentativa ${tentativa}/3`
      );

      if (ehVideo) {
        await Kyara.sendMessage(
          jid,
          {
            video: {
              url: caminho
            },
            mimetype: mime,
            fileName: nomeArquivo,
            caption
          }
        );

        console.log(
          '[KYARA VIDEO SEND] ✅ Vídeo enviado com sucesso.'
        );

        return;
      }

      if (ehImagem) {
        await Kyara.sendMessage(
          jid,
          {
            image: {
              url: caminho
            },
            mimetype: mime,
            fileName: nomeArquivo,
            caption
          }
        );

        console.log(
          '[KYARA VIDEO SEND] ✅ Imagem enviada com sucesso.'
        );

        return;
      }

      if (ehAudio) {
        await Kyara.sendMessage(
          jid,
          {
            audio: {
              url: caminho
            },
            mimetype: mime,
            ptt: false
          }
        );

        console.log(
          '[KYARA VIDEO SEND] ✅ Áudio enviado com sucesso.'
        );

        return;
      }

      await Kyara.sendMessage(
        jid,
        {
          document: {
            url: caminho
          },
          mimetype: mime,
          fileName: nomeArquivo,
          caption
        }
      );

      console.log(
        '[KYARA VIDEO SEND] ✅ Arquivo enviado como documento.'
      );

      return;

    } catch (error) {
      ultimoErro = error;

      console.error(
        `[KYARA VIDEO SEND] ❌ Tentativa ${tentativa}/3 falhou:`,
        error?.message ||
        error
      );

      if (tentativa < 3) {
        const espera =
          tentativa * 2500;

        console.log(
          `[KYARA VIDEO SEND] ⏳ Aguardando ${espera}ms antes de tentar novamente...`
        );

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              espera
            )
        );
      }
    }
  }

  throw new Error(
    `Falha no upload após 3 tentativas: ${
      ultimoErro?.message ||
      'Media upload failed'
    }`
  );
}

/* =========================================================
   CLICK / DOWNLOAD
   ========================================================= */

export async function handleKyaraVideoFlowClick({
  Kyara,
  info,
  jid,
  clickerId
}) {
  const id =
    extrairIdInterativo(info);

  if (!isKyaraVideoFlowId(id)) {
    return false;
  }

  const parsed =
    lerFlowId(id);

  if (!parsed) {
    return true;
  }

  const session =
    SESSIONS.get(
      parsed.token
    );

  /*
   * O carousel atual possui somente:
   *
   * ⬇️ BAIXAR VÍDEO
   *
   * Seleção/abertura não fazem mais parte
   * do fluxo atual.
   *
   * IDs antigos são ignorados silenciosamente.
   */
  if (!session) {
    return true;
  }

  if (!sessionValida(session)) {
    SESSIONS.delete(
      parsed.token
    );

    return true;
  }

  /*
   * Segurança:
   * verifica chat + autor original.
   */
  if (
    !mesmaIdentidade(
      session.jid,
      jid
    )
  ) {
    return true;
  }

  if (
    session.requesterId &&
    clickerId &&
    !mesmaIdentidade(
      session.requesterId,
      clickerId
    )
  ) {
    return true;
  }

  /*
   * O único botão existente no carousel é:
   *
   * download -> baixa o resultado
   */
  if (
    parsed.acao !== 'download'
  ) {
    return true;
  }

  const index =
    parsed.numero - 1;

  const resultado =
    session.resultados?.[index];

  if (!resultado) {
    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `❌ Resultado não encontrado.`
      }
    );

    return true;
  }

  if (!resultado.url) {
    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `❌ A URL deste resultado não está disponível.`
      }
    );

    return true;
  }

  /*
   * =======================================================
   * FAST PATH — IMAGEM
   * =======================================================
   *
   * Pinterest e outros resultados de imagem não passam
   * pelo downloader de vídeo.
   */
  if (
    kyaraResultadoEhImagem(
      resultado,
      session.site
    )
  ) {

    await presence(
      Kyara,
      jid,
      'composing'
    );

    try {

      let imagem =
        resultado.__kyaraAlbumSource ||
        resultado.image_url ||
        resultado.imageUrl ||
        resultado.image ||
        resultado.imagem ||
        resultado.thumbnail ||
        resultado.thumb ||
        null;

      /*
       * Pinterest normalmente guarda a imagem
       * dentro da página do Pin.
       */
      if (
        (
          !imagem ||
          typeof imagem === 'string'
        ) &&
        (
          String(session.site || '')
            .toLowerCase()
            .includes('pinterest') ||
          String(session.site || '')
            .toLowerCase() === 'pin'
        )
      ) {

        const paginaUrl =
          String(
            resultado.url ||
            resultado.link ||
            ''
          ).trim();

        const meta =
          await buscarImagemPagina(
            paginaUrl
          );

        if (
          meta
        ) {
          const buffer =
            await baixarImagemBuffer(
              meta,
              15_000,
              paginaUrl
            );

          if (
            buffer
          ) {
            imagem = buffer;
          }
        }
      }

      /*
       * Se ainda for uma URL, tenta transformá-la
       * em Buffer validado antes de enviar.
       */
      if (
        typeof imagem === 'string' &&
        /^https?:\/\//i.test(
          imagem
        )
      ) {
        const buffer =
          await baixarImagemBuffer(
            imagem,
            15_000,
            resultado.url
          );

        if (
          buffer
        ) {
          imagem = buffer;
        }
      }

      if (
        !imagem
      ) {
        throw new Error(
          'Não foi encontrada uma imagem válida para este resultado.'
        );
      }

      await Kyara.sendMessage(
        jid,
        {
          image:
            (typeof imagem === 'string'
              ? { url: imagem }
              : imagem),

          mimetype:
            resultado.__kyaraAlbumMime ||
            resultado.mimetype ||
            'image/jpeg',

          caption:
            limitar(
              resultado.titulo ||
              'Imagem',
              180
            )
        },
        info
          ? {
              quoted: info
            }
          : {}
      );

      console.log(
        '[KYARA IMAGE SEND] ✅ Imagem enviada:',
        resultado.titulo
      );

      return true;

    } catch (erroImagem) {

      console.error(
        '[KYARA IMAGE SEND]',
        erroImagem?.stack ||
        erroImagem
      );

      await Kyara.sendMessage(
        jid,
        {
          text:
            `🌸 *KYARA DOWNLOADER*\n\n` +
            `❌ Não consegui enviar a imagem.\n\n` +
            `⚠️ ${limitar(
              erroImagem?.message ||
              'Erro desconhecido',
              300
            )}`
        },
        info
          ? {
              quoted: info
            }
          : {}
      );

      return true;

    } finally {

      await presence(
        Kyara,
        jid,
        'paused'
      );
    }
  }

  /*
   * FAST PATH:
   * resultado já é um arquivo de vídeo.
   *
   * Não inicia:
   *   Python
   *   yt-dlp
   *   download local
   *
   * Se o servidor não aceitar o envio direto,
   * o fluxo original continua como fallback.
   */
  if (
    kyaraVideoUrlDireta(
      resultado.url
    )
  ) {

    console.log(
      '[KYARA VIDEO FAST DIRECT]',
      resultado.url
    );

    await presence(
      Kyara,
      jid,
      'composing'
    );

    try {

      await Kyara.sendMessage(
        jid,
        {
          video: {
            url:
              resultado.url
          },

          mimetype:
            kyaraVideoMimePorUrl(
              resultado.url
            ),

          caption:
            limitar(
              resultado.titulo ||
              'Vídeo',
              180
            )
        },
        info
          ? {
              quoted: info
            }
          : {}
      );

      return true;

    } catch (erroDirect) {

      console.warn(
        '[KYARA VIDEO FAST DIRECT] ' +
        'fallback Python:',
        erroDirect?.message ||
        erroDirect
      );

    } finally {

      await presence(
        Kyara,
        jid,
        'paused'
      );
    }
  }

  /*
   * Compatibilidade com sessões antigas.
   *
   * Rule34 nunca mais precisa passar pelo
   * downloader Python.
   */
  if (
    ehRule34Resultado(
      session.site
    )
  ) {

    await presence(
      Kyara,
      jid,
      'composing'
    );

    try {

      await Kyara.sendMessage(
        jid,
        {
          image: {
            url:
              resultado.url
          }
        },
        info
          ? { quoted: info }
          : {}
      );

      return true;

    } catch (erroRule34) {

      console.error(
        '[KYARA RULE34 PRIME] envio direto:',
        erroRule34?.stack ||
        erroRule34
      );

      await Kyara.sendMessage(
        jid,
        {
          text:
            `🌸 *KYARA RULE34 PRIME*\n\n` +
            `❌ Falha ao enviar a mídia.`
        },
        info
          ? { quoted: info }
          : {}
      );

      return true;

    } finally {

      await presence(
        Kyara,
        jid,
        'paused'
      );
    }
  }

  await presence(
    Kyara,
    jid,
    'composing'
  );

  try {
    /*
     * Não manda "baixando..." para não poluir o chat.
     */
    const dados =
      await executarDownloaderPublico(
        resultado.url,
        10 * 60 * 1000
      );

    const arquivoInformado =
      dados?.arquivo ||
      dados?.filePath ||
      dados?.filepath ||
      dados?.path ||
      null;

    const arquivo =
      arquivoInformado ||
      encontrarArquivo(
        dados
      );

    console.log(
      '[KYARA VIDEO DOWNLOAD] Arquivo retornado pelo Python:',
      JSON.stringify({
        arquivoInformado:
          arquivoInformado || null,
        arquivoResolvido:
          arquivo || null
      })
    );

    if (!arquivo) {
      throw new Error(
        'O download foi processado, mas o Python não informou o arquivo gerado.'
      );
    }

    const caminho =
      caminhoNormalizado(
        arquivo
      );

    if (
      !caminho ||
      !fs.existsSync(caminho)
    ) {
      throw new Error(
        'O arquivo do download não foi encontrado no armazenamento.'
      );
    }

    /*
     * Remove o temporário assim que o envio terminar,
     * inclusive se o envio falhar.
     */
    try {
      await enviarArquivoBaixado(
        Kyara,
        jid,
        caminho,
        resultado.titulo
      );
    } finally {
      await apagarArquivoSeguro(
        caminho
      );
    }

    return true;
  } catch (erro) {
    console.error(
      '[KYARA VIDEO DOWNLOAD]',
      erro?.stack ||
      erro
    );

    await Kyara.sendMessage(
      jid,
      {
        text:
          `🌸 *KYARA DOWNLOADER*\n\n` +
          `❌ *Não foi possível enviar o resultado.*\n\n` +
          `🎬 ${limitar(resultado.titulo, 180)}\n\n` +
          `🔗 A URL escolhida foi preservada na sessão.\n\n` +
          `⚠️ ${limitar(erro?.message || 'Erro desconhecido', 500)}`
      }
    );

    return true;
  } finally {
    await presence(
      Kyara,
      jid,
      'paused'
    );
  }
}

/* =========================================================
   EXPORTS
   ========================================================= */

export default {
  isKyaraVideoSearchCommand,
  isKyaraVideoFlowId,
  handleKyaraVideoFlowCommand,
  handleKyaraVideoFlowClick,
  handleKyaraVideoFlowNumber
};
