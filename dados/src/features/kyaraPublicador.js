import fs from 'fs';
import path from 'path';

const DATABASE_DIR =
  process.env.KYARA_DATABASE_DIR ||
  path.join(process.cwd(), 'dados');

const CONFIG_FILE =
  path.join(
    DATABASE_DIR,
    'kyaraPublicador.json'
  );

function garantirDiretorio() {
  fs.mkdirSync(
    path.dirname(CONFIG_FILE),
    { recursive: true }
  );
}

function configuracaoPadrao() {
  return {
    enabled: true,

    publicargp: {
      enabled: true,
      destinos: []
    },

    publicargphentai: {
      enabled: true,
      destinos: []
    }
  };
}

function lerConfig() {
  garantirDiretorio();

  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      const padrao =
        configuracaoPadrao();

      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(
          padrao,
          null,
          2
        )
      );

      return padrao;
    }

    const dados =
      JSON.parse(
        fs.readFileSync(
          CONFIG_FILE,
          'utf8'
        )
      );

    return {
      ...configuracaoPadrao(),
      ...dados,
      publicargp: {
        ...configuracaoPadrao().publicargp,
        ...(dados.publicargp || {})
      },
      publicargphentai: {
        ...configuracaoPadrao().publicargphentai,
        ...(dados.publicargphentai || {})
      }
    };
  } catch (erro) {
    console.error(
      '[KYARA PUBLICADOR] Falha ao ler configuração:',
      erro
    );

    return configuracaoPadrao();
  }
}

function salvarConfig(config) {
  garantirDiretorio();

  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(
      config,
      null,
      2
    )
  );
}

function normalizarJid(valor) {
  const jid =
    String(valor || '')
      .trim();

  if (!jid) {
    return null;
  }

  if (
    !/@(g\.us|newsletter|s\.whatsapp\.net)$/i.test(
      jid
    )
  ) {
    return null;
  }

  return jid;
}

function obterDestinos(tipo) {
  const config =
    lerConfig();

  const bloco =
    tipo === 'hentai'
      ? config.publicargphentai
      : config.publicargp;

  if (
    !config.enabled ||
    !bloco?.enabled
  ) {
    return [];
  }

  return [
    ...new Set(
      (Array.isArray(bloco.destinos)
        ? bloco.destinos
        : []
      )
        .map(normalizarJid)
        .filter(Boolean)
    )
  ];
}

function ehComandoPublicador(texto) {
  return /^[/#!.]?publicargp(?:hentai)?(?:\s|$)/i.test(
    String(texto || '').trim()
  );
}

function analisarComando(texto) {
  const entrada =
    String(texto || '')
      .trim();

  const match =
    entrada.match(
      /^[/#!.]?(publicargphentai|publicargp)(?:\s+(.+))?$/i
    );

  if (!match) {
    return null;
  }

  const comando =
    String(match[1])
      .toLowerCase();

  return {
    tipo:
      comando === 'publicargphentai'
        ? 'hentai'
        : 'normal',

    url:
      String(match[2] || '')
        .trim()
  };
}

function extrairUrl(texto) {
  const match =
    String(texto || '')
      .match(
        /https?:\/\/[^\s<>]+/i
      );

  return match
    ? match[0]
    : null;
}

function nomeDestino(jid) {
  if (
    /@g\.us$/i.test(jid)
  ) {
    return 'grupo';
  }

  if (
    /@newsletter$/i.test(jid)
  ) {
    return 'canal';
  }

  return 'destino';
}

function formatarRelatorio(
  tipo,
  resultados
) {
  const titulo =
    tipo === 'hentai'
      ? '🔞 PUBLICARGPHENTAI'
      : '📢 PUBLICARGP';

  const linhas =
    resultados.map(item => {
      const icone =
        item.ok
          ? '✅'
          : '❌';

      return (
        `${icone} ${nomeDestino(item.jid)}` +
        `\n   ${item.jid}` +
        (
          item.erro
            ? `\n   ${item.erro}`
            : ''
        )
      );
    });

  return (
    `*${titulo}*\n\n` +
    linhas.join('\n\n')
  );
}

async function enviarMidia(
  Kyara,
  jid,
  arquivo,
  dados
) {
  const nomeArquivo =
    path.basename(
      arquivo
    );

  const ext =
    path.extname(
      nomeArquivo
    ).toLowerCase();

  const ehVideo =
    [
      '.mp4',
      '.m4v',
      '.webm',
      '.mov',
      '.mkv'
    ].includes(ext);

  const ehImagem =
    [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif'
    ].includes(ext);

  if (!ehVideo && !ehImagem) {
    throw new Error(
      `Formato não suportado: ${ext || 'desconhecido'}`
    );
  }

  const caption =
    String(
      dados?.caption ||
      dados?.titulo ||
      ''
    ).trim();

  if (ehVideo) {
    await Kyara.sendMessage(
      jid,
      {
        video: {
          url: arquivo
        },
        mimetype:
          dados?.mimetype ||
          'video/mp4',
        fileName:
          nomeArquivo,
        caption
      }
    );

    return;
  }

  await Kyara.sendMessage(
    jid,
    {
      image: {
        url: arquivo
      },
      mimetype:
        dados?.mimetype ||
        'image/jpeg',
      fileName:
        nomeArquivo,
      caption
    }
  );
}

export {
  ehComandoPublicador,
  analisarComando,
  extrairUrl,
  lerConfig,
  salvarConfig,
  obterDestinos,
  enviarMidia,
  formatarRelatorio
};
