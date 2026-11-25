import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJETO = path.resolve(
  __dirname,
  '../../../'
);

const SCRIPT_PYTHON = path.join(
  PROJETO,
  'bot_videos.py'
);

const ARQUIVO_SITES = path.join(
  PROJETO,
  'sites_videos.json'
);

function carregarSites() {
  try {
    if (!fs.existsSync(ARQUIVO_SITES)) {
      return {};
    }

    const dados = JSON.parse(
      fs.readFileSync(
        ARQUIVO_SITES,
        'utf8'
      )
    );

    return (
      dados &&
      typeof dados === 'object'
    )
      ? dados
      : {};
  } catch {
    return {};
  }
}

function extrairRespostaFinal(stdout, stderr) {
  const texto = String(
    stdout || ''
  ).trim();

  if (!texto) {
    return String(
      stderr || ''
    ).trim();
  }

  const marcadores = [
    '🌸 SITES CADASTRADOS',
    '✅ Site ',
    '🔎 RESULTADOS PARA:',
    '✅ DOWNLOAD CONCLUÍDO!',
    '❌ Não foi possível',
    '❌ Nenhum resultado',
    '❌ Site ',
    '⚠️ Uso correto:',
    '⚠️ Uso:',
    '❌ '
  ];

  let indice = -1;

  for (const marcador of marcadores) {
    const encontrado =
      texto.lastIndexOf(marcador);

    if (encontrado > indice) {
      indice = encontrado;
    }
  }

  if (indice >= 0) {
    return texto
      .slice(indice)
      .trim();
  }

  return texto;
}

function extrairArquivo(stdout) {
  const texto = String(
    stdout || ''
  );

  const encontrados = [
    ...texto.matchAll(
      /📁\s+(.+?)(?:\r?\n|$)/g
    )
  ];

  if (!encontrados.length) {
    return null;
  }

  const caminho = encontrados[
    encontrados.length - 1
  ][1].trim();

  if (!caminho) {
    return null;
  }

  try {
    return fs.existsSync(caminho)
      ? caminho
      : null;
  } catch {
    return null;
  }
}

export function kyaraUniversalDownloader(
  comando
) {
  return new Promise((resolve) => {
    const processo = spawn(
      'python3',
      [
        SCRIPT_PYTHON,
        comando
      ],
      {
        cwd: PROJETO,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      }
    );

    let stdout = '';
    let stderr = '';

    processo.stdout.on(
      'data',
      (dados) => {
        stdout += dados.toString();
      }
    );

    processo.stderr.on(
      'data',
      (dados) => {
        stderr += dados.toString();
      }
    );

    processo.on(
      'error',
      (erro) => {
        resolve({
          ok: false,
          output:
            '❌ Erro ao iniciar o downloader:\n' +
            erro.message,
          filePath: null
        });
      }
    );

    processo.on(
      'close',
      (codigo) => {
        const output =
          extrairRespostaFinal(
            stdout,
            stderr
          );

        const filePath =
          extrairArquivo(stdout);

        resolve({
          ok: codigo === 0,
          output:
            output ||
            `❌ Downloader encerrou sem resposta. Código: ${codigo}`,
          filePath
        });
      }
    );
  });
}

export function ehComandoKyaraDownloader(
  texto
) {
  const entrada = (
    texto || ''
  ).trim();

  if (!entrada) {
    return false;
  }

  const partes = entrada.split(
    /\s+/
  );

  const comando =
    partes[0].toLowerCase();

  if (
    comando === '/siteadd' ||
    comando === '/sites' ||
    comando === '/listasites' ||
    comando === '/listsites' ||
    comando === '/sitedel'
  ) {
    return true;
  }

  if (comando !== '/baixar') {
    return false;
  }

  /*
   * /baixar SITE CONSULTA pertence exclusivamente ao
   * Kyara Video Flow.
   *
   * O downloader universal continua disponível para os
   * demais comandos, mas nunca deve interceptar a busca
   * de vídeos.
   */
  if (
    partes.length >= 3 &&
    partes[1] &&
    partes.slice(2).join(' ').trim()
  ) {
    return false;
  }

  const nomeSite = (
    partes[1] || ''
  ).toLowerCase();

  if (!nomeSite) {
    return false;
  }

  const sites = carregarSites();

  return Boolean(
    sites[nomeSite]
  );
}
