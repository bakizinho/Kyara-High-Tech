/**
 * KYARA DIAGNOSTICS
 */

import fs from 'fs';
import path from 'path';

import {
  getExperimentalStatus
} from './index.js';

function exists(relativePath) {

  return fs.existsSync(
    path.resolve(
      process.cwd(),
      relativePath
    )
  );
}

export function runDiagnostics() {

  const checks = [

    {
      name: 'KYARA CORE',
      ok: exists('dados/src/core/kyara.js')
    },

    {
      name: 'KYARA KNOWLEDGE',
      ok: exists('dados/src/core/kyaraKnowledge.js')
    },

    {
      name: 'CONTEXTO',
      ok: exists('dados/src/core/contexto.js')
    },

    {
      name: 'ORQUESTRADOR',
      ok: exists('dados/src/core/orquestrador.js')
    },

    {
      name: 'EXPERIMENTAL ENGINE',
      ok: exists('dados/src/core/experimental/index.js')
    },

    {
      name: 'MEMORY ENGINE',
      ok: exists('dados/src/core/experimental/memory.js')
    },

    {
      name: 'TOOL REGISTRY',
      ok: exists('dados/src/core/experimental/toolRegistry.js')
    },

    {
      name: 'EVENT ENGINE',
      ok: exists('dados/src/core/experimental/eventEngine.js')
    },

    {
      name: 'INTENT ENGINE',
      ok: exists('dados/src/core/experimental/intentEngine.js')
    },

    {
      name: 'PACKAGE.JSON',
      ok: exists('package.json')
    }
  ];

  const passed =
    checks.filter(item => item.ok).length;

  return {
    passed,
    total: checks.length,
    checks,
    status:
      passed === checks.length
        ? 'HEALTHY'
        : 'DEGRADED',
    experimental:
      getExperimentalStatus()
  };
}

export function printDiagnostics() {

  const report = runDiagnostics();

  console.log('');
  console.log('╔════════════════════════════════════╗');
  console.log('║       KYARA EXPERIMENTAL LAB       ║');
  console.log('╠════════════════════════════════════╣');

  for (const check of report.checks) {

    console.log(
      `║ ${check.ok ? '🟢' : '🔴'} ${check.name}`
    );
  }

  console.log('╠════════════════════════════════════╣');
  console.log(
    `║ STATUS: ${report.status}`
  );
  console.log(
    `║ TESTES: ${report.passed}/${report.total}`
  );
  console.log('╚════════════════════════════════════╝');
  console.log('');

  return report;
}

export default {
  runDiagnostics,
  printDiagnostics
};
