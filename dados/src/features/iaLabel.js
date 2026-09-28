export function patchIALabel(sock){
  const originalSend = sock.sendMessage.bind(sock);
  sock.sendMessage = async (jid, content, options) => {
    try {
      // Adiciona footer IA em todo texto
      if(content && content.text && !content.text.includes('IA 💎')){
        // Não adiciona se já é do quiz (quiz já tem footer próprio)
        if(!content.text.includes('QUIZ DO CASAL')){
          content.text = content.text + '\n\nIA 💎';
        }
      }
      if(content && content.caption && !content.caption.includes('IA 💎')){
        content.caption = content.caption + '\n\nIA 💎';
      }
      // Força marcação de IA no contexto - é o que faz aparecer o 💎 do lado do horário
      if(!content.contextInfo) content.contextInfo = {};

      content.contextInfo.isBot = true;
      content.contextInfo.businessMessage = true;

      // Para mensagens com botões também
      if(content.buttons){
        if(!content.footer) content.footer = 'IA 💎';
        else if(!content.footer.includes('IA')) content.footer += ' • IA 💎';
      }
      if(content.templateButtons){
        content.contextInfo.businessMessage = true;
      }
    } catch(e){}
    return originalSend(jid, content, options);
  };
  console.log('✅ PATCH IA 💎 ATIVADO - Todas mensagens com selo IA');
  return sock;
}
