import {
  AlertaFinanceiroItem,
  ConflitoAgendaItem,
  DashboardOverview,
  EscalaMusico,
  EventoCasamento,
  EventoCasamento360,
  HistoricoEscalaMusicoItem,
  HistoricoFinanceiroMusico,
  Musico,
  ParcelaContrato,
  PlaybackBiblioteca,
  RepertorioItem,
  ResumoFinanceiroDRE,
  SonorizacaoLogistica,
  UploadPlaybackResponse,
  VerificacaoConflito,
} from '../types';
import { obterKitEquipamentosPadrao } from '../utils/formatters';

const STORAGE_KEY_DB = 'mm3_offline_database_v1';
const STORAGE_KEY_SERVER_URL = 'mm3_remote_server_url_v1';

export interface OfflineDatabaseSchema {
  version: number;
  updatedAt: string;
  nextIds: {
    musico: number;
    evento: number;
    escala: number;
    repertorio: number;
    parcela: number;
    playback: number;
  };
  musicos: Musico[];
  eventos360: EventoCasamento360[];
  playbacks: PlaybackBiblioteca[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayDateIso(): string {
  return new Date().toISOString().split('T')[0];
}

function timeToMinutes(t: string): number {
  const parts = (t || '00:00').split(':');
  return Number(parts[0] || 0) * 60 + Number(parts[1] || 0);
}

/**
 * Calcula o DRE de um casamento 360º exatamente com a mesma regra do Backend
 */
export function recalcularDRELocal(ev: EventoCasamento360): EventoCasamento360 {
  const receitaBruta = Number(ev.valor_total_bruto || 0);
  const parcelasValidas = (ev.parcelas || []).filter((p) => p.status !== 'CANCELADO');
  const receitaJaRecebida = parcelasValidas
    .filter((p) => p.status === 'PAGO')
    .reduce((acc, p) => acc + Number(p.valor_parcela || 0), 0);
  const saldoAReceber = Math.max(0, receitaBruta - receitaJaRecebida);

  const escalasAtivas = (ev.escalas || []).filter(
    (e) => e.status_confirmacao !== 'RECUSOU'
  );
  const totalMusicosEscalados = (ev.escalas || []).length;
  const musicosConfirmados = (ev.escalas || []).filter(
    (e) => e.status_confirmacao === 'CONFIRMADO'
  ).length;

  const custoCaches = escalasAtivas.reduce(
    (acc, e) => acc + Number(e.valor_cache_combinado || 0),
    0
  );
  const custoDeslocamento = escalasAtivas.reduce(
    (acc, e) => acc + Number(e.taxa_deslocamento_combustivel || 0),
    0
  );
  const custoSonorizacao = Number(
    ev.sonorizacao?.custo_locacao_tecnico_som || 0
  );

  const despesasTotais = custoCaches + custoDeslocamento + custoSonorizacao;

  const totalPagoMusicos = escalasAtivas
    .filter((e) => e.status_pagamento === 'PAGO')
    .reduce(
      (acc, e) =>
        acc +
        Number(e.valor_cache_combinado || 0) +
        Number(e.taxa_deslocamento_combustivel || 0),
      0
    );

  const totalPendenteMusicos = escalasAtivas
    .filter((e) => e.status_pagamento === 'PENDENTE')
    .reduce(
      (acc, e) =>
        acc +
        Number(e.valor_cache_combinado || 0) +
        Number(e.taxa_deslocamento_combustivel || 0),
      0
    );

  const lucroLiquido = receitaBruta - despesasTotais;
  const margem =
    receitaBruta > 0 ? Number(((lucroLiquido / receitaBruta) * 100).toFixed(2)) : 0;

  const resumo: ResumoFinanceiroDRE = {
    evento_id: ev.id,
    receita_bruta: receitaBruta.toFixed(2),
    receita_ja_recebida: receitaJaRecebida.toFixed(2),
    saldo_a_receber_noivos: saldoAReceber.toFixed(2),
    total_musicos_escalados: totalMusicosEscalados,
    musicos_confirmados: musicosConfirmados,
    custo_caches: custoCaches.toFixed(2),
    custo_deslocamento: custoDeslocamento.toFixed(2),
    custo_sonorizacao: custoSonorizacao.toFixed(2),
    despesas_totais: despesasTotais.toFixed(2),
    total_pago_musicos: totalPagoMusicos.toFixed(2),
    total_pendente_musicos: totalPendenteMusicos.toFixed(2),
    lucro_liquido_banda: lucroLiquido.toFixed(2),
    margem_lucro_percentual: margem.toFixed(2),
  };

  ev.resumo_financeiro = resumo;
  return ev;
}

function criarSeedInicial(): OfflineDatabaseSchema {
  const ts = nowIso();
  const musicos: Musico[] = [
    {
      id: 1,
      nome_completo: 'Micael Sousa (Violino Titular)',
      instrumento_principal: 'Violino Solo & Spalla',
      instrumentos_secundarios: 'Direção Musical, Disparo de Playbacks (VS)',
      telefone_whatsapp: '11998765432',
      email: 'micael@mm3musica.com.br',
      chave_pix: '11998765432',
      tipo_chave_pix: 'TELEFONE',
      valor_cache_base: '650.00',
      cidade: 'São Paulo',
      bairro: 'Jardins',
      status: 'ATIVO',
      observacoes: 'Titular — Contratos próprios e apresentações Violino Solo + Playback.',
      created_at: ts,
      updated_at: ts,
    },
    {
      id: 2,
      nome_completo: 'Lucas Andrade',
      instrumento_principal: 'Teclado / Piano Digital',
      instrumentos_secundarios: 'Arranjos e Base',
      telefone_whatsapp: '11991234567',
      email: 'lucas.teclado@email.com',
      chave_pix: 'lucas.teclado@email.com',
      tipo_chave_pix: 'EMAIL',
      valor_cache_base: '550.00',
      cidade: 'São Paulo',
      bairro: 'Moema',
      status: 'ATIVO',
      observacoes: 'Possui piano Nord Stage próprio.',
      created_at: ts,
      updated_at: ts,
    },
    {
      id: 3,
      nome_completo: 'Helena Vasconcelos',
      instrumento_principal: 'Violoncelo',
      instrumentos_secundarios: null,
      telefone_whatsapp: '11993456789',
      email: 'helena.cello@email.com',
      chave_pix: '345.678.901-22',
      tipo_chave_pix: 'CPF',
      valor_cache_base: '550.00',
      cidade: 'São Paulo',
      bairro: 'Pinheiros',
      status: 'ATIVO',
      observacoes: null,
      created_at: ts,
      updated_at: ts,
    },
  ];

  const ev1: EventoCasamento360 = recalcularDRELocal({
    id: 1,
    codigo_contrato: 'CT-2026-001',
    tipo_contratacao: 'CONTRATO_PROPRIO',
    nome_banda_contratante: null,
    nome_noivos: 'Mariana & Rafael',
    cpf_cnpj_contratante: '321.654.987-00',
    telefone_contato: '11988887777',
    email_contratante: 'mariana.rafael@email.com',
    data_casamento: '2026-11-14',
    horario_chegada_banda: '15:00',
    horario_inicio_cerimonia: '16:30',
    local_cerimonia: 'Capela São José',
    endereco_completo: 'Av. Brigadeiro Luís Antônio, 2000',
    cidade_cerimonia: 'São Paulo',
    estado_uf: 'SP',
    tipo_formacao: 'VIOLINO_SOLO',
    descricao_formacao: 'Violino Solo + Playback (VS Profissional)',
    status: 'EM_PREPARACAO',
    valor_total_bruto: '2800.00',
    observacoes_gerais: 'Cerimônia intimista com Violino + Playback VS.',
    created_at: ts,
    updated_at: ts,
    escalas: [
      {
        id: 1,
        evento_id: 1,
        musico_id: 1,
        instrumento_no_evento: 'Violino Solo + Disparo de Playbacks (VS)',
        valor_cache_combinado: '0.00',
        taxa_deslocamento_combustivel: '60.00',
        valor_total: '60.00',
        status_confirmacao: 'CONFIRMADO',
        status_pagamento: 'PAGO',
        data_pagamento: '2026-11-01',
        observacoes_escala: 'Apresentação Eu Sozinho (Violino + Playback)',
        created_at: ts,
        updated_at: ts,
        musico: musicos[0],
      },
    ],
    repertorio: [
      {
        id: 1,
        evento_id: 1,
        ordem_execucao: 1,
        momento_cerimonia: 'ENTRADA_NOIVO',
        nome_musica: 'Viva La Vida',
        artista_versao_referencia: 'Coldplay (David Garrett Violin Version)',
        tom_musica: 'Ab Maior',
        andamento_bpm: 138,
        usa_playback: true,
        duracao_playback: '03:45',
        observacoes_arranjo: 'Iniciar playback assim que as portas fecharem para o noivo.',
        created_at: ts,
        updated_at: ts,
      },
      {
        id: 2,
        evento_id: 1,
        ordem_execucao: 2,
        momento_cerimonia: 'ENTRADA_PADRINHOS',
        nome_musica: 'Perfect',
        artista_versao_referencia: 'Ed Sheeran (Backing Track Violino)',
        tom_musica: 'G Maior',
        andamento_bpm: 95,
        usa_playback: true,
        duracao_playback: '04:10',
        observacoes_arranjo: 'Entrar no violino aos 0:08s após a introdução do piano.',
        created_at: ts,
        updated_at: ts,
      },
      {
        id: 3,
        evento_id: 1,
        ordem_execucao: 3,
        momento_cerimonia: 'ENTRADA_NOIVA',
        nome_musica: 'Marcha Nupcial + A Thousand Years',
        artista_versao_referencia: 'Christina Perri (Arranjo Violino Solo + VS)',
        tom_musica: 'Bb Maior',
        andamento_bpm: 74,
        usa_playback: true,
        duracao_playback: '04:30',
        observacoes_arranjo: 'Clarins no playback aos 0:00s; abertura da porta aos 0:15s.',
        created_at: ts,
        updated_at: ts,
      },
      {
        id: 4,
        evento_id: 1,
        ordem_execucao: 4,
        momento_cerimonia: 'BENCAO_ALIANCAS',
        nome_musica: 'Ave Maria (Schubert)',
        artista_versao_referencia: 'Arranjo Clássico Violino & Harpa VS',
        tom_musica: 'Bb Maior',
        andamento_bpm: 64,
        usa_playback: true,
        duracao_playback: '03:50',
        observacoes_arranjo: 'Fazer Fade Out suave quando os pajens entregarem as alianças.',
        created_at: ts,
        updated_at: ts,
      },
    ],
    sonorizacao: {
      id: 1,
      evento_id: 1,
      necessita_som_proprio: true,
      lista_equipamentos: obterKitEquipamentosPadrao('VIOLINO_SOLO'),
      custo_locacao_tecnico_som: '0.00',
      status_pagamento_som: 'PAGO',
      observacoes_logistica:
        'Levar Redmi Pad Pro em Modo Avião + Receptor Sem Fio Violino + Caixa Ativa.',
      created_at: ts,
      updated_at: ts,
    },
    parcelas: [
      {
        id: 1,
        evento_id: 1,
        numero_parcela: 1,
        tipo_parcela: 'SINAL_ENTRADA',
        descricao: 'Sinal de Reserva de Data (50%)',
        valor_parcela: '1400.00',
        data_vencimento: '2026-10-10',
        data_pagamento: '2026-10-10',
        forma_pagamento: 'PIX',
        status: 'PAGO',
        created_at: ts,
        updated_at: ts,
      },
      {
        id: 2,
        evento_id: 1,
        numero_parcela: 2,
        tipo_parcela: 'QUITACAO_FINAL',
        descricao: 'Quitação Final (50% - Semana do Casamento)',
        valor_parcela: '1400.00',
        data_vencimento: '2026-11-10',
        data_pagamento: null,
        forma_pagamento: 'PIX',
        status: 'ABERTO',
        created_at: ts,
        updated_at: ts,
      },
    ],
    resumo_financeiro: {} as ResumoFinanceiroDRE,
  });

  const ev2: EventoCasamento360 = recalcularDRELocal({
    id: 2,
    codigo_contrato: 'FL-2026-001',
    tipo_contratacao: 'FREELANCER_CACHE',
    nome_banda_contratante: 'Coral & Orquestra Del Chiaro',
    nome_noivos: 'Camila & Rodrigo (Freelancer)',
    cpf_cnpj_contratante: 'ISENTO-FREELANCER',
    telefone_contato: '11977776666',
    email_contratante: null,
    data_casamento: '2026-11-21',
    horario_chegada_banda: '18:00',
    horario_inicio_cerimonia: '19:30',
    local_cerimonia: 'Paróquia Nossa Senhora do Brasil',
    endereco_completo: 'Praça Nossa Senhora do Brasil, s/n',
    cidade_cerimonia: 'São Paulo',
    estado_uf: 'SP',
    tipo_formacao: 'ORQUESTRA_CAMARA',
    descricao_formacao: 'Contratado como Violino Freelancer por outra banda',
    status: 'CONFIRMADO' as any,
    valor_total_bruto: '750.00',
    observacoes_gerais: 'Traje social preto completo.',
    created_at: ts,
    updated_at: ts,
    escalas: [],
    repertorio: [],
    sonorizacao: {
      id: 2,
      evento_id: 2,
      necessita_som_proprio: false,
      lista_equipamentos: obterKitEquipamentosPadrao('FREELANCER'),
      custo_locacao_tecnico_som: '0.00',
      status_pagamento_som: 'PAGO',
      observacoes_logistica: 'Som por conta da banda contratante.',
      created_at: ts,
      updated_at: ts,
    },
    parcelas: [
      {
        id: 3,
        evento_id: 2,
        numero_parcela: 1,
        tipo_parcela: 'QUITACAO_FINAL',
        descricao: 'Cachê Freelancer — Coral & Orquestra Del Chiaro',
        valor_parcela: '750.00',
        data_vencimento: '2026-11-21',
        data_pagamento: null,
        forma_pagamento: 'PIX',
        status: 'ABERTO',
        created_at: ts,
        updated_at: ts,
      },
    ],
    resumo_financeiro: {} as ResumoFinanceiroDRE,
  });
  ev2.status = 'CONTRATO_ASSINADO';

  return {
    version: 1,
    updatedAt: ts,
    nextIds: {
      musico: 10,
      evento: 10,
      escala: 20,
      repertorio: 30,
      parcela: 20,
      playback: 20,
    },
    musicos,
    eventos360: [ev1, ev2],
    playbacks: [],
  };
}

export function carregarDBLocal(): OfflineDatabaseSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DB);
    if (!raw) {
      const seed = criarSeedInicial();
      salvarDBLocal(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as OfflineDatabaseSchema;
    if (!parsed || !Array.isArray(parsed.eventos360)) {
      const seed = criarSeedInicial();
      salvarDBLocal(seed);
      return seed;
    }
    parsed.eventos360 = parsed.eventos360.map(recalcularDRELocal);
    return parsed;
  } catch {
    const seed = criarSeedInicial();
    return seed;
  }
}

export function salvarDBLocal(db: OfflineDatabaseSchema): void {
  try {
    db.updatedAt = nowIso();
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));
  } catch (e) {
    console.error('Erro ao salvar no banco offline:', e);
  }
}

