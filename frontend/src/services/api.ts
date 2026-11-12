import axios from 'axios';
import {
  DashboardOverview,
  EscalaMusico,
  EventoCasamento,
  EventoCasamento360,
  HistoricoFinanceiroMusico,
  Musico,
  ParcelaContrato,
  PlaybackBiblioteca,
  RepertorioItem,
  SonorizacaoLogistica,
  UploadPlaybackResponse,
  VerificacaoConflito,
} from '../types';
import {
  arquivoParaDataUrlOffline,
  carregarDBLocal,
  espelharEvento360NoCache,
  espelharMusicosNoCache,
  espelharPlaybacksNoCache,
  obterUrlServidorRemoto,
  offlineEngine,
  salvarDBLocal,
} from './offlineStore';

const defaultApiBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: defaultApiBaseUrl,
  timeout: 4500,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Status de conectividade em tempo real para o cabeçalho do sistema
type ListenerStatusConexao = (online: boolean) => void;
const listenersConexao = new Set<ListenerStatusConexao>();
let ultimoStatusOnline = true;

export function notificarStatusConexao(online: boolean): void {
  ultimoStatusOnline = online;
  listenersConexao.forEach((cb) => cb(online));
}

export function obterUltimoStatusOnline(): boolean {
  return ultimoStatusOnline;
}

export function assinarStatusConexao(cb: ListenerStatusConexao): () => void {
  listenersConexao.add(cb);
  return () => listenersConexao.delete(cb);
}

// Detecta se está rodando nativamente dentro do APK Android sem servidor remoto configurado
function deveUsarApenasBancoLocal(): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  const remoteUrl = obterUrlServidorRemoto();
  if (remoteUrl) {
    return false;
  }
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    // No APK Android (Capacitor), o app roda em https://localhost ou capacitor://localhost sem porta
    if (proto === 'capacitor:' || proto === 'file:') {
      return true;
    }
    if ((host === 'localhost' || host === '127.0.0.1') && !port) {
      return true;
    }
  }
  return false;
}

api.interceptors.request.use((config) => {
  const remoteUrl = obterUrlServidorRemoto();
  if (remoteUrl) {
    config.baseURL = `${remoteUrl.replace(/\/+$/, '')}/api/v1`;
  } else {
    config.baseURL = defaultApiBaseUrl;
  }
  return config;
});

// Dashboard
export const dashboardService = {
  getOverview: async (params?: { mes?: number; ano?: number }): Promise<DashboardOverview> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.obterDashboard(params);
    }
    try {
      const { data } = await api.get<DashboardOverview>('/dashboard', { params });
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.obterDashboard(params);
    }
  },
};

// Módulo A: Músicos
export const musicosService = {
  listar: async (params?: {
    search?: string;
    instrumento?: string;
    status?: string;
  }): Promise<Musico[]> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.listarMusicos(params);
    }
    try {
      const { data } = await api.get<Musico[]>('/musicos', { params });
      notificarStatusConexao(true);
      if (!params?.search && !params?.instrumento && !params?.status) {
        espelharMusicosNoCache(data);
      }
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.listarMusicos(params);
    }
  },
  obter: async (id: number): Promise<Musico> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.obterMusico(id);
    }
    try {
      const { data } = await api.get<Musico>(`/musicos/${id}`);
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.obterMusico(id);
    }
  },
  obterHistoricoFinanceiro: async (id: number): Promise<HistoricoFinanceiroMusico> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.obterHistoricoMusico(id);
    }
    try {
      const { data } = await api.get<HistoricoFinanceiroMusico>(
        `/musicos/${id}/historico-financeiro`
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.obterHistoricoMusico(id);
    }
  },
  criar: async (payload: Partial<Musico>): Promise<Musico> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.criarMusico(payload);
    }
    try {
      const { data } = await api.post<Musico>('/musicos', payload);
      notificarStatusConexao(true);
      const db = carregarDBLocal();
      const idx = db.musicos.findIndex((m) => m.id === data.id);
      if (idx >= 0) db.musicos[idx] = data;
      else db.musicos.push(data);
      salvarDBLocal(db);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.criarMusico(payload);
    }
  },
  atualizar: async (id: number, payload: Partial<Musico>): Promise<Musico> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.atualizarMusico(id, payload);
    }
    try {
      const { data } = await api.put<Musico>(`/musicos/${id}`, payload);
      notificarStatusConexao(true);
      const db = carregarDBLocal();
      const idx = db.musicos.findIndex((m) => m.id === data.id);
      if (idx >= 0) db.musicos[idx] = data;
      salvarDBLocal(db);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.atualizarMusico(id, payload);
    }
  },
  remover: async (id: number): Promise<void> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      offlineEngine.removerMusico(id);
      return;
    }
    try {
      await api.delete(`/musicos/${id}`);
      notificarStatusConexao(true);
      offlineEngine.removerMusico(id);
    } catch {
      notificarStatusConexao(false);
      offlineEngine.removerMusico(id);
    }
  },
};

