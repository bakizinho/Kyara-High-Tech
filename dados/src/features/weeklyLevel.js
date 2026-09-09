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
  limit = 30
} = {}) {
  try {
    fs.mkdirSync(
      path.dirname(file),
      { recursive: true }
    );

    if (!fs.existsSync(file)) {
      return [];
    }

    const raw =
      fs.readFileSync(
        file,
        'utf8'
      );

    const data =
      JSON.parse(raw);

    /*
     * Compatibilidade com os dois formatos
     * que foram usados durante a integração:
     *
     * { items: [] }
     * { ideas: [] }
     */
    let ideas = [];

    if (Array.isArray(data?.ideas)) {
      ideas = data.ideas;
    } else if (Array.isArray(data?.items)) {
      ideas = data.items;
    }

    if (status) {
      ideas =
        ideas.filter(
          item =>
            item?.status === status
        );
    }

    return ideas
      .slice()
      .sort(
        (a, b) =>
          new Date(
            b?.createdAt || 0
          ).getTime() -
          new Date(
            a?.createdAt || 0
          ).getTime()
      )
      .slice(
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
  file = path.join(DATABASE_DIR, 'dono', 'caixa-ideias.json')
} = {}) {
  try {
    if (!userId || !String(idea).trim()) {
      return {
        success: false,
        error: 'Usuário ou ideia não informado.'
      };
    }

    fs.mkdirSync(path.dirname(file), { recursive: true });

    let box = {};

    if (fs.existsSync(file)) {
      try {
        box = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        box = {};
      }
    }

    /*
     * O formato oficial usado pelo bot é:
     * { items: [] }
     */
    box.items = Array.isArray(box.items)
      ? box.items
      : [];

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
      user: userId,
      name: name || '',
      idea: String(idea).trim(),
      createdAt: new Date().toISOString(),
      status: 'pendente'
    };

    box.items.push(item);

    fs.writeFileSync(
      file,
      JSON.stringify(box, null, 2),
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
