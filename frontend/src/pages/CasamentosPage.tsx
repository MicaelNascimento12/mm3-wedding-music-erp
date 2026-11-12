import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Eye,
  Layers,
  MapPin,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import {
  EventoCasamento,
  FormacaoMusicalEnum,
  StatusEventoEnum,
  TipoContratacaoEventoEnum,
} from '../types';
import { eventosService } from '../services/api';
import {
  FORMACAO_LABELS,
  STATUS_EVENTO_COLORS,
  STATUS_EVENTO_LABELS,
  formatCurrency,
  formatDateBR,
  formatTimeShort,
} from '../utils/formatters';
import { NovoCasamentoModal } from '../components/NovoCasamentoModal';
import { exportarFinanceiroCasamentosCSV } from '../utils/exportadores';

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MESES_CURTOS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

interface ResumoPeriodo {
  totalCerimonias: number;
  cerimoniasAtivas: number;
  faturamentoBruto: number;
  receitaRecebida: number;
  saldoAReceber: number;
  gastoTotal: number;
  gastoCaches: number;
  gastoDeslocamento: number;
  gastoSonorizacao: number;
  cachesPagos: number;
  cachesPendentes: number;
  lucroLiquido: number;
  margemPercentual: number;
}

function calcularResumoEventos(lista: EventoCasamento[]): ResumoPeriodo {
  let cerimoniasAtivas = 0;
  let faturamentoBruto = 0;
  let receitaRecebida = 0;
  let saldoAReceber = 0;
  let gastoTotal = 0;
  let gastoCaches = 0;
  let gastoDeslocamento = 0;
  let gastoSonorizacao = 0;
  let cachesPagos = 0;
  let cachesPendentes = 0;
  let lucroLiquido = 0;

  for (const ev of lista) {
    if (ev.status === 'CANCELADO') continue;
    cerimoniasAtivas += 1;
    const bruto = Number(ev.valor_total_bruto || 0);
    const dre = ev.resumo_financeiro;

    faturamentoBruto += bruto;
    if (dre) {
      receitaRecebida += Number(dre.receita_ja_recebida || 0);
      saldoAReceber += Number(dre.saldo_a_receber_noivos || 0);
      gastoTotal += Number(dre.despesas_totais || 0);
      gastoCaches += Number(dre.custo_caches || 0);
      gastoDeslocamento += Number(dre.custo_deslocamento || 0);
      gastoSonorizacao += Number(dre.custo_sonorizacao || 0);
      cachesPagos += Number(dre.total_pago_musicos || 0);
      cachesPendentes += Number(dre.total_pendente_musicos || 0);
      lucroLiquido += Number(dre.lucro_liquido_banda || 0);
    } else {
      saldoAReceber += bruto;
      lucroLiquido += bruto;
    }
  }

  const margemPercentual =
    faturamentoBruto > 0 ? Number(((lucroLiquido / faturamentoBruto) * 100).toFixed(2)) : 0;

  return {
    totalCerimonias: lista.length,
    cerimoniasAtivas,
    faturamentoBruto,
    receitaRecebida,
    saldoAReceber,
    gastoTotal,
    gastoCaches,
    gastoDeslocamento,
    gastoSonorizacao,
    cachesPagos,
    cachesPendentes,
    lucroLiquido,
    margemPercentual,
  };
}