// Módulos B, C, D, E, F: Casamentos & Visão 360º
export const eventosService = {
  listar: async (params?: {
    mes?: number;
    ano?: number;
    status?: string;
    tipo_formacao?: string;
    tipo_contratacao?: string;
    search?: string;
  }): Promise<EventoCasamento[]> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.listarEventos(params);
    }
    try {
      const { data } = await api.get<EventoCasamento[]>('/eventos', { params });
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.listarEventos(params);
    }
  },
  verificarConflito: async (params: {
    data_casamento: string;
    horario_chegada_banda: string;
    horario_inicio_cerimonia: string;
    exclude_evento_id?: number;
  }): Promise<VerificacaoConflito> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.verificarConflito(params);
    }
    try {
      const { data } = await api.get<VerificacaoConflito>('/eventos/verificar-conflito', {
        params,
      });
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.verificarConflito(params);
    }
  },
  obter360: async (id: number): Promise<EventoCasamento360> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.obterEvento360(id);
    }
    try {
      const { data } = await api.get<EventoCasamento360>(`/eventos/${id}`);
      notificarStatusConexao(true);
      espelharEvento360NoCache(data);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.obterEvento360(id);
    }
  },
  criar: async (
    payload: Partial<EventoCasamento> & {
      forcar_criacao_com_conflito?: boolean;
      status_cache_freelancer?: 'ABERTO' | 'PAGO';
    }
  ): Promise<EventoCasamento360> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.criarEvento(payload);
    }
    try {
      const { data } = await api.post<EventoCasamento360>('/eventos', payload);
      notificarStatusConexao(true);
      espelharEvento360NoCache(data);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.criarEvento(payload);
    }
  },
  atualizar: async (
    id: number,
    payload: Partial<EventoCasamento>
  ): Promise<EventoCasamento360> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.atualizarEvento(id, payload);
    }
    try {
      const { data } = await api.put<EventoCasamento360>(`/eventos/${id}`, payload);
      notificarStatusConexao(true);
      espelharEvento360NoCache(data);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.atualizarEvento(id, payload);
    }
  },
  remover: async (id: number): Promise<void> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      offlineEngine.removerEvento(id);
      return;
    }
    try {
      await api.delete(`/eventos/${id}`);
      notificarStatusConexao(true);
      offlineEngine.removerEvento(id);
    } catch {
      notificarStatusConexao(false);
      offlineEngine.removerEvento(id);
    }
  },
  confirmarCacheFreelancer: async (id: number): Promise<EventoCasamento360> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.confirmarCacheFreelancer(id);
    }
    try {
      const { data } = await api.post<EventoCasamento360>(
        `/eventos/${id}/confirmar-cache-freelancer`
      );
      notificarStatusConexao(true);
      espelharEvento360NoCache(data);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.confirmarCacheFreelancer(id);
    }
  },

  // Módulo C: Escalas
  adicionarEscala: async (
    eventoId: number,
    payload: {
      musico_id: number;
      instrumento_no_evento?: string;
      valor_cache_combinado?: number;
      taxa_deslocamento_combustivel?: number;
      status_confirmacao?: string;
      observacoes_escala?: string;
    }
  ): Promise<EscalaMusico> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.adicionarEscala(eventoId, payload);
    }
    try {
      const { data } = await api.post<EscalaMusico>(`/eventos/${eventoId}/escalas`, payload);
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.adicionarEscala(eventoId, payload);
    }
  },
  atualizarEscala: async (
    eventoId: number,
    escalaId: number,
    payload: Partial<EscalaMusico>
  ): Promise<EscalaMusico> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.atualizarEscala(eventoId, escalaId, payload);
    }
    try {
      const { data } = await api.put<EscalaMusico>(
        `/eventos/${eventoId}/escalas/${escalaId}`,
        payload
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.atualizarEscala(eventoId, escalaId, payload);
    }
  },
  baixarPagamentoEscala: async (
    eventoId: number,
    escalaId: number,
    payload?: { data_pagamento?: string; observacoes_escala?: string }
  ): Promise<EscalaMusico> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.baixarPagamentoEscala(eventoId, escalaId, payload);
    }
    try {
      const { data } = await api.post<EscalaMusico>(
        `/eventos/${eventoId}/escalas/${escalaId}/baixar-pagamento`,
        payload || {}
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.baixarPagamentoEscala(eventoId, escalaId, payload);
    }
  },
  removerEscala: async (eventoId: number, escalaId: number): Promise<void> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      offlineEngine.removerEscala(eventoId, escalaId);
      return;
    }
    try {
      await api.delete(`/eventos/${eventoId}/escalas/${escalaId}`);
      notificarStatusConexao(true);
      offlineEngine.removerEscala(eventoId, escalaId);
    } catch {
      notificarStatusConexao(false);
      offlineEngine.removerEscala(eventoId, escalaId);
    }
  },

  // Módulo D: Repertório
  adicionarRepertorio: async (
    eventoId: number,
    payload: Partial<RepertorioItem>
  ): Promise<RepertorioItem> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.adicionarRepertorio(eventoId, payload);
    }
    try {
      const { data } = await api.post<RepertorioItem>(
        `/eventos/${eventoId}/repertorio`,
        payload
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.adicionarRepertorio(eventoId, payload);
    }
  },
  atualizarRepertorio: async (
    eventoId: number,
    itemId: number,
    payload: Partial<RepertorioItem>
  ): Promise<RepertorioItem> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.atualizarRepertorio(eventoId, itemId, payload);
    }
    try {
      const { data } = await api.put<RepertorioItem>(
        `/eventos/${eventoId}/repertorio/${itemId}`,
        payload
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.atualizarRepertorio(eventoId, itemId, payload);
    }
  },
  reordenarRepertorio: async (
    eventoId: number,
    itens: { id: number; ordem_execucao: number }[]
  ): Promise<RepertorioItem[]> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.reordenarRepertorio(eventoId, itens);
    }
    try {
      const { data } = await api.put<RepertorioItem[]>(
        `/eventos/${eventoId}/repertorio/reordenar`,
        { itens }
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.reordenarRepertorio(eventoId, itens);
    }
  },
  removerRepertorio: async (eventoId: number, itemId: number): Promise<void> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      offlineEngine.removerRepertorio(eventoId, itemId);
      return;
    }
    try {
      await api.delete(`/eventos/${eventoId}/repertorio/${itemId}`);
      notificarStatusConexao(true);
      offlineEngine.removerRepertorio(eventoId, itemId);
    } catch {
      notificarStatusConexao(false);
      offlineEngine.removerRepertorio(eventoId, itemId);
    }
  },

  // Módulo E: Sonorização
  atualizarSonorizacao: async (
    eventoId: number,
    payload: Partial<SonorizacaoLogistica>
  ): Promise<SonorizacaoLogistica> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.atualizarSonorizacao(eventoId, payload);
    }
    try {
      const { data } = await api.put<SonorizacaoLogistica>(
        `/eventos/${eventoId}/sonorizacao`,
        payload
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.atualizarSonorizacao(eventoId, payload);
    }
  },

  // Módulo F: Parcelas do Contrato
  adicionarParcela: async (
    eventoId: number,
    payload: Partial<ParcelaContrato>
  ): Promise<ParcelaContrato> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.adicionarParcela(eventoId, payload);
    }
    try {
      const { data } = await api.post<ParcelaContrato>(
        `/eventos/${eventoId}/parcelas`,
        payload
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.adicionarParcela(eventoId, payload);
    }
  },
  atualizarParcela: async (
    eventoId: number,
    parcelaId: number,
    payload: Partial<ParcelaContrato>
  ): Promise<ParcelaContrato> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.atualizarParcela(eventoId, parcelaId, payload);
    }
    try {
      const { data } = await api.put<ParcelaContrato>(
        `/eventos/${eventoId}/parcelas/${parcelaId}`,
        payload
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.atualizarParcela(eventoId, parcelaId, payload);
    }
  },
  baixarPagamentoParcela: async (
    eventoId: number,
    parcelaId: number,
    payload?: { forma_pagamento?: string; observacoes?: string }
  ): Promise<ParcelaContrato> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.baixarPagamentoParcela(eventoId, parcelaId, payload);
    }
    try {
      const { data } = await api.post<ParcelaContrato>(
        `/eventos/${eventoId}/parcelas/${parcelaId}/baixar-pagamento`,
        payload || {}
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.baixarPagamentoParcela(eventoId, parcelaId, payload);
    }
  },
  removerParcela: async (eventoId: number, parcelaId: number): Promise<void> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      offlineEngine.removerParcela(eventoId, parcelaId);
      return;
    }
    try {
      await api.delete(`/eventos/${eventoId}/parcelas/${parcelaId}`);
      notificarStatusConexao(true);
      offlineEngine.removerParcela(eventoId, parcelaId);
    } catch {
      notificarStatusConexao(false);
      offlineEngine.removerParcela(eventoId, parcelaId);
    }
  },
};

