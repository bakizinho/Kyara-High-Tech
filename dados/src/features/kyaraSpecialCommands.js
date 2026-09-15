import {
  handle as handleMedia
} from './kyaraMediaCommands.js';

import {
  handleBrowserCommand,
  sendBrowserHtml
} from './kyaraBrowser.js';

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

function parseLevelAction(q = '') {
  const value =
    String(q || '')
      .trim()
      .toLowerCase();

  if (
    [
      'on',
      'ativar',
      'ligar'
    ].includes(value)
  ) {
    return true;
  }

  if (
    [
      'off',
      'desativar',
      'desligar'
    ].includes(value)
  ) {
    return false;
  }

  return null;
}


export async function handleKyaraSpecialCommand(
  options = {}
) {

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

  /*
   * ============================================================
   * MENUHTML
   * ============================================================
   *
   * Comando auxiliar.
   * Não entra no menu normal.
   */

  const menuHtmlHandled =
    await handleKyaraMenuHtml(
      options
    );

  if (
    menuHtmlHandled
  ) {
    return true;
  }

  /*
   * ============================================================
   * LEVEL
   * ============================================================
   */

  if (
    command === 'level' ||
    command === 'nivel'
  ) {

    const action =
      parseLevelAction(q);

    if (
      action !== null
    ) {

      if (
        options.isOwner
      ) {

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

    if (
      options.isOwner
    ) {

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

  if (
    gameHandled
  ) {
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

  if (
    browserHandled
  ) {
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

  if (
    mediaHandled
  ) {
    return true;
  }

  /*
   * ============================================================
   * LEGACY
   * ============================================================
   *
   * Tudo que já existia continua passando
   * pelo sistema antigo.
   */

  return handleLegacy(
    options
  );
}