export const CasamentosPage: React.FC = () => {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoCasamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo de Período: ANUAL (dividido por meses no ano) vs MENSAL (foco em 1 mês específico)
  const [periodoVisao, setPeriodoVisao] = useState<'ANUAL' | 'MENSAL'>('ANUAL');
  // Sub-modo de exibição: TABELA vs CALENDARIO
  const [modoVisao, setModoVisao] = useState<'TABELA' | 'CALENDARIO'>('TABELA');
  // Na visão anual, permite mostrar apenas meses com eventos ou todos os 12 meses
  const [mostrarMesesVazios, setMostrarMesesVazios] = useState(false);

  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalTipoDefault, setModalTipoDefault] =
    useState<TipoContratacaoEventoEnum>('CONTRATO_PROPRIO');
  const [abaContratacao, setAbaContratacao] = useState<
    'TODOS' | 'CONTRATO_PROPRIO' | 'FREELANCER_CACHE'
  >('TODOS');
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);

  // Exclusão de Cerimônia
  const [eventoParaExcluir, setEventoParaExcluir] = useState<EventoCasamento | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Filtros
  const [busca, setBusca] = useState('');
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);
  const [mesSelecionado, setMesSelecionado] = useState<number>(11); // Novembro
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroFormacao, setFiltroFormacao] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMensagem(msg);
    setTimeout(() => setToastMensagem(null), 3200);
  };

  const carregarEventos = async () => {
    try {
      setLoading(true);
      const data = await eventosService.listar({
        ano: anoSelecionado || undefined,
        status: filtroStatus || undefined,
        tipo_formacao: filtroFormacao || undefined,
        search: busca.trim() || undefined,
      });
      setEventos(data);
    } catch (error) {
      console.error('Erro ao listar casamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarEventos();
    }, 200);
    return () => clearTimeout(timer);
  }, [busca, anoSelecionado, filtroStatus, filtroFormacao]);

  const confirmarExclusaoEvento = async () => {
    if (!eventoParaExcluir) return;
    try {
      setExcluindo(true);
      const nomeCasal = eventoParaExcluir.nome_noivos;
      await eventosService.remover(eventoParaExcluir.id);
      setEventoParaExcluir(null);
      await carregarEventos();
      showToast(`Cerimônia de "${nomeCasal}" excluída com sucesso!`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao excluir cerimônia.');
    } finally {
      setExcluindo(false);
    }
  };

  const handleConfirmarCacheFreelancer = async (
    ev: EventoCasamento,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      await eventosService.confirmarCacheFreelancer(ev.id);
      await carregarEventos();
      showToast(
        `Cachê freelancer de "${ev.nome_noivos}" (${ev.nome_banda_contratante || 'Banda'}) marcado como RECEBIDO!`
      );
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao confirmar recebimento do cachê freelancer.');
    }
  };

  const navegarMes = (delta: number) => {
    let novoMes = mesSelecionado + delta;
    let novoAno = anoSelecionado;
    if (novoMes > 12) {
      novoMes = 1;
      novoAno += 1;
    } else if (novoMes < 1) {
      novoMes = 12;
      novoAno -= 1;
    }
    setMesSelecionado(novoMes);
    setAnoSelecionado(novoAno);
  };

  // Divisão entre Meus Contratos Próprios e Freelancer / Cachês (Outras Bandas)
  const eventosProprios = useMemo(
    () =>
      eventos.filter(
        (ev) => (ev.tipo_contratacao || 'CONTRATO_PROPRIO') === 'CONTRATO_PROPRIO'
      ),
    [eventos]
  );

  const eventosFreelancer = useMemo(
    () => eventos.filter((ev) => ev.tipo_contratacao === 'FREELANCER_CACHE'),
    [eventos]
  );

  const resumoProprios = useMemo(
    () => calcularResumoEventos(eventosProprios),
    [eventosProprios]
  );

  const resumoFreelancer = useMemo(
    () => calcularResumoEventos(eventosFreelancer),
    [eventosFreelancer]
  );

  const eventosAtivosAba = useMemo(() => {
    if (abaContratacao === 'CONTRATO_PROPRIO') return eventosProprios;
    if (abaContratacao === 'FREELANCER_CACHE') return eventosFreelancer;
    return eventos;
  }, [eventos, eventosProprios, eventosFreelancer, abaContratacao]);

  // Agrupamento dos eventos por mês (1..12)
  const gruposMensais = useMemo(() => {
    const mapa = new Map<number, EventoCasamento[]>();
    for (let m = 1; m <= 12; m++) {
      mapa.set(m, []);
    }
    for (const ev of eventosAtivosAba) {
      const partes = ev.data_casamento.split('-');
      const mesEv = Number(partes[1] || 1);
      const atual = mapa.get(mesEv) || [];
      atual.push(ev);
      mapa.set(mesEv, atual);
    }

    const todosMeses = Array.from({ length: 12 }, (_, idx) => {
      const numeroMes = idx + 1;
      const lista = mapa.get(numeroMes) || [];
      return {
        mes: numeroMes,
        nomeMes: MESES_NOMES[idx],
        eventos: lista,
        resumo: calcularResumoEventos(lista),
      };
    });

    if (periodoVisao === 'MENSAL') {
      return todosMeses.filter((g) => g.mes === mesSelecionado);
    }

    if (mostrarMesesVazios) {
      return todosMeses;
    }

    return todosMeses.filter((g) => g.eventos.length > 0);
  }, [eventosAtivosAba, periodoVisao, mesSelecionado, mostrarMesesVazios]);

  // Resumo consolidado do período ativo (Anual ou Mensal)
  const resumoConsolidado = useMemo(() => {
    if (periodoVisao === 'MENSAL') {
      const evsMes = eventosAtivosAba.filter((ev) => {
        const m = Number(ev.data_casamento.split('-')[1]);
        return m === mesSelecionado;
      });
      return calcularResumoEventos(evsMes);
    }
    return calcularResumoEventos(eventosAtivosAba);
  }, [eventosAtivosAba, periodoVisao, mesSelecionado]);

  // Geração da grade do Calendário Mensal
  const diasCalendario = useMemo(() => {
    const primeiroDiaSemana = new Date(anoSelecionado, mesSelecionado - 1, 1).getDay();
    const totalDiasMes = new Date(anoSelecionado, mesSelecionado, 0).getDate();
    const celulas: Array<{ dia: number | null; dataIso: string | null }> = [];

    for (let i = 0; i < primeiroDiaSemana; i++) {
      celulas.push({ dia: null, dataIso: null });
    }
    for (let d = 1; d <= totalDiasMes; d++) {
      const mStr = String(mesSelecionado).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      celulas.push({ dia: d, dataIso: `${anoSelecionado}-${mStr}-${dStr}` });
    }
    return celulas;
  }, [mesSelecionado, anoSelecionado]);

  return (
    <div className="space-y-6">
      {/* Toast Flutuante */}
      {toastMensagem && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-amber-500/40 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMensagem}</span>
        </div>
      )}

      {/* Cabeçalho Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            Cerimônias & Divisão: Meus Contratos vs. Cachês Freelancer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Separe facilmente os casamentos que você fechou com os clientes daqueles em que foi contratado por outra banda como cachê
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Alternador de Período: Visão Anual (Por Meses) vs Visão Mensal */}
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-300/60">
            <button
              type="button"
              onClick={() => {
                setPeriodoVisao('ANUAL');
                setModoVisao('TABELA');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                periodoVisao === 'ANUAL' && modoVisao === 'TABELA'
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Visão Anual (Por Meses)
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriodoVisao('MENSAL');
                setModoVisao('TABELA');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                periodoVisao === 'MENSAL' && modoVisao === 'TABELA'
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Visão Mensal
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriodoVisao('MENSAL');
                setModoVisao('CALENDARIO');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                modoVisao === 'CALENDARIO'
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendário Mensal
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const listaExportar =
                periodoVisao === 'MENSAL'
                  ? eventosAtivosAba.filter(
                      (ev) => Number(ev.data_casamento.split('-')[1]) === mesSelecionado
                    )
                  : eventosAtivosAba;
              const labelModalidade =
                abaContratacao === 'CONTRATO_PROPRIO'
                  ? 'Meus Contratos'
                  : abaContratacao === 'FREELANCER_CACHE'
                  ? 'Caches Freelancer'
                  : 'Todos';
              const labelPeriodo =
                periodoVisao === 'MENSAL'
                  ? `${MESES_NOMES[mesSelecionado - 1]}-${anoSelecionado}-${labelModalidade}`
                  : `Ano-${anoSelecionado}-${labelModalidade}`;
              exportarFinanceiroCasamentosCSV(listaExportar, labelPeriodo);
              showToast('Planilha Financeira exportada para Excel (.CSV) com sucesso!');
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
            title="Baixar planilha Excel (.CSV) com Faturamento, Gastos, Cachês e Lucro Líquido"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>

          <div className="inline-flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setModalTipoDefault('CONTRATO_PROPRIO');
                setModalNovoOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-md flex items-center gap-2 transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Novo Contrato
            </button>

            <button
              type="button"
              onClick={() => {
                setModalTipoDefault('FREELANCER_CACHE');
                setModalNovoOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-semibold shadow-md flex items-center gap-2 transition-all whitespace-nowrap"
            >
              <Briefcase className="w-4 h-4 text-indigo-200" />
              + Cachê Freelancer
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          DIVISÃO DE MODALIDADE: TODOS vs MEUS CONTRATOS vs FREELANCER (CACHÊ)
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Todos os Casamentos */}
        <button
          type="button"
          onClick={() => setAbaContratacao('TODOS')}
          className={`text-left p-4 rounded-2xl border-2 transition-all ${
            abaContratacao === 'TODOS'
              ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                abaContratacao === 'TODOS'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Visão Unificada ({eventos.length})
            </span>
            <Layers
              className={`w-4 h-4 ${
                abaContratacao === 'TODOS' ? 'text-amber-400' : 'text-slate-400'
              }`}
            />
          </div>
          <div className="mt-2.5 font-bold text-base">
            Todos os Casamentos da Agenda
          </div>
          <p
            className={`text-xs mt-0.5 ${
              abaContratacao === 'TODOS' ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            Soma dos seus contratos próprios + seus cachês como freelancer
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-700/30 flex items-center justify-between text-xs">
            <span>
              Bruto:{' '}
              <strong>
                {formatCurrency(
                  resumoProprios.faturamentoBruto + resumoFreelancer.faturamentoBruto
                )}
              </strong>
            </span>
            <span
              className={
                abaContratacao === 'TODOS'
                  ? 'text-emerald-400 font-bold'
                  : 'text-emerald-700 font-bold'
              }
            >
              Líquido:{' '}
              {formatCurrency(
                resumoProprios.lucroLiquido + resumoFreelancer.lucroLiquido
              )}
            </span>
          </div>
        </button>

        {/* Card 2: Meus Contratos Próprios (Fechei com os Clientes) */}
        <button
          type="button"
          onClick={() => setAbaContratacao('CONTRATO_PROPRIO')}
          className={`text-left p-4 rounded-2xl border-2 transition-all ${
            abaContratacao === 'CONTRATO_PROPRIO'
              ? 'border-amber-500 bg-amber-50/90 text-slate-900 shadow-md ring-2 ring-amber-500/20'
              : 'border-slate-200 bg-white hover:border-amber-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
              Meus Contratos ({eventosProprios.length})
            </span>
            <UserCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2.5 font-bold text-base text-slate-900">
            Casamentos que Eu Fechei com Clientes
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Contratos diretos com os noivos (Banda Completa ou Violino + Playback)
          </p>
          <div className="mt-3 pt-2.5 border-t border-amber-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Faturamento: <strong>{formatCurrency(resumoProprios.faturamentoBruto)}</strong>
            </span>
            <span className="text-emerald-700 font-bold">
              Lucro: {formatCurrency(resumoProprios.lucroLiquido)}
            </span>
          </div>
        </button>

        {/* Card 3: Freelancer / Cachês (Contratado por Outra Banda) */}
        <button
          type="button"
          onClick={() => setAbaContratacao('FREELANCER_CACHE')}
          className={`text-left p-4 rounded-2xl border-2 transition-all ${
            abaContratacao === 'FREELANCER_CACHE'
              ? 'border-indigo-600 bg-indigo-50/90 text-slate-900 shadow-md ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
              Freelancer / Cachês ({eventosFreelancer.length})
            </span>
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5 font-bold text-base text-slate-900">
            Contratado por Outra Banda (Cachê)
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Eventos onde outra banda/produtora te chamou para tocar por cachê
          </p>
          <div className="mt-3 pt-2.5 border-t border-indigo-200/80 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-semibold">
              Recebido: <strong>{formatCurrency(resumoFreelancer.receitaRecebida)}</strong>
            </span>
            <span className="text-amber-700 font-bold">
              Falta receber: {formatCurrency(resumoFreelancer.saldoAReceber)}
            </span>
          </div>
        </button>
      </div>

      {/* Barra de Navegação de Ano e Meses */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Seletor de Ano com setas */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">
              Ano Base:
            </span>
            <button
              type="button"
              onClick={() => setAnoSelecionado((a) => a - 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
              title="Ano anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3.5 py-1 rounded-lg bg-slate-900 text-amber-400 font-bold text-sm">
              {anoSelecionado}
            </span>
            <button
              type="button"
              onClick={() => setAnoSelecionado((a) => a + 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
              title="Próximo ano"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {periodoVisao === 'MENSAL' && (
              <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => navegarMes(-1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs">
                  {MESES_NOMES[mesSelecionado - 1]} / {anoSelecionado}
                </span>
                <button
                  type="button"
                  onClick={() => navegarMes(1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Seletor rápido de Mês (Pills Jan..Dez) */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setPeriodoVisao('ANUAL');
                setModoVisao('TABELA');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                periodoVisao === 'ANUAL'
                  ? 'bg-slate-900 text-amber-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ano Todo ({eventosAtivosAba.length})
            </button>
            {MESES_CURTOS.map((nomeCurto, idx) => {
              const numMes = idx + 1;
              const qtdNoMes = eventosAtivosAba.filter(
                (e) => Number(e.data_casamento.split('-')[1]) === numMes
              ).length;
              const ativo = periodoVisao === 'MENSAL' && mesSelecionado === numMes;
              return (
                <button
                  key={nomeCurto}
                  type="button"
                  onClick={() => {
                    setMesSelecionado(numMes);
                    setPeriodoVisao('MENSAL');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    ativo
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : qtdNoMes > 0
                      ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <span>{nomeCurto}</span>
                  {qtdNoMes > 0 && (
                    <span
                      className={`text-[10px] px-1 rounded-full font-bold ${
                        ativo
                          ? 'bg-slate-900 text-amber-400'
                          : 'bg-amber-500/20 text-amber-900'
                      }`}
                    >
                      {qtdNoMes}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros de Busca, Status e Formação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 items-center">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por casal, banda contratante, código ou local..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">Todos os Status</option>
              {(Object.keys(STATUS_EVENTO_LABELS) as StatusEventoEnum[]).map((st) => (
                <option key={st} value={st}>
                  {STATUS_EVENTO_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filtroFormacao}
              onChange={(e) => setFiltroFormacao(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">Todas as Formações</option>
              {(Object.keys(FORMACAO_LABELS) as FormacaoMusicalEnum[]).map((f) => (
                <option key={f} value={f}>
                  {FORMACAO_LABELS[f]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end">
            {periodoVisao === 'ANUAL' && modoVisao === 'TABELA' && (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mostrarMesesVazios}
                  onChange={(e) => setMostrarMesesVazios(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                Exibir meses sem eventos
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Cards de Resumo Financeiro Consolidado (Mensal ou Anual conforme a visão ativa) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {periodoVisao === 'MENSAL'
                ? `Faturamento Mensal (${MESES_CURTOS[mesSelecionado - 1]})`
                : `Faturamento Anual (${anoSelecionado})`}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(resumoConsolidado.faturamentoBruto)}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>
              Recebido:{' '}
              <strong className="text-emerald-700">
                {formatCurrency(resumoConsolidado.receitaRecebida)}
              </strong>
            </span>
            <span>
              Falta:{' '}
              <strong className="text-amber-700">
                {formatCurrency(resumoConsolidado.saldoAReceber)}
              </strong>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {periodoVisao === 'MENSAL'
                ? `Gasto Mensal (${MESES_CURTOS[mesSelecionado - 1]})`
                : `Gasto Anual (${anoSelecionado})`}
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {formatCurrency(resumoConsolidado.gastoTotal)}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Cachês: <strong>{formatCurrency(resumoConsolidado.gastoCaches)}</strong> • Desloc.:{' '}
            <strong>{formatCurrency(resumoConsolidado.gastoDeslocamento)}</strong> • Som:{' '}
            <strong>{formatCurrency(resumoConsolidado.gastoSonorizacao)}</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {periodoVisao === 'MENSAL'
                ? `Lucro Líquido (${MESES_CURTOS[mesSelecionado - 1]})`
                : `Lucro Líquido (${anoSelecionado})`}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700">
            {formatCurrency(resumoConsolidado.lucroLiquido)}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>
              Margem Média:{' '}
              <strong className="text-indigo-700">
                {resumoConsolidado.margemPercentual}%
              </strong>
            </span>
            <span>{resumoConsolidado.cerimoniasAtivas} cerimônias ativas</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cachês da Equipe ({periodoVisao === 'MENSAL' ? MESES_CURTOS[mesSelecionado - 1] : anoSelecionado})
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(resumoConsolidado.cachesPendentes)}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>Pendentes de baixa</span>
            <span>
              Já pagos:{' '}
              <strong className="text-emerald-700">
                {formatCurrency(resumoConsolidado.cachesPagos)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          VISÃO EM TABELA DIVIDIDA POR MESES (ANUAL OU MENSAL)
         ===================================================================== */}
      {modoVisao === 'TABELA' ? (
        loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            Carregando cerimônias e demonstrativos mensais...
          </div>
        ) : gruposMensais.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <p className="text-slate-600 font-semibold">
              Nenhuma cerimônia encontrada para o período e filtros selecionados.
            </p>
            <button
              type="button"
              onClick={() => setModalNovoOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Cadastrar Nova Cerimônia
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {gruposMensais.map((grupo) => {
              const r = grupo.resumo;
              return (
                <div
                  key={grupo.mes}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Cabeçalho Financeiro do Mês */}
                  <div className="bg-slate-900 text-white px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-lg font-bold tracking-tight text-white">
                            {grupo.nomeMes} de {anoSelecionado}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-amber-400 border border-slate-700">
                            {grupo.eventos.length}{' '}
                            {grupo.eventos.length === 1 ? 'cerimônia' : 'cerimônias'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Resumo financeiro mensal de contratos, gastos com equipe/som e resultado líquido
                        </p>
                      </div>
                    </div>

                    {/* Indicadores do Mês no Cabeçalho */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Faturamento Mensal
                        </div>
                        <div className="text-sm font-bold text-emerald-400 mt-0.5">
                          {formatCurrency(r.faturamentoBruto)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Recebido: {formatCurrency(r.receitaRecebida)}
                        </div>
                      </div>

                      <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Gasto Mensal
                        </div>
                        <div className="text-sm font-bold text-rose-400 mt-0.5">
                          {formatCurrency(r.gastoTotal)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Equipe: {formatCurrency(r.gastoCaches + r.gastoDeslocamento)} • Som:{' '}
                          {formatCurrency(r.gastoSonorizacao)}
                        </div>
                      </div>

                      <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Lucro Líquido Mês
                        </div>
                        <div className="text-sm font-bold text-amber-400 mt-0.5">
                          {formatCurrency(r.lucroLiquido)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Margem: <strong className="text-amber-300">{r.margemPercentual}%</strong>
                        </div>
                      </div>

                      <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 flex flex-col justify-between">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Saldo a Receber
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {formatCurrency(r.saldoAReceber)}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          {periodoVisao === 'ANUAL' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMesSelecionado(grupo.mes);
                                setPeriodoVisao('MENSAL');
                              }}
                              className="text-[10px] font-bold text-amber-400 hover:underline text-left"
                            >
                              Focar neste mês →
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setModoVisao('CALENDARIO')}
                              className="text-[10px] font-bold text-amber-400 hover:underline text-left"
                            >
                              Ver no calendário →
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              exportarFinanceiroCasamentosCSV(
                                grupo.eventos,
                                `${grupo.nomeMes}-${anoSelecionado}`
                              );
                              showToast(
                                `Relatório de ${grupo.nomeMes}/${anoSelecionado} exportado para Excel!`
                              );
                            }}
                            className="text-[10px] font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                            title="Exportar este mês para Excel (.CSV)"
                          >
                            <Download className="w-3 h-3" />
                            Excel Mês
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Cerimônias do Mês */}
                  {grupo.eventos.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Nenhuma cerimônia cadastrada em {grupo.nomeMes} de {anoSelecionado}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="py-3.5 px-4">Data & Horários</th>
                            <th className="py-3.5 px-4">Noivos & Contrato</th>
                            <th className="py-3.5 px-4">Local da Cerimônia</th>
                            <th className="py-3.5 px-4">Formação Musical</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4 text-right">Faturamento (Bruto)</th>
                            <th className="py-3.5 px-4 text-right">Gasto (Equipe + Som)</th>
                            <th className="py-3.5 px-4 text-right">Lucro Líquido (DRE)</th>
                            <th className="py-3.5 px-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {grupo.eventos.map((ev) => {
                            const temConflito = ev.alerta_conflito_agenda?.possui_conflito;
                            const dre = ev.resumo_financeiro;
                            const isFreelancer = ev.tipo_contratacao === 'FREELANCER_CACHE';
                            const cacheFreelancerPendente =
                              isFreelancer && Number(dre?.saldo_a_receber_noivos || 0) > 0;
                            return (
                              <tr
                                key={ev.id}
                                onClick={() => navigate(`/casamentos/${ev.id}`)}
                                className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${
                                  isFreelancer ? 'bg-indigo-50/20' : ''
                                }`}
                              >
                                <td className="py-4 px-4 whitespace-nowrap">
                                  <div className="font-bold text-slate-900">
                                    {formatDateBR(ev.data_casamento)}
                                  </div>
                                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    Som: {formatTimeShort(ev.horario_chegada_banda)} • Início:{' '}
                                    <strong>{formatTimeShort(ev.horario_inicio_cerimonia)}</strong>
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-bold text-slate-900">
                                      {ev.nome_noivos}
                                    </span>
                                    {isFreelancer ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                        <Briefcase className="w-3 h-3" />
                                        Freelancer: {ev.nome_banda_contratante || 'Outra Banda'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        Meu Contrato
                                      </span>
                                    )}
                                    {temConflito && (
                                      <span
                                        title="Alerta de conflito de agenda nesta data"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300"
                                      >
                                        <AlertTriangle className="w-3 h-3" /> Conflito
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                                    {ev.codigo_contrato || `#${ev.id}`} • {ev.telefone_contato}
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="font-medium text-slate-800">
                                    {ev.local_cerimonia}
                                  </div>
                                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {ev.cidade_cerimonia} - {ev.estado_uf}
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                      isFreelancer
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    {FORMACAO_LABELS[ev.tipo_formacao]}
                                  </span>
                                  {isFreelancer ? (
                                    <div className="text-[11px] text-indigo-700 font-medium mt-1">
                                      Músico convidado (cachê)
                                    </div>
                                  ) : (
                                    dre && (
                                      <div className="text-[11px] text-slate-500 mt-1">
                                        {dre.musicos_confirmados}/{dre.total_musicos_escalados} músicos
                                        confirmados
                                      </div>
                                    )
                                  )}
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap">
                                  <span
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                      STATUS_EVENTO_COLORS[ev.status]
                                    }`}
                                  >
                                    {STATUS_EVENTO_LABELS[ev.status]}
                                  </span>
                                </td>

                                <td className="py-4 px-4 text-right whitespace-nowrap">
                                  <div className="font-bold text-slate-900">
                                    {formatCurrency(ev.valor_total_bruto)}
                                  </div>
                                  {dre && (
                                    <div
                                      className={`text-[11px] font-semibold ${
                                        Number(dre.saldo_a_receber_noivos || 0) > 0
                                          ? 'text-amber-700'
                                          : 'text-emerald-700'
                                      }`}
                                    >
                                      {isFreelancer
                                        ? Number(dre.saldo_a_receber_noivos || 0) > 0
                                          ? `Cachê a receber: ${formatCurrency(dre.saldo_a_receber_noivos)}`
                                          : 'Cachê Recebido ✓'
                                        : `Pago: ${formatCurrency(dre.receita_ja_recebida)}`}
                                    </div>
                                  )}
                                </td>

                                <td className="py-4 px-4 text-right whitespace-nowrap">
                                  {dre ? (
                                    <div>
                                      <div className="font-bold text-rose-600">
                                        {formatCurrency(dre.despesas_totais)}
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        Cachês:{' '}
                                        {formatCurrency(
                                          Number(dre.custo_caches || 0) +
                                            Number(dre.custo_deslocamento || 0)
                                        )}{' '}
                                        • Som: {formatCurrency(dre.custo_sonorizacao)}
                                      </div>
                                    </div>
                                  ) : (
                                    '—'
                                  )}
                                </td>

                                <td className="py-4 px-4 text-right whitespace-nowrap">
                                  {dre ? (
                                    <div>
                                      <div className="font-bold text-emerald-700">
                                        {formatCurrency(dre.lucro_liquido_banda)}
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        Margem: {dre.margem_lucro_percentual}%
                                      </div>
                                    </div>
                                  ) : (
                                    '—'
                                  )}
                                </td>

                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                  <div className="inline-flex items-center gap-2">
                                    {cacheFreelancerPendente && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleConfirmarCacheFreelancer(ev, e)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
                                        title="Dar baixa em 1 clique no recebimento deste cachê freelancer"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        Receber Cachê
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/casamentos/${ev.id}`);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-semibold transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Visão 360º
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEventoParaExcluir(ev);
                                      }}
                                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                                      title="Excluir Cerimônia"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Rodapé Subtotal do Mês */}
                        <tfoot>
                          <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold text-slate-800">
                            <td colSpan={5} className="py-3.5 px-4 text-right uppercase tracking-wider text-slate-500">
                              Fechamento de {grupo.nomeMes} ({r.cerimoniasAtivas}{' '}
                              {r.cerimoniasAtivas === 1 ? 'cerimônia ativa' : 'cerimônias ativas'}):
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-900">
                              <div>{formatCurrency(r.faturamentoBruto)}</div>
                              <div className="text-[10px] font-normal text-slate-500">
                                Falta receber: {formatCurrency(r.saldoAReceber)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right text-rose-600">
                              <div>- {formatCurrency(r.gastoTotal)}</div>
                              <div className="text-[10px] font-normal text-slate-500">
                                Cachês pend.: {formatCurrency(r.cachesPendentes)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right text-emerald-700">
                              <div>{formatCurrency(r.lucroLiquido)}</div>
                              <div className="text-[10px] font-normal text-slate-500">
                                Margem: {r.margemPercentual}%
                              </div>
                            </td>
                            <td className="py-3.5 px-4" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* =====================================================================
           VISÃO 2: CALENDÁRIO MENSAL INTERATIVO
           ===================================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-lg font-bold">
                  Calendário de {MESES_NOMES[mesSelecionado - 1]} de {anoSelecionado}
                </h2>
                <p className="text-xs text-slate-400">
                  Faturamento do Mês: <strong className="text-emerald-400">{formatCurrency(resumoConsolidado.faturamentoBruto)}</strong> •
                  Gasto do Mês: <strong className="text-rose-400">{formatCurrency(resumoConsolidado.gastoTotal)}</strong> •
                  Lucro: <strong className="text-amber-400">{formatCurrency(resumoConsolidado.lucroLiquido)}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navegarMes(-1)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMesSelecionado(11);
                  setAnoSelecionado(2026);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400"
              >
                Nov / 2026
              </button>
              <button
                type="button"
                onClick={() => navegarMes(1)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-xs font-bold uppercase tracking-wider text-slate-500 py-2.5">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
            {diasCalendario.map((celula, index) => {
              const eventosDoDia = celula.dataIso
                ? eventosAtivosAba.filter((e) => e.data_casamento === celula.dataIso)
                : [];
              return (
                <div
                  key={index}
                  className={`min-h-[130px] p-2.5 transition-colors ${
                    celula.dia ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/50'
                  }`}
                >
                  {celula.dia && (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            eventosDoDia.length > 0
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-600'
                          }`}
                        >
                          {celula.dia}
                        </span>
                        {eventosDoDia.length > 0 && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {eventosDoDia.length} ev.
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {eventosDoDia.map((ev) => {
                          const isFreelancer = ev.tipo_contratacao === 'FREELANCER_CACHE';
                          return (
                            <div
                              key={ev.id}
                              onClick={() => navigate(`/casamentos/${ev.id}`)}
                              className={`p-2 rounded-lg text-white text-xs cursor-pointer transition-all shadow-sm group relative ${
                                isFreelancer
                                  ? 'bg-indigo-900 hover:bg-indigo-600'
                                  : 'bg-slate-900 hover:bg-amber-500 hover:text-slate-950'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="font-bold truncate">
                                  {formatTimeShort(ev.horario_inicio_cerimonia)} • {ev.nome_noivos}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEventoParaExcluir(ev);
                                  }}
                                  className="opacity-70 hover:opacity-100 p-0.5 rounded text-rose-300 group-hover:text-rose-900"
                                  title="Excluir Cerimônia"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-[10px] opacity-85 truncate">
                                {isFreelancer
                                  ? `Freelancer: ${ev.nome_banda_contratante || 'Banda'}`
                                  : `${ev.local_cerimonia} (${FORMACAO_LABELS[ev.tipo_formacao]})`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Cerimônia */}
      {eventoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-base font-bold">Confirmar Exclusão de Cerimônia</h2>
              </div>
              <button
                type="button"
                onClick={() => setEventoParaExcluir(null)}
                className="text-rose-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Tem certeza que deseja excluir a cerimônia do casal{' '}
                <strong className="text-slate-900">{eventoParaExcluir.nome_noivos}</strong>{' '}
                ({formatDateBR(eventoParaExcluir.data_casamento)})?
              </p>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                Esta ação excluirá permanentemente o contrato, a escala de músicos, o
                repertório, os equipamentos de som e as parcelas vinculadas.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={excluindo}
                  onClick={() => setEventoParaExcluir(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={excluindo}
                  onClick={confirmarExclusaoEvento}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold flex items-center gap-2 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  {excluindo ? 'Excluindo...' : 'Sim, Excluir Cerimônia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <NovoCasamentoModal
        isOpen={modalNovoOpen}
        onClose={() => setModalNovoOpen(false)}
        defaultTipoContratacao={modalTipoDefault}
        onSuccess={(novo) => {
          carregarEventos();
          navigate(`/casamentos/${novo.id}`);
        }}
      />
    </div>
  );
};
