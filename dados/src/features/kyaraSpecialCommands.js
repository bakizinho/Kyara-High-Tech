import {
  handle as handleMedia
} from './kyaraMediaCommands.js';

import { handleKyaraImageCommand } from './kyaraImageCommand.js';

import {
  handleBrowserCommand
} from './kyaraBrowser.js';

import {
  handleKyaraYouTubeCommand
} from './kyaraYouTube.js';

import {
  handleKyaraGameCommand
} from './kyaraGame.js';

import {
  handleKyaraMenuHtml
} from './kyaraMenuHtml.js';

import {
  handleKyaraSpecialCommand as handleLegacy
} from './kyaraSpecialCommandsLegacy.js';

import {
  setLevelingEnabled
} from './levelingControl.js';

import fs from 'node:fs';
import path from 'node:path';
import { readMenuButtonState, writeMenuButtonState } from '../menus/categorias/sistema/menu-button-state.js';

/*
 * ============================================================
 * SANDRO_COMPAT_TOOLS_V2
 * ============================================================
 *
 * Somente comandos que não possuem implementação equivalente
 * no BKkyara.
 *
 * Não duplica qrcode, chance, calc, clima, horoscopo etc.
 * ============================================================
 */


function fmtCompatNumber(
  value
) {

  if (
    !Number.isFinite(
      value
    )
  ) {

    return 'indefinido';

  }

  if (
    Number.isInteger(
      value
    )
  ) {

    return String(
      value
    );

  }

  return value
    .toFixed(8)
    .replace(
      /0+$/,
      ''
    )
    .replace(
      /\.$/,
      ''
    );

}


function parseQuadratic(
  input
) {

  const value =
    String(
      input ||
      ''
    )

    .replace(
      /,/g,
      '.'
    )

    .replace(
      /\s+/g,
      ''
    )

    .replace(
      /²/g,
      '^2'
    )

    .replace(
      /=0$/,
      ''
    );


  const match =
    value.match(

      /^([+-]?\d+(?:\.\d+)?)?x(?:\^2|\*\*2)([+-]\d+(?:\.\d+)?)?x?([+-]\d+(?:\.\d+)?)?$/i

    );


  if (
    !match
  ) {

    return null;

  }


  const a =
    Number(
      match[1] ||
      1
    );

  const b =
    Number(
      match[2] ||
      0
    );

  const c =
    Number(
      match[3] ||
      0
    );


  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    !Number.isFinite(c) ||
    a === 0
  ) {

    return null;

  }


  return {
    a,
    b,
    c
  };

}


function gerarNicksCompat(
  nome
) {

  const value =
    String(
      nome ||
      ''
    ).trim();

  const small = {

    a:'ᴀ',
    b:'ʙ',
    c:'ᴄ',
    d:'ᴅ',
    e:'ᴇ',
    f:'ꜰ',
    g:'ɢ',
    h:'ʜ',
    i:'ɪ',
    j:'ᴊ',
    k:'ᴋ',
    l:'ʟ',
    m:'ᴍ',
    n:'ɴ',
    o:'ᴏ',
    p:'ᴘ',
    q:'ǫ',
    r:'ʀ',
    s:'s',
    t:'ᴛ',
    u:'ᴜ',
    v:'ᴠ',
    w:'ᴡ',
    x:'x',
    y:'ʏ',
    z:'ᴢ'

  };

  const bold = {

    a:'𝗮',
    b:'𝗯',
    c:'𝗰',
    d:'𝗱',
    e:'𝗲',
    f:'𝗳',
    g:'𝗴',
    h:'𝗵',
    i:'𝗶',
    j:'𝗷',
    k:'𝗸',
    l:'𝗹',
    m:'𝗺',
    n:'𝗻',
    o:'𝗼',
    p:'𝗽',
    q:'𝗾',
    r:'𝗿',
    s:'𝘀',
    t:'𝘁',
    u:'𝘂',
    v:'𝘃',
    w:'𝘄',
    x:'𝘅',
    y:'𝘆',
    z:'𝘇'

  };

  const transform =
    map =>

      Array
        .from(
          value.toLowerCase()
        )

        .map(
          char =>
            map[char] ||
            char
        )

        .join('');


  return [

    `『 ${transform(
      small
    )} 』`,

    `꧁${transform(
      bold
    )}꧂`,

    `✦ ${value} ✦`,

    `⟦ ${value} ⟧`

  ];

}


