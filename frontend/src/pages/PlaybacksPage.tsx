import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Briefcase,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileAudio,
  FileText,
  Headphones,
  Mic2,
  Minus,
  Music,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Search,
  Speaker,
  Star,
  Trash2,
  Upload,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { EquipamentoSomItem, MomentoCerimoniaEnum, PlaybackBiblioteca } from '../types';
import { playbacksService } from '../services/api';
import {
  MAPA_LIGACAO_PADRAO,
  MOMENTO_CERIMONIA_LABELS,
  NotasMapaLigacao,
  TipoKitEquipamento,
  obterKitEquipamentosPadrao,
  obterMapaLigacaoPadrao,
  resolvePlaybackUrl,
  restaurarKitEquipamentosPadrao,
  salvarKitEquipamentosPadrao,
  salvarMapaLigacaoPadrao,
} from '../utils/formatters';
import { NovoCasamentoModal } from '../components/NovoCasamentoModal';

const MOMENTOS_FILTRO: Array<{ key: string; label: string }> = [
  { key: 'TODOS', label: 'Todos os Momentos' },
  { key: 'ENTRADA_NOIVA', label: 'Entrada da Noiva' },
  { key: 'ENTRADA_PADRINHOS', label: 'Padrinhos & Pais' },
  { key: 'ENTRADA_NOIVO', label: 'Entrada do Noivo' },
  { key: 'ENTRADA_PAJENS_DAMAS', label: 'Pajens & Daminhas' },
  { key: 'BENCAO_ALIANCAS', label: 'Bênção das Alianças' },
  { key: 'ASSINATURA_TERMOS', label: 'Assinatura / Cumprimentos' },
  { key: 'SAIDA_NOIVOS', label: 'Saída dos Noivos' },
];

