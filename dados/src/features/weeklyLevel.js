import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_DIR = path.join(__dirname, '..', '..', 'database');
const FILE = path.join(DATABASE_DIR, 'weekly-level.json');
const PREMIUM_FILE_DEFAULT = path.join(
  DATABASE_DIR,
  'dono',
  'premium.json'
);

function brazilNow() {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Sao_Paulo'
    })
  );
}

function getMondayStart(date = brazilNow()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

function weekKey(date = brazilNow()) {
  const d = getMondayStart(date);

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function defaultData() {
  return {
    currentWeek: weekKey(),
    users: {},
    history: [],
    weeklyVipWinner: null,
    lastFinalizedWeek: null
  };
}

function load() {
  try {
    fs.mkdirSync(DATABASE_DIR, {
      recursive: true
    });

    if (!fs.existsSync(FILE)) {
      const data = defaultData();

      fs.writeFileSync(
        FILE,
        JSON.stringify(data, null, 2)
      );

      return data;
    }

    let data;

    try {
      data = JSON.parse(
        fs.readFileSync(FILE, 'utf8')
      );
    } catch {
      data = defaultData();
    }

    if (!data || typeof data !== 'object') {
      data = defaultData();
    }

    data.users =
      data.users &&
      typeof data.users === 'object'
        ? data.users
        : {};

    data.history =
      Array.isArray(data.history)
        ? data.history
        : [];

    /*
     * Arquivo antigo podia ter currentWeek vazio.
     * Nesse caso começa corretamente na semana atual.
     */
    if (!data.currentWeek) {
      data.currentWeek = weekKey();
    }

    if (!Object.prototype.hasOwnProperty.call(
      data,
      'weeklyVipWinner'
    )) {
      data.weeklyVipWinner = null;
    }

    if (!Object.prototype.hasOwnProperty.call(
      data,
      'lastFinalizedWeek'
    )) {
      data.lastFinalizedWeek = null;
    }

    return data;

  } catch (e) {
    console.error(
      '[WEEKLY LEVEL] Erro ao carregar banco:',
      e.message
    );

    return defaultData();
  }
}

function save(data) {
  fs.mkdirSync(DATABASE_DIR, {
    recursive: true
  });

  const tmp = `${FILE}.tmp`;

  fs.writeFileSync(
    tmp,
    JSON.stringify(data, null, 2)
  );

  fs.renameSync(tmp, FILE);
}

/*
 * Fecha a semana anterior e inicia a nova.
 *
 * Retorna:
 * {
 *   changed,
 *   previousWeek,
 *   winner
 * }
 */
function ensureCurrentWeek(data) {
  const current = weekKey();

  if (data.currentWeek === current) {
    return {
      changed: false,
      previousWeek: null,
      winner: null
    };
  }

  const previousWeek =
    data.currentWeek;

  const ranking = Object.entries(
    data.users || {}
  )
    .map(([id, user]) => ({
      id,
      name: user?.name || '',
      xp: Number(user?.xp) || 0
    }))
    .sort((a, b) => {
      if (b.xp !== a.xp) {
        return b.xp - a.xp;
      }

      return String(a.id).localeCompare(
        String(b.id)
      );
    })
    .slice(0, 20);

  const winner =
    ranking.length > 0
      ? ranking[0].id
      : null;

  data.history.push({
    week: previousWeek,
    ranking,
    winner,
    finalizedAt:
      new Date().toISOString()
  });

  data.currentWeek = current;
  data.users = {};

  return {
    changed: true,
    previousWeek,
    winner
  };
}

/*
 * Adiciona XP semanal.
 */
export function addWeeklyXP(
  userId,
  amount = 1,
  name = ''
) {
  if (!userId) return;

  const data = load();

  const rollover =
    ensureCurrentWeek(data);

  if (rollover.changed) {
    /*
     * Apenas registra o fechamento aqui.
     * A transferência de VIP é feita pelo
     * syncWeeklyVIP(), que possui acesso à lista VIP.
     */
    save(data);
  }

  const user =
    data.users[userId] || {
      xp: 0,
      name: ''
    };

  user.xp =
    Math.max(
      0,
      Number(user.xp) || 0
    ) +
    Math.max(
      0,
      Number(amount) || 0
    );

  if (name) {
    user.name = name;
  }

  data.users[userId] = user;

  save(data);
}

/*
 * Ranking da semana atual.
 */
export function getWeeklyRanking(
  limit = 15
) {
  const data = load();

  /*
   * Não apagamos a semana silenciosamente aqui.
   * O rollover/VIP é sincronizado pelo index.
   */
  return Object.entries(
    data.users || {}
  )
    .map(([id, user]) => ({
      id,
      name: user?.name || '',
      xp: Number(user?.xp) || 0
    }))
    .sort((a, b) => {
      if (b.xp !== a.xp) {
        return b.xp - a.xp;
      }

      return String(a.id).localeCompare(
        String(b.id)
      );
    })
    .slice(0, limit);
}

/*
 * Status do usuário.
 */
export function getWeeklyStatus(
  userId = null
) {
  const data = load();

  return {
    weekKey: data.currentWeek,
    userXP: userId
      ? Number(
          data.users?.[userId]?.xp
        ) || 0
      : 0
  };
}

/*
 * HISTÓRICO — este export estava faltando
 * e causava o crash:
 *
 * getWeeklyHistory is not exported
 */
export function getWeeklyHistory(
  limit = 20
) {
  const data = load();

  return Array.isArray(data.history)
    ? data.history
        .slice()
        .reverse()
        .slice(0, limit)
    : [];
}

/*
 * Sincroniza o VIP semanal.
 *
 * Só remove o VIP do vencedor anterior
 * que ESTE sistema havia marcado.
 */
export function syncWeeklyVIP({
  premiumList = {},
  premiumFile = PREMIUM_FILE_DEFAULT
} = {}) {
  const data = load();

  const rollover =
    ensureCurrentWeek(data);

  if (!rollover.changed) {
    return {
      changed: false,
      previousWeek: null,
      previousWinner:
        data.weeklyVipWinner || null,
      winner:
        data.weeklyVipWinner || null
    };
  }

  const previousWinner =
    data.weeklyVipWinner || null;

  const winner =
    rollover.winner || null;

  /*
   * Remove somente o VIP que o sistema
   * semanal havia concedido anteriormente.
   */
  if (
    previousWinner &&
    previousWinner !== winner
  ) {
    delete premiumList[previousWinner];
  }

  if (winner) {
    premiumList[winner] = true;
  }

  data.weeklyVipWinner = winner;
  data.lastFinalizedWeek =
    rollover.previousWeek;

  save(data);

  try {
    fs.mkdirSync(
      path.dirname(premiumFile),
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      premiumFile,
      JSON.stringify(
        premiumList,
        null,
        2
      )
    );
  } catch (e) {
    console.error(
      '[WEEKLY VIP] Erro ao salvar premium.json:',
      e.message
    );
  }

  return {
    changed: true,
    previousWeek:
      rollover.previousWeek,
    previousWinner,
    winner
  };
}

/*
 * Mantido para compatibilidade com o
 * index.js antigo.
 */
export function finalizeWeeklyVIP(
  options = {}
) {
  return syncWeeklyVIP(options);
}


/*
 * ============================================================
 * CAIXA DE IDEIAS
 * ============================================================
 */

export function listIdeas({
  file = path.join(DATABASE_DIR, 'dono', 'caixa-ideias.json'),
  status = null,
  limit = 30,
  sort = 'recent'
} = {}) {
  try {
    fs.mkdirSync(
      path.dirname(file),
      { recursive: true }
    );

    if (!fs.existsSync(file)) {
      return [];
    }

    let data;

    try {
      data = JSON.parse(
        fs.readFileSync(file, 'utf8')
      );
    } catch {
      return [];
    }

    let ideas = [];

    if (Array.isArray(data?.ideas)) {
      ideas = data.ideas;
    } else if (Array.isArray(data?.items)) {
      ideas = data.items;
    }

    /*
     * Migração/normalização:
     *
     * Algumas versões antigas usavam:
     * idea
     *
     * Outras partes do bot esperavam:
     * text
     *
     * Agora os dois ficam disponíveis.
     */
    ideas = ideas.map(item => {
      const normalized = {
        ...item
      };

      if (
        !normalized.text &&
        normalized.idea
      ) {
        normalized.text =
          String(normalized.idea);
      }

      if (
        !normalized.idea &&
        normalized.text
      ) {
        normalized.idea =
          String(normalized.text);
      }

      if (
        !normalized.votes ||
        typeof normalized.votes !== 'object' ||
        Array.isArray(normalized.votes)
      ) {
        normalized.votes = {
          up: [],
          down: []
        };
      }

      normalized.votes.up =
        Array.isArray(normalized.votes.up)
          ? normalized.votes.up
          : [];

      normalized.votes.down =
        Array.isArray(normalized.votes.down)
          ? normalized.votes.down
          : [];

      normalized.score =
        normalized.votes.up.length -
        normalized.votes.down.length;

      normalized.status =
        normalized.status ||
        'pendente';

      return normalized;
    });

    if (status) {
      ideas =
        ideas.filter(
          item =>
            String(item?.status || '')
              .toLowerCase() ===
            String(status)
              .toLowerCase()
        );
    }

    ideas.sort((a, b) => {
      if (sort === 'votes') {
        const scoreA =
          Number(a?.score) || 0;

        const scoreB =
          Number(b?.score) || 0;

        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
      }

      return (
        new Date(
          b?.createdAt || 0
        ).getTime() -
        new Date(
          a?.createdAt || 0
        ).getTime()
      );
    });

    return ideas.slice(
      0,
      Math.max(
        1,
        Number(limit) || 30
      )
    );

  } catch (error) {
    console.error(
      '[IDEIAS] Erro ao listar ideias:',
      error.message
    );

    return [];
  }
}


/*
 * ============================================================
 * CAIXA DE IDEIAS — SALVAR IDEIA
 * ============================================================
 */

export function submitIdea({
  userId = '',
  name = '',
  idea = '',
  file = path.join(
    DATABASE_DIR,
    'dono',
    'caixa-ideias.json'
  )
} = {}) {
  try {
    const text =
      String(idea || '').trim();

    if (
      !userId ||
      !text
    ) {
      return {
        success: false,
        error:
          'Usuário ou ideia não informado.'
      };
    }

    fs.mkdirSync(
      path.dirname(file),
      {
        recursive: true
      }
    );

    let box = {};

    if (fs.existsSync(file)) {
      try {
        box =
          JSON.parse(
            fs.readFileSync(
              file,
              'utf8'
            )
          );
      } catch {
        box = {};
      }
    }

    /*
     * O formato principal continua sendo:
     *
     * {
     *   items: []
     * }
     *
     * Se uma versão antiga possuir "ideas",
     * fazemos a migração sem apagar dados.
     */
    if (
      !Array.isArray(box.items)
    ) {
      if (
        Array.isArray(box.ideas)
      ) {
        box.items =
          box.ideas;
      } else {
        box.items = [];
      }
    }

    const nextId =
      box.items.reduce(
        (max, item) =>
          Math.max(
            max,
            Number(item?.id) || 0
          ),
        0
      ) + 1;

    const item = {
      id: nextId,

      user:
        String(userId),

      name:
        String(name || ''),

      text,

      /*
       * Compatibilidade com código antigo.
       */
      idea: text,

      createdAt:
        new Date().toISOString(),

      status:
        'pendente',

      votes: {
        up: [],
        down: []
      },

      score: 0
    };

    box.items.push(item);

    /*
     * Mantém "ideas" sincronizado se
     * o arquivo antigo já usava esse campo.
     */
    if (Array.isArray(box.ideas)) {
      box.ideas =
        box.items;
    }

    fs.writeFileSync(
      file,
      JSON.stringify(
        box,
        null,
        2
      ),
      'utf8'
    );

    return {
      success: true,
      id: nextId,
      item
    };

  } catch (error) {
    console.error(
      '[IDEIAS] Erro ao salvar ideia:',
      error.message
    );

    return {
      success: false,
      error: error.message
    };
  }
}

/*
 * ======================================================
 * VOTAÇÃO DAS IDEIAS
 * ======================================================
 */

export function getIdea({
  id,
  file = path.join(
    DATABASE_DIR,
    'dono',
    'caixa-ideias.json'
  )
} = {}) {
  try {
    const numericId =
      Number(id);

    if (
      !Number.isInteger(numericId) ||
      numericId <= 0
    ) {
      return null;
    }

    const ideas =
      listIdeas({
        file,
        limit: 100000,
        sort: 'recent'
      });

    return (
      ideas.find(
        item =>
          Number(item?.id) ===
          numericId
      ) || null
    );

  } catch (error) {
    console.error(
      '[IDEIAS] Erro ao buscar ideia:',
      error.message
    );

    return null;
  }
}

export function voteIdea({
  id,
  userId,
  type = 'up',
  file = path.join(
    DATABASE_DIR,
    'dono',
    'caixa-ideias.json'
  )
} = {}) {
  try {
    const numericId =
      Number(id);

    if (
      !Number.isInteger(numericId) ||
      numericId <= 0
    ) {
      return {
        success: false,
        error: 'ID da ideia inválido.'
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'Usuário não identificado.'
      };
    }

    const voteType =
      String(type)
        .toLowerCase() === 'down'
        ? 'down'
        : 'up';

    if (
      !fs.existsSync(file)
    ) {
      return {
        success: false,
        error:
          'A caixa de ideias ainda não existe.'
      };
    }

    let box;

    try {
      box =
        JSON.parse(
          fs.readFileSync(
            file,
            'utf8'
          )
        );
    } catch {
      return {
        success: false,
        error:
          'Não foi possível ler a caixa de ideias.'
      };
    }

    if (
      !Array.isArray(box.items)
    ) {
      if (
        Array.isArray(box.ideas)
      ) {
        box.items =
          box.ideas;
      } else {
        box.items = [];
      }
    }

    const item =
      box.items.find(
        idea =>
          Number(idea?.id) ===
          numericId
      );

    if (!item) {
      return {
        success: false,
        error:
          `A ideia #${numericId} não existe.`
      };
    }

    if (
      !item.votes ||
      typeof item.votes !== 'object' ||
      Array.isArray(item.votes)
    ) {
      item.votes = {
        up: [],
        down: []
      };
    }

    item.votes.up =
      Array.isArray(item.votes.up)
        ? item.votes.up
        : [];

    item.votes.down =
      Array.isArray(item.votes.down)
        ? item.votes.down
        : [];

    const uid =
      String(userId);

    const wasUp =
      item.votes.up.includes(uid);

    const wasDown =
      item.votes.down.includes(uid);

    /*
     * Voto repetido no mesmo sentido:
     * remove o voto.
     *
     * Assim:
     * /votarideia 5
     * novamente
     * desfaz o voto.
     */
    if (
      voteType === 'up'
    ) {
      if (wasUp) {
        item.votes.up =
          item.votes.up.filter(
            id => id !== uid
          );
      } else {
        item.votes.up =
          item.votes.up.filter(
            id => id !== uid
          );

        item.votes.down =
          item.votes.down.filter(
            id => id !== uid
          );

        item.votes.up.push(uid);
      }
    } else {
      if (wasDown) {
        item.votes.down =
          item.votes.down.filter(
            id => id !== uid
          );
      } else {
        item.votes.up =
          item.votes.up.filter(
            id => id !== uid
          );

        item.votes.down =
          item.votes.down.filter(
            id => id !== uid
          );

        item.votes.down.push(uid);
      }
    }

    item.score =
      item.votes.up.length -
      item.votes.down.length;

    item.text =
      item.text ||
      item.idea ||
      '';

    item.idea =
      item.idea ||
      item.text;

    fs.writeFileSync(
      file,
      JSON.stringify(
        box,
        null,
        2
      ),
      'utf8'
    );

    return {
      success: true,
      item,
      type: voteType,
      score: item.score,
      removed:
        voteType === 'up'
          ? wasUp
          : wasDown
    };

  } catch (error) {
    console.error(
      '[IDEIAS] Erro ao votar:',
      error.message
    );

    return {
      success: false,
      error: error.message
    };
  }
}