const SANDRO_COMPAT_COMMANDS =
  new Set([

    'botoes',
    'botões',

    'gerarsenha',

    'bhaskara',

    'raizquadrada',

    'caracoroa',

    'aleatorio',

    'gerarnick2',

    'fatos',

    'biografia',

    'wiki',

    'wikipedia',

    'google',

    'googlesearch',

    'cep',

    'ddd',

    'feriados',

    'cotacao',

    'pokemon',

    'tinyur',

    'tinyurl',

    'traduzir',

    'tagme'

  ]);


async function handleSandroCompatCommand(
  options,
  command,
  q
) {

  if (
    !SANDRO_COMPAT_COMMANDS.has(
      command
    )
  ) {

    return false;

  }


  const prefix =
    options.prefix ||
    '#';


  /*
   * BOTÕES
   */

  if (
    command === 'botoes' ||
    command === 'botões'
  ) {

    if (
      !options.isOwner
    ) {

      await options.reply(
        '⛔ *Apenas o dono pode alterar os botões do menu.*'
      );

      return true;

    }


    const value =
      String(
        q ||
        ''
      )
      .trim()
      .toLowerCase();


    if (
      value === 'status'
    ) {

      const state =
        readMenuButtonState();


      await options.reply(

        state.buttonsEnabled === false

          ? '❌ *BOTÕES DESATIVADOS*'

          : '✅ *BOTÕES ATIVADOS*'

      );

      return true;

    }


    if (
      ![
        '0',
        '1'
      ].includes(
        value
      )
    ) {

      await options.reply(

        `⚙️ *CONTROLE DOS BOTÕES*\n\n` +

        `✅ ${prefix}botoes 1\n` +
        `Ativar botões\n\n` +

        `❌ ${prefix}botoes 0\n` +
        `Desativar botões\n\n` +

        `ℹ️ ${prefix}botoes status`

      );

      return true;

    }


    writeMenuButtonState(
      value === '1'
    );


    await options.reply(

      value === '1'

        ? (
            '✅ *BOTÕES ATIVADOS!*\n\n' +
            'Menu principal, submenus e Play voltam ao Native Flow.'
          )

        : (
            '❌ *BOTÕES DESATIVADOS!*\n\n' +
            'Menus passam para o modo sem botões.'
          )

    );


    return true;

  }


  /*
   * SENHA
   */

  if (
    command === 'gerarsenha'
  ) {

    let length =
      Number.parseInt(
        q,
        10
      );


    if (
      !Number.isFinite(
        length
      )
    ) {

      length =
        12;

    }


    if (
      length < 6 ||
      length > 32
    ) {

      await options.reply(
        `❌ Use entre 6 e 32 caracteres.\nEx.: ${prefix}gerarsenha 16`
      );

      return true;

    }


    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZ' +
      'abcdefghijkmnopqrstuvwxyz' +
      '23456789!@#$%&*';


    let result =
      '';


    for (
      let i = 0;
      i < length;
      i += 1
    ) {

      result +=
        chars[
          Math.floor(
            Math.random() *
            chars.length
          )
        ];

    }


    await options.reply(

      `🔐 *SENHA GERADA*\n\n` +
      `Tamanho: *${length}*\n\n` +
      `\`${result}\``

    );


    return true;

  }


  /*
   * CARA/COROA
   */

  if (
    command === 'caracoroa'
  ) {

    await options.reply(

      `🪙 *CARA OU COROA*\n\n` +

      `Resultado: *${
        Math.random() < 0.5
          ? 'CARA'
          : 'COROA'
      }*`

    );

    return true;

  }


  /*
   * ALEATÓRIO
   */

  if (
    command === 'aleatorio'
  ) {

    await options.reply(

      `🎲 *NÚMERO ALEATÓRIO*\n\n` +

      `Resultado: *${
        Math.floor(
          Math.random() *
          100
        ) + 1
      }*`

    );

    return true;

  }


  /*
   * GERAR NICK
   */

  if (
    command === 'gerarnick2'
  ) {

    if (
      !q
    ) {

      await options.reply(
        `❌ Use: ${prefix}gerarnick2 𝗩Ø𝗫-𝗦𝗬𝗦𝗧Ξ𝗠`
      );

      return true;

    }


    await options.reply(

      `✨ *NICKS GERADOS*\n\n` +

      gerarNicksCompat(
        q
      ).join('\n')

    );


    return true;

  }


  /*
   * FATOS
   */

  if (
    command === 'fatos'
  ) {

    const facts = [

      'A Lua é o satélite natural da Terra.',

      'A luz do Sol leva aproximadamente 8 minutos e 20 segundos para chegar à Terra.',

      'A água ocorre naturalmente como sólido, líquido e gás.',

      'O som precisa de um meio material para se propagar.',

      'A atmosfera terrestre é composta principalmente por nitrogênio e oxigênio.'

    ];


    await options.reply(

      `🧠 *FATO ALEATÓRIO*\n\n` +

      facts[
        Math.floor(
          Math.random() *
          facts.length
        )
      ]

    );


    return true;

  }


  /*
   * BHASKARA
   */

  if (
    command === 'bhaskara'
  ) {

    const data =
      parseQuadratic(
        q
      );


    if (
      !data
    ) {

      await options.reply(

        `❌ Equação inválida.\n\n` +
        `Ex.: ${prefix}bhaskara 2x²+4x+2`

      );

      return true;

    }


    const delta =
      data.b *
      data.b -
      4 *
      data.a *
      data.c;


    if (
      delta < 0
    ) {

      await options.reply(

        `📐 *BHASKARA*\n\n` +
        `Δ = *${fmtCompatNumber(delta)}*\n` +
        `Não existem raízes reais.`

      );

      return true;

    }


    const x1 =
      (
        -data.b +
        Math.sqrt(delta)
      ) /
      (2 * data.a);


    const x2 =
      (
        -data.b -
        Math.sqrt(delta)
      ) /
      (2 * data.a);


    await options.reply(

      `📐 *BHASKARA*\n\n` +

      `a = ${data.a}\n` +
      `b = ${data.b}\n` +
      `c = ${data.c}\n\n` +

      `Δ = ${fmtCompatNumber(delta)}\n` +

      `x₁ = *${fmtCompatNumber(x1)}*\n` +
      `x₂ = *${fmtCompatNumber(x2)}*`

    );


    return true;

  }


  /*
   * RAIZ
   */

  if (
    command === 'raizquadrada'
  ) {

    const value =
      Number(
        String(
          q ||
          ''
        )
        .replace(
          /^√/,
          ''
        )
        .replace(
          ',',
          '.'
        )
        .trim()
      );


    if (
      !Number.isFinite(
        value
      ) ||
      value < 0
    ) {

      await options.reply(
        `❌ Use: ${prefix}raizquadrada 81`
      );

      return true;

    }


    await options.reply(

      `🧮 √${value} = *${fmtCompatNumber(
        Math.sqrt(value)
      )}*`

    );


    return true;

  }


  /*
   * TAGME
   */

  if (
    command === 'tagme'
  ) {

    const sender =
      String(
        options.sender ||
        ''
      ).trim();


    if (
      !sender
    ) {

      await options.reply(
        '❌ Não consegui identificar o usuário.'
      );

      return true;

    }


    await options.kya.sendMessage(

      options.from,

      {

        text:
          `🏷️ *Você:* @${sender.split('@')[0]}`,

        mentions:
          [
            sender
          ]

      },

      {
        quoted:
          options.info
      }

    );


    return true;

  }


  /*
   * CEP
   */

  if (
    command === 'cep'
  ) {

    const cep =
      String(
        q ||
        ''
      )
      .replace(
        /\D/g,
        ''
      );


    if (
      cep.length !== 8
    ) {

      await options.reply(
        `❌ Use: ${prefix}cep 59000000`
      );

      return true;

    }


    try {

      const response =
        await fetch(
          `https://viacep.com.br/ws/${cep}/json/`
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        data.erro
      ) {

        throw new Error(
          'CEP não encontrado'
        );

      }


      await options.reply(

        `📍 *CEP ${data.cep}*\n\n` +

        `Rua: *${
          data.logradouro ||
          'Não informado'
        }*\n` +

        `Bairro: *${
          data.bairro ||
          'Não informado'
        }*\n` +

        `Cidade: *${
          data.localidade ||
          'Não informado'
        }*\n` +

        `UF: *${
          data.uf ||
          'Não informado'
        }*\n` +

        `DDD: *${
          data.ddd ||
          'Não informado'
        }*`

      );


    } catch (
      error
    ) {

      await options.reply(
        `❌ ${error?.message || 'Falha ao consultar o CEP.'}`
      );

    }


    return true;

  }


  /*
   * DDD
   */

  if (
    command === 'ddd'
  ) {

    const ddd =
      String(
        q ||
        ''
      )
      .replace(
        /\D/g,
        ''
      )
      .slice(
        0,
        2
      );


    if (
      ddd.length !== 2
    ) {

      await options.reply(
        `❌ Use: ${prefix}ddd 84`
      );

      return true;

    }


    try {

      const response =
        await fetch(
          `https://brasilapi.com.br/api/ddd/v1/${ddd}`
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        data.error
      ) {

        throw new Error(
          'DDD não encontrado'
        );

      }


      const cities =
        Array.isArray(
          data.cities
        )
          ? data.cities
          : [];


      await options.reply(

        `📞 *DDD ${ddd}*\n\n` +

        `Estado: *${
          data.state ||
          'Não informado'
        }*\n\n` +

        cities
          .slice(
            0,
            40
          )
          .map(
            (city, index) =>
              `${index + 1}. ${city}`
          )
          .join('\n')

      );


    } catch (
      error
    ) {

      await options.reply(
        `❌ ${error?.message || 'Falha ao consultar o DDD.'}`
      );

    }


    return true;

  }


  /*
   * FERIADOS
   */

  if (
    command === 'feriados'
  ) {

    const year =
      Number.parseInt(
        q,
        10
      ) ||
      new Date()
        .getFullYear();


    if (
      year < 1900 ||
      year > 2100
    ) {

      await options.reply(
        `❌ Use: ${prefix}feriados 2026`
      );

      return true;

    }


    try {

      const response =
        await fetch(
          `https://brasilapi.com.br/api/feriados/v1/${year}`
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !Array.isArray(
          data
        )
      ) {

        throw new Error(
          'Consulta indisponível'
        );

      }


      await options.reply(

        `📅 *FERIADOS DO BRASIL — ${year}*\n\n` +

        data
          .map(
            item =>
              `• *${item.date}* — ${item.name}`
          )
          .join('\n')

      );


    } catch (
      error
    ) {

      await options.reply(
        `❌ ${error?.message || 'Falha ao consultar feriados.'}`
      );

    }


    return true;

  }


  /*
   * COTAÇÃO
   */

  if (
    command === 'cotacao'
  ) {

    const base =
      String(
        q ||
        'USD'
      )
      .trim()
      .toUpperCase();


    const pair =
      [
        'USD',
        'EUR',
        'GBP'
      ].includes(
        base
      )

        ? `${base}-BRL`

        : 'USD-BRL';


    try {

      const response =
        await fetch(
          `https://economia.awesomeapi.com.br/json/last/${pair}`
        );


      const data =
        await response.json();


      const quote =
        data?.[
          pair.replace(
            '-',
            ''
          )
        ];


      if (
        !response.ok ||
        !quote
      ) {

        throw new Error(
          'Cotação indisponível'
        );

      }


      await options.reply(

        `💱 *COTAÇÃO ${base}/BRL*\n\n` +

        `Compra: *R$ ${
          quote.bid ||
          'n/d'
        }*\n` +

        `Venda: *R$ ${
          quote.ask ||
          'n/d'
        }*\n` +

        `Atualização: *${
          quote.create_date ||
          'n/d'
        }*`

      );


    } catch (
      error
    ) {

      await options.reply(
        `❌ ${error?.message || 'Falha ao consultar cotação.'}`
      );

    }


    return true;

  }


  /*
   * POKÉMON
   */

  if (
    command === 'pokemon'
  ) {

    const name =
      String(
        q ||
        ''
      )
      .trim()
      .toLowerCase();


    if (
      !name
    ) {

      await options.reply(
        `❌ Use: ${prefix}pokemon pikachu`
      );

      return true;

    }


    try {

      const response =
        await fetch(

          `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(
            name
          )}`

        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          'Pokémon não encontrado'
        );

      }


      const imageUrl =
        data?.sprites
          ?.other
          ?.[
            'official-artwork'
          ]
          ?.front_default ||
        data?.sprites
          ?.front_default;


      const caption =

        `⚡ *${String(
          data.name ||
          name
        ).toUpperCase()}*\n\n` +

        `ID: *#${data.id}*\n` +

        `Tipos: *${
          (data.types || [])
            .map(
              item =>
                item.type.name
            )
            .join(', ') ||
          'n/d'
        }*\n` +

        `Altura: *${
          Number(data.height) /
          10
        } m*\n` +

        `Peso: *${
          Number(data.weight) /
          10
        } kg*`;


      if (
        imageUrl
      ) {

        await options.kya.sendMessage(

          options.from,

          {

            image:
              {
                url:
                  imageUrl
              },

            caption

          },

          {
            quoted:
              options.info
          }

        );

      } else {

        await options.reply(
          caption
        );

      }


    } catch (
      error
    ) {

      await options.reply(
        `❌ ${error?.message || 'Falha ao consultar Pokémon.'}`
      );

    }


    return true;

  }


  /*
   * WIKIPÉDIA
   */

  if (
    command === 'biografia' ||
    command === 'wiki' ||
    command === 'wikipedia'
  ) {

    const person =
      String(
        q ||
        ''
      ).trim();


    if (
      !person
    ) {

      await options.reply(
        `❌ Use: ${prefix}${command} Albert Einstein`
      );

      return true;

    }


    try {

      const response =
        await fetch(

          `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            person
          )}`

        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data?.extract
      ) {

        throw new Error(
          'Página não encontrada'
        );

      }


      await options.reply(

        `📚 *${
          data.title ||
          person
        }*\n\n` +

        String(
          data.extract
        ).slice(
          0,
          3500
        )

      );


    } catch (
      error
    ) {

      await options.reply(
        `❌ ${error?.message || 'Falha na consulta da Wikipédia.'}`
      );

    }


    return true;

  }


  /*
   * GOOGLE
   *
   * Sem chave de API hardcoded.
   */

  if (
    command === 'google' ||
    command === 'googlesearch'
  ) {

    const query =
      String(
        q ||
        ''
      ).trim();


    if (
      !query
    ) {

      await options.reply(
        `❌ Use: ${prefix}${command} sua pesquisa`
      );

      return true;

    }


    await options.reply(

      `🔎 *GOOGLE*\n\n` +

      `https://www.google.com/search?q=${
        encodeURIComponent(
          query
        )
      }`

    );


    return true;

  }


  /*
   * TINYURL
   */

  if (
    command === 'tinyur' ||
    command === 'tinyurl'
  ) {

    const url =
      String(
        q ||
        ''
      ).trim();


    if (
      !/^https?:\/\//i.test(
        url
      )
    ) {

      await options.reply(
        `❌ Use: ${prefix}tinyurl https://example.com`
      );

      return true;

    }


    try {

      const response =
        await fetch(

          'https://tinyurl.com/api-create.php?url=' +

          encodeURIComponent(
            url
          )

        );


      const shortUrl =
        (
          await response.text()
        ).trim();


      if (
        !response.ok ||
        !/^https?:\/\//i.test(
          shortUrl
        )
      ) {

        throw new Error(
          'URL não retornada'
        );

      }


      await options.reply(

        `🔗 *LINK ENCURTADO*\n\n` +

        shortUrl

      );


    } catch (
      error
    ) {

      await options.reply(
        `❌ ${error?.message || 'Falha ao encurtar link.'}`
      );

    }


    return true;

  }


  /*
   * TRADUZIR
   */

  if (
    command === 'traduzir'
  ) {

    const input =
      String(
        q ||
        ''
      ).trim();


    if (
      !input
    ) {

      await options.reply(
        `❌ Use: ${prefix}traduzir hello world`
      );

      return true;

    }


    try {

      const response =
        await fetch(

          'https://translate.googleapis.com/translate_a/single' +

          '?client=gtx' +
          '&sl=auto' +
          '&tl=pt' +
          '&dt=t' +
          '&q=' +

          encodeURIComponent(
            input
          )

        );


      const data =
        await response.json();


      const translated =
        Array.isArray(
          data?.[0]
        )

          ? data[0]
              .map(
                item =>
                  item?.[0] ||
                  ''
              )
              .join('')
              .trim()

          : '';


      if (
        !response.ok ||
        !translated
      ) {

        throw new Error(
          'Tradução indisponível'
        );

      }


      await options.reply(

        `🌐 *TRADUÇÃO → PT-BR*\n\n` +
        translated

      );


    } catch (
      error
    ) {

      await options.reply(
        `❌ ${error?.message || 'Falha ao traduzir.'}`
      );

    }


    return true;

  }


  return false;

}


