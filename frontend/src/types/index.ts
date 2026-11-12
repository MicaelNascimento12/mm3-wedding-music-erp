export type StatusMusicoEnum = 'ATIVO' | 'INATIVO';

export type FormacaoMusicalEnum =
  | 'VIOLINO_SOLO'
  | 'DUO'
  | 'TRIO'
  | 'QUARTETO'
  | 'QUINTETO'
  | 'SEXTETO'
  | 'ORQUESTRA_CAMARA'
  | 'BANDA_COMPLETA'
  | 'PERSONALIZADA';

export type StatusEventoEnum =
  | 'ORCAMENTO'
  | 'CONTRATO_ASSINADO'
  | 'EM_PREPARACAO'
  | 'REALIZADO'
  | 'CANCELADO';

export type TipoContratacaoEventoEnum = 'CONTRATO_PROPRIO' | 'FREELANCER_CACHE';

export type StatusConfirmacaoEscalaEnum = 'PENDENTE' | 'CONFIRMADO' | 'RECUSOU';

export type StatusPagamentoEnum = 'PENDENTE' | 'PAGO';

export type StatusParcelaContratoEnum = 'ABERTO' | 'PAGO' | 'ATRASADO' | 'CANCELADO';

export type TipoParcelaEnum =
  | 'SINAL_ENTRADA'
  | 'PARCELA_INTERMEDIARIA'
  | 'QUITACAO_FINAL'
  | 'ADITIVO_EXTRA';

export type FormaPagamentoEnum =
  | 'PIX'
  | 'TRANSFERENCIA_TED_DOC'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'BOLETO'
  | 'DINHEIRO';

export type MomentoCerimoniaEnum =
  | 'RECEPTIVO_CONVIDADOS'
  | 'ENTRADA_PADRINHOS'
  | 'ENTRADA_NOIVO'
  | 'ENTRADA_PAJENS_DAMAS'
  | 'ANUNCIO_CLARINS'
  | 'ENTRADA_NOIVA'
  | 'BENCAO_ALIANCAS'
  | 'COMUNHAO_HOMENAGENS'
  | 'ASSINATURA_TERMOS'
  | 'CUMPRIMENTOS'
  | 'SAIDA_NOIVOS'
  | 'POSLUDIO_SAIDA_CONVIDADOS'
  | 'OUTRO';