export const PlaybacksPage: React.FC = () => {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<'BIBLIOTECA' | 'EQUIPAMENTOS'>('BIBLIOTECA');
  const [playbacks, setPlaybacks] = useState<PlaybackBiblioteca[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [momentoFiltro, setMomentoFiltro] = useState('TODOS');
  const [apenasFavoritos, setApenasFavoritos] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal de Cadastro / Edição de Playback
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<PlaybackBiblioteca | null>(null);
  const [nomeMusica, setNomeMusica] = useState('');
  const [artistaVersao, setArtistaVersao] = useState('');
  const [tomViolino, setTomViolino] = useState('D Maior');
  const [andamentoBpm, setAndamentoBpm] = useState('75');
  const [duracaoFormatada, setDuracaoFormatada] = useState('03:45');
  const [momentoSugerido, setMomentoSugerido] =
    useState<MomentoCerimoniaEnum>('ENTRADA_NOIVA');
  const [arquivoPlaybackUrl, setArquivoPlaybackUrl] = useState('');
  const [nomeArquivoOriginal, setNomeArquivoOriginal] = useState('');
  const [linkPartituraPdf, setLinkPartituraPdf] = useState('');
  const [observacoesExecucao, setObservacoesExecucao] = useState('');
  const [favorito, setFavorito] = useState(true);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Modal de Exclusão de Playback
  const [playbackParaExcluir, setPlaybackParaExcluir] =
    useState<PlaybackBiblioteca | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Modal de Novo Casamento pré-configurado para Violino Solo + Playback
  const [modalNovoCasamentoSolo, setModalNovoCasamentoSolo] = useState(false);

  // --- Gerenciador Editável de Kits de Equipamentos de Som ---
  const [kitSelecionado, setKitSelecionado] = useState<TipoKitEquipamento>('VIOLINO_SOLO');
  const [checklistSolo, setChecklistSolo] = useState<EquipamentoSomItem[]>(() =>
    obterKitEquipamentosPadrao('VIOLINO_SOLO')
  );
  const [novoItemEquipNome, setNovoItemEquipNome] = useState('');
  const [novoItemEquipQtd, setNovoItemEquipQtd] = useState(1);

  // Edição inline de um item existente
  const [indiceEditandoEquip, setIndiceEditandoEquip] = useState<number | null>(null);
  const [textoEditandoEquip, setTextoEditandoEquip] = useState('');
  const [qtdEditandoEquip, setQtdEditandoEquip] = useState(1);

  // Edição do Mapa de Ligação Rápida
  const [mapaLigacao, setMapaLigacao] = useState<NotasMapaLigacao>(() =>
    obterMapaLigacaoPadrao()
  );
  const [editandoMapa, setEditandoMapa] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleTrocarKitAtivo = (tipo: TipoKitEquipamento) => {
    setKitSelecionado(tipo);
    setIndiceEditandoEquip(null);
    setChecklistSolo(obterKitEquipamentosPadrao(tipo));
  };

  const atualizarESalvarKit = (novaLista: EquipamentoSomItem[], msgToast?: string) => {
    setChecklistSolo(novaLista);
    salvarKitEquipamentosPadrao(kitSelecionado, novaLista);
    if (msgToast) showToast(msgToast);
  };

  const handleAdicionarEquipamentoKit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItemEquipNome.trim()) return;
    const novaLista: EquipamentoSomItem[] = [
      ...checklistSolo,
      {
        item: novoItemEquipNome.trim(),
        quantidade: Math.max(1, Number(novoItemEquipQtd || 1)),
        conferido: false,
      },
    ];
    setNovoItemEquipNome('');
    setNovoItemEquipQtd(1);
    atualizarESalvarKit(novaLista, 'Equipamento adicionado ao kit com sucesso!');
  };

  const handleIniciarEdicaoEquip = (idx: number) => {
    const alvo = checklistSolo[idx];
    if (!alvo) return;
    setIndiceEditandoEquip(idx);
    setTextoEditandoEquip(alvo.item);
    setQtdEditandoEquip(alvo.quantidade);
  };

  const handleSalvarEdicaoEquip = (idx: number) => {
    if (!textoEditandoEquip.trim()) return;
    const novaLista = checklistSolo.map((item, i) =>
      i === idx
        ? {
            ...item,
            item: textoEditandoEquip.trim(),
            quantidade: Math.max(1, Number(qtdEditandoEquip || 1)),
          }
        : item
    );
    setIndiceEditandoEquip(null);
    atualizarESalvarKit(novaLista, 'Equipamento atualizado!');
  };

  const handleAlterarQtdRapidaKit = (idx: number, delta: number) => {
    const novaLista = checklistSolo.map((item, i) =>
      i === idx
        ? { ...item, quantidade: Math.max(1, Number(item.quantidade || 1) + delta) }
        : item
    );
    atualizarESalvarKit(novaLista);
  };

  const handleMoverEquipamentoKit = (idx: number, direcao: 'SUBIR' | 'DESCER') => {
    const destino = direcao === 'SUBIR' ? idx - 1 : idx + 1;
    if (destino < 0 || destino >= checklistSolo.length) return;
    const copia = [...checklistSolo];
    const [movido] = copia.splice(idx, 1);
    copia.splice(destino, 0, movido);
    atualizarESalvarKit(copia);
  };

  const handleRemoverEquipamentoKit = (idx: number) => {
    const removido = checklistSolo[idx]?.item;
    const novaLista = checklistSolo.filter((_, i) => i !== idx);
    if (indiceEditandoEquip === idx) setIndiceEditandoEquip(null);
    atualizarESalvarKit(novaLista, `Equipamento "${removido}" removido do kit.`);
  };

  const handleRestaurarKitPadrao = () => {
    const original = restaurarKitEquipamentosPadrao(kitSelecionado);
    setIndiceEditandoEquip(null);
    setChecklistSolo(original);
    showToast('Kit restaurado para os itens originais de fábrica!');
  };

  const handleSalvarMapaLigacao = () => {
    salvarMapaLigacaoPadrao(mapaLigacao);
    setEditandoMapa(false);
    showToast('Mapa de ligação rápida atualizado e salvo!');
  };

  const carregarPlaybacks = async () => {
    try {
      setLoading(true);
      const data = await playbacksService.listar({
        search: busca.trim() || undefined,
        momento: momentoFiltro !== 'TODOS' ? momentoFiltro : undefined,
        apenas_favoritos: apenasFavoritos || undefined,
      });
      setPlaybacks(data);
    } catch (error) {
      console.error('Erro ao listar playbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarPlaybacks();
    }, 200);
    return () => clearTimeout(timer);
  }, [busca, momentoFiltro, apenasFavoritos]);

  const abrirModalNovo = () => {
    setEditando(null);
    setNomeMusica('');
    setArtistaVersao('');
    setTomViolino('D Maior');
    setAndamentoBpm('75');
    setDuracaoFormatada('03:45');
    setMomentoSugerido('ENTRADA_NOIVA');
    setArquivoPlaybackUrl('');
    setNomeArquivoOriginal('');
    setLinkPartituraPdf('');
    setObservacoesExecucao('');
    setFavorito(true);
    setModalOpen(true);
  };

  const abrirModalEditar = (pb: PlaybackBiblioteca) => {
    setEditando(pb);
    setNomeMusica(pb.nome_musica);
    setArtistaVersao(pb.artista_versao || '');
    setTomViolino(pb.tom_violino || '');
    setAndamentoBpm(pb.andamento_bpm ? String(pb.andamento_bpm) : '');
    setDuracaoFormatada(pb.duracao_formatada || '');
    setMomentoSugerido(pb.momento_sugerido || 'ENTRADA_NOIVA');
    setArquivoPlaybackUrl(pb.arquivo_playback_url);
    setNomeArquivoOriginal(pb.nome_arquivo_original || '');
    setLinkPartituraPdf(pb.link_partitura_violino_pdf || '');
    setObservacoesExecucao(pb.observacoes_execucao || '');
    setFavorito(pb.favorito);
    setModalOpen(true);
  };

  const handleUploadArquivoAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAudio(true);
      const res = await playbacksService.uploadArquivo(file);
      setArquivoPlaybackUrl(res.arquivo_url);
      setNomeArquivoOriginal(res.nome_arquivo_original);
      if (!nomeMusica.trim()) {
        const semExt = res.nome_arquivo_original.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        setNomeMusica(semExt);
      }
      showToast(`Arquivo de áudio "${res.nome_arquivo_original}" enviado com sucesso!`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao fazer upload do arquivo de áudio.');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSalvarPlayback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivoPlaybackUrl.trim()) {
      alert('Envie um arquivo de áudio (MP3/WAV) ou informe o link do playback.');
      return;
    }
    try {
      setSalvando(true);
      const payload = {
        nome_musica: nomeMusica.trim(),
        artista_versao: artistaVersao.trim() || null,
        tom_violino: tomViolino.trim() || null,
        andamento_bpm: andamentoBpm ? Number(andamentoBpm) : null,
        duracao_formatada: duracaoFormatada.trim() || null,
        momento_sugerido: momentoSugerido,
        arquivo_playback_url: arquivoPlaybackUrl.trim(),
        nome_arquivo_original: nomeArquivoOriginal.trim() || null,
        link_partitura_violino_pdf: linkPartituraPdf.trim() || null,
        observacoes_execucao: observacoesExecucao.trim() || null,
        favorito,
      };
      if (editando) {
        await playbacksService.atualizar(editando.id, payload);
        showToast(`Playback "${nomeMusica}" atualizado!`);
      } else {
        await playbacksService.criar(payload);
        showToast(`Playback "${nomeMusica}" salvo na Biblioteca!`);
      }
      setModalOpen(false);
      carregarPlaybacks();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao salvar playback.');
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleFavorito = async (pb: PlaybackBiblioteca) => {
    await playbacksService.atualizar(pb.id, { favorito: !pb.favorito });
    carregarPlaybacks();
  };

  const handleConfirmarExclusao = async () => {
    if (!playbackParaExcluir) return;
    try {
      setExcluindo(true);
      const nome = playbackParaExcluir.nome_musica;
      await playbacksService.remover(playbackParaExcluir.id);
      setPlaybackParaExcluir(null);
      setModalOpen(false);
      await carregarPlaybacks();
      showToast(`Playback "${nome}" excluído da biblioteca.`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao excluir playback.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Flutuante */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-amber-500/40 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Cabeçalho Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
            <Radio className="w-3.5 h-3.5 text-amber-600" />
            Modo Eu Sozinho: Violino Solo + Playback (VS)
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            Central de Playbacks (VS) & Setup Violino Solo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Salve seus arquivos de Playback (MP3/WAV), ouça no player integrado, organize tons/partituras e confira seus equipamentos de som
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setModalNovoCasamentoSolo(true)}
            className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Music className="w-4 h-4 text-amber-600" />
            Nova Cerimônia Violino + Playback
          </button>

          <button
            type="button"
            onClick={abrirModalNovo}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Salvar Novo Playback (VS)
          </button>
        </div>
      </div>

      {/* Alternador entre Biblioteca de Playbacks e Checklist de Equipamentos de Som */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setAbaAtiva('BIBLIOTECA')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            abaAtiva === 'BIBLIOTECA'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Headphones className="w-4 h-4" />
          1. Biblioteca de Playbacks & Player ({playbacks.length} VS salvos)
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('EQUIPAMENTOS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            abaAtiva === 'EQUIPAMENTOS'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Speaker className="w-4 h-4" />
          2. Equipamentos de Som que Preciso (Violino Solo + Playback)
        </button>
      </div>

      {/* =====================================================================
          ABA 1: BIBLIOTECA DE PLAYBACKS (VS) COM PLAYER DE ÁUDIO
         ===================================================================== */}
      {abaAtiva === 'BIBLIOTECA' ? (
        <div className="space-y-5">
          {/* Filtros Rápidos por Momento e Busca */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {MOMENTOS_FILTRO.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMomentoFiltro(m.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    momentoFiltro === m.key
                      ? 'bg-slate-900 text-amber-400 shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar playback por nome da música, versão, tom do violino ou observação..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setApenasFavoritos((f) => !f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shrink-0 ${
                  apenasFavoritos
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${apenasFavoritos ? 'fill-slate-950' : ''}`} />
                Somente Favoritos
              </button>
            </div>
          </div>

          {/* Grid de Cards de Playbacks com Player Embutido */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Carregando biblioteca de Playbacks (VS)...
            </div>
          ) : playbacks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <p className="text-slate-600 font-semibold">
                Nenhum playback encontrado para os filtros selecionados.
              </p>
              <button
                type="button"
                onClick={abrirModalNovo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                Subir Primeiro Playback (MP3/WAV)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playbacks.map((pb) => {
                const audioSrc = resolvePlaybackUrl(pb.arquivo_playback_url);
                return (
                  <div
                    key={pb.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {pb.momento_sugerido && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                                {MOMENTO_CERIMONIA_LABELS[pb.momento_sugerido]}
                              </span>
                            )}
                            {pb.tom_violino && (
                              <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-mono text-[11px] font-bold">
                                Tom: {pb.tom_violino}
                              </span>
                            )}
                            {pb.andamento_bpm && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                {pb.andamento_bpm} BPM
                              </span>
                            )}
                            {pb.duracao_formatada && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                ⏱ {pb.duracao_formatada}
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-bold text-slate-900">{pb.nome_musica}</h3>
                          {pb.artista_versao && (
                            <p className="text-xs text-slate-500 font-medium">
                              {pb.artista_versao}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleFavorito(pb)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              pb.favorito
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-300 hover:text-amber-400 hover:bg-slate-50'
                            }`}
                            title="Favoritar Playback"
                          >
                            <Star className={`w-4 h-4 ${pb.favorito ? 'fill-amber-400' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(pb)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="Editar Playback"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlaybackParaExcluir(pb)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Excluir Playback"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Player de Áudio Integrado */}
                      <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span className="flex items-center gap-1.5 font-semibold text-amber-400 truncate">
                            <Volume2 className="w-3.5 h-3.5 shrink-0" />
                            {pb.nome_arquivo_original || 'Playback (VS) Pronto para Disparo'}
                          </span>
                          <a
                            href={audioSrc}
                            download={pb.nome_arquivo_original || `${pb.nome_musica}.wav`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:underline shrink-0 ml-2"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Baixar VS
                          </a>
                        </div>
                        <audio controls preload="none" src={audioSrc} className="w-full h-9" />
                      </div>

                      {pb.observacoes_execucao && (
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-slate-700">
                          <strong className="text-amber-900">Guia p/ Violino:</strong>{' '}
                          {pb.observacoes_execucao}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      {pb.link_partitura_violino_pdf ? (
                        <a
                          href={pb.link_partitura_violino_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Abrir Partitura do Violino (PDF)
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Sem partitura anexada</span>
                      )}

                      <span className="text-[11px] text-slate-400">ID #{pb.id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* =====================================================================
           ABA 2: GERENCIADOR EDITÁVEL DE EQUIPAMENTOS DE SOM & KITS PADRÃO
           ===================================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel Principal: Editor Completo do Kit de Equipamentos */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            {/* Seletor de Qual Kit Padrão Você Está Editando */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950">
                  <Speaker className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Gerenciador de Equipamentos de Som & Kits Padrão
                  </h2>
                  <p className="text-xs text-slate-500">
                    Adicione, edite, altere quantidades, reordene ou remova itens. Suas alterações ficam salvas automaticamente!
                  </p>
                </div>
              </div>
            </div>

            {/* Abas para alternar entre os 3 Kits de Equipamentos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleTrocarKitAtivo('VIOLINO_SOLO')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  kitSelecionado === 'VIOLINO_SOLO'
                    ? 'border-amber-500 bg-amber-50 text-slate-900 ring-2 ring-amber-500/20 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Headphones className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-bold truncate">Kit Violino Solo + Playback</div>
                  <div className="text-[10px] text-slate-500">Eu Sozinho (Som Próprio)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTrocarKitAtivo('BANDA_COMPLETA')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  kitSelecionado === 'BANDA_COMPLETA'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Users
                  className={`w-4 h-4 shrink-0 ${
                    kitSelecionado === 'BANDA_COMPLETA' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <div className="truncate">
                  <div className="text-xs font-bold truncate">Kit Banda Completa</div>
                  <div
                    className={`text-[10px] ${
                      kitSelecionado === 'BANDA_COMPLETA' ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    PA + Mesa Digital + Mics
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTrocarKitAtivo('FREELANCER')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  kitSelecionado === 'FREELANCER'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/20 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Briefcase className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-bold truncate">Kit Músico Freelancer</div>
                  <div className="text-[10px] text-slate-500">Quando Outra Banda Chama</div>
                </div>
              </button>
            </div>

            {/* Formulário para Adicionar Novo Equipamento */}
            <form
              onSubmit={handleAdicionarEquipamentoKit}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                placeholder="Digite o nome do equipamento para adicionar (Ex: Pedestal de Violino Hércules, Cabo XLR 10m)..."
                value={novoItemEquipNome}
                onChange={(e) => setNovoItemEquipNome(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden">
                  <span className="px-2.5 text-[11px] font-bold text-slate-500 uppercase">
                    Qtd:
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={novoItemEquipQtd}
                    onChange={(e) => setNovoItemEquipQtd(Math.max(1, Number(e.target.value)))}
                    className="w-16 py-2 px-2 text-sm font-bold text-center outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  Adicionar Item
                </button>
              </div>
            </form>

            {/* Barra de Ações em Lote da Lista */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 font-medium">
                Total de itens no kit: <strong className="text-slate-900">{checklistSolo.length}</strong>{' '}
                • Conferidos:{' '}
                <strong className="text-emerald-700">
                  {checklistSolo.filter((i) => i.conferido).length}/{checklistSolo.length}
                </strong>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    atualizarESalvarKit(
                      checklistSolo.map((i) => ({ ...i, conferido: true })),
                      'Todos os equipamentos marcados como conferidos!'
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    atualizarESalvarKit(
                      checklistSolo.map((i) => ({ ...i, conferido: false })),
                      'Conferência desmarcada.'
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                >
                  Desmarcar Todos
                </button>
                <button
                  type="button"
                  onClick={handleRestaurarKitPadrao}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-semibold flex items-center gap-1"
                  title="Restaurar os itens originais de fábrica deste kit"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Padrão
                </button>
              </div>
            </div>

            {/* Lista de Equipamentos com Edição Inline, Quantidade (-/+), Reordenação e Exclusão */}
            {checklistSolo.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-slate-500 text-sm space-y-2">
                <p>Nenhum equipamento cadastrado neste kit.</p>
                <button
                  type="button"
                  onClick={handleRestaurarKitPadrao}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Restaurar Kit Padrão
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {checklistSolo.map((eq, idx) => {
                  const estaEditando = indiceEditandoEquip === idx;
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        eq.conferido ? 'bg-emerald-50/40' : 'bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      {estaEditando ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={textoEditandoEquip}
                            onChange={(e) => setTextoEditandoEquip(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSalvarEdicaoEquip(idx);
                              } else if (e.key === 'Escape') {
                                setIndiceEditandoEquip(null);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-amber-400 text-sm font-medium bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-500">Qtd:</span>
                            <input
                              type="number"
                              min="1"
                              value={qtdEditandoEquip}
                              onChange={(e) =>
                                setQtdEditandoEquip(Math.max(1, Number(e.target.value)))
                              }
                              className="w-16 px-2 py-1.5 rounded-lg border border-amber-400 text-sm font-bold text-center bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleSalvarEdicaoEquip(idx)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setIndiceEditandoEquip(null)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={eq.conferido}
                              onChange={() =>
                                atualizarESalvarKit(
                                  checklistSolo.map((item, i) =>
                                    i === idx ? { ...item, conferido: !item.conferido } : item
                                  )
                                )
                              }
                              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                            />
                            <span
                              onClick={() => handleIniciarEdicaoEquip(idx)}
                              title="Clique para editar o nome deste equipamento"
                              className={`text-sm font-medium cursor-pointer hover:text-amber-700 truncate ${
                                eq.conferido ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {eq.item}
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 shrink-0">
                            {/* Controle rápido de quantidade (- / +) */}
                            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-1 py-0.5 mr-1">
                              <button
                                type="button"
                                onClick={() => handleAlterarQtdRapidaKit(idx, -1)}
                                className="p-1 text-slate-500 hover:text-slate-900 rounded"
                                title="Diminuir quantidade"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-bold text-slate-800">
                                {eq.quantidade} un.
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAlterarQtdRapidaKit(idx, 1)}
                                className="p-1 text-slate-500 hover:text-slate-900 rounded"
                                title="Aumentar quantidade"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Reordenar Subir / Descer */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoverEquipamentoKit(idx, 'SUBIR')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === checklistSolo.length - 1}
                              onClick={() => handleMoverEquipamentoKit(idx, 'DESCER')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão Editar Item */}
                            <button
                              type="button"
                              onClick={() => handleIniciarEdicaoEquip(idx)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                              title="Editar nome e quantidade"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Botão Remover Item */}
                            <button
                              type="button"
                              onClick={() => handleRemoverEquipamentoKit(idx)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Remover equipamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Guia Prático de Ligação e Segurança no Palco (Também Editável) */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                  <Mic2 className="w-5 h-5" />
                  <span>Mapa de Ligação Rápida</span>
                </div>
                {!editandoMapa ? (
                  <button
                    type="button"
                    onClick={() => setEditandoMapa(true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar Mapa
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMapaLigacao({ ...MAPA_LIGACAO_PADRAO });
                      salvarMapaLigacaoPadrao(MAPA_LIGACAO_PADRAO);
                      setEditandoMapa(false);
                      showToast('Mapa de ligação restaurado!');
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  >
                    Restaurar
                  </button>
                )}
              </div>

              {editandoMapa ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-amber-300 font-bold mb-1">
                      1. Canal 1 da Mesa (Violino):
                    </label>
                    <textarea
                      rows={3}
                      value={mapaLigacao.canal1}
                      onChange={(e) =>
                        setMapaLigacao({ ...mapaLigacao, canal1: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-300 font-bold mb-1">
                      2. Canal 2/3 Estéreo (Playback VS):
                    </label>
                    <textarea
                      rows={3}
                      value={mapaLigacao.canal2}
                      onChange={(e) =>
                        setMapaLigacao({ ...mapaLigacao, canal2: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-300 font-bold mb-1">
                      3. Monitoração & Disparo:
                    </label>
                    <textarea
                      rows={3}
                      value={mapaLigacao.monitoracao}
                      onChange={(e) =>
                        setMapaLigacao({ ...mapaLigacao, monitoracao: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSalvarMapaLigacao}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar Mapa
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoMapa(false)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <strong className="text-white block mb-0.5">
                      1. Canal 1 da Mesa (Violino):
                    </strong>
                    {mapaLigacao.canal1}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <strong className="text-white block mb-0.5">
                      2. Canal 2/3 Estéreo (Playback VS):
                    </strong>
                    {mapaLigacao.canal2}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                    <strong className="text-white block mb-0.5">
                      3. Monitoração & Disparo:
                    </strong>
                    {mapaLigacao.monitoracao}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setModalNovoCasamentoSolo(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Casamento Violino + Playback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição de Playback (VS) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileAudio className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold">
                  {editando ? `Editar Playback: ${editando.nome_musica}` : 'Salvar Novo Playback (VS)'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarPlayback} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Upload direto de Arquivo MP3/WAV */}
              <div className="p-4 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Enviar Arquivo de Áudio do Computador (MP3, WAV, M4A, OGG)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors">
                    <Upload className="w-4 h-4 text-amber-400" />
                    {uploadingAudio ? 'Enviando áudio...' : 'Escolher Arquivo de Playback'}
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
                      onChange={handleUploadArquivoAudio}
                      className="hidden"
                    />
                  </label>
                  {nomeArquivoOriginal && (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      {nomeArquivoOriginal}
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ou cole o caminho / link direto do Playback (Google Drive, Dropbox ou URL local) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="/uploads/playbacks/meu_arquivo.mp3 ou https://..."
                    value={arquivoPlaybackUrl}
                    onChange={(e) => setArquivoPlaybackUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-mono bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Música *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: A Thousand Years"
                    value={nomeMusica}
                    onChange={(e) => setNomeMusica(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Versão do Playback / Instrumentação da Base
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: VS Piano & Cordas (Sem Violino Guia)"
                    value={artistaVersao}
                    onChange={(e) => setArtistaVersao(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Momento Sugerido na Cerimônia
                  </label>
                  <select
                    value={momentoSugerido}
                    onChange={(e) =>
                      setMomentoSugerido(e.target.value as MomentoCerimoniaEnum)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    {(Object.keys(MOMENTO_CERIMONIA_LABELS) as MomentoCerimoniaEnum[]).map(
                      (m) => (
                        <option key={m} value={m}>
                          {MOMENTO_CERIMONIA_LABELS[m]}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tom (Violino)
                    </label>
                    <input
                      type="text"
                      placeholder="Bb Maior"
                      value={tomViolino}
                      onChange={(e) => setTomViolino(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      BPM
                    </label>
                    <input
                      type="number"
                      placeholder="75"
                      value={andamentoBpm}
                      onChange={(e) => setAndamentoBpm(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Duração
                    </label>
                    <input
                      type="text"
                      placeholder="04:15"
                      value={duracaoFormatada}
                      onChange={(e) => setDuracaoFormatada(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link da Partitura / Cifra de Violino (PDF)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={linkPartituraPdf}
                    onChange={(e) => setLinkPartituraPdf(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações de Execução (Tempo de Intro, Deixa de Entrada, Ponto de Fade-Out)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Aguardar 4 compassos de piano no playback antes de entrar com o violino..."
                    value={observacoesExecucao}
                    onChange={(e) => setObservacoesExecucao(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={favorito}
                      onChange={(e) => setFavorito(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Destacar como Playback Favorito (Repertório Padrão Violino Solo)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div>
                  {editando && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalOpen(false);
                        setPlaybackParaExcluir(editando);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Playback
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando || uploadingAudio}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
                  >
                    {salvando ? 'Salvando...' : 'Salvar Playback'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Playback */}
      {playbackParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-base font-bold">Excluir Playback (VS)</h2>
              </div>
              <button
                type="button"
                onClick={() => setPlaybackParaExcluir(null)}
                className="text-rose-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Deseja excluir o playback{' '}
                <strong className="text-slate-900">{playbackParaExcluir.nome_musica}</strong>{' '}
                da sua biblioteca?
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={excluindo}
                  onClick={() => setPlaybackParaExcluir(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={excluindo}
                  onClick={handleConfirmarExclusao}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold flex items-center gap-2"
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
        isOpen={modalNovoCasamentoSolo}
        onClose={() => setModalNovoCasamentoSolo(false)}
        defaultFormacao="VIOLINO_SOLO"
        onSuccess={(novo) => navigate(`/casamentos/${novo.id}`)}
      />
    </div>
  );
};