export function obterUrlServidorRemoto(): string {
  return localStorage.getItem(STORAGE_KEY_SERVER_URL) || '';
}

export function salvarUrlServidorRemoto(url: string): void {
  const limpa = url.trim().replace(/\/+$/, '');
  if (!limpa) {
    localStorage.removeItem(STORAGE_KEY_SERVER_URL);
  } else {
    localStorage.setItem(STORAGE_KEY_SERVER_URL, limpa);
  }
}

/**
 * Converte um arquivo de áudio (MP3/WAV) para DataURL para funcionar offline no tablet/celular
 */
export function arquivoParaDataUrlOffline(file: File): Promise<UploadPlaybackResponse> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        arquivo_url: String(reader.result || ''),
        nome_arquivo_original: file.name,
        tamanho_bytes: file.size,
      });
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de áudio.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Atualiza o espelho local sempre que o backend responde com sucesso
 */
export function espelharEvento360NoCache(ev: EventoCasamento360): void {
  const db = carregarDBLocal();
  const idx = db.eventos360.findIndex((x) => x.id === ev.id);
  const recalculado = recalcularDRELocal(ev);
  if (idx >= 0) {
    db.eventos360[idx] = recalculado;
  } else {
    db.eventos360.push(recalculado);
  }
  if (ev.id >= db.nextIds.evento) db.nextIds.evento = ev.id + 1;
  salvarDBLocal(db);
}

