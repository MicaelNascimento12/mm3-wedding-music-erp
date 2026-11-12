import {
  EquipamentoSomItem,
  FormacaoMusicalEnum,
  MomentoCerimoniaEnum,
  StatusConfirmacaoEscalaEnum,
  StatusEventoEnum,
  StatusParcelaContratoEnum,
  TipoContratacaoEventoEnum,
  TipoParcelaEnum,
  FormaPagamentoEnum,
} from '../types';

export function formatCurrency(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatTimeShort(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  return timeStr.slice(0, 5);
}

export function buildWhatsAppUrl(phone: string, customMessage?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  const textParam = customMessage ? `?text=${encodeURIComponent(customMessage)}` : '';
  return `https://wa.me/${normalized}${textParam}`;
}

export const FORMACAO_LABELS: Record<FormacaoMusicalEnum, string> = {
  VIOLINO_SOLO: 'Violino Solo + Playback (VS)',
  DUO: 'Duo Musical',
  TRIO: 'Trio Clássico / Pop',
  QUARTETO: 'Quarteto de Cordas & Teclado',
  QUINTETO: 'Quinteto Musical',
  SEXTETO: 'Sexteto com Clarins & Voz',
  ORQUESTRA_CAMARA: 'Orquestra de Câmara',
  BANDA_COMPLETA: 'Banda Completa Cerimônia & Festa',
  PERSONALIZADA: 'Formação Personalizada',
};

export function resolvePlaybackUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  try {
    const remoteServer = localStorage.getItem('mm3_servidor_remoto_url_v1');
    if (remoteServer) {
      const cleanOrigin = remoteServer.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
      return `${cleanOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
  } catch {
    // ignore storage errors
  }
  const customApiUrl = import.meta.env.VITE_API_URL;
  if (customApiUrl) {
    const backendOrigin = customApiUrl.replace(/\/api\/v1\/?$/, '');
    return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return `${url.startsWith('/') ? '' : '/'}${url}`;
}

export const KIT_VIOLINO_SOLO_PLAYBACK: EquipamentoSomItem[] = [
  { item: 'Violino Principal + Arco Reserva + Breu + Surdina', quantidade: 1, conferido: false },
  {
    item: 'Captação de Violino (Microfone DPA / Piezo + Transmissor Sem Fio UHF)',
    quantidade: 1,
    conferido: false,
  },
  {
    item: 'Pedaleira / Pré-Amp / Reverb de Violino + Bateria 9V Reserva',
    quantidade: 1,
    conferido: false,
  },
  { item: 'Caixa Ativa / Coluna PA Portátil + Pedestal', quantidade: 1, conferido: false },
  {
    item: 'Mesa de Som Compacta / Interface (Canal Violino + Canal Playback)',
    quantidade: 1,
    conferido: false,
  },
  {
    item: 'Notebook / Tablet / Celular Dedicado para Playbacks (Modo Avião)',
    quantidade: 1,
    conferido: false,
  },
  {
    item: 'Cabo P2-P10 Estéreo + Adaptador USB-C/Lightning Reserva (VS)',
    quantidade: 2,
    conferido: false,
  },
  {
    item: 'Pedal Passador / Disparador Bluetooth de Playback',
    quantidade: 1,
    conferido: false,
  },
  {
    item: 'Retorno In-Ear / Fone de Monitoração do Playback',
    quantidade: 1,
    conferido: false,
  },
  {
    item: 'Estante de Partitura / Suporte de Tablet + Extensão Elétrica',
    quantidade: 1,
    conferido: false,
  },
];

export const KIT_BANDA_COMPLETA: EquipamentoSomItem[] = [
  { item: 'Caixas Ativas PA + Pedestais', quantidade: 2, conferido: false },
  { item: 'Mesa de Som Digital', quantidade: 1, conferido: false },
  { item: 'Microfones Instrumentos / Voz', quantidade: 4, conferido: false },
  { item: 'Estantes de Partitura Iluminadas', quantidade: 4, conferido: false },
  { item: 'Cabos XLR / P10 + Régua AC / Extensão', quantidade: 6, conferido: false },
];

export const KIT_MUSICO_FREELANCER: EquipamentoSomItem[] = [
  { item: 'Violino Principal + Arco Reserva + Breu + Espaleira', quantidade: 1, conferido: false },
  { item: 'Captador / Microfone de Violino + Cabo P10 / XLR Próprio', quantidade: 1, conferido: false },
  { item: 'Tablet / iPad Carregado + Partituras da Banda Contratante', quantidade: 1, conferido: false },
  { item: 'Fone In-Ear (caso a banda utilize VS/Click)', quantidade: 1, conferido: false },
  { item: 'Traje Social Completo (conforme dress code da banda)', quantidade: 1, conferido: false },
];

export type TipoKitEquipamento = 'VIOLINO_SOLO' | 'BANDA_COMPLETA' | 'FREELANCER';

const STORAGE_KEYS_KIT: Record<TipoKitEquipamento, string> = {
  VIOLINO_SOLO: 'mm3_kit_equipamentos_violino_solo_v1',
  BANDA_COMPLETA: 'mm3_kit_equipamentos_banda_completa_v1',
  FREELANCER: 'mm3_kit_equipamentos_freelancer_v1',
};

export function obterKitEquipamentosOriginal(tipo: TipoKitEquipamento): EquipamentoSomItem[] {
  if (tipo === 'VIOLINO_SOLO') return KIT_VIOLINO_SOLO_PLAYBACK.map((i) => ({ ...i }));
  if (tipo === 'FREELANCER') return KIT_MUSICO_FREELANCER.map((i) => ({ ...i }));
  return KIT_BANDA_COMPLETA.map((i) => ({ ...i }));
}

export function obterKitEquipamentosPadrao(tipo: TipoKitEquipamento): EquipamentoSomItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS_KIT[tipo]);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          item: String(item.item || ''),
          quantidade: Math.max(1, Number(item.quantidade || 1)),
          conferido: Boolean(item.conferido),
        }));
      }
    }
  } catch (e) {
    console.warn('Falha ao ler kit de equipamentos personalizado:', e);
  }
  return obterKitEquipamentosOriginal(tipo);
}

export function salvarKitEquipamentosPadrao(
  tipo: TipoKitEquipamento,
  itens: EquipamentoSomItem[]
): void {
  try {
    localStorage.setItem(STORAGE_KEYS_KIT[tipo], JSON.stringify(itens));
  } catch (e) {
    console.warn('Falha ao salvar kit de equipamentos personalizado:', e);
  }
}

export function restaurarKitEquipamentosPadrao(tipo: TipoKitEquipamento): EquipamentoSomItem[] {
  const original = obterKitEquipamentosOriginal(tipo);
  salvarKitEquipamentosPadrao(tipo, original);
  return original;
}

export interface NotasMapaLigacao {
  canal1: string;
  canal2: string;
  monitoracao: string;
}

const STORAGE_KEY_MAPA_LIGACAO = 'mm3_mapa_ligacao_som_v1';

export const MAPA_LIGACAO_PADRAO: NotasMapaLigacao = {
  canal1:
    'Captador DPA/Piezo → Transmissor Sem Fio → Pedaleira/Pré-Amp (com Reverb Hall suave) → Canal 1 da Mesa/Caixa Ativa.',
  canal2:
    'Notebook / iPad / Celular (em Modo Avião) → Cabo P2/P10 Estéreo ou Interface USB → Canal de Linha da Mesa de Som.',
  monitoracao:
    'Fone In-Ear na saída Phones da Mesa para ouvir o início do VS com precisão + Pedal Bluetooth para dar Play/Pause sem soltar o arco.',
};

export function obterMapaLigacaoPadrao(): NotasMapaLigacao {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MAPA_LIGACAO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          canal1: String(parsed.canal1 ?? MAPA_LIGACAO_PADRAO.canal1),
          canal2: String(parsed.canal2 ?? MAPA_LIGACAO_PADRAO.canal2),
          monitoracao: String(parsed.monitoracao ?? MAPA_LIGACAO_PADRAO.monitoracao),
        };
      }
    }
  } catch (e) {
    console.warn('Falha ao ler mapa de ligação:', e);
  }
  return { ...MAPA_LIGACAO_PADRAO };
}

export function salvarMapaLigacaoPadrao(notas: NotasMapaLigacao): void {
  try {
    localStorage.setItem(STORAGE_KEY_MAPA_LIGACAO, JSON.stringify(notas));
  } catch (e) {
    console.warn('Falha ao salvar mapa de ligação:', e);
  }
}

export const TIPO_CONTRATACAO_LABELS: Record<TipoContratacaoEventoEnum, string> = {
  CONTRATO_PROPRIO: 'Meu Contrato (Cliente Próprio)',
  FREELANCER_CACHE: 'Freelancer / Cachê (Outra Banda)',
};

export const STATUS_EVENTO_LABELS: Record<StatusEventoEnum, string> = {
  ORCAMENTO: 'Orçamento',
  CONTRATO_ASSINADO: 'Contrato Assinado',
  EM_PREPARACAO: 'Em Preparação',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
};

export const STATUS_EVENTO_COLORS: Record<StatusEventoEnum, string> = {
  ORCAMENTO: 'bg-amber-50 text-amber-800 border-amber-200',
  CONTRATO_ASSINADO: 'bg-blue-50 text-blue-800 border-blue-200',
  EM_PREPARACAO: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  REALIZADO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELADO: 'bg-rose-50 text-rose-800 border-rose-200',
};

export const STATUS_CONFIRMACAO_LABELS: Record<StatusConfirmacaoEscalaEnum, string> = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  RECUSOU: 'Recusou',
};

export const STATUS_PARCELA_LABELS: Record<StatusParcelaContratoEnum, string> = {
  ABERTO: 'Em Aberto',
  PAGO: 'Pago',
  ATRASADO: 'Em Atraso',
  CANCELADO: 'Cancelado',
};

export const TIPO_PARCELA_LABELS: Record<TipoParcelaEnum, string> = {
  SINAL_ENTRADA: 'Sinal / Entrada',
  PARCELA_INTERMEDIARIA: 'Parcela Intermediária',
  QUITACAO_FINAL: 'Quitação Final',
  ADITIVO_EXTRA: 'Aditivo Extra',
};

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamentoEnum, string> = {
  PIX: 'PIX',
  TRANSFERENCIA_TED_DOC: 'Transferência TED/DOC',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  BOLETO: 'Boleto Bancário',
  DINHEIRO: 'Dinheiro / Espécie',
};

export const MOMENTO_CERIMONIA_LABELS: Record<MomentoCerimoniaEnum, string> = {
  RECEPTIVO_CONVIDADOS: 'Receptivo dos Convidados',
  ENTRADA_PADRINHOS: 'Entrada dos Padrinhos e Pais',
  ENTRADA_NOIVO: 'Entrada do Noivo',
  ENTRADA_PAJENS_DAMAS: 'Entrada de Pajens e Daminhas',
  ANUNCIO_CLARINS: 'Anúncio Triunfal dos Clarins',
  ENTRADA_NOIVA: 'Entrada da Noiva (Cortejo Principal)',
  BENCAO_ALIANCAS: 'Bênção das Alianças',
  COMUNHAO_HOMENAGENS: 'Comunhão / Homenagens',
  ASSINATURA_TERMOS: 'Assinatura dos Termos',
  CUMPRIMENTOS: 'Cumprimentos dos Padrinhos',
  SAIDA_NOIVOS: 'Saída dos Noivos (Recessional)',
  POSLUDIO_SAIDA_CONVIDADOS: 'Poslúdio / Saída Convidados',
  OUTRO: 'Momento Personalizado',
};
