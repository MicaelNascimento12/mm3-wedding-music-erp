import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Music,
  UserCheck,
  X,
} from 'lucide-react';
import {
  EventoCasamento360,
  FormacaoMusicalEnum,
  StatusEventoEnum,
  TipoContratacaoEventoEnum,
  VerificacaoConflito,
} from '../types';
import { eventosService } from '../services/api';
import { FORMACAO_LABELS, STATUS_EVENTO_LABELS } from '../utils/formatters';

interface NovoCasamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (novoCasamento: EventoCasamento360) => void;
  defaultFormacao?: FormacaoMusicalEnum;
  defaultTipoContratacao?: TipoContratacaoEventoEnum;
}

export const NovoCasamentoModal: React.FC<NovoCasamentoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultFormacao = 'SEXTETO',
  defaultTipoContratacao = 'CONTRATO_PROPRIO',
}) => {
  const [tipoContratacao, setTipoContratacao] =
    useState<TipoContratacaoEventoEnum>(defaultTipoContratacao);
  const [nomeBandaContratante, setNomeBandaContratante] = useState('');
  const [statusCacheFreelancer, setStatusCacheFreelancer] = useState<'ABERTO' | 'PAGO'>(
    'ABERTO'
  );
  const [nomeNoivos, setNomeNoivos] = useState('');
  const [codigoContrato, setCodigoContrato] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [emailContratante, setEmailContratante] = useState('');
  const [dataCasamento, setDataCasamento] = useState('2026-11-07');
  const [horarioChegadaBanda, setHorarioChegadaBanda] = useState('14:30');
  const [horarioInicioCerimonia, setHorarioInicioCerimonia] = useState('16:30');
  const [localCerimonia, setLocalCerimonia] = useState('');
  const [enderecoCompleto, setEnderecoCompleto] = useState('');
  const [cidadeCerimonia, setCidadeCerimonia] = useState('São Paulo');
  const [estadoUf, setEstadoUf] = useState('SP');
  const [tipoFormacao, setTipoFormacao] =
    useState<FormacaoMusicalEnum>(defaultFormacao);
  const [descricaoFormacao, setDescricaoFormacao] = useState(
    defaultFormacao === 'VIOLINO_SOLO'
      ? 'Violino Solo + Playback (VS Profissional) — Execução Individual'
      : ''
  );
  const [status, setStatus] = useState<StatusEventoEnum>('CONTRATO_ASSINADO');
  const [valorTotalBruto, setValorTotalBruto] = useState(
    defaultTipoContratacao === 'FREELANCER_CACHE'
      ? '750.00'
      : defaultFormacao === 'VIOLINO_SOLO'
      ? '2800.00'
      : '8500.00'
  );
  const [linkContratoPdf, setLinkContratoPdf] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  const [verificandoConflito, setVerificandoConflito] = useState(false);
  const [conflitoInfo, setConflitoInfo] = useState<VerificacaoConflito | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTipoContratacao(defaultTipoContratacao);
      if (defaultTipoContratacao === 'FREELANCER_CACHE') {
        setValorTotalBruto('750.00');
        setDescricaoFormacao('Contratado como Violino Freelancer por outra banda');
      } else if (defaultFormacao === 'VIOLINO_SOLO') {
        setValorTotalBruto('2800.00');
        setDescricaoFormacao(
          'Violino Solo + Playback (VS Profissional) — Execução Individual'
        );
      } else {
        setValorTotalBruto('8500.00');
      }
    }
  }, [isOpen, defaultTipoContratacao, defaultFormacao]);

  const isFreelancer = tipoContratacao === 'FREELANCER_CACHE';

  // Validação em tempo real de conflito de agenda
  useEffect(() => {
    if (!isOpen || !dataCasamento || !horarioChegadaBanda || !horarioInicioCerimonia) {
      setConflitoInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setVerificandoConflito(true);
        const res = await eventosService.verificarConflito({
          data_casamento: dataCasamento,
          horario_chegada_banda: horarioChegadaBanda,
          horario_inicio_cerimonia: horarioInicioCerimonia,
        });
        setConflitoInfo(res);
      } catch {
        setConflitoInfo(null);
      } finally {
        setVerificandoConflito(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, dataCasamento, horarioChegadaBanda, horarioInicioCerimonia]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    if (horarioChegadaBanda > horarioInicioCerimonia) {
      setErroForm(
        'O horário de chegada da banda (passagem de som) deve ser anterior ou igual ao início da cerimônia.'
      );
      return;
    }

    try {
      setSalvando(true);
      const novo = await eventosService.criar({
        codigo_contrato: codigoContrato.trim() || undefined,
        tipo_contratacao: tipoContratacao,
        nome_banda_contratante: isFreelancer
          ? nomeBandaContratante.trim() || 'Banda Contratante'
          : null,
        nome_noivos: nomeNoivos.trim(),
        cpf_cnpj_contratante:
          cpfCnpj.trim() || (isFreelancer ? 'ISENTO-FREELANCER' : '000.000.000-00'),
        telefone_contato: telefoneContato.trim(),
        email_contratante: emailContratante.trim() || undefined,
        data_casamento: dataCasamento,
        horario_chegada_banda: horarioChegadaBanda,
        horario_inicio_cerimonia: horarioInicioCerimonia,
        local_cerimonia: localCerimonia.trim(),
        endereco_completo: enderecoCompleto.trim() || undefined,
        cidade_cerimonia: cidadeCerimonia.trim(),
        estado_uf: estadoUf.trim().toUpperCase() || 'SP',
        tipo_formacao: tipoFormacao,
        descricao_formacao: descricaoFormacao.trim() || undefined,
        status,
        valor_total_bruto: Number(valorTotalBruto || 0),
        link_arquivo_contrato_pdf: linkContratoPdf.trim() || undefined,
        observacoes_gerais: observacoesGerais.trim() || undefined,
        forcar_criacao_com_conflito: true,
        status_cache_freelancer: isFreelancer ? statusCacheFreelancer : undefined,
      });
      onSuccess(novo);
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErroForm(
        typeof detail === 'string'
          ? detail
          : 'Não foi possível cadastrar o casamento. Verifique os campos informados.'
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-slate-950">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isFreelancer
                  ? 'Novo Casamento como Freelancer (Cachê de Outra Banda)'
                  : 'Novo Contrato de Casamento (Meus Clientes)'}
              </h2>
              <p className="text-xs text-slate-300">
                Cadastro completo com verificação automática de conflito de agenda (janela de 90 min)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Seletor de Modalidade: Contrato Próprio vs Freelancer (Outra Banda) */}
          <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Qual é a modalidade deste casamento?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTipoContratacao('CONTRATO_PROPRIO');
                  if (valorTotalBruto === '750.00') setValorTotalBruto('8500.00');
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  !isFreelancer
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <UserCheck
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    !isFreelancer ? 'text-amber-400' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold">
                    Meu Contrato Próprio (Fechei com os Noivos)
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      !isFreelancer ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    Casamento fechado pela minha assessoria/banda ou Violino Solo direto com o casal
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoContratacao('FREELANCER_CACHE');
                  if (valorTotalBruto === '8500.00' || valorTotalBruto === '2800.00') {
                    setValorTotalBruto('750.00');
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  isFreelancer
                    ? 'bg-indigo-950 text-white border-indigo-900 shadow-md'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Briefcase
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    isFreelancer ? 'text-amber-400' : 'text-indigo-500'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold">
                    Freelancer / Cachê (Contratado por Outra Banda)
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      isFreelancer ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    Outra banda ou produtora me chamou como músico e vai me pagar um cachê
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Banner de Validação de Conflito de Horário em Tempo Real */}
          {verificandoConflito ? (
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-amber-600" />
              <span>Verificando disponibilidade de agenda para {dataCasamento}...</span>
            </div>
          ) : conflitoInfo?.possui_conflito ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  Alerta de Conflito de Agenda Detectado ({conflitoInfo.total_conflitos}{' '}
                  evento(s) no mesmo dia)
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-800 pl-7 list-disc">
                {conflitoInfo.conflitos.map((c) => (
                  <li key={c.evento_id}>
                    <strong>{c.nome_noivos}</strong> ({c.codigo_contrato || `#${c.evento_id}`}):{' '}
                    {c.mensagem_detalhada}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 pl-7">
                Você ainda pode salvar este contrato caso disponha de janela suficiente ou segunda equipe.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Horário livre! Nenhum conflito ou margem inferior a 90 minutos na data selecionada.
              </span>
            </div>
          )}

          {erroForm && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {erroForm}
            </div>
          )}

          {/* Seção 1: Dados dos Noivos / Banda Contratante */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              {isFreelancer ? (
                <>
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  1. Banda que me Contratou & Identificação do Casamento
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  1. Identificação dos Noivos & Contrato
                </>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isFreelancer && (
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-indigo-950 mb-1">
                    Nome da Banda / Produtora / Maestro que me Contratou *
                  </label>
                  <input
                    type="text"
                    required={isFreelancer}
                    placeholder="Ex: Orquestra Del Chiaro / Banda Sinfonia Vip / Maestro Renato"
                    value={nomeBandaContratante}
                    onChange={(e) => setNomeBandaContratante(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-indigo-300 bg-indigo-50/40 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isFreelancer
                    ? 'Nome dos Noivos ou Identificação do Evento *'
                    : 'Nome dos Noivos *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    isFreelancer
                      ? 'Ex: Casamento Gabriela & Leonardo (Freela Violino)'
                      : 'Ex: Juliana Paes & Rodrigo Lombardi'
                  }
                  value={nomeNoivos}
                  onChange={(e) => setNomeNoivos(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código Referência
                </label>
                <input
                  type="text"
                  placeholder={isFreelancer ? 'Auto (Ex: FL-2026-003)' : 'Auto (Ex: CT-2026-005)'}
                  value={codigoContrato}
                  onChange={(e) => setCodigoContrato(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isFreelancer
                    ? 'CNPJ / CPF da Banda (Opcional)'
                    : 'CPF / CNPJ Contratante *'}
                </label>
                <input
                  type="text"
                  required={!isFreelancer}
                  placeholder={isFreelancer ? 'Opcional para Freelancer' : '000.000.000-00'}
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isFreelancer
                    ? 'WhatsApp do Produtor / Líder da Banda *'
                    : 'Telefone / WhatsApp dos Noivos *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="5511999998888"
                  value={telefoneContato}
                  onChange={(e) => setTelefoneContato(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isFreelancer ? 'E-mail da Banda (Opcional)' : 'E-mail dos Noivos'}
                </label>
                <input
                  type="email"
                  placeholder="contato@email.com"
                  value={emailContratante}
                  onChange={(e) => setEmailContratante(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Data e Janela de Horários */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              2. Data & Janela de Horários (Passagem de Som e Cerimônia)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data do Casamento *
                </label>
                <input
                  type="date"
                  required
                  value={dataCasamento}
                  onChange={(e) => setDataCasamento(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chegada Banda (Som) *
                </label>
                <input
                  type="time"
                  required
                  value={horarioChegadaBanda}
                  onChange={(e) => setHorarioChegadaBanda(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Início da Cerimônia *
                </label>
                <input
                  type="time"
                  required
                  value={horarioInicioCerimonia}
                  onChange={(e) => setHorarioInicioCerimonia(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Local e Formação Musical */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-600" />
              3. Local da Cerimônia, Formação & Valor do Contrato
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Igreja / Espaço de Eventos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Paróquia São José / Fazenda Dona Catarina"
                  value={localCerimonia}
                  onChange={(e) => setLocalCerimonia(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    value={cidadeCerimonia}
                    onChange={(e) => setCidadeCerimonia(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UF *
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    required
                    value={estadoUf}
                    onChange={(e) => setEstadoUf(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro..."
                  value={enderecoCompleto}
                  onChange={(e) => setEnderecoCompleto(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Formação Musical *
                </label>
                <select
                  value={tipoFormacao}
                  onChange={(e) => {
                    const nova = e.target.value as FormacaoMusicalEnum;
                    setTipoFormacao(nova);
                    if (nova === 'VIOLINO_SOLO' && !descricaoFormacao.trim()) {
                      setDescricaoFormacao(
                        'Violino Solo + Playback (VS Profissional) — Execução Individual'
                      );
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {(Object.keys(FORMACAO_LABELS) as FormacaoMusicalEnum[]).map((key) => (
                    <option key={key} value={key}>
                      {FORMACAO_LABELS[key]}
                    </option>
                  ))}
                </select>
                {tipoFormacao === 'VIOLINO_SOLO' && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 mt-1.5 font-medium">
                    ✓ O checklist de 10 equipamentos de som para Violino Solo + Playback será carregado automaticamente.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status do Evento *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusEventoEnum)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {(Object.keys(STATUS_EVENTO_LABELS) as StatusEventoEnum[]).map((key) => (
                    <option key={key} value={key}>
                      {STATUS_EVENTO_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isFreelancer
                    ? 'Valor do Meu Cachê Combinado (R$) *'
                    : 'Valor Total Bruto (R$) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={valorTotalBruto}
                  onChange={(e) => setValorTotalBruto(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-emerald-700 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {isFreelancer && (
                <div>
                  <label className="block text-xs font-bold text-indigo-900 mb-1">
                    Status do Recebimento do Meu Cachê
                  </label>
                  <select
                    value={statusCacheFreelancer}
                    onChange={(e) =>
                      setStatusCacheFreelancer(e.target.value as 'ABERTO' | 'PAGO')
                    }
                    className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-indigo-50/50 text-sm font-semibold text-indigo-950 outline-none"
                  >
                    <option value="ABERTO">A Receber da Banda (Pendente)</option>
                    <option value="PAGO">Já Recebido (Pago via PIX)</option>
                  </select>
                </div>
              )}

              <div className={isFreelancer ? 'md:col-span-2' : 'md:col-span-2'}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isFreelancer
                    ? 'Minha Função / Instrumento na Banda Contratante'
                    : 'Descrição dos Instrumentos da Formação'}
                </label>
                <input
                  type="text"
                  placeholder={
                    isFreelancer
                      ? 'Ex: 1º Violino (Spalla) — Cerimônia + Receptivo'
                      : 'Ex: Teclado, Violino, Cello, 2 Clarins e Soprano'
                  }
                  value={descricaoFormacao}
                  onChange={(e) => setDescricaoFormacao(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {!isFreelancer && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link PDF do Contrato
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={linkContratoPdf}
                    onChange={(e) => setLinkContratoPdf(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Music className="w-4 h-4 text-amber-400" />
              {salvando ? 'Salvando Contrato...' : 'Cadastrar Casamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