// Módulo G: Biblioteca de Playbacks (VS) & Violino Solo
export const playbacksService = {
  listar: async (params?: {
    search?: string;
    momento?: string;
    apenas_favoritos?: boolean;
  }): Promise<PlaybackBiblioteca[]> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.listarPlaybacks(params);
    }
    try {
      const { data } = await api.get<PlaybackBiblioteca[]>('/playbacks', { params });
      notificarStatusConexao(true);
      if (!params?.search && !params?.momento && !params?.apenas_favoritos) {
        espelharPlaybacksNoCache(data);
      }
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.listarPlaybacks(params);
    }
  },
  criar: async (payload: Partial<PlaybackBiblioteca>): Promise<PlaybackBiblioteca> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.criarPlayback(payload);
    }
    try {
      const { data } = await api.post<PlaybackBiblioteca>('/playbacks', payload);
      notificarStatusConexao(true);
      const db = carregarDBLocal();
      db.playbacks.push(data);
      salvarDBLocal(db);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.criarPlayback(payload);
    }
  },
  atualizar: async (
    id: number,
    payload: Partial<PlaybackBiblioteca>
  ): Promise<PlaybackBiblioteca> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return offlineEngine.atualizarPlayback(id, payload);
    }
    try {
      const { data } = await api.put<PlaybackBiblioteca>(`/playbacks/${id}`, payload);
      notificarStatusConexao(true);
      const db = carregarDBLocal();
      const idx = db.playbacks.findIndex((p) => p.id === data.id);
      if (idx >= 0) db.playbacks[idx] = data;
      salvarDBLocal(db);
      return data;
    } catch {
      notificarStatusConexao(false);
      return offlineEngine.atualizarPlayback(id, payload);
    }
  },
  remover: async (id: number): Promise<void> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      offlineEngine.removerPlayback(id);
      return;
    }
    try {
      await api.delete(`/playbacks/${id}`);
      notificarStatusConexao(true);
      offlineEngine.removerPlayback(id);
    } catch {
      notificarStatusConexao(false);
      offlineEngine.removerPlayback(id);
    }
  },
  uploadArquivo: async (file: File): Promise<UploadPlaybackResponse> => {
    if (deveUsarApenasBancoLocal()) {
      notificarStatusConexao(false);
      return arquivoParaDataUrlOffline(file);
    }
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      const { data } = await api.post<UploadPlaybackResponse>(
        '/playbacks/upload-arquivo',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      notificarStatusConexao(true);
      return data;
    } catch {
      notificarStatusConexao(false);
      return arquivoParaDataUrlOffline(file);
    }
  },
};

