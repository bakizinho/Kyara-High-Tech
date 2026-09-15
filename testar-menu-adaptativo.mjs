import {
  buildSections,
  buildQuickButtons,
  createNativeButtons,
  isOwner
} from './dados/src/core/menuAdaptativo/menu-adaptativo.js'

const memberSections =
  buildSections({
    owner: false,
    admin: false,
    botAdmin: false
  })

const adminSections =
  buildSections({
    owner: false,
    admin: true,
    botAdmin: true
  })

const ownerSections =
  buildSections({
    owner: true,
    admin: true,
    botAdmin: true
  })

if (
  memberSections.some(section =>
    section.rows.some(row =>
      row.id === '/menuadm'
    )
  )
) {
  throw new Error(
    'Membro recebeu menu ADM.'
  )
}

if (
  !adminSections.some(section =>
    section.rows.some(row =>
      row.id === '/menuadm'
    )
  )
) {
  throw new Error(
    'Admin não recebeu menu ADM.'
  )
}

if (
  !ownerSections.some(section =>
    section.rows.some(row =>
      row.id === '/menudono'
    )
  )
) {
  throw new Error(
    'Owner não recebeu menu DONO.'
  )
}

const memberButtons =
  buildQuickButtons({
    owner: false,
    admin: false
  })

const adminButtons =
  buildQuickButtons({
    owner: false,
    admin: true
  })

if (
  !memberButtons.some(button =>
    button.buttonParamsJson.includes(
      '/menubn'
    )
  )
) {
  throw new Error(
    'Botão de diversão ausente.'
  )
}

if (
  !adminButtons.some(button =>
    button.buttonParamsJson.includes(
      '/menuadm'
    )
  )
) {
  throw new Error(
    'Botão ADM ausente.'
  )
}

const native =
  createNativeButtons({
    owner: true,
    admin: true,
    botAdmin: true
  })

if (!Array.isArray(native)) {
  throw new Error(
    'Native Flow inválido.'
  )
}

if (!isOwner('5584987480834@s.whatsapp.net')) {
  throw new Error(
    'Owner não reconhecido.'
  )
}

console.log(
  '========================================'
)

console.log(
  ' KYARA MENU ADAPTATIVO: TESTE OK'
)

console.log(
  '========================================'
)
