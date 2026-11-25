import { loadRelationships, saveRelationships } from '../../utils/database.js';
import { getUserName, normalizar } from '../../utils/helpers.js';

const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const MARRIAGE_REQUIRED_MS = 48 * 60 * 60 * 1000;

const STATUS_ORDER = {
  brincadeira: 1,
  namoro: 2,
  casamento: 3
};

const TYPE_CONFIG = {
  brincadeira: {
    label: 'Brincadeira',
    emoji: '🎈',
    inviteLabel: 'uma brincadeira',
    successHeadline: '🎈 Pedido aceito!',
    successText: 'agora estão em uma brincadeira!'
  },
  namoro: {
    label: 'Namoro',
    emoji: '💞',
    inviteLabel: 'um namoro',
    successHeadline: '💞 Pedido aceito!',
    successText: 'agora estão namorando!'
  },
  casamento: {
    label: 'Casamento',
    emoji: '💍',
    inviteLabel: 'um casamento',
    successHeadline: '💍 Pedido aceito!',
    successText: 'agora estão oficialmente casados!'
  }
};

class RelationshipManager {
  constructor() {
    this.pendingRequests = new Map();
    this.pendingBetrayals = new Map(); // Nova estrutura para pedidos de traição
    const timer = setInterval(() => this._cleanup(), 60 * 1000);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  _normalizeId(id) {
    return typeof id === 'string' ? id.trim().toLowerCase() : '';
  }

  _normalizeType(type) {
    const normalized = normalizar(type || '');
    return ['brincadeira', 'namoro', 'casamento'].includes(normalized) ? normalized : null;
  }

  _getPairKey(a, b) {
    const first = this._normalizeId(a);
    const second = this._normalizeId(b);
    if (!first || !second || first === second) return null;
    return [first, second].sort().join('::');
  }

  _loadData() {
    const data = loadRelationships();
    if (!data || typeof data !== 'object') {
      return { pairs: {}, archived: [] };
    }
    if (!data.pairs || typeof data.pairs !== 'object') {
      data.pairs = {};
    }
    if (!Array.isArray(data.archived)) {
      data.archived = [];
    }
    return data;
  }

  _saveData(data) {
    return saveRelationships(data);
  }

  _formatDuration(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return '0s';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (!parts.length) parts.push(`${seconds}s`);
    return parts.join(' ');
  }

  _formatDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  hasPendingRequest(groupId) {
    return this.pendingRequests.has(groupId);
  }

  createRequest(type, groupId, requesterId, targetId, context = {}) {
    const normalizedType = this._normalizeType(type);
    if (!normalizedType) {
      return { success: false, message: 'Tipo de pedido inválido.' };
    }

    const requester = this._normalizeId(requesterId);
    const target = this._normalizeId(targetId);
    if (!requester || !target) {
      return { success: false, message: 'Participantes inválidos.' };
    }
    if (requester === target) {
      return { success: false, message: 'Você não pode enviar um pedido para você mesmo.' };
    }

    if (this.pendingRequests.has(groupId)) {
      const pending = this.pendingRequests.get(groupId);
      const config = TYPE_CONFIG[pending.type];
      return {
        success: false,
        message: `Já existe um pedido de ${config?.label?.toLowerCase() || 'relacionamento'} aguardando resposta neste grupo.`
      };
    }

    // ===== CORREÇÃO: Verifica se o solicitante já está em outro relacionamento =====
    const requesterActivePair = this.getActivePairForUser(requesterId);
    if (requesterActivePair && this._normalizeId(requesterActivePair.partnerId) !== target) {
      const partnerName = getUserName(requesterActivePair.partnerId);
      const currentConfig = TYPE_CONFIG[requesterActivePair.pair.status];
      return {
        success: false,
        message: `❌ Você já está em ${currentConfig.inviteLabel} com @${partnerName}. Termine esse relacionamento primeiro!`,
        mentions: [requesterActivePair.partnerId]
      };
    }

    // ===== CORREÇÃO: Verifica se o alvo já está em outro relacionamento =====
    const targetActivePair = this.getActivePairForUser(targetId);
    if (targetActivePair && this._normalizeId(targetActivePair.partnerId) !== requester) {
      const partnerName = getUserName(targetActivePair.partnerId);
      const targetName = getUserName(targetId);
      const currentConfig = TYPE_CONFIG[targetActivePair.pair.status];
      return {
        success: false,
        message: `❌ @${targetName} já está em ${currentConfig.inviteLabel} com @${partnerName}!`,
        mentions: [targetId, targetActivePair.partnerId]
      };
    }

    const pairKey = this._getPairKey(requesterId, targetId);
    if (!pairKey) {
      return { success: false, message: 'Não foi possível registrar o pedido.' };
    }

    const data = this._loadData();
    const existingPair = data.pairs[pairKey];
    const validation = this._validateNewRequest(normalizedType, existingPair);
    if (!validation.allowed) {
      return { success: false, message: validation.message };
    }

    const now = Date.now();
    const request = {
      id: `${groupId}:${now}`,
      type: normalizedType,
      groupId,
      requester,
      target,
      requesterRaw: requesterId,
      targetRaw: targetId,
      createdAt: now,
      expiresAt: now + REQUEST_TIMEOUT_MS,
      context
    };

    this.pendingRequests.set(groupId, request);

    return {
      success: true,
      message: this._buildInvitationMessage(request),
      mentions: [requesterId, targetId],
      request
    };
  }

  _validateNewRequest(type, pair) {
    if (!pair) {
      if (type === 'casamento') {
        return {
          allowed: false,
          message: 'Vocês precisam estar namorando para casar.'
        };
      }
      return { allowed: true };
    }

    const currentStatus = pair.status;

    if (type === 'brincadeira') {
      if (currentStatus === 'brincadeira') {
        const since = pair.stages?.brincadeira?.since;
        const dateText = since ? this._formatDate(since) : 'recentemente';
        return {
          allowed: false,
          message: `Vocês já estão em brincadeira desde ${dateText}.`
        };
      }
      if (currentStatus === 'namoro') {
        return {
          allowed: false,
          message: 'Vocês já estão namorando. Use o comando de terminar primeiro se quiser começar de novo.'
        };
      }
      if (currentStatus === 'casamento') {
        return {
          allowed: false,
          message: 'Vocês já são casados. Use o comando de terminar primeiro se quiser começar de novo.'
        };
      }
      return { allowed: true };
    }

    if (type === 'namoro') {
      if (currentStatus === 'namoro') {
        const since = pair.stages?.namoro?.since;
        const dateText = since ? this._formatDate(since) : 'recentemente';
        return {
          allowed: false,
          message: `Vocês já estão namorando desde ${dateText}.`
        };
      }
      if (currentStatus === 'casamento') {
        return {
          allowed: false,
          message: 'Vocês já são casados!'
        };
      }
      // Permite evoluir de brincadeira para namoro
      return { allowed: true };
    }

    if (type === 'casamento') {
      if (currentStatus === 'casamento') {
        const since = pair.stages?.casamento?.since;
        const dateText = since ? this._formatDate(since) : 'recentemente';
        return {
          allowed: false,
          message: `Vocês já são casados desde ${dateText}.`
        };
      }
      
      if (currentStatus !== 'namoro') {
        return {
          allowed: false,
          message: 'Vocês precisam estar namorando para casar.'
        };
      }
      
      const since = pair.stages?.namoro?.since;
      if (!since) {
        return {
          allowed: false,
          message: 'Vocês precisam estar namorando para casar. O registro do namoro não foi encontrado.'
        };
      }
      
      const sinceTime = Date.parse(since);
      if (Number.isNaN(sinceTime)) {
        return {
          allowed: false,
          message: 'Não foi possível validar a data do namoro. Reinicie o namoro antes de casar.'
        };
      }
      
      const elapsed = Date.now() - sinceTime;
      if (elapsed < MARRIAGE_REQUIRED_MS) {
        return {
          allowed: false,
          message: `Vocês precisam namorar por mais ${this._formatDuration(MARRIAGE_REQUIRED_MS - elapsed)} antes de casar.`
        };
      }
      
      return { allowed: true };
    }

    return {
      allowed: false,
      message: 'Tipo de pedido inválido.'
    };
  }

  _buildInvitationMessage(request) {
    const config = TYPE_CONFIG[request.type];
    const requesterName = getUserName(request.requesterRaw);
    const targetName = getUserName(request.targetRaw);
    return `${config.emoji} *PEDIDO DE ${config.label.toUpperCase()}*

@${requesterName} convidou @${targetName} para ${config.inviteLabel}!

✅ Aceitar: "sim"
❌ Recusar: "não"

⏳ Expira em ${this._formatDuration(REQUEST_TIMEOUT_MS)}.`;
  }

  processResponse(groupId, responderId, rawResponse) {
    const pending = this.pendingRequests.get(groupId);
    if (!pending) return null;

    const responder = this._normalizeId(responderId);
    if (responder !== pending.target) {
      return { success: false, reason: 'not_target' };
    }

    const decision = this._normalizeDecision(rawResponse);
    if (!decision) {
      return {
        success: false,
        reason: 'invalid_response',
        message: '❌ Resposta inválida. Use "sim" para aceitar ou "não" para recusar.'
      };
    }

    this.pendingRequests.delete(groupId);

    if (decision === 'reject') {
      const config = TYPE_CONFIG[pending.type];
      const requesterName = getUserName(pending.requesterRaw);
      const targetName = getUserName(pending.targetRaw);
      return {
        success: true,
        message: `${config.emoji} Pedido de ${config.label.toLowerCase()} recusado.

@${targetName} não aceitou o pedido de @${requesterName}.`,
        mentions: [pending.requesterRaw, pending.targetRaw]
      };
    }

    return this._applyRequest(pending);
  }

  _normalizeDecision(rawResponse) {
    const normalized = normalizar((rawResponse || '').trim());
    if (!normalized) return null;
    const firstWord = normalized.split(/\s+/)[0];
    if (['s', 'sim', 'aceito', 'aceitar', 'yes', 'y', 'claro'].includes(firstWord)) {
      return 'accept';
    }
    if (['n', 'nao', 'não', 'no', 'recuso', 'recusar', 'rejeito', 'rejeitar'].includes(firstWord)) {
      return 'reject';
    }
    return null;
  }

  _applyRequest(request) {
    const data = this._loadData();
    const key = this._getPairKey(request.requesterRaw, request.targetRaw);
    if (!key) {
      return {
        success: false,
        message: '❌ Não consegui registrar o relacionamento. Tente novamente.'
      };
    }

    const now = Date.now();
    let pair = data.pairs[key];
    if (!pair || typeof pair !== 'object') {
      pair = {
        users: [this._normalizeId(request.requesterRaw), this._normalizeId(request.targetRaw)],
        status: null,
        stages: {},
        history: [],
        createdAt: new Date(now).toISOString()
      };
    }

    if (!Array.isArray(pair.history)) {
      pair.history = [];
    }

    if (!pair.stages || typeof pair.stages !== 'object') {
      pair.stages = {};
    }

    const stageEntry = {
      since: new Date(now).toISOString(),
      requestedBy: request.requesterRaw,
      acceptedBy: request.targetRaw,
      groupId: request.groupId,
      requestedAt: new Date(request.createdAt).toISOString(),
      acceptedAt: new Date(now).toISOString()
    };

    pair.history.push({
      type: request.type,
      requestedBy: request.requesterRaw,
      acceptedBy: request.targetRaw,
      requestedAt: stageEntry.requestedAt,
      acceptedAt: stageEntry.acceptedAt
    });

    // Lógica de atualização de status
    if (request.type === 'brincadeira') {
      pair.status = 'brincadeira';
      // Só cria brincadeira se não existir
      if (!pair.stages.brincadeira) {
        pair.stages.brincadeira = stageEntry;
      }
      if (!pair.createdAt) {
        pair.createdAt = stageEntry.since;
      }
    } else if (request.type === 'namoro') {
      pair.status = 'namoro';
      // Sempre atualiza o namoro com a nova data
      pair.stages.namoro = stageEntry;
      // Preserva brincadeira anterior se existir, senão cria
      if (!pair.stages.brincadeira) {
        pair.stages.brincadeira = { ...stageEntry };
      }
    } else if (request.type === 'casamento') {
      pair.status = 'casamento';
      // Sempre atualiza o casamento com a nova data
      pair.stages.casamento = stageEntry;
      // Preserva namoro e brincadeira anteriores
      if (!pair.stages.namoro) {
        pair.stages.namoro = { ...stageEntry };
      }
      if (!pair.stages.brincadeira) {
        pair.stages.brincadeira = { ...stageEntry };
      }
    }

    pair.users = [this._normalizeId(request.requesterRaw), this._normalizeId(request.targetRaw)];
    pair.updatedAt = stageEntry.since;
    pair.terminatedAt = null;
    pair.terminatedBy = null;
    pair.lastStatus = pair.status;

    data.pairs[key] = pair;
    this._saveData(data);

    return {
      success: true,
      message: this._buildAcceptanceMessage(request, pair),
      mentions: [request.requesterRaw, request.targetRaw],
      pair
    };
  }

  _buildAcceptanceMessage(request, pair) {
    const config = TYPE_CONFIG[request.type];
    const requesterName = getUserName(request.requesterRaw);
    const targetName = getUserName(request.targetRaw);
    const stageInfo = pair.stages?.[request.type];
    const sinceText = stageInfo?.since ? this._formatDate(stageInfo.since) : null;

    const lines = [
      config.successHeadline,
      '',
      `${config.emoji} @${requesterName} e @${targetName} ${config.successText}`
    ];

    if (sinceText) {
      lines.push(`🗓️ Início: ${sinceText}`);
    }

    // Para casamento, mostra quanto tempo namoraram
    if (request.type === 'casamento' && pair.stages?.namoro?.since) {
      const namoroSince = Date.parse(pair.stages.namoro.since);
      const casamentoSince = Date.parse(stageInfo.since);
      if (!Number.isNaN(namoroSince) && !Number.isNaN(casamentoSince)) {
        const namoroDuration = casamentoSince - namoroSince;
        lines.push(`� Tempo de namoro antes do casamento: ${this._formatDuration(namoroDuration)}`);
      }
    }

    // Para namoro, mostra quanto tempo de brincadeira (se houver)
    if (request.type === 'namoro' && pair.stages?.brincadeira?.since) {
      const brincadeiraSince = Date.parse(pair.stages.brincadeira.since);
      const namoroSince = Date.parse(stageInfo.since);
      if (!Number.isNaN(brincadeiraSince) && !Number.isNaN(namoroSince) && brincadeiraSince !== namoroSince) {
        const brincadeiraDuration = namoroSince - brincadeiraSince;
        lines.push(`🎈 Tempo de brincadeira antes do namoro: ${this._formatDuration(brincadeiraDuration)}`);
      }
    }

    return lines.join('\n');
  }

  getRelationshipSummary(userA, userB) {
    const key = this._getPairKey(userA, userB);
    if (!key) {
      return {
        success: false,
        message: 'Não foi possível identificar essa dupla.'
      };
    }

    const data = this._loadData();
    const pair = data.pairs[key];
    if (!pair || !pair.status) {
      return {
        success: false,
        message: 'Nenhum relacionamento ativo registrado entre essas pessoas.'
      };
    }

    const partnerA = getUserName(userA);
    const partnerB = getUserName(userB);
    const lines = [
      '💞 *RELACIONAMENTO*',
      '',
      `👥 Parceiros: @${partnerA} & @${partnerB}`
    ];

    if (pair.status && TYPE_CONFIG[pair.status]) {
      const statusConfig = TYPE_CONFIG[pair.status];
      lines.push(`${statusConfig.emoji} Status atual: ${statusConfig.label}`);
      
      const statusSince = pair.stages?.[pair.status]?.since;
      if (statusSince) {
        const formatted = this._formatDate(statusSince);
        const sinceTimestamp = Date.parse(statusSince);
        const duration = Number.isNaN(sinceTimestamp) ? null : this._formatDuration(Date.now() - sinceTimestamp);
        lines.push(`🗓️ Desde: ${formatted || 'data desconhecida'}${duration ? ` (há ${duration})` : ''}`);
      }
    } else {
      lines.push('⚠️ Status atual: sem registro válido.');
    }

    // Mostra histórico de estágios
    const historicalStages = ['brincadeira', 'namoro', 'casamento']
      .filter(stage => pair.stages?.[stage]?.since)
      .map(stage => {
        const config = TYPE_CONFIG[stage];
        const since = pair.stages[stage].since;
        const formatted = this._formatDate(since);
        const sinceTimestamp = Date.parse(since);
        const duration = Number.isNaN(sinceTimestamp) ? null : this._formatDuration(Date.now() - sinceTimestamp);
        return `${config.emoji} ${config.label}: ${formatted || 'data desconhecida'}${duration ? ` (há ${duration})` : ''}`;
      });

    if (historicalStages.length > 0) {
      lines.push('', '📚 Histórico de Estágios:', ...historicalStages);
    }

    // Se está namorando mas não casado, mostra tempo restante para casar
    if (pair.status === 'namoro' && pair.stages?.namoro?.since) {
      const namoroSince = Date.parse(pair.stages.namoro.since);
      if (!Number.isNaN(namoroSince)) {
        const elapsed = Date.now() - namoroSince;
        if (elapsed < MARRIAGE_REQUIRED_MS) {
          const remaining = MARRIAGE_REQUIRED_MS - elapsed;
          lines.push('', `⏳ Tempo restante para liberar casamento: ${this._formatDuration(remaining)}`);
        } else {
          lines.push('', `✅ Já podem se casar! Tempo de namoro: ${this._formatDuration(elapsed)}`);
        }
      }
    }

    return {
      success: true,
      message: lines.join('\n'),
      mentions: [userA, userB]
    };
  }

  getActivePairForUser(userId) {
    const normalized = this._normalizeId(userId);
    if (!normalized) return null;

    const data = this._loadData();
    for (const [key, pair] of Object.entries(data.pairs)) {
      if (!pair || !Array.isArray(pair.users) || !pair.status || !TYPE_CONFIG[pair.status]) continue;
      const users = pair.users.map(u => this._normalizeId(u));
      const index = users.indexOf(normalized);
      if (index === -1) continue;

      const partnerIndex = index === 0 ? 1 : 0;
      const partnerId = pair.users[partnerIndex];
      if (!partnerId) continue;

      return {
        key,
        pair,
        partnerId,
        userId: pair.users[index]
      };
    }

    return null;
  }

  endRelationship(userA, userB, triggeredBy) {
    const key = this._getPairKey(userA, userB);
    if (!key) {
      return {
        success: false,
        message: '❌ Não foi possível identificar essa dupla.'
      };
    }

    const data = this._loadData();
    const pair = data.pairs[key];
    if (!pair || !pair.status || !TYPE_CONFIG[pair.status]) {
      return {
        success: false,
        message: '❌ Não existe um relacionamento ativo entre essas pessoas.'
      };
    }

    const status = pair.status;
    const config = TYPE_CONFIG[status];
    const stageInfo = pair.stages?.[status];
    const since = stageInfo?.since ? Date.parse(stageInfo.since) : null;
    const duration = since && !Number.isNaN(since) ? this._formatDuration(Date.now() - since) : null;
    const sinceFormatted = stageInfo?.since ? this._formatDate(stageInfo.since) : null;
    const endedAt = new Date().toISOString();

    if (!Array.isArray(pair.history)) {
      pair.history = [];
    }
    pair.history.push({
      type: 'termino',
      previousStatus: status,
      triggeredBy,
      endedAt
    });

    const archivedPair = JSON.parse(JSON.stringify(pair));
    archivedPair.terminatedAt = endedAt;
    archivedPair.terminatedBy = triggeredBy;
    archivedPair.finalStatus = status;
    archivedPair.status = 'terminado';
    if (!Array.isArray(data.archived)) {
      data.archived = [];
    }
    data.archived.push(archivedPair);

    delete data.pairs[key];
    this._saveData(data);

    const triggerName = getUserName(triggeredBy);
    const userOneName = getUserName(userA);
    const userTwoName = getUserName(userB);
    const lines = [
      '💔 *Relacionamento encerrado!*',
      '',
      `${config.emoji} Status encerrado: ${config.label}`
    ];

    if (sinceFormatted && duration) {
      lines.push(`📆 Duração total: ${duration}`);
      lines.push(`🗓️ Início: ${sinceFormatted}`);
    } else if (sinceFormatted) {
      lines.push(`🗓️ Iniciado em: ${sinceFormatted}`);
    }

    lines.push('', `👤 Quem encerrou: @${triggerName}`);
    lines.push(`👥 Ex-casal: @${userOneName} & @${userTwoName}`);

    return {
      success: true,
      message: lines.join('\n'),
      mentions: Array.from(new Set([userA, userB, triggeredBy].filter(Boolean)))
    };
  }

  _cleanup() {
    const now = Date.now();
    for (const [groupId, request] of this.pendingRequests.entries()) {
      if (request.expiresAt && request.expiresAt <= now) {
        this.pendingRequests.delete(groupId);
      }
    }
    // Limpa pedidos de traição expirados
    for (const [key, betrayal] of this.pendingBetrayals.entries()) {
      if (betrayal.expiresAt && betrayal.expiresAt <= now) {
        this.pendingBetrayals.delete(key);
      }
    }
  }

  // Verifica se há pedido de traição pendente
  hasPendingBetrayal(groupId) {
    for (const [key, betrayal] of this.pendingBetrayals.entries()) {
      if (betrayal.groupId === groupId) {
        return true;
      }
    }
    return false;
  }

  // Processa resposta de traição
  processBetrayalResponse(groupId, responderId, rawResponse, prefix = '/') {
    let betrayalToProcess = null;
    let betrayalKey = null;

    // Encontra o pedido de traição para este grupo e respondente
    for (const [key, betrayal] of this.pendingBetrayals.entries()) {
      if (betrayal.groupId === groupId && this._normalizeId(betrayal.targetId) === this._normalizeId(responderId)) {
        betrayalToProcess = betrayal;
        betrayalKey = key;
        break;
      }
    }

    if (!betrayalToProcess) return null;

    const decision = this._normalizeDecision(rawResponse);
    if (!decision) {
      return {
        success: false,
        reason: 'invalid_response',
        message: '❌ Resposta inválida. Use "sim" para aceitar ou "não" para recusar.'
      };
    }

    this.pendingBetrayals.delete(betrayalKey);

    const traitorName = getUserName(betrayalToProcess.userId);
    const targetName = getUserName(betrayalToProcess.targetId);
    const victimName = getUserName(betrayalToProcess.partnerId);

    if (decision === 'reject') {
      return {
        success: true,
        message: `😇 *CONSCIÊNCIA LIMPA*\n\n@${targetName} recusou a proposta de traição de @${traitorName}!\n\n💚 @${victimName} pode dormir tranquilo(a)!`,
        mentions: [betrayalToProcess.targetId, betrayalToProcess.userId, betrayalToProcess.partnerId]
      };
    }

    // Aceita a traição - executa o processo completo
    return this._executeBetrayalAccepted(betrayalToProcess, prefix);
  }

  // Cria pedido de traição
  createBetrayalRequest(userId, targetId, groupId, prefix = '/') {
    const userActivePair = this.getActivePairForUser(userId);
    
    if (!userActivePair) {
      return {
        success: false,
        message: '❌ Você não está em um relacionamento ativo!',
        mentions: []
      };
    }

    const partnerId = userActivePair.partnerId;

    // Verifica se está tentando trair com o próprio parceiro
    if (this._normalizeId(targetId) === this._normalizeId(partnerId)) {
      return {
        success: false,
        message: '❌ Você não pode trair seu parceiro com ele mesmo!',
        mentions: [partnerId]
      };
    }

    // Verifica se está tentando trair consigo mesmo
    if (this._normalizeId(targetId) === this._normalizeId(userId)) {
      return {
        success: false,
        message: '❌ Você não pode trair a si mesmo!',
        mentions: []
      };
    }

    // Verifica se já existe pedido de traição pendente neste grupo
    for (const betrayal of this.pendingBetrayals.values()) {
      if (betrayal.groupId === groupId) {
        return {
          success: false,
          message: '⏳ Já existe um pedido de traição aguardando resposta neste grupo.',
          mentions: []
        };
      }
    }

    const now = Date.now();
    const betrayalKey = `${groupId}:${userId}:${targetId}:${now}`;
    
    const betrayalRequest = {
      userId,
      targetId,
      partnerId,
      groupId,
      userKey: userActivePair.key,
      createdAt: now,
      expiresAt: now + REQUEST_TIMEOUT_MS
    };

    this.pendingBetrayals.set(betrayalKey, betrayalRequest);

    const traitorName = getUserName(userId);
    const targetName = getUserName(targetId);
    const victimName = getUserName(partnerId);

    return {
      success: true,
      message: `😈 *PROPOSTA DE TRAIÇÃO*\n\n@${traitorName} quer trair @${victimName} com você, @${targetName}!\n\n✅ Aceitar: "sim"\n❌ Recusar: "não"\n\n⏳ Expira em ${this._formatDuration(REQUEST_TIMEOUT_MS)}.`,
      mentions: [userId, targetId, partnerId]
    };
  }

  // Executa traição após aceitação
  _executeBetrayalAccepted(betrayalRequest, prefix = '/') {
    const { userId, targetId, partnerId, groupId, userKey } = betrayalRequest;

    const data = this._loadData();
    const currentPair = data.pairs[userKey];
    
    if (!currentPair || !currentPair.status) {
      return {
        success: false,
        message: '❌ Não foi possível encontrar seu relacionamento ativo!',
        mentions: []
      };
    }

    // Verifica se o alvo também está em um relacionamento
    const targetActivePair = this.getActivePairForUser(targetId);
    
    let targetInRelationship = false;
    let targetPartner = null;
    
    if (targetActivePair) {
      targetInRelationship = true;
      targetPartner = targetActivePair.partnerId;
    }

    const now = new Date().toISOString();
    const config = TYPE_CONFIG[currentPair.status];

    // Registra a traição no histórico
    if (!Array.isArray(currentPair.history)) {
      currentPair.history = [];
    }

    currentPair.history.push({
      type: 'traicao',
      traitor: userId,
      victim: partnerId,
      accomplice: targetId,
      date: now,
      groupId: groupId,
      previousStatus: currentPair.status
    });

    // Incrementa contador de traições
    if (!currentPair.betrayals) {
      currentPair.betrayals = { [userId]: 0, [partnerId]: 0 };
    }
    currentPair.betrayals[userId] = (currentPair.betrayals[userId] || 0) + 1;

    // Marca como relacionamento traído
    currentPair.lastBetrayal = {
      date: now,
      traitor: userId,
      victim: partnerId,
      accomplice: targetId
    };

    this._saveData(data);

    const traitorName = getUserName(userId);
    const victimName = getUserName(partnerId);
    const accompliceName = getUserName(targetId);

    const lines = [
      '😈 *TRAIÇÃO CONFIRMADA!*',
      '',
      `💔 @${traitorName} traiu @${victimName}!`,
      `👤 Cúmplice: @${accompliceName} aceitou participar!`,
      ''
    ];

    const mentions = [userId, partnerId, targetId];

    if (targetInRelationship && targetPartner) {
      lines.push(`⚠️ @${accompliceName} também está em um relacionamento!`);
      lines.push(`💔 @${getUserName(targetPartner)} também foi traído(a)!`);
      lines.push('');
      mentions.push(targetPartner);
    }

    lines.push(`${config.emoji} Status atual: ${config.label}`);
    lines.push(`⚠️ Traições registradas: ${currentPair.betrayals[userId]}`);
    lines.push('');
    lines.push('💡 O relacionamento continua, mas a confiança foi abalada...');
    lines.push(`Use ${prefix}terminar para encerrar o relacionamento.`);

    return {
      success: true,
      message: lines.join('\n'),
      mentions: Array.from(new Set(mentions.filter(Boolean))),
      betrayalCount: currentPair.betrayals[userId]
    };
  }

  getBetrayalHistory(userA, userB) {
    const key = this._getPairKey(userA, userB);
    if (!key) {
      return {
        success: false,
        message: 'Não foi possível identificar essa dupla.'
      };
    }

    const data = this._loadData();
    const pair = data.pairs[key];
    
    if (!pair || !pair.status) {
      return {
        success: false,
        message: 'Nenhum relacionamento ativo encontrado entre essas pessoas.'
      };
    }

    const betrayals = (pair.history || []).filter(h => h.type === 'traicao');
    
    if (betrayals.length === 0) {
      return {
        success: true,
        message: '✨ Este relacionamento não possui histórico de traições!',
        mentions: [userA, userB],
        betrayalCount: 0
      };
    }

    const partnerA = getUserName(userA);
    const partnerB = getUserName(userB);
    
    const lines = [
      '📜 *HISTÓRICO DE TRAIÇÕES*',
      '',
      `👥 Casal: @${partnerA} & @${partnerB}`,
      `💔 Total de traições: ${betrayals.length}`,
      ''
    ];

    betrayals.slice(-5).forEach((betrayal, index) => {
      const traitorName = getUserName(betrayal.traitor);
      const victimName = getUserName(betrayal.victim);
      const accompliceName = getUserName(betrayal.accomplice);
      const date = this._formatDate(betrayal.date);
      
      lines.push(`${index + 1}. 😈 @${traitorName} traiu @${victimName}`);
      lines.push(`   👤 Com: @${accompliceName}`);
      lines.push(`   📅 Data: ${date || 'N/A'}`);
      lines.push('');
    });

    if (betrayals.length > 5) {
      lines.push(`... e mais ${betrayals.length - 5} traições anteriores.`);
    }

    return {
      success: true,
      message: lines.join('\n'),
      mentions: Array.from(new Set([userA, userB, ...betrayals.map(b => b.traitor), ...betrayals.map(b => b.accomplice)].filter(Boolean))),
      betrayalCount: betrayals.length
    };
  }
}

export default new RelationshipManager();
