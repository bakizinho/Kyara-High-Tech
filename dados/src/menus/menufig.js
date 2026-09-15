async function menuSticker(prefix, botName = "MeuBot", userName = "Usuário", {
    header = `╭┈⊰ 🌸 『 *${botName}* 』\n┊Olá, #user#!\n╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯`,
    menuTopBorder = "╭┈",
    bottomBorder = "╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯",
    menuItemIcon = "•.̇𖥨֗💜⭟",
    separatorIcon = "❁",
    middleBorder = "┊"
} = {}) {

    const formattedHeader =
        header.replace(/#user#/g, userName);

    return [
        formattedHeader,
        "",
        menuTopBorder + separatorIcon + " *📦 PACOTE DE FIGURINHAS*",
        middleBorder,
        middleBorder + menuItemIcon + prefix + "pacote Goku",
        middleBorder + menuItemIcon + prefix + "pacote Naruto",
        middleBorder + menuItemIcon + prefix + "pacote gatos",
        bottomBorder,
        "",
        menuTopBorder + separatorIcon + " *ℹ️ COMO FUNCIONA*",
        middleBorder,
        middleBorder + menuItemIcon + "40 figurinhas por pacote",
        middleBorder + menuItemIcon + "Tema livre",
        middleBorder + menuItemIcon + "Busca automática de imagens",
        middleBorder + menuItemIcon + "Histórico evita repetições recentes",
        middleBorder + menuItemIcon + "Em grupo: envio no privado",
        bottomBorder
    ].join("\n");
}

export default menuSticker;
