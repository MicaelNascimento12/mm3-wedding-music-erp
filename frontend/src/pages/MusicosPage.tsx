import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Copy,
  Edit3,
  History,
  MessageCircle,
  Music2,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { HistoricoFinanceiroMusico, Musico, StatusMusicoEnum } from '../types';
import { musicosService } from '../services/api';
import {
  buildWhatsAppUrl,
  formatCurrency,
  formatDateBR,
} from '../utils/formatters';

const INSTRUMENTOS_RAPIDOS = [
  'TODOS',
  'Violino',
  'Teclado',
  'Violoncelo',
  'Clarins',
  'Voz',
  'Percussão',
];

export const MusicosPage: React.FC = () => {
  const navigate = useNavigate();
  const [musicos, setMusicos] = useState<Musico[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [instrumentoFiltro, setInstrumentoFiltro] = useState('TODOS');
  const [statusFiltro, setStatusFiltro] = useState<string>('');

  // Feedback visual Toast para cópia de chave PIX
  const [pixCopiadoId, setPixCopiadoId] = useState<number | null>(null);
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);

  // Modal de Cadastro/Edição de Músico
  const [modalMusicoOpen, setModalMusicoOpen] = useState(false);
  const [musicoEditando, setMusicoEditando] = useState<Musico | null>(null);

  // Campos do formulário de Músico
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [instrumentoPrincipal, setInstrumentoPrincipal] = useState('Violino');
  const [instrumentosSecundarios, setInstrumentosSecundarios] = useState('');
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [tipoChavePix, setTipoChavePix] = useState('CPF');
  const [valorCacheBase, setValorCacheBase] = useState('450.00');
  const [cidade, setCidade] = useState('São Paulo');
  const [bairro, setBairro] = useState('');
  const [statusMusico, setStatusMusico] = useState<StatusMusicoEnum>('ATIVO');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Modal de Histórico Financeiro do Músico
  const [historicoModal, setHistoricoModal] = useState<HistoricoFinanceiroMusico | null>(
    null
  );
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // Modal de Confirmação de Exclusão de Músico
  const [musicoParaExcluir, setMusicoParaExcluir] = useState<Musico | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarMusicos = async () => {
    try {
      setLoading(true);
      const data = await musicosService.listar({
        search: busca.trim() || undefined,
        instrumento: instrumentoFiltro !== 'TODOS' ? instrumentoFiltro : undefined,
        status: statusFiltro || undefined,
      });
      setMusicos(data);
    } catch (error) {
      console.error('Erro ao listar músicos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarMusicos();
    }, 200);
    return () => clearTimeout(timer);
  }, [busca, instrumentoFiltro, statusFiltro]);

  const copiarChavePix = async (musico: Musico) => {
    try {
      await navigator.clipboard.writeText(musico.chave_pix);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = musico.chave_pix;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setPixCopiadoId(musico.id);
    setToastMensagem(
      `Chave PIX de ${musico.nome_completo} (${musico.chave_pix}) copiada para a área de transferência!`
    );
    setTimeout(() => {
      setPixCopiadoId(null);
      setToastMensagem(null);
    }, 3200);
  };

  const abrirModalNovo = () => {
    setMusicoEditando(null);
    setNomeCompleto('');
    setInstrumentoPrincipal('Violino');
    setInstrumentosSecundarios('');
    setTelefoneWhatsapp('55119');
    setEmail('');
    setChavePix('');
    setTipoChavePix('CPF');
    setValorCacheBase('450.00');
    setCidade('São Paulo');
    setBairro('');
    setStatusMusico('ATIVO');
    setObservacoes('');
    setModalMusicoOpen(true);
  };

  const abrirModalEditar = (m: Musico) => {
    setMusicoEditando(m);
    setNomeCompleto(m.nome_completo);
    setInstrumentoPrincipal(m.instrumento_principal);
    setInstrumentosSecundarios(m.instrumentos_secundarios || '');
    setTelefoneWhatsapp(m.telefone_whatsapp);
    setEmail(m.email || '');
    setChavePix(m.chave_pix);
    setTipoChavePix(m.tipo_chave_pix || 'CPF');
    setValorCacheBase(String(m.valor_cache_base));
    setCidade(m.cidade);
    setBairro(m.bairro || '');
    setStatusMusico(m.status);
    setObservacoes(m.observacoes || '');
    setModalMusicoOpen(true);
  };

  const salvarMusico = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvando(true);
      const payload = {
        nome_completo: nomeCompleto.trim(),
        instrumento_principal: instrumentoPrincipal.trim(),
        instrumentos_secundarios: instrumentosSecundarios.trim() || null,
        telefone_whatsapp: telefoneWhatsapp.trim(),
        email: email.trim() || null,
        chave_pix: chavePix.trim(),
        tipo_chave_pix: tipoChavePix,
        valor_cache_base: Number(valorCacheBase || 0),
        cidade: cidade.trim(),
        bairro: bairro.trim() || null,
        status: statusMusico,
        observacoes: observacoes.trim() || null,
      };
      if (musicoEditando) {
        await musicosService.atualizar(musicoEditando.id, payload);
      } else {
        await musicosService.criar(payload);
      }
      setModalMusicoOpen(false);
      carregarMusicos();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao salvar músico.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirHistoricoFinanceiro = async (musicoId: number) => {
    try {
      setCarregandoHistorico(true);
      const res = await musicosService.obterHistoricoFinanceiro(musicoId);
      setHistoricoModal(res);
    } catch (error) {
      console.error('Erro ao carregar histórico financeiro:', error);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const confirmarExclusaoMusico = async () => {
    if (!musicoParaExcluir) return;
    try {
      setExcluindo(true);
      const nomeRemovido = musicoParaExcluir.nome_completo;
      await musicosService.remover(musicoParaExcluir.id);
      setMusicoParaExcluir(null);
      setModalMusicoOpen(false);
      await carregarMusicos();
      setToastMensagem(`Músico "${nomeRemovido}" excluído com sucesso!`);
      setTimeout(() => setToastMensagem(null), 3200);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao excluir músico.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Flutuante de Cópia de PIX */}
      {toastMensagem && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-amber-500/40 flex items-center gap-3 animate-bounce">
          <div className="p-1.5 rounded-lg bg-emerald-500 text-slate-950">
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-semibold">{toastMensagem}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            Elenco de Músicos (Fixos & Freelancers)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acesso rápido ao WhatsApp, cópia instantânea de chave PIX e histórico financeiro de cachês
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalNovo}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
        >
          <UserPlus className="w-4 h-4 text-amber-400" />
          Novo Músico
        </button>
      </div>

      {/* Filtros Rápidos por Instrumento e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {INSTRUMENTOS_RAPIDOS.map((inst) => (
            <button
              key={inst}
              type="button"
              onClick={() => setInstrumentoFiltro(inst)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                instrumentoFiltro === inst
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {inst === 'TODOS' ? 'Todos os Instrumentos' : inst}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar músico por nome, instrumento secundário ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">Status: Todos</option>
              <option value="ATIVO">Somente Ativos</option>
              <option value="INATIVO">Somente Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Músicos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Músico</th>
                <th className="py-3.5 px-4">Instrumento Principal & Secundários</th>
                <th className="py-3.5 px-4">Cidade / Região</th>
                <th className="py-3.5 px-4">Cachê Base</th>
                <th className="py-3.5 px-4">Chave PIX</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Carregando elenco de músicos...
                  </td>
                </tr>
              ) : musicos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhum músico encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                musicos.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{m.nome_completo}</div>
                      <div className="text-xs text-slate-500">{m.email || 'Sem e-mail'}</div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                        <Music2 className="w-3.5 h-3.5 text-amber-600" />
                        {m.instrumento_principal}
                      </span>
                      {m.instrumentos_secundarios && (
                        <div className="text-xs text-slate-500 mt-1">
                          + {m.instrumentos_secundarios}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-800">{m.cidade}</div>
                      {m.bairro && <div className="text-xs text-slate-500">{m.bairro}</div>}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900">
                      {formatCurrency(m.valor_cache_base)}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mr-1.5">
                            {m.tipo_chave_pix || 'PIX'}
                          </span>
                          <span className="font-mono text-xs text-slate-700">
                            {m.chave_pix}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          m.status === 'ATIVO'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Botão WhatsApp Direto */}
                        <a
                          href={buildWhatsAppUrl(
                            m.telefone_whatsapp,
                            `Olá ${m.nome_completo}, tudo bem? Aqui é da assessoria MM3 Música sobre a escala de casamento!`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                          title="Abrir conversa no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>

                        {/* Botão Copiar PIX */}
                        <button
                          type="button"
                          onClick={() => copiarChavePix(m)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            pixCopiadoId === m.id
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {pixCopiadoId === m.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              PIX Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar PIX
                            </>
                          )}
                        </button>

                        {/* Botão Histórico Financeiro do Músico */}
                        <button
                          type="button"
                          onClick={() => abrirHistoricoFinanceiro(m.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                          title="Histórico Financeiro de Casamentos e Cachês"
                        >
                          <History className="w-3.5 h-3.5" />
                          Extrato
                        </button>

                        {/* Botão Editar */}
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Editar Cadastro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Botão Excluir Músico */}
                        <button
                          type="button"
                          onClick={() => setMusicoParaExcluir(m)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Excluir Músico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Músico */}
      {modalMusicoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {musicoEditando ? `Editar Músico: ${musicoEditando.nome_completo}` : 'Cadastrar Novo Músico'}
              </h2>
              <button
                type="button"
                onClick={() => setModalMusicoOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarMusico} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Instrumento Principal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Violino, Teclado, Clarins, Voz..."
                    value={instrumentoPrincipal}
                    onChange={(e) => setInstrumentoPrincipal(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Instrumentos Secundários
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Viola de Arco, Violão..."
                    value={instrumentosSecundarios}
                    onChange={(e) => setInstrumentosSecundarios(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp (com DDD) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="5511999998888"
                    value={telefoneWhatsapp}
                    onChange={(e) => setTelefoneWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Chave PIX
                  </label>
                  <select
                    value={tipoChavePix}
                    onChange={(e) => setTipoChavePix(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="TELEFONE">Celular / Telefone</option>
                    <option value="ALEATORIA">Chave Aleatória</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chave PIX *
                  </label>
                  <input
                    type="text"
                    required
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cachê Base Padrão (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={valorCacheBase}
                    onChange={(e) => setValorCacheBase(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusMusico}
                    onChange={(e) => setStatusMusico(e.target.value as StatusMusicoEnum)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações Técnicas / Equipamento Próprio
                  </label>
                  <textarea
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <div>
                  {musicoEditando && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalMusicoOpen(false);
                        setMusicoParaExcluir(musicoEditando);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Músico
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalMusicoOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
                  >
                    {salvando ? 'Salvando...' : 'Salvar Músico'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Músico */}
      {musicoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-base font-bold">Confirmar Exclusão de Músico</h2>
              </div>
              <button
                type="button"
                onClick={() => setMusicoParaExcluir(null)}
                className="text-rose-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Tem certeza que deseja excluir o músico{' '}
                <strong className="text-slate-900">
                  {musicoParaExcluir.nome_completo}
                </strong>{' '}
                ({musicoParaExcluir.instrumento_principal})?
              </p>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                Esta ação é permanente e removerá o músico do catálogo e de eventuais
                escalas vinculadas.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={excluindo}
                  onClick={() => setMusicoParaExcluir(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={excluindo}
                  onClick={confirmarExclusaoMusico}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold flex items-center gap-2 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  {excluindo ? 'Excluindo...' : 'Sim, Excluir Músico'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico Financeiro do Músico (/api/v1/musicos/{id}/historico-financeiro) */}
      {historicoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  Extrato & Histórico Financeiro — {historicoModal.musico.nome_completo}
                </h2>
                <p className="text-xs text-slate-300">
                  {historicoModal.musico.instrumento_principal} • PIX:{' '}
                  {historicoModal.musico.chave_pix}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoricoModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-800">
                    Total de Cachês Já Pagos
                  </span>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {formatCurrency(historicoModal.total_caches_pagos)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-xs font-semibold text-amber-800">
                    Saldo Pendente a Receber
                  </span>
                  <div className="text-xl font-bold text-amber-700 mt-1">
                    {formatCurrency(historicoModal.saldo_pendente_a_receber)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">
                    Casamentos Escalado
                  </span>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {historicoModal.total_casamentos_escalado} eventos
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Casal / Local</th>
                      <th className="py-3 px-4">Função</th>
                      <th className="py-3 px-4 text-right">Cachê + Desloc.</th>
                      <th className="py-3 px-4 text-center">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historicoModal.historico_escalas.map((item) => (
                      <tr
                        key={item.escala_id}
                        onClick={() => {
                          setHistoricoModal(null);
                          navigate(`/casamentos/${item.evento_id}`);
                        }}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="py-3 px-4 font-semibold">
                          {formatDateBR(item.data_casamento)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.nome_noivos}</div>
                          <div className="text-slate-500">{item.local_cerimonia}</div>
                        </td>
                        <td className="py-3 px-4">{item.instrumento_no_evento}</td>
                        <td className="py-3 px-4 text-right font-bold">
                          {formatCurrency(item.valor_total_musico)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              item.status_pagamento === 'PAGO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status_pagamento}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
