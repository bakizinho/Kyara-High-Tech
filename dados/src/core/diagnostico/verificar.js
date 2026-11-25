import fs from 'node:fs';
import path from 'node:path';

export function diagnosticarKyara(root = process.cwd()) {
  const arquivos = [
    'dados/src/connect.js',
    'dados/src/index.js',
    'dados/src/.scripts/start.js',
    'dados/src/config.json',
    'package.json'
  ];

  const resultados = arquivos.map((arquivo) => {
    const completo = path.join(root, arquivo);
    return {
      arquivo,
      ok: fs.existsSync(completo),
      mensagem: fs.existsSync(completo)
        ? 'Encontrado'
        : 'Arquivo ausente'
    };
  });

  return {
    nome: 'Kyara',
    data: new Date().toISOString(),
    node: process.version,
    verificacoes: resultados,
    tudoCerto: resultados.every((item) => item.ok)
  };
}

export default diagnosticarKyara;
