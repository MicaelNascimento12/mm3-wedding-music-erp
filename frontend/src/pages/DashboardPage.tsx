import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarCheck2,
  Clock,
  DollarSign,
  Download,
  MapPin,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { DashboardOverview, EventoCasamento, TipoContratacaoEventoEnum } from '../types';
import { dashboardService, eventosService } from '../services/api';
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

const MESES_NOMES: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [mesReferencia, setMesReferencia] = useState<number>(11);
  const [anoReferencia, setAnoReferencia] = useState<number>(2026);
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalTipoDefault, setModalTipoDefault] =
    useState<TipoContratacaoEventoEnum>('CONTRATO_PROPRIO');
  const [eventoParaExcluir, setEventoParaExcluir] = useState<EventoCasamento | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const confirmarExclusaoEvento = async () => {
    if (!eventoParaExcluir) return;
    try {
      setExcluindo(true);
      await eventosService.remover(eventoParaExcluir.id);
      setEventoParaExcluir(null);
      await carregarDashboard();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao excluir cerimônia.');
    } finally {
      setExcluindo(false);
    }
  };

  const carregarDashboard = async (mes = mesReferencia, ano = anoReferencia) => {
    try {
      setLoading(true);
      const res = await dashboardService.getOverview({ mes, ano });
      setData(res);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDashboard(mesReferencia, anoReferencia);
  }, [mesReferencia, anoReferencia]);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl" />
          <div className="h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Topo da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            Dashboard Executivo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visão consolidada financeira (DRE), próximos casamentos e alertas de cachês/parcelas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Mês / Ano de Referência */}
          <div className="inline-flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <span className="text-slate-400">Período:</span>
            <select
              value={mesReferencia}
              onChange={(e) => setMesReferencia(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              {Object.entries(MESES_NOMES).map(([num, nome]) => (
                <option key={num} value={num}>
                  {nome}
                </option>
              ))}
            </select>
            <span className="text-slate-300">/</span>
            <select
              value={anoReferencia}
              onChange={(e) => setAnoReferencia(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              {[2025, 2026, 2027, 2028].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={async () => {
              const todosAno = await eventosService.listar({ ano: anoReferencia });
              exportarFinanceiroCasamentosCSV(todosAno, `Ano-${anoReferencia}`);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm flex items-center gap-2 transition-all"
            title="Exportar Relatório Financeiro Anual para Excel (.CSV)"
          >
            <Download className="w-4 h-4" />
            Exportar Excel ({anoReferencia})
          </button>

          <Link
            to="/casamentos"
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
          >
            Ver Contratos & Freelancers
          </Link>

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

      {/* 4 Cards Executivos Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Faturamento ({MESES_NOMES[mesReferencia]})
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {formatCurrency(data?.faturamento_mes)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Receita Bruta Anual:{' '}
            <strong className="text-slate-700">{formatCurrency(data?.receita_bruta_ano)}</strong>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lucro Líquido Previsto
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-indigo-700">
            {formatCurrency(data?.lucro_liquido_previsto_ano)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Despesas do Ano:{' '}
            <strong className="text-slate-700">{formatCurrency(data?.despesas_totais_ano)}</strong>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Casamentos no Ano
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {data?.total_casamentos_ano ?? 0}{' '}
            <span className="text-sm font-normal text-slate-500">eventos</span>
          </div>
          <p className="mt-1.5 text-xs text-emerald-700 font-medium">
            {data?.total_casamentos_confirmados_ano ?? 0} contratos confirmados/realizados
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cachês Pendentes Equipe
            </span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-600">
            {formatCurrency(data?.caches_pendentes_pagamento)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {data?.quantidade_caches_pendentes ?? 0} cachês a pagar • A receber noivos:{' '}
            <strong className="text-slate-700">
              {formatCurrency(data?.saldo_a_receber_noivos_total)}
            </strong>
          </p>
        </div>
      </div>

      {/* Grid Principal: Próximos Casamentos da Semana & Alertas de Vencimento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Próximos Casamentos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Próximos Casamentos Agendados
              </h2>
              <p className="text-xs text-slate-500">
                Clique em qualquer casamento para abrir a Visão 360º (Escala, Repertório, Som e DRE)
              </p>
            </div>
            <Link
              to="/casamentos"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.proximos_casamentos.map((ev) => (
              <div
                key={ev.id}
                onClick={() => navigate(`/casamentos/${ev.id}`)}
                className="p-5 hover:bg-slate-50/90 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {ev.codigo_contrato || `#${ev.id}`}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base hover:text-amber-600 transition-colors">
                      {ev.nome_noivos}
                    </h3>
                    {ev.tipo_contratacao === 'FREELANCER_CACHE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        <Briefcase className="w-3 h-3" />
                        Freelancer: {ev.nome_banda_contratante || 'Outra Banda'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Meu Contrato
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        STATUS_EVENTO_COLORS[ev.status]
                      }`}
                    >
                      {STATUS_EVENTO_LABELS[ev.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {formatDateBR(ev.data_casamento)} • Som {formatTimeShort(ev.horario_chegada_banda)}{' '}
                      | Cerimônia {formatTimeShort(ev.horario_inicio_cerimonia)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {ev.local_cerimonia} ({ev.cidade_cerimonia}/{ev.estado_uf})
                    </span>
                  </div>

                  <div className="text-xs text-slate-500">
                    Formação:{' '}
                    <strong className="text-slate-700">
                      {FORMACAO_LABELS[ev.tipo_formacao]}
                    </strong>
                    {ev.descricao_formacao ? ` — ${ev.descricao_formacao}` : ''}
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between shrink-0 gap-1.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Contrato Bruto</div>
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(ev.valor_total_bruto)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventoParaExcluir(ev);
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Excluir Cerimônia"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {ev.resumo_financeiro && (
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Lucro: {formatCurrency(ev.resumo_financeiro.lucro_liquido_banda)} (
                        {ev.resumo_financeiro.margem_lucro_percentual}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Direita: Alertas de Parcelas e Cachês Vencendo */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Alertas Financeiros
                </h2>
                <p className="text-xs text-slate-500">
                  Parcelas dos noivos e cachês pendentes
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {data?.alertas_vencimentos.map((alerta, idx) => {
              const isAtrasado = alerta.status_alerta === 'ATRASADO';
              const isSemana = alerta.status_alerta === 'VENCENDO_SEMANA';
              return (
                <div
                  key={`${alerta.evento_id}-${idx}`}
                  onClick={() => navigate(`/casamentos/${alerta.evento_id}`)}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        alerta.tipo === 'PARCELA_NOIVOS'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {alerta.tipo === 'PARCELA_NOIVOS' ? 'Recebimento Noivos' : 'Cachê Músico'}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isAtrasado
                          ? 'bg-rose-100 text-rose-800'
                          : isSemana
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isAtrasado
                        ? 'Em Atraso'
                        : isSemana
                        ? 'Vence em Breve'
                        : formatDateBR(alerta.data_referencia)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {alerta.favorecido_ou_pagador}
                    </p>
                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrency(alerta.valor)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 truncate">
                    {alerta.descricao} • Casal: <strong>{alerta.nome_noivos}</strong>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
                Deseja excluir permanentemente a cerimônia de{' '}
                <strong className="text-slate-900">{eventoParaExcluir.nome_noivos}</strong>{' '}
                ({formatDateBR(eventoParaExcluir.data_casamento)})?
              </p>
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
                  {excluindo ? 'Excluindo...' : 'Sim, Excluir'}
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
        onSuccess={(novo) => navigate(`/casamentos/${novo.id}`)}
      />
    </div>
  );
};
