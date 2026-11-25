import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const DIR = path.join(
  os.homedir(),
  '.kyara'
);

const FILE = path.join(
  DIR,
  'voz.json'
);

const PADRAO = {
  enabled: false,
  mode: 'off',
  voice: 'pf_dora',
  provider: 'local'
};

export async function carregarConfigVoz() {
  try {
    const data = await fs.readFile(FILE, 'utf8');
    return {
      ...PADRAO,
      ...JSON.parse(data)
    };
  } catch {
    return { ...PADRAO };
  }
}

export async function salvarConfigVoz(config = {}) {
  await fs.mkdir(DIR, { recursive: true });

  const atual = await carregarConfigVoz();

  const novo = {
    ...atual,
    ...config
  };

  await fs.writeFile(
    FILE,
    JSON.stringify(novo, null, 2),
    'utf8'
  );

  return novo;
}

export async function vozEstaAtiva() {
  const config = await carregarConfigVoz();
  return config.enabled === true && config.mode !== 'off';
}

export default {
  carregarConfigVoz,
  salvarConfigVoz,
  vozEstaAtiva
};
