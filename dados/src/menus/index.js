// Loader ESM-safe para todos os menus.
// Mantém a mesma API: objeto `menus` com chaves nomeadas (menu, menuAlterador, etc.)
// e adiciona `getMenus()` para acesso explícito assíncrono.

import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_MODULES } from './menu-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapa estático dos menus e seus arquivos correspondentes.
const menuModules = MENU_MODULES;

let menusPromise;

async function loadMenus() {
    if (menusPromise) return menusPromise;

    menusPromise = Promise.all(
        Object.entries(menuModules).map(async ([name, relPath]) => {
            try {
                const mod = await import(
                    new URL(relPath, import.meta.url)
                );

                const fn = mod.default || mod[name];

                if (typeof fn === 'function') {
                    return [name, fn];
                }

                console.error(
                    `[${new Date().toISOString()}] [AVISO] ` +
                    `Menu '${name}' em ${relPath} não exporta função válida.`
                );
            } catch (err) {
                console.error(
                    `[${new Date().toISOString()}] [AVISO] ` +
                    `Falha ao carregar '${name}': ${err.message}`
                );
            }

            return [name, null];
        })
    ).then(entries => {
        const menus = Object.fromEntries(
            entries.filter(([, fn]) => typeof fn === 'function')
        );

        const failed = Object.keys(menuModules).filter(
            name => !menus[name]
        );

        if (failed.length) {
            console.error(
                `[${new Date().toISOString()}] [AVISO] ` +
                `Menus não carregados: ${failed.join(', ')}.`
            );
        }

        return menus;
    });

    return menusPromise;
}

export async function getMenus() {
    return await loadMenus();
}

const menus = await loadMenus();
export default menus;