export interface Musico {
  id: number;
  nome_completo: string;
  instrumento_principal: string;
  instrumentos_secundarios?: string | null;
  telefone_whatsapp: string;
  email?: string | null;
  chave_pix: string;
  tipo_chave_pix?: string | null;
  valor_cache_base: string | number;
  cidade: string;
  bairro?: string | null;
  status: StatusMusicoEnum;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HistoricoEscalaMusicoItem {
  escala_id: number;
  evento_id: number;
  codigo_contrato?: string | null;
  nome_noivos: string;
  data_casamento: string;
  local_cerimonia: string;
  cidade_cerimonia: string;
  instrumento_no_evento: string;
  valor_cache_combinado: string | number;
  taxa_deslocamento_combustivel: string | number;
  valor_total_musico: string | number;
  status_confirmacao: StatusConfirmacaoEscalaEnum;
  status_pagamento: StatusPagamentoEnum;
  data_pagamento?: string | null;
  observacoes_escala?: string | null;
}

export interface HistoricoFinanceiroMusico {
  musico: Musico;
  total_casamentos_escalado: number;
  total_casamentos_confirmados: number;
  total_caches_pagos: string | number;
  saldo_pendente_a_receber: string | number;
  total_geral_acumulado: string | number;
  historico_escalas: HistoricoEscalaMusicoItem[];
}

export interface ConflitoMusicoEscalaAlerta {
  possui_conflito: boolean;
  mensagem?: string | null;
  eventos_conflitantes: string[];
}

export interface EscalaMusico {
  id: number;
  evento_id: number;
  musico_id: number;
  instrumento_no_evento: string;
  valor_cache_combinado: string | number;
  taxa_deslocamento_combustivel: string | number;
  valor_total: string | number;
  status_confirmacao: StatusConfirmacaoEscalaEnum;
  status_pagamento: StatusPagamentoEnum;
  data_pagamento?: string | null;
  comprovante_pagamento_url?: string | null;
  observacoes_escala?: string | null;
  created_at: string;
  updated_at: string;
  musico?: Musico | null;
  alerta_conflito?: ConflitoMusicoEscalaAlerta | null;
}

export interface RepertorioItem {
  id: number;
  evento_id: number;
  ordem_execucao: number;
  momento_cerimonia: MomentoCerimoniaEnum;
  descricao_momento_customizado?: string | null;
  nome_musica: string;
  artista_versao_referencia?: string | null;
  tom_musica?: string | null;
  andamento_bpm?: number | null;
  link_referencia_midia?: string | null;
  link_partitura_cifra_pdf?: string | null;
  usa_playback?: boolean;
  link_playback_url?: string | null;
  nome_arquivo_playback?: string | null;
  duracao_playback?: string | null;
  observacoes_arranjo?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybackBiblioteca {
  id: number;
  nome_musica: string;
  artista_versao?: string | null;
  tom_violino?: string | null;
  andamento_bpm?: number | null;
  duracao_formatada?: string | null;
  momento_sugerido?: MomentoCerimoniaEnum | null;
  arquivo_playback_url: string;
  nome_arquivo_original?: string | null;
  link_partitura_violino_pdf?: string | null;
  observacoes_execucao?: string | null;
  favorito: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploadPlaybackResponse {
  arquivo_url: string;
  nome_arquivo_original: string;
  tamanho_bytes: number;
}

export interface EquipamentoSomItem {
  item: string;
  quantidade: number;
  conferido: boolean;
}

export interface SonorizacaoLogistica {
  id: number;
  evento_id: number;
  necessita_som_proprio: boolean;
  lista_equipamentos: EquipamentoSomItem[];
  descricao_equipamentos_texto?: string | null;
  responsavel_tecnico_som?: string | null;
  telefone_responsavel_som?: string | null;
  custo_locacao_tecnico_som: string | number;
  status_pagamento_som: StatusPagamentoEnum;
  data_pagamento_som?: string | null;
  observacoes_logistica?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelaContrato {
  id: number;
  evento_id: number;
  numero_parcela: number;
  tipo_parcela: TipoParcelaEnum;
  descricao: string;
  valor_parcela: string | number;
  data_vencimento: string;
  data_pagamento?: string | null;
  forma_pagamento: FormaPagamentoEnum;
  status: StatusParcelaContratoEnum;
  comprovante_url?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumoFinanceiroDRE {
  evento_id: number;
  receita_bruta: string | number;
  receita_ja_recebida: string | number;
  saldo_a_receber_noivos: string | number;
  total_musicos_escalados: number;
  musicos_confirmados: number;
  custo_caches: string | number;
  custo_deslocamento: string | number;
  custo_sonorizacao: string | number;
  despesas_totais: string | number;
  total_pago_musicos: string | number;
  total_pendente_musicos: string | number;
  lucro_liquido_banda: string | number;
  margem_lucro_percentual: string | number;
}

export interface ConflitoAgendaItem {
  evento_id: number;
  codigo_contrato?: string | null;
  nome_noivos: string;
  data_casamento: string;
  horario_chegada_banda: string;
  horario_inicio_cerimonia: string;
  local_cerimonia: string;
  cidade_cerimonia: string;
  status: StatusEventoEnum;
  tipo_conflito: 'SOBREPOSICAO_DIRETA' | 'MARGEM_INFERIOR_90_MIN';
  diferenca_minutos: number;
  mensagem_detalhada: string;
}

export interface VerificacaoConflito {
  possui_conflito: boolean;
  margem_minima_recomendada_minutos: number;
  total_conflitos: number;
  conflitos: ConflitoAgendaItem[];
}

export interface EventoCasamento {
  id: number;
  codigo_contrato?: string | null;
  tipo_contratacao?: TipoContratacaoEventoEnum;
  nome_banda_contratante?: string | null;
  nome_noivos: string;
  cpf_cnpj_contratante: string;
  telefone_contato: string;
  email_contratante?: string | null;
  data_casamento: string;
  horario_inicio_cerimonia: string;
  horario_chegada_banda: string;
  local_cerimonia: string;
  endereco_completo?: string | null;
  cidade_cerimonia: string;
  estado_uf: string;
  tipo_formacao: FormacaoMusicalEnum;
  descricao_formacao?: string | null;
  status: StatusEventoEnum;
  link_arquivo_contrato_pdf?: string | null;
  valor_total_bruto: string | number;
  observacoes_gerais?: string | null;
  created_at: string;
  updated_at: string;
  resumo_financeiro?: ResumoFinanceiroDRE | null;
  alerta_conflito_agenda?: VerificacaoConflito | null;
}

export interface EventoCasamento360 extends EventoCasamento {
  escalas: EscalaMusico[];
  repertorio: RepertorioItem[];
  sonorizacao?: SonorizacaoLogistica | null;
  parcelas: ParcelaContrato[];
  resumo_financeiro: ResumoFinanceiroDRE;
}

export interface AlertaFinanceiroItem {
  tipo: 'PARCELA_NOIVOS' | 'CACHE_MUSICO' | 'SOM_LOGISTICA';
  evento_id: number;
  codigo_contrato?: string | null;
  nome_noivos: string;
  descricao: string;
  favorecido_ou_pagador: string;
  valor: string | number;
  data_referencia: string;
  status_alerta: 'ATRASADO' | 'VENCENDO_SEMANA' | 'PENDENTE';
}

export interface DashboardOverview {
  faturamento_mes: string | number;
  lucro_liquido_previsto_ano: string | number;
  receita_bruta_ano: string | number;
  despesas_totais_ano: string | number;
  total_casamentos_ano: number;
  total_casamentos_confirmados_ano: number;
  caches_pendentes_pagamento: string | number;
  quantidade_caches_pendentes: number;
  saldo_a_receber_noivos_total: string | number;
  proximos_casamentos: EventoCasamento[];
  alertas_vencimentos: AlertaFinanceiroItem[];
}