function parseLevelAction(q = ''){

  const value =
    String(q || '')
      .trim()
      .toLowerCase();

  if(
    [
      'on',
      'ativar',
      'ligar'
    ].includes(value)
  ){
    return true;
  }

  if(
    [
      'off',
      'desativar',
      'desligar'
    ].includes(value)
  ){
    return false;
  }

  return null;
}

export async function handleKyaraSpecialCommand(
  options = {}
){

  const command =
    String(
      options.command || ''
    )
    .trim()
    .toLowerCase();

  const q =
    String(
      options.q || ''
    ).trim();

  const compatHandled =
    await handleSandroCompatCommand(
      options,
      command,
      q
    );

  if (
    compatHandled
  ) {

    return true;

  }

  const imageHandled =
    await handleKyaraImageCommand(
      options
    );

  if (
    imageHandled
  ) {

    return true;

  }

  /*
   * ============================================================
   * MENUHTML
   * ============================================================
   */

  const menuHtmlHandled =
    await handleKyaraMenuHtml(
      options
    );

  if(menuHtmlHandled){
    return true;
  }

  /*
   * ============================================================
   * LEVEL
   * ============================================================
   */

  if(
    command === 'level' ||
    command === 'nivel'
  ){

    const action =
      parseLevelAction(q);

    if(action !== null){

      if(options.isOwner){

        await options.reply(
          '👑 O dono não participa do sistema de Level.'
        );

        return true;
      }

      setLevelingEnabled(
        options.sender,
        action
      );

      await options.reply(
        action
          ? (
              '✅ *Level ativado para você.*\n\n' +
              'Seu nível e XP antigos continuam intactos.'
            )
          : (
              '🔕 *Level desativado para você.*\n\n' +
              'Seu nível e XP ficam guardados e não serão apagados.'
            )
      );

      return true;
    }

    if(options.isOwner){

      await options.reply(
        '👑 Você é o dono e não participa do sistema de Level.'
      );

      return true;
    }

  }

  /*
   * ============================================================
   * KYARA GAMES
   * ============================================================
   */

  const gameHandled =
    await handleKyaraGameCommand(
      options
    );

  if(gameHandled){
    return true;
  }

  /*
   * ============================================================
   * KYARA YOUTUBE
   * ============================================================
   */

  const youtubeHandled =
    await handleKyaraYouTubeCommand(
      options
    );

  if(youtubeHandled){
    return true;
  }

  /*
   * ============================================================
   * KYARA BROWSER
   * ============================================================
   */

  const browserHandled =
    await handleBrowserCommand(
      options
    );

  if(browserHandled){
    return true;
  }

  /*
   * ============================================================
   * SISTEMA UNIVERSAL DE MÍDIA
   * ============================================================
   */

  const mediaHandled =
    await handleMedia(
      options
    );

  if(mediaHandled){
    return true;
  }

  /*
   * ============================================================
   * LEGACY
   * ============================================================
   */

  return handleLegacy(
    options
  );
}
