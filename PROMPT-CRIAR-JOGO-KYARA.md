# 🎮 PROMPT MESTRE — CRIAR JOGO PARA O KYARA BROWSER

Quero que você crie um jogo completo em HTML5, CSS3 e JavaScript puro, pensado especificamente para funcionar dentro do KYARA BROWSER, que é uma interface Rich HTML exibida dentro do WhatsApp.

## OBJETIVO

Crie um jogo realmente jogável, bonito e responsivo para celular.

O jogo deve parecer um aplicativo/jogo de verdade, e não apenas uma página HTML demonstrativa.

## REGRAS PRINCIPAIS

1. Use HTML5 + CSS3 + JavaScript puro.
2. Não use API paga.
3. Não dependa de banco de dados externo.
4. Não dependa de backend para funcionar, salvo quando for absolutamente necessário.
5. Não use frameworks pesados.
6. Evite bibliotecas externas.
7. O jogo deve funcionar mesmo sem internet depois que o HTML for carregado.
8. O código deve ser otimizado para Android.
9. O jogo deve funcionar em telas pequenas.
10. Não utilize recursos que dependam de mouse.
11. Todos os controles importantes precisam funcionar por toque.
12. Não crie botões pequenos demais.
13. Não utilize alert() para a interface principal.
14. Não abra novas páginas desnecessariamente.
15. O jogo deve permanecer dentro da experiência do KYARA BROWSER sempre que possível.

## INTERFACE

Crie uma interface moderna e profissional.

A tela deve possuir:

- área principal do jogo;
- HUD;
- pontuação;
- vida/energia quando necessário;
- moedas ou recursos quando fizer sentido;
- botão de pausa;
- botão de reiniciar;
- tela inicial;
- tela de Game Over;
- tela de vitória;
- instruções;
- feedback visual para ações;
- animações suaves.

A interface precisa se adaptar automaticamente ao tamanho da tela.

## CONTROLES MOBILE

Priorize:

- toque;
- arrastar;
- botões virtuais;
- joystick virtual quando necessário;
- gestos;
- toque prolongado quando fizer sentido.

Os controles devem ser confortáveis para jogar segurando o celular.

Evite depender de teclado físico.

Caso teclado seja útil, ele deve ser apenas uma opção adicional.

## DESEMPENHO

O jogo deve ser leve.

Evite:

- loops desnecessários;
- centenas de elementos DOM;
- imagens gigantes;
- processamento pesado;
- animações que causem travamentos;
- consumo exagerado de memória.

Quando apropriado, utilize:

- Canvas;
- requestAnimationFrame;
- sprites desenhados via Canvas;
- partículas controladas;
- pooling de objetos.

O jogo precisa rodar bem em um celular Android intermediário.

## ARMAZENAMENTO

Quando houver progresso, utilize localStorage.

Exemplos:

- maior pontuação;
- moedas;
- configurações;
- progresso;
- personagens desbloqueados;
- fases desbloqueadas.

O jogo deve continuar funcionando mesmo se localStorage estiver indisponível, usando valores padrão.

## VISUAL

Crie um visual consistente.

Não entregue uma interface genérica.

Defina:

- paleta;
- tipografia;
- sombras;
- bordas;
- animações;
- estados dos botões;
- HUD;
- menus;
- feedback de dano;
- feedback de recompensa.

Tudo deve parecer parte do mesmo jogo.

## ÁUDIO

Se adicionar áudio:

- permita ativar/desativar;
- não reproduza áudio automaticamente sem necessidade;
- não dependa obrigatoriamente de arquivos externos;
- prefira Web Audio API quando apropriado.

O jogo deve continuar jogável sem áudio.

## ESTRUTURA DO JOGO

Implemente de verdade:

- menu inicial;
- gameplay;
- sistema de pontuação;
- regras;
- colisões quando necessárias;
- inimigos ou obstáculos quando fizer sentido;
- dificuldade progressiva;
- vitória;
- derrota;
- reinício;
- pausa;
- feedback visual.

Não deixe funções falsas ou botões que não fazem nada.

## CÓDIGO

Entregue o código COMPLETO.

Não entregue:

- pseudocódigo;
- trechos incompletos;
- "adicione aqui";
- funções vazias;
- comentários dizendo que algo precisa ser implementado depois.

Tudo deve estar implementado.

Prefira uma estrutura organizada:

HTML
├── interface
├── canvas/área do jogo
├── HUD
└── menus

CSS
├── layout
├── componentes
├── animações
└── responsividade

JavaScript
├── estado do jogo
├── entrada do usuário
├── física
├── colisões
├── entidades
├── renderização
├── áudio
├── pontuação
├── armazenamento
└── fluxo de telas

## COMPATIBILIDADE COM KYARA BROWSER

O jogo será colocado dentro do KYARA BROWSER.

Portanto:

- não dependa de APIs proprietárias do WhatsApp;
- não tente acessar arquivos privados do Android;
- não tente quebrar sandbox;
- não tente burlar CSP;
- não tente burlar X-Frame-Options;
- não tente acessar autenticação de outros sites;
- não utilize técnicas de evasão;
- não dependa de permissões especiais.

O jogo deve funcionar dentro de um ambiente HTML restrito.

## EXPERIÊNCIA

Quero que o usuário tenha a sensação de estar abrindo um pequeno jogo/app dentro do navegador.

Ao iniciar:

1. Mostrar tela de carregamento curta, se necessária.
2. Mostrar menu principal.
3. Exibir botão JOGAR.
4. Entrar no gameplay.
5. Permitir pausar.
6. Permitir reiniciar.
7. Salvar progresso quando aplicável.
8. Mostrar resultado ao terminar.
9. Permitir jogar novamente.

## EXPANSÃO

O código deve ser preparado para receber futuramente:

- novas fases;
- novos inimigos;
- novos personagens;
- novas armas;
- novos mapas;
- sistema de níveis;
- conquistas;
- skins;
- ranking local;
- missões;
- loja;
- configurações.

Não implemente sistemas gigantes desnecessariamente agora, mas organize o código para permitir expansão.

## IMPORTANTE

Não destrua nenhuma funcionalidade existente do KYARA BROWSER.

O jogo deve ser uma funcionalidade independente.

Não altere:

- pesquisa;
- histórico;
- navegação;
- barra de URL;
- YouTube;
- páginas externas;
- sistema Rich HTML;
- comandos do bot.

## ENTREGA

Primeiro explique em poucas linhas:

- nome do jogo;
- gênero;
- objetivo;
- controles;
- mecânica principal.

Depois entregue o HTML COMPLETO.

O HTML precisa estar pronto para ser salvo e executado.

Depois faça uma pequena checklist:

[ ] Menu
[ ] Gameplay
[ ] Controles touch
[ ] Pontuação
[ ] Colisões
[ ] Vitória
[ ] Game Over
[ ] Pausa
[ ] Reinício
[ ] Responsividade
[ ] localStorage quando necessário
[ ] Sem API paga
[ ] Sem dependência externa obrigatória
[ ] Compatível com Android
[ ] Compatível com KYARA BROWSER

NUNCA entregue uma demonstração falsa.

QUERO UM JOGO REALMENTE JOGÁVEL.