export function espelharMusicosNoCache(lista: Musico[]): void {
  const db = carregarDBLocal();
  db.musicos = lista;
  const maxId = lista.reduce((m, x) => Math.max(m, x.id), 0);
  if (maxId >= db.nextIds.musico) db.nextIds.musico = maxId + 1;
  salvarDBLocal(db);
}

export function espelharPlaybacksNoCache(lista: PlaybackBiblioteca[]): void {
  const db = carregarDBLocal();
  db.playbacks = lista;
  const maxId = lista.reduce((m, x) => Math.max(m, x.id), 0);
  if (maxId >= db.nextIds.playback) db.nextIds.playback = maxId + 1;
  salvarDBLocal(db);
}

/**
 * Exporta todo o banco de dados local como arquivo .json para enviar entre PC, Tablet e Celular
 */
export function exportarBackupCompletoJSON(): void {
  const db = carregarDBLocal();
  const conteudo = JSON.stringify(db, null, 2);
  const blob = new Blob([conteudo], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dataHoje = todayDateIso();
  link.href = url;
  link.setAttribute('download', `backup-casamentos-${dataHoje}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importarBackupCompletoJSON(file: File): Promise<OfflineDatabaseSchema> {
  const texto = await file.text();
  const parsed = JSON.parse(texto) as OfflineDatabaseSchema;
  if (!parsed || !Array.isArray(parsed.eventos360) || !Array.isArray(parsed.musicos)) {
    throw new Error('Arquivo de backup inválido.');
  }
  parsed.eventos360 = parsed.eventos360.map(recalcularDRELocal);
  salvarDBLocal(parsed);
  return parsed;
}

// ============================================================================
// OPERAÇÕES LOCAIS (EXECUTADAS QUANDO OFFLINE / MODO AVIÃO NO TABLET & CELULAR)
// ============================================================================
export const offlineEngine = {
  obterDashboard(params?: { mes?: number; ano?: number }): DashboardOverview {
    const db = carregarDBLocal();
    const mes = params?.mes || new Date().getMonth() + 1;
    const ano = params?.ano || new Date().getFullYear();

    const ativosAno = db.eventos360.filter(
      (ev) =>
        ev.status !== 'CANCELADO' && Number(ev.data_casamento.split('-')[0]) === ano
    );
    const ativosMes = ativosAno.filter(
      (ev) => Number(ev.data_casamento.split('-')[1]) === mes
    );

    const faturamentoMes = ativosMes.reduce(
      (acc, ev) => acc + Number(ev.valor_total_bruto || 0),
      0
    );
    const receitaBrutaAno = ativosAno.reduce(
      (acc, ev) => acc + Number(ev.valor_total_bruto || 0),
      0
    );
    const despesasTotaisAno = ativosAno.reduce(
      (acc, ev) => acc + Number(ev.resumo_financeiro?.despesas_totais || 0),
      0
    );
    const lucroLiquidoAno = receitaBrutaAno - despesasTotaisAno;

    let cachesPendentes = 0;
    let qtdCachesPendentes = 0;
    let parcelasAReceber = 0;
    const alertas: AlertaFinanceiroItem[] = [];
    const hoje = todayDateIso();

    for (const ev of db.eventos360) {
      if (ev.status === 'CANCELADO') continue;
      for (const esc of ev.escalas || []) {
        if (esc.status_confirmacao !== 'RECUSOU' && esc.status_pagamento === 'PENDENTE') {
          const val =
            Number(esc.valor_cache_combinado || 0) +
            Number(esc.taxa_deslocamento_combustivel || 0);
          cachesPendentes += val;
          qtdCachesPendentes += 1;
          alertas.push({
            tipo: 'CACHE_MUSICO',
            evento_id: ev.id,
            codigo_contrato: ev.codigo_contrato,
            nome_noivos: ev.nome_noivos,
            descricao: `Cachê pendente (${esc.instrumento_no_evento})`,
            favorecido_ou_pagador: esc.musico?.nome_completo || 'Músico',
            valor: val.toFixed(2),
            data_referencia: ev.data_casamento,
            status_alerta: ev.data_casamento < hoje ? 'ATRASADO' : 'PENDENTE',
          });
        }
      }
      for (const p of ev.parcelas || []) {
        if (p.status === 'ABERTO' || p.status === 'ATRASADO') {
          const val = Number(p.valor_parcela || 0);
          parcelasAReceber += val;
          const isFl = ev.tipo_contratacao === 'FREELANCER_CACHE';
          alertas.push({
            tipo: 'PARCELA_NOIVOS',
            evento_id: ev.id,
            codigo_contrato: ev.codigo_contrato,
            nome_noivos: ev.nome_noivos,
            descricao: p.descricao,
            favorecido_ou_pagador: isFl
              ? `${ev.nome_banda_contratante || 'Banda Contratante'} (Cachê Freelancer)`
              : ev.nome_noivos,
            valor: val.toFixed(2),
            data_referencia: p.data_vencimento,
            status_alerta: p.data_vencimento < hoje ? 'ATRASADO' : 'PENDENTE',
          });
        }
      }
    }

    const proximos = [...db.eventos360]
      .filter((e) => e.status !== 'CANCELADO')
      .sort((a, b) => a.data_casamento.localeCompare(b.data_casamento))
      .slice(0, 6);

    return {
      faturamento_mes: faturamentoMes.toFixed(2),
      receita_bruta_ano: receitaBrutaAno.toFixed(2),
      despesas_totais_ano: despesasTotaisAno.toFixed(2),
      lucro_liquido_previsto_ano: lucroLiquidoAno.toFixed(2),
      total_casamentos_ano: ativosAno.length,
      total_casamentos_confirmados_ano: ativosAno.filter((e) => e.status !== 'ORCAMENTO').length,
      caches_pendentes_pagamento: cachesPendentes.toFixed(2),
      quantidade_caches_pendentes: qtdCachesPendentes,
      saldo_a_receber_noivos_total: parcelasAReceber.toFixed(2),
      proximos_casamentos: proximos,
      alertas_vencimentos: alertas.slice(0, 12),
    };
  },

  obterMusico(id: number): Musico {
    const db = carregarDBLocal();
    const m = db.musicos.find((x) => x.id === id);
    if (!m) throw new Error('Músico não encontrado.');
    return m;
  },

  listarMusicos(params?: { search?: string; instrumento?: string; status?: string }): Musico[] {
    const db = carregarDBLocal();
    return db.musicos.filter((m) => {
      if (params?.status && m.status !== params.status) return false;
      if (
        params?.instrumento &&
        !m.instrumento_principal.toLowerCase().includes(params.instrumento.toLowerCase())
      ) {
        return false;
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        const match =
          m.nome_completo.toLowerCase().includes(q) ||
          m.instrumento_principal.toLowerCase().includes(q) ||
          m.cidade.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  },

  obterHistoricoMusico(musicoId: number): HistoricoFinanceiroMusico {
    const db = carregarDBLocal();
    const musico = db.musicos.find((m) => m.id === musicoId);
    if (!musico) throw new Error('Músico não encontrado.');

    const historico: HistoricoEscalaMusicoItem[] = [];
    let pagos = 0;
    let pendentes = 0;
    let confirmados = 0;

    for (const ev of db.eventos360) {
      for (const esc of ev.escalas || []) {
        if (esc.musico_id === musicoId) {
          const total =
            Number(esc.valor_cache_combinado || 0) +
            Number(esc.taxa_deslocamento_combustivel || 0);
          if (esc.status_confirmacao === 'CONFIRMADO') confirmados += 1;
          if (esc.status_pagamento === 'PAGO') pagos += total;
          else pendentes += total;

          historico.push({
            escala_id: esc.id,
            evento_id: ev.id,
            codigo_contrato: ev.codigo_contrato,
            nome_noivos: ev.nome_noivos,
            data_casamento: ev.data_casamento,
            local_cerimonia: ev.local_cerimonia,
            cidade_cerimonia: ev.cidade_cerimonia,
            instrumento_no_evento: esc.instrumento_no_evento,
            valor_cache_combinado: esc.valor_cache_combinado,
            taxa_deslocamento_combustivel: esc.taxa_deslocamento_combustivel,
            valor_total_musico: total.toFixed(2),
            status_confirmacao: esc.status_confirmacao,
            status_pagamento: esc.status_pagamento,
            data_pagamento: esc.data_pagamento,
            observacoes_escala: esc.observacoes_escala,
          });
        }
      }
    }

    return {
      musico,
      total_casamentos_escalado: historico.length,
      total_casamentos_confirmados: confirmados,
      total_caches_pagos: pagos.toFixed(2),
      saldo_pendente_a_receber: pendentes.toFixed(2),
      total_geral_acumulado: (pagos + pendentes).toFixed(2),
      historico_escalas: historico,
    };
  },

  criarMusico(payload: Partial<Musico>): Musico {
    const db = carregarDBLocal();
    const ts = nowIso();
    const novo: Musico = {
      id: db.nextIds.musico++,
      nome_completo: payload.nome_completo || 'Novo Músico',
      instrumento_principal: payload.instrumento_principal || 'Violino',
      instrumentos_secundarios: payload.instrumentos_secundarios || null,
      telefone_whatsapp: payload.telefone_whatsapp || '',
      email: payload.email || null,
      chave_pix: payload.chave_pix || '',
      tipo_chave_pix: payload.tipo_chave_pix || 'TELEFONE',
      valor_cache_base: String(payload.valor_cache_base ?? '450.00'),
      cidade: payload.cidade || 'São Paulo',
      bairro: payload.bairro || null,
      status: payload.status || 'ATIVO',
      observacoes: payload.observacoes || null,
      created_at: ts,
      updated_at: ts,
    };
    db.musicos.push(novo);
    salvarDBLocal(db);
    return novo;
  },

  atualizarMusico(id: number, payload: Partial<Musico>): Musico {
    const db = carregarDBLocal();
    const idx = db.musicos.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error('Músico não encontrado.');
    db.musicos[idx] = {
      ...db.musicos[idx],
      ...payload,
      updated_at: nowIso(),
    };
    salvarDBLocal(db);
    return db.musicos[idx];
  },

  removerMusico(id: number): void {
    const db = carregarDBLocal();
    db.musicos = db.musicos.filter((m) => m.id !== id);
    for (const ev of db.eventos360) {
      ev.escalas = (ev.escalas || []).filter((e) => e.musico_id !== id);
      recalcularDRELocal(ev);
    }
    salvarDBLocal(db);
  },

  verificarConflito(params: {
    data_casamento: string;
    horario_chegada_banda: string;
    horario_inicio_cerimonia: string;
    exclude_evento_id?: number;
  }): VerificacaoConflito {
    const db = carregarDBLocal();
    const doDia = db.eventos360.filter(
      (ev) =>
        ev.status !== 'CANCELADO' &&
        ev.data_casamento === params.data_casamento &&
        ev.id !== params.exclude_evento_id
    );

    const startA = timeToMinutes(params.horario_chegada_banda);
    const endA = timeToMinutes(params.horario_inicio_cerimonia) + 120;
    const conflitos: ConflitoAgendaItem[] = [];

    for (const ev of doDia) {
      const startB = timeToMinutes(ev.horario_chegada_banda);
      const endB = timeToMinutes(ev.horario_inicio_cerimonia) + 120;
      if (startA < endB && startB < endA) {
        conflitos.push({
          evento_id: ev.id,
          codigo_contrato: ev.codigo_contrato,
          nome_noivos: ev.nome_noivos,
          data_casamento: ev.data_casamento,
          horario_chegada_banda: ev.horario_chegada_banda,
          horario_inicio_cerimonia: ev.horario_inicio_cerimonia,
          local_cerimonia: ev.local_cerimonia,
          cidade_cerimonia: ev.cidade_cerimonia,
          status: ev.status,
          tipo_conflito: 'SOBREPOSICAO_DIRETA',
          diferenca_minutos: -30,
          mensagem_detalhada: `Sobreposição direta de horário com o casamento de ${ev.nome_noivos} (Chegada: ${ev.horario_chegada_banda.slice(
            0,
            5
          )} | Início: ${ev.horario_inicio_cerimonia.slice(0, 5)}).`,
        });
      }
    }

    return {
      possui_conflito: conflitos.length > 0,
      margem_minima_recomendada_minutos: 90,
      total_conflitos: conflitos.length,
      conflitos,
    };
  },

  listarEventos(params?: {
    mes?: number;
    ano?: number;
    status?: string;
    tipo_formacao?: string;
    tipo_contratacao?: string;
    search?: string;
  }): EventoCasamento[] {
    const db = carregarDBLocal();
    return db.eventos360
      .map(recalcularDRELocal)
      .filter((ev) => {
        const [anoStr, mesStr] = ev.data_casamento.split('-');
        if (params?.ano && Number(anoStr) !== Number(params.ano)) return false;
        if (params?.mes && Number(mesStr) !== Number(params.mes)) return false;
        if (params?.status && ev.status !== params.status) return false;
        if (params?.tipo_formacao && ev.tipo_formacao !== params.tipo_formacao) return false;
        if (
          params?.tipo_contratacao &&
          (ev.tipo_contratacao || 'CONTRATO_PROPRIO') !== params.tipo_contratacao
        ) {
          return false;
        }
        if (params?.search) {
          const q = params.search.toLowerCase();
          const match =
            ev.nome_noivos.toLowerCase().includes(q) ||
            ev.local_cerimonia.toLowerCase().includes(q) ||
            (ev.nome_banda_contratante || '').toLowerCase().includes(q) ||
            (ev.codigo_contrato || '').toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => a.data_casamento.localeCompare(b.data_casamento));
  },

  obterEvento360(id: number): EventoCasamento360 {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((x) => x.id === id);
    if (!ev) throw new Error('Casamento não encontrado.');
    return recalcularDRELocal(ev);
  },

  criarEvento(
    payload: Partial<EventoCasamento> & { status_cache_freelancer?: 'ABERTO' | 'PAGO' }
  ): EventoCasamento360 {
    const db = carregarDBLocal();
    const ts = nowIso();
    const novoId = db.nextIds.evento++;
    const isFl = payload.tipo_contratacao === 'FREELANCER_CACHE';
    const isSolo = payload.tipo_formacao === 'VIOLINO_SOLO';
    const prefix = isFl ? 'FL' : 'CT';
    const ano = (payload.data_casamento || '2026').split('-')[0];
    const codigo =
      payload.codigo_contrato || `${prefix}-${ano}-${String(novoId).padStart(3, '0')}`;
    const bruto = Number(payload.valor_total_bruto || 0);

    const parcelas: ParcelaContrato[] = [];
    if (bruto > 0) {
      if (isFl) {
        const jaPago = payload.status_cache_freelancer === 'PAGO';
        parcelas.push({
          id: db.nextIds.parcela++,
          evento_id: novoId,
          numero_parcela: 1,
          tipo_parcela: 'QUITACAO_FINAL',
          descricao: `Cachê Freelancer — ${payload.nome_banda_contratante || 'Banda Contratante'}`,
          valor_parcela: bruto.toFixed(2),
          data_vencimento: payload.data_casamento || todayDateIso(),
          data_pagamento: jaPago ? todayDateIso() : null,
          forma_pagamento: 'PIX',
          status: jaPago ? 'PAGO' : 'ABERTO',
          created_at: ts,
          updated_at: ts,
        });
      } else {
        const metade = (bruto / 2).toFixed(2);
        parcelas.push(
          {
            id: db.nextIds.parcela++,
            evento_id: novoId,
            numero_parcela: 1,
            tipo_parcela: 'SINAL_ENTRADA',
            descricao: 'Sinal de Reserva de Data (50%)',
            valor_parcela: metade,
            data_vencimento: todayDateIso(),
            data_pagamento: todayDateIso(),
            forma_pagamento: 'PIX',
            status: 'PAGO',
            created_at: ts,
            updated_at: ts,
          },
          {
            id: db.nextIds.parcela++,
            evento_id: novoId,
            numero_parcela: 2,
            tipo_parcela: 'QUITACAO_FINAL',
            descricao: 'Quitação Final até 7 dias antes da Cerimônia (50%)',
            valor_parcela: (bruto - Number(metade)).toFixed(2),
            data_vencimento: payload.data_casamento || todayDateIso(),
            data_pagamento: null,
            forma_pagamento: 'PIX',
            status: 'ABERTO',
            created_at: ts,
            updated_at: ts,
          }
        );
      }
    }

    const tipoKit = isFl ? 'FREELANCER' : isSolo ? 'VIOLINO_SOLO' : 'BANDA_COMPLETA';

    const novoEv: EventoCasamento360 = recalcularDRELocal({
      id: novoId,
      codigo_contrato: codigo,
      tipo_contratacao: payload.tipo_contratacao || 'CONTRATO_PROPRIO',
      nome_banda_contratante: payload.nome_banda_contratante || null,
      nome_noivos: payload.nome_noivos || 'Novo Casamento',
      cpf_cnpj_contratante: payload.cpf_cnpj_contratante || '000.000.000-00',
      telefone_contato: payload.telefone_contato || '',
      email_contratante: payload.email_contratante || null,
      data_casamento: payload.data_casamento || todayDateIso(),
      horario_chegada_banda: payload.horario_chegada_banda || '15:00',
      horario_inicio_cerimonia: payload.horario_inicio_cerimonia || '16:30',
      local_cerimonia: payload.local_cerimonia || '',
      endereco_completo: payload.endereco_completo || null,
      cidade_cerimonia: payload.cidade_cerimonia || 'São Paulo',
      estado_uf: payload.estado_uf || 'SP',
      tipo_formacao: payload.tipo_formacao || 'VIOLINO_SOLO',
      descricao_formacao: payload.descricao_formacao || null,
      status: payload.status || 'CONTRATO_ASSINADO',
      link_arquivo_contrato_pdf: payload.link_arquivo_contrato_pdf || null,
      valor_total_bruto: bruto.toFixed(2),
      observacoes_gerais: payload.observacoes_gerais || null,
      created_at: ts,
      updated_at: ts,
      escalas: [],
      repertorio: [],
      sonorizacao: {
        id: novoId,
        evento_id: novoId,
        necessita_som_proprio: !isFl,
        lista_equipamentos: obterKitEquipamentosPadrao(tipoKit),
        custo_locacao_tecnico_som: '0.00',
        status_pagamento_som: 'PENDENTE',
        created_at: ts,
        updated_at: ts,
      },
      parcelas,
      resumo_financeiro: {} as ResumoFinanceiroDRE,
    });

    db.eventos360.push(novoEv);
    salvarDBLocal(db);
    return novoEv;
  },

  atualizarEvento(id: number, payload: Partial<EventoCasamento>): EventoCasamento360 {
    const db = carregarDBLocal();
    const idx = db.eventos360.findIndex((e) => e.id === id);
    if (idx < 0) throw new Error('Casamento não encontrado.');
    db.eventos360[idx] = recalcularDRELocal({
      ...db.eventos360[idx],
      ...payload,
      resumo_financeiro: db.eventos360[idx].resumo_financeiro,
      valor_total_bruto:
        payload.valor_total_bruto !== undefined
          ? Number(payload.valor_total_bruto).toFixed(2)
          : db.eventos360[idx].valor_total_bruto,
      updated_at: nowIso(),
    });
    salvarDBLocal(db);
    return db.eventos360[idx];
  },

  removerEvento(id: number): void {
    const db = carregarDBLocal();
    db.eventos360 = db.eventos360.filter((e) => e.id !== id);
    salvarDBLocal(db);
  },

  confirmarCacheFreelancer(id: number): EventoCasamento360 {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === id);
    if (!ev) throw new Error('Casamento não encontrado.');
    const ts = nowIso();
    const hoje = todayDateIso();
    if (!ev.parcelas || ev.parcelas.length === 0) {
      ev.parcelas = [
        {
          id: db.nextIds.parcela++,
          evento_id: ev.id,
          numero_parcela: 1,
          tipo_parcela: 'QUITACAO_FINAL',
          descricao: `Cachê Freelancer — ${ev.nome_banda_contratante || 'Banda Contratante'}`,
          valor_parcela: String(ev.valor_total_bruto),
          data_vencimento: ev.data_casamento,
          data_pagamento: hoje,
          forma_pagamento: 'PIX',
          status: 'PAGO',
          created_at: ts,
          updated_at: ts,
        },
      ];
    } else {
      ev.parcelas = ev.parcelas.map((p) => ({
        ...p,
        status: 'PAGO',
        data_pagamento: hoje,
        updated_at: ts,
      }));
    }
    recalcularDRELocal(ev);
    salvarDBLocal(db);
    return ev;
  },

  adicionarEscala(
    eventoId: number,
    payload: {
      musico_id: number;
      instrumento_no_evento?: string;
      valor_cache_combinado?: number;
      taxa_deslocamento_combustivel?: number;
      status_confirmacao?: any;
      observacoes_escala?: string;
    }
  ): EscalaMusico {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) throw new Error('Casamento não encontrado.');
    const mus = db.musicos.find((m) => m.id === payload.musico_id) || null;
    const cache = Number(payload.valor_cache_combinado ?? mus?.valor_cache_base ?? 0);
    const desloc = Number(payload.taxa_deslocamento_combustivel ?? 0);
    const ts = nowIso();

    const nova: EscalaMusico = {
      id: db.nextIds.escala++,
      evento_id: eventoId,
      musico_id: payload.musico_id,
      instrumento_no_evento:
        payload.instrumento_no_evento || mus?.instrumento_principal || 'Músico',
      valor_cache_combinado: cache.toFixed(2),
      taxa_deslocamento_combustivel: desloc.toFixed(2),
      valor_total: (cache + desloc).toFixed(2),
      status_confirmacao: payload.status_confirmacao || 'CONFIRMADO',
      status_pagamento: 'PENDENTE',
      data_pagamento: null,
      observacoes_escala: payload.observacoes_escala || null,
      created_at: ts,
      updated_at: ts,
      musico: mus,
    };
    ev.escalas.push(nova);
    recalcularDRELocal(ev);
    salvarDBLocal(db);
    return nova;
  },

  atualizarEscala(
    eventoId: number,
    escalaId: number,
    payload: Partial<EscalaMusico>
  ): EscalaMusico {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) throw new Error('Casamento não encontrado.');
    const idx = ev.escalas.findIndex((x) => x.id === escalaId);
    if (idx < 0) throw new Error('Escala não encontrada.');

    const atual = ev.escalas[idx];
    const cache =
      payload.valor_cache_combinado !== undefined
        ? Number(payload.valor_cache_combinado)
        : Number(atual.valor_cache_combinado);
    const desloc =
      payload.taxa_deslocamento_combustivel !== undefined
        ? Number(payload.taxa_deslocamento_combustivel)
        : Number(atual.taxa_deslocamento_combustivel);

    ev.escalas[idx] = {
      ...atual,
      ...payload,
      valor_cache_combinado: cache.toFixed(2),
      taxa_deslocamento_combustivel: desloc.toFixed(2),
      valor_total: (cache + desloc).toFixed(2),
      data_pagamento:
        payload.status_pagamento === 'PENDENTE'
          ? null
          : payload.status_pagamento === 'PAGO'
          ? atual.data_pagamento || todayDateIso()
          : atual.data_pagamento,
      updated_at: nowIso(),
    };
    recalcularDRELocal(ev);
    salvarDBLocal(db);
    return ev.escalas[idx];
  },

  baixarPagamentoEscala(
    eventoId: number,
    escalaId: number,
    payload?: { data_pagamento?: string; observacoes_escala?: string }
  ): EscalaMusico {
    return this.atualizarEscala(eventoId, escalaId, {
      status_pagamento: 'PAGO',
      data_pagamento: payload?.data_pagamento || todayDateIso(),
      ...(payload?.observacoes_escala ? { observacoes_escala: payload.observacoes_escala } : {}),
    });
  },

  removerEscala(eventoId: number, escalaId: number): void {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) return;
    ev.escalas = ev.escalas.filter((x) => x.id !== escalaId);
    recalcularDRELocal(ev);
    salvarDBLocal(db);
  },

  adicionarRepertorio(
    eventoId: number,
    payload: Partial<RepertorioItem>
  ): RepertorioItem {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) throw new Error('Casamento não encontrado.');
    const ts = nowIso();
    const novo: RepertorioItem = {
      id: db.nextIds.repertorio++,
      evento_id: eventoId,
      ordem_execucao: ev.repertorio.length + 1,
      momento_cerimonia: payload.momento_cerimonia || 'ENTRADA_NOIVA',
      nome_musica: payload.nome_musica || 'Nova Música',
      artista_versao_referencia: payload.artista_versao_referencia || null,
      tom_musica: payload.tom_musica || null,
      andamento_bpm: payload.andamento_bpm || null,
      usa_playback: Boolean(payload.usa_playback || payload.link_playback_url),
      link_playback_url: payload.link_playback_url || null,
      nome_arquivo_playback: payload.nome_arquivo_playback || null,
      duracao_playback: payload.duracao_playback || null,
      link_referencia_midia: payload.link_referencia_midia || null,
      link_partitura_cifra_pdf: payload.link_partitura_cifra_pdf || null,
      observacoes_arranjo: payload.observacoes_arranjo || null,
      created_at: ts,
      updated_at: ts,
    };
    ev.repertorio.push(novo);
    salvarDBLocal(db);
    return novo;
  },

  atualizarRepertorio(
    eventoId: number,
    itemId: number,
    payload: Partial<RepertorioItem>
  ): RepertorioItem {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) throw new Error('Casamento não encontrado.');
    const idx = ev.repertorio.findIndex((r) => r.id === itemId);
    if (idx < 0) throw new Error('Música não encontrada.');
    ev.repertorio[idx] = {
      ...ev.repertorio[idx],
      ...payload,
      updated_at: nowIso(),
    };
    salvarDBLocal(db);
    return ev.repertorio[idx];
  },

  reordenarRepertorio(
    eventoId: number,
    itens: { id: number; ordem_execucao: number }[]
  ): RepertorioItem[] {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) throw new Error('Casamento não encontrado.');
    for (const item of itens) {
      const alvo = ev.repertorio.find((r) => r.id === item.id);
      if (alvo) alvo.ordem_execucao = item.ordem_execucao;
    }
    ev.repertorio.sort((a, b) => a.ordem_execucao - b.ordem_execucao);
    salvarDBLocal(db);
    return ev.repertorio;
  },

  removerRepertorio(eventoId: number, itemId: number): void {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) return;
    ev.repertorio = ev.repertorio
      .filter((r) => r.id !== itemId)
      .map((r, i) => ({ ...r, ordem_execucao: i + 1 }));
    salvarDBLocal(db);
  },

  atualizarSonorizacao(
    eventoId: number,
    payload: Partial<SonorizacaoLogistica>
  ): SonorizacaoLogistica {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) throw new Error('Casamento não encontrado.');
    const ts = nowIso();
    ev.sonorizacao = {
      ...(ev.sonorizacao || {
        id: eventoId,
        evento_id: eventoId,
        necessita_som_proprio: true,
        lista_equipamentos: [],
        custo_locacao_tecnico_som: '0.00',
        status_pagamento_som: 'PENDENTE',
        created_at: ts,
      }),
      ...payload,
      custo_locacao_tecnico_som:
        payload.custo_locacao_tecnico_som !== undefined
          ? Number(payload.custo_locacao_tecnico_som).toFixed(2)
          : ev.sonorizacao?.custo_locacao_tecnico_som || '0.00',
      updated_at: ts,
    };
    recalcularDRELocal(ev);
    salvarDBLocal(db);
    return ev.sonorizacao;
  },

  adicionarParcela(
    eventoId: number,
    payload: Partial<ParcelaContrato>
  ): ParcelaContrato {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) throw new Error('Casamento não encontrado.');
    const ts = nowIso();
    const nova: ParcelaContrato = {
      id: db.nextIds.parcela++,
      evento_id: eventoId,
      numero_parcela: (ev.parcelas?.length || 0) + 1,
      tipo_parcela: payload.tipo_parcela || 'PARCELA_INTERMEDIARIA',
      descricao: payload.descricao || 'Parcela',
      valor_parcela: Number(payload.valor_parcela || 0).toFixed(2),
      data_vencimento: payload.data_vencimento || todayDateIso(),
      data_pagamento: payload.status === 'PAGO' ? todayDateIso() : null,
      forma_pagamento: payload.forma_pagamento || 'PIX',
      status: payload.status || 'ABERTO',
      created_at: ts,
      updated_at: ts,
    };
    ev.parcelas.push(nova);
    recalcularDRELocal(ev);
    salvarDBLocal(db);
    return nova;
  },

  atualizarParcela(
    eventoId: number,
    parcelaId: number,
    payload: Partial<ParcelaContrato>
  ): ParcelaContrato {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) throw new Error('Casamento não encontrado.');
    const idx = ev.parcelas.findIndex((p) => p.id === parcelaId);
    if (idx < 0) throw new Error('Parcela não encontrada.');

    const atual = ev.parcelas[idx];
    ev.parcelas[idx] = {
      ...atual,
      ...payload,
      valor_parcela:
        payload.valor_parcela !== undefined
          ? Number(payload.valor_parcela).toFixed(2)
          : atual.valor_parcela,
      data_pagamento:
        payload.status === 'ABERTO'
          ? null
          : payload.status === 'PAGO'
          ? atual.data_pagamento || todayDateIso()
          : atual.data_pagamento,
      updated_at: nowIso(),
    };
    recalcularDRELocal(ev);
    salvarDBLocal(db);
    return ev.parcelas[idx];
  },

  baixarPagamentoParcela(
    eventoId: number,
    parcelaId: number,
    payload?: { forma_pagamento?: any; observacoes?: string }
  ): ParcelaContrato {
    return this.atualizarParcela(eventoId, parcelaId, {
      status: 'PAGO',
      data_pagamento: todayDateIso(),
      ...(payload?.forma_pagamento ? { forma_pagamento: payload.forma_pagamento } : {}),
      ...(payload?.observacoes ? { observacoes: payload.observacoes } : {}),
    });
  },

  removerParcela(eventoId: number, parcelaId: number): void {
    const db = carregarDBLocal();
    const ev = db.eventos360.find((e) => e.id === eventoId);
    if (!ev) return;
    ev.parcelas = ev.parcelas
      .filter((p) => p.id !== parcelaId)
      .map((p, i) => ({ ...p, numero_parcela: i + 1 }));
    recalcularDRELocal(ev);
    salvarDBLocal(db);
  },

  listarPlaybacks(params?: {
    search?: string;
    momento?: string;
    apenas_favoritos?: boolean;
  }): PlaybackBiblioteca[] {
    const db = carregarDBLocal();
    return db.playbacks.filter((pb) => {
      if (params?.apenas_favoritos && !pb.favorito) return false;
      if (params?.momento && pb.momento_sugerido !== params.momento) return false;
      if (params?.search) {
        const q = params.search.toLowerCase();
        const match =
          pb.nome_musica.toLowerCase().includes(q) ||
          (pb.artista_versao || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  },

  criarPlayback(payload: Partial<PlaybackBiblioteca>): PlaybackBiblioteca {
    const db = carregarDBLocal();
    const ts = nowIso();
    const novo: PlaybackBiblioteca = {
      id: db.nextIds.playback++,
      nome_musica: payload.nome_musica || 'Novo Playback',
      artista_versao: payload.artista_versao || null,
      tom_violino: payload.tom_violino || null,
      andamento_bpm: payload.andamento_bpm || null,
      duracao_formatada: payload.duracao_formatada || null,
      momento_sugerido: payload.momento_sugerido || null,
      arquivo_playback_url: payload.arquivo_playback_url || '',
      nome_arquivo_original: payload.nome_arquivo_original || null,
      link_partitura_violino_pdf: payload.link_partitura_violino_pdf || null,
      observacoes_execucao: payload.observacoes_execucao || null,
      favorito: payload.favorito ?? true,
      created_at: ts,
      updated_at: ts,
    };
    db.playbacks.push(novo);
    salvarDBLocal(db);
    return novo;
  },

  atualizarPlayback(id: number, payload: Partial<PlaybackBiblioteca>): PlaybackBiblioteca {
    const db = carregarDBLocal();
    const idx = db.playbacks.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error('Playback não encontrado.');
    db.playbacks[idx] = {
      ...db.playbacks[idx],
      ...payload,
      updated_at: nowIso(),
    };
    salvarDBLocal(db);
    return db.playbacks[idx];
  },

  removerPlayback(id: number): void {
    const db = carregarDBLocal();
    db.playbacks = db.playbacks.filter((p) => p.id !== id);
    salvarDBLocal(db);
  },
};