/**
 * Sincroniza todos os Casamentos (Visão 360º), Músicos e Playbacks do Servidor PC
 * para a memória interna do Tablet (Redmi Pad Pro) ou Celular (Poco X6),
 * garantindo que funcione 100% em Modo Avião na cerimônia.
 */
export async function puxarTudoDoServidorPC(
  servidorUrl?: string
): Promise<{ totalEventos: number; totalMusicos: number; totalPlaybacks: number }> {
  const baseUrl = servidorUrl
    ? `${servidorUrl.replace(/\/+$/, '')}/api/v1`
    : defaultApiBaseUrl;

  const client = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
  });

  const [musicosRes, playbacksRes, eventosRes] = await Promise.all([
    client.get<Musico[]>('/musicos'),
    client.get<PlaybackBiblioteca[]>('/playbacks'),
    client.get<EventoCasamento[]>('/eventos'),
  ]);

  const detalhes360: EventoCasamento360[] = [];
  for (const ev of eventosRes.data) {
    const det = await client.get<EventoCasamento360>(`/eventos/${ev.id}`);
    detalhes360.push(det.data);
  }

  const db = carregarDBLocal();
  db.musicos = musicosRes.data;
  db.playbacks = playbacksRes.data;
  db.eventos360 = detalhes360;
  salvarDBLocal(db);
  notificarStatusConexao(true);

  return {
    totalEventos: detalhes360.length,
    totalMusicos: musicosRes.data.length,
    totalPlaybacks: playbacksRes.data.length,
  };
}
