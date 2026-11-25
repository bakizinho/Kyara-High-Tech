import fs from 'fs';
import path from 'path';

const FILE =
  path.join(
    process.cwd(),
    'dados',
    'database',
    'leveling-settings.json'
  );

function load() {
  try {
    if (
      !fs.existsSync(FILE)
    ) {
      return {
        disabled: {}
      };
    }

    const data =
      JSON.parse(
        fs.readFileSync(
          FILE,
          'utf8'
        )
      );

    if (
      !data ||
      typeof data !== 'object'
    ) {
      return {
        disabled: {}
      };
    }

    if (
      !data.disabled ||
      typeof data.disabled !== 'object'
    ) {
      data.disabled = {};
    }

    return data;

  } catch {
    return {
      disabled: {}
    };
  }
}

function save(data) {
  fs.mkdirSync(
    path.dirname(FILE),
    {
      recursive: true
    }
  );

  const tmp =
    `${FILE}.tmp`;

  fs.writeFileSync(
    tmp,
    JSON.stringify(
      data,
      null,
      2
    )
  );

  fs.renameSync(
    tmp,
    FILE
  );
}

function normalize(id) {
  return String(
    id || ''
  ).trim();
}

function setLevelingEnabled(
  userId,
  enabled
) {
  const id =
    normalize(userId);

  if (!id) {
    return false;
  }

  const data =
    load();

  if (enabled) {
    delete data.disabled[id];
  } else {
    data.disabled[id] = true;
  }

  save(data);

  return true;
}

function getLevelingEnabled(
  userId
) {
  const id =
    normalize(userId);

  if (!id) {
    return true;
  }

  return !Boolean(
    load().disabled[id]
  );
}

function isLevelingDisabled(
  userId
) {
  return !getLevelingEnabled(
    userId
  );
}

export {
  setLevelingEnabled,
  getLevelingEnabled,
  isLevelingDisabled
};
