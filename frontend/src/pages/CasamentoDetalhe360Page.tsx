import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Disc3,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Headphones,
  ListMusic,
  MapPin,
  MessageCircle,
  Mic2,
  Minus,
  Music,
  Play,
  Plus,
  Printer,
  Save,
  Speaker,
  Trash2,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  Wallet,
  X,
  Youtube,
} from 'lucide-react';
import {
  EquipamentoSomItem,
  EventoCasamento360,
  FormaPagamentoEnum,
  FormacaoMusicalEnum,
  MomentoCerimoniaEnum,
  Musico,
  PlaybackBiblioteca,
  StatusConfirmacaoEscalaEnum,
  StatusEventoEnum,
  StatusPagamentoEnum,
  TipoContratacaoEventoEnum,
  TipoParcelaEnum,
} from '../types';
import { eventosService, musicosService, playbacksService } from '../services/api';
import {
  FORMA_PAGAMENTO_LABELS,
  FORMACAO_LABELS,
  MOMENTO_CERIMONIA_LABELS,
  STATUS_CONFIRMACAO_LABELS,
  STATUS_EVENTO_COLORS,
  STATUS_EVENTO_LABELS,
  STATUS_PARCELA_LABELS,
  TIPO_CONTRATACAO_LABELS,
  TIPO_PARCELA_LABELS,
  TipoKitEquipamento,
  buildWhatsAppUrl,
  formatCurrency,
  formatDateBR,
  formatTimeShort,
  obterKitEquipamentosPadrao,
  resolvePlaybackUrl,
  salvarKitEquipamentosPadrao,
} from '../utils/formatters';
import {
  exportarDRECasamento360CSV,
  gerarLinkConvocacaoMusicoWhatsApp,
  gerarTextoConvocacaoMusicoWhatsApp,
  gerarTextoRoteiroGrupoWhatsApp,
} from '../utils/exportadores';
import { FolhaDePalcoModal } from '../components/FolhaDePalcoModal';
import { ModoApresentacaoAoVivoModal } from '../components/ModoApresentacaoAoVivoModal';

type TabKey = 'CONTRATO' | 'ESCALA' | 'REPERTORIO' | 'SOM' | 'FINANCEIRO';

export const CasamentoDetalhe360Page: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventoId = Number(id);

  const [evento, setEvento] = useState<EventoCasamento360 | null>(null);
  const [catalogoMusicos, setCatalogoMusicos] = useState<Musico[]>([]);
  const [catalogoPlaybacks, setCatalogoPlaybacks] = useState<PlaybackBiblioteca[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('ESCALA');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [excluindoEvento, setExcluindoEvento] = useState(false);
  const [modalFolhaPalcoOpen, setModalFolhaPalcoOpen] = useState(false);
  const [modalModoAoVivoOpen, setModalModoAoVivoOpen] = useState(false);

  // --- Estado Aba 1: Dados & Contrato ---
  const [formContrato, setFormContrato] = useState({
    tipo_contratacao: 'CONTRATO_PROPRIO' as TipoContratacaoEventoEnum,
    nome_banda_contratante: '',
    codigo_contrato: '',
    nome_noivos: '',
    cpf_cnpj_contratante: '',
    telefone_contato: '',
    email_contratante: '',
    data_casamento: '',
    horario_chegada_banda: '',
    horario_inicio_cerimonia: '',
    local_cerimonia: '',
    endereco_completo: '',
    cidade_cerimonia: '',
    estado_uf: 'SP',
    tipo_formacao: 'SEXTETO' as FormacaoMusicalEnum,
    descricao_formacao: '',
    status: 'EM_PREPARACAO' as StatusEventoEnum,
    valor_total_bruto: '0.00',
    link_arquivo_contrato_pdf: '',
    observacoes_gerais: '',
  });
  const [salvandoContrato, setSalvandoContrato] = useState(false);

  // --- Estado Aba 2: Escala de Músicos ---
  const [musicoSelecionadoId, setMusicoSelecionadoId] = useState<number>(0);
  const [instrumentoEscala, setInstrumentoEscala] = useState('');
  const [cacheCombinadoEscala, setCacheCombinadoEscala] = useState('');
  const [taxaDeslocamentoEscala, setTaxaDeslocamentoEscala] = useState('50.00');
  const [statusConfirmacaoEscala, setStatusConfirmacaoEscala] =
    useState<StatusConfirmacaoEscalaEnum>('CONFIRMADO');
  const [obsEscala, setObsEscala] = useState('');
  const [adicionandoEscala, setAdicionandoEscala] = useState(false);
  const [escalaEditandoId, setEscalaEditandoId] = useState<number | null>(null);
  const [editInstrumentoEscala, setEditInstrumentoEscala] = useState('');
  const [editCacheEscala, setEditCacheEscala] = useState('');
  const [editDeslocamentoEscala, setEditDeslocamentoEscala] = useState('');
  const [editObsEscala, setEditObsEscala] = useState('');

  // --- Estado Aba 3: Repertório da Cerimônia ---
  const [momentoCerimonia, setMomentoCerimonia] =
    useState<MomentoCerimoniaEnum>('ENTRADA_NOIVA');
  const [nomeMusica, setNomeMusica] = useState('');
  const [artistaReferencia, setArtistaReferencia] = useState('');
  const [tomMusica, setTomMusica] = useState('C Maior');
  const [andamentoBpm, setAndamentoBpm] = useState('76');
  const [linkMidia, setLinkMidia] = useState('');
  const [linkPartituraPdf, setLinkPartituraPdf] = useState('');
  const [usaPlayback, setUsaPlayback] = useState(false);
  const [linkPlaybackUrl, setLinkPlaybackUrl] = useState('');
  const [nomeArquivoPlayback, setNomeArquivoPlayback] = useState('');
  const [duracaoPlayback, setDuracaoPlayback] = useState('');
  const [salvarPlaybackNaBiblioteca, setSalvarPlaybackNaBiblioteca] = useState(true);
  const [uploadingPlaybackRep, setUploadingPlaybackRep] = useState(false);
  const [modalBibliotecaOpen, setModalBibliotecaOpen] = useState(false);
  const [momentoImportarBiblioteca, setMomentoImportarBiblioteca] =
    useState<MomentoCerimoniaEnum>('ENTRADA_NOIVA');
  const [obsArranjo, setObsArranjo] = useState('');
  const [adicionandoMusica, setAdicionandoMusica] = useState(false);
  const [repEditandoId, setRepEditandoId] = useState<number | null>(null);
  const [editMomentoRep, setEditMomentoRep] =
    useState<MomentoCerimoniaEnum>('ENTRADA_NOIVA');
  const [editNomeMusicaRep, setEditNomeMusicaRep] = useState('');
  const [editArtistaRep, setEditArtistaRep] = useState('');
  const [editTomRep, setEditTomRep] = useState('');
  const [editBpmRep, setEditBpmRep] = useState('');
  const [editObsRep, setEditObsRep] = useState('');

  // --- Estado Aba 4: Equipamentos de Som & Logística ---
  const [necessitaSomProprio, setNecessitaSomProprio] = useState(true);
  const [listaEquipamentos, setListaEquipamentos] = useState<EquipamentoSomItem[]>([]);
  const [novoEquipNome, setNovoEquipNome] = useState('');
  const [novoEquipQtd, setNovoEquipQtd] = useState(1);
  const [indiceEditandoEquip, setIndiceEditandoEquip] = useState<number | null>(null);
  const [textoEditandoEquip, setTextoEditandoEquip] = useState('');
  const [qtdEditandoEquip, setQtdEditandoEquip] = useState(1);
  const [descricaoSomTexto, setDescricaoSomTexto] = useState('');
  const [responsavelSom, setResponsavelSom] = useState('');
  const [telefoneSom, setTelefoneSom] = useState('');
  const [custoSom, setCustoSom] = useState('0.00');
  const [statusPagamentoSom, setStatusPagamentoSom] =
    useState<StatusPagamentoEnum>('PENDENTE');
  const [obsLogistica, setObsLogistica] = useState('');
  const [salvandoSom, setSalvandoSom] = useState(false);

  // --- Estado Aba 5: Parcelas do Contrato (Financeiro) ---
  const [novaParcelaTipo, setNovaParcelaTipo] =
    useState<TipoParcelaEnum>('PARCELA_INTERMEDIARIA');
  const [novaParcelaDesc, setNovaParcelaDesc] = useState('');
  const [novaParcelaValor, setNovaParcelaValor] = useState('');
  const [novaParcelaVencimento, setNovaParcelaVencimento] = useState('2026-11-10');
  const [novaParcelaForma, setNovaParcelaForma] = useState<FormaPagamentoEnum>('PIX');
  const [adicionandoParcela, setAdicionandoParcela] = useState(false);
  const [parcelaEditandoId, setParcelaEditandoId] = useState<number | null>(null);
  const [editDescParcela, setEditDescParcela] = useState('');
  const [editValorParcela, setEditValorParcela] = useState('');
  const [editVencimentoParcela, setEditVencimentoParcela] = useState('');

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3200);
  };

  const sincronizarEstadosLocais = (ev: EventoCasamento360) => {
    setFormContrato({
      tipo_contratacao: ev.tipo_contratacao || 'CONTRATO_PROPRIO',
      nome_banda_contratante: ev.nome_banda_contratante || '',
      codigo_contrato: ev.codigo_contrato || '',
      nome_noivos: ev.nome_noivos,
      cpf_cnpj_contratante: ev.cpf_cnpj_contratante,
      telefone_contato: ev.telefone_contato,
      email_contratante: ev.email_contratante || '',
      data_casamento: ev.data_casamento,
      horario_chegada_banda: formatTimeShort(ev.horario_chegada_banda),
      horario_inicio_cerimonia: formatTimeShort(ev.horario_inicio_cerimonia),
      local_cerimonia: ev.local_cerimonia,
      endereco_completo: ev.endereco_completo || '',
      cidade_cerimonia: ev.cidade_cerimonia,
      estado_uf: ev.estado_uf,
      tipo_formacao: ev.tipo_formacao,
      descricao_formacao: ev.descricao_formacao || '',
      status: ev.status,
      valor_total_bruto: String(ev.valor_total_bruto),
      link_arquivo_contrato_pdf: ev.link_arquivo_contrato_pdf || '',
      observacoes_gerais: ev.observacoes_gerais || '',
    });

    if (ev.tipo_formacao === 'VIOLINO_SOLO') {
      setUsaPlayback(true);
    }

    if (ev.sonorizacao) {
      setNecessitaSomProprio(ev.sonorizacao.necessita_som_proprio);
      setListaEquipamentos(ev.sonorizacao.lista_equipamentos || []);
      setDescricaoSomTexto(ev.sonorizacao.descricao_equipamentos_texto || '');
      setResponsavelSom(ev.sonorizacao.responsavel_tecnico_som || '');
      setTelefoneSom(ev.sonorizacao.telefone_responsavel_som || '');
      setCustoSom(String(ev.sonorizacao.custo_locacao_tecnico_som ?? '0.00'));
      setStatusPagamentoSom(ev.sonorizacao.status_pagamento_som);
      setObsLogistica(ev.sonorizacao.observacoes_logistica || '');
    }
  };

  const carregarDados360 = async () => {
    try {
      setLoading(true);
      const [evData, musicosData, playbacksData] = await Promise.all([
        eventosService.obter360(eventoId),
        musicosService.listar({ status: 'ATIVO' }),
        playbacksService.listar().catch(() => []),
      ]);
      setEvento(evData);
      setCatalogoMusicos(musicosData);
      setCatalogoPlaybacks(playbacksData);
      sincronizarEstadosLocais(evData);

      if (musicosData.length > 0 && musicoSelecionadoId === 0) {
        const primeiro = musicosData[0];
        setMusicoSelecionadoId(primeiro.id);
        setInstrumentoEscala(primeiro.instrumento_principal);
        setCacheCombinadoEscala(String(primeiro.valor_cache_base));
      }
    } catch (error) {
      console.error('Erro ao carregar visão 360º do casamento:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventoId) {
      carregarDados360();
    }
  }, [eventoId]);

  const handleSelecionarMusicoDropdown = (idMusico: number) => {
    setMusicoSelecionadoId(idMusico);
    const encontrado = catalogoMusicos.find((m) => m.id === idMusico);
    if (encontrado) {
      setInstrumentoEscala(encontrado.instrumento_principal);
      setCacheCombinadoEscala(String(encontrado.valor_cache_base));
    }
  };

  // --- Handlers Aba 1: Contrato ---
  const handleSalvarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvandoContrato(true);
      const atualizado = await eventosService.atualizar(eventoId, {
        ...formContrato,
        nome_banda_contratante: formContrato.nome_banda_contratante.trim() || null,
        valor_total_bruto: Number(formContrato.valor_total_bruto || 0),
        email_contratante: formContrato.email_contratante || null,
        link_arquivo_contrato_pdf: formContrato.link_arquivo_contrato_pdf || null,
      });
      setEvento(atualizado);
      sincronizarEstadosLocais(atualizado);
      showToast('Dados contratuais atualizados com sucesso!');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao atualizar dados do casamento.');
    } finally {
      setSalvandoContrato(false);
    }
  };

  // --- Handlers Aba 2: Escala de Músicos ---
  const handleEscalarMusico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicoSelecionadoId) return;
    try {
      setAdicionandoEscala(true);
      await eventosService.adicionarEscala(eventoId, {
        musico_id: musicoSelecionadoId,
        instrumento_no_evento: instrumentoEscala.trim(),
        valor_cache_combinado: Number(cacheCombinadoEscala || 0),
        taxa_deslocamento_combustivel: Number(taxaDeslocamentoEscala || 0),
        status_confirmacao: statusConfirmacaoEscala,
        observacoes_escala: obsEscala.trim() || undefined,
      });
      setObsEscala('');
      await carregarDados360();
      showToast('Músico escalado no casamento e DRE recalculado!');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Não foi possível escalar o músico.');
    } finally {
      setAdicionandoEscala(false);
    }
  };

  const handleEscalarModoEuSozinho = async () => {
    // Procura o violinista no elenco ou usa o músico selecionado
    const violinista =
      catalogoMusicos.find((m) =>
        m.instrumento_principal.toLowerCase().includes('violino')
      ) || catalogoMusicos[0];

    if (!violinista) {
      alert('Cadastre um músico violinista na aba Músicos primeiro.');
      return;
    }

    try {
      setAdicionandoEscala(true);
      await eventosService.adicionarEscala(eventoId, {
        musico_id: violinista.id,
        instrumento_no_evento: 'Violino Solo + Disparo de Playbacks (VS)',
        valor_cache_combinado: 0,
        taxa_deslocamento_combustivel: 60,
        status_confirmacao: 'CONFIRMADO',
        observacoes_escala:
          'Apresentação solo (Eu Sozinho) com Violino + Playbacks (VS) — 100% do lucro líquido para o titular.',
      });
      await carregarDados360();
      showToast('Modo Eu Sozinho (Violino + Playback) escalado com sucesso!');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Este músico já está escalado neste casamento.');
    } finally {
      setAdicionandoEscala(false);
    }
  };

  const handleAlterarConfirmacaoEscala = async (
    escalaId: number,
    novoStatus: StatusConfirmacaoEscalaEnum
  ) => {
    await eventosService.atualizarEscala(eventoId, escalaId, {
      status_confirmacao: novoStatus,
    });
    await carregarDados360();
    showToast(`Confirmação atualizada para ${STATUS_CONFIRMACAO_LABELS[novoStatus]}!`);
  };

  const handleBaixarPagamentoMusico = async (escalaId: number, nomeMusico: string) => {
    await eventosService.baixarPagamentoEscala(eventoId, escalaId);
    await carregarDados360();
    showToast(`Pagamento de cachê para ${nomeMusico} baixado como PAGO (hoje)!`);
  };

  const handleReverterPagamentoMusico = async (escalaId: number, nomeMusico: string) => {
    await eventosService.atualizarEscala(eventoId, escalaId, {
      status_pagamento: 'PENDENTE',
    });
    await carregarDados360();
    showToast(`Pagamento de ${nomeMusico} revertido para PENDENTE.`);
  };

  const iniciarEdicaoEscala = (esc: any) => {
    setEscalaEditandoId(esc.id);
    setEditInstrumentoEscala(esc.instrumento_no_evento || '');
    setEditCacheEscala(String(esc.valor_cache_combinado ?? 0));
    setEditDeslocamentoEscala(String(esc.taxa_deslocamento_combustivel ?? 0));
    setEditObsEscala(esc.observacoes_escala || '');
  };

  const handleSalvarEdicaoEscala = async (escalaId: number) => {
    if (!editInstrumentoEscala.trim()) return;
    await eventosService.atualizarEscala(eventoId, escalaId, {
      instrumento_no_evento: editInstrumentoEscala.trim(),
      valor_cache_combinado: Number(editCacheEscala || 0),
      taxa_deslocamento_combustivel: Number(editDeslocamentoEscala || 0),
      observacoes_escala: editObsEscala.trim() || null,
    });
    setEscalaEditandoId(null);
    await carregarDados360();
    showToast('Dados do músico escalado e DRE atualizados!');
  };

  const handleRemoverEscala = async (escalaId: number) => {
    if (escalaEditandoId === escalaId) setEscalaEditandoId(null);
    await eventosService.removerEscala(eventoId, escalaId);
    await carregarDados360();
    showToast('Músico removido da escala do casamento.');
  };

  // --- Handlers Aba 3: Repertório & Playbacks ---
  const handleUploadArquivoPlaybackRepertorio = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPlaybackRep(true);
      const res = await playbacksService.uploadArquivo(file);
      setUsaPlayback(true);
      setLinkPlaybackUrl(res.arquivo_url);
      setNomeArquivoPlayback(res.nome_arquivo_original);
      if (!nomeMusica.trim()) {
        const limpo = res.nome_arquivo_original.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setNomeMusica(limpo);
      }
      showToast(`Arquivo de playback "${res.nome_arquivo_original}" enviado!`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao fazer upload do playback.');
    } finally {
      setUploadingPlaybackRep(false);
    }
  };

  const handleAnexarPlaybackItemExistente = async (
    repId: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await playbacksService.uploadArquivo(file);
      await eventosService.atualizarRepertorio(eventoId, repId, {
        usa_playback: true,
        link_playback_url: res.arquivo_url,
        nome_arquivo_playback: res.nome_arquivo_original,
      });
      await carregarDados360();
      showToast(`Playback "${res.nome_arquivo_original}" anexado à música!`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao anexar playback na música.');
    }
  };

  const handleImportarDaBiblioteca = async (pb: PlaybackBiblioteca) => {
    try {
      await eventosService.adicionarRepertorio(eventoId, {
        momento_cerimonia: pb.momento_sugerido || momentoImportarBiblioteca,
        nome_musica: pb.nome_musica,
        artista_versao_referencia: pb.artista_versao || null,
        tom_musica: pb.tom_violino || null,
        andamento_bpm: pb.andamento_bpm || null,
        usa_playback: true,
        link_playback_url: pb.arquivo_playback_url,
        nome_arquivo_playback: pb.nome_arquivo_original || `${pb.nome_musica}.wav`,
        duracao_playback: pb.duracao_formatada || null,
        link_partitura_cifra_pdf: pb.link_partitura_violino_pdf || null,
        observacoes_arranjo: pb.observacoes_execucao || null,
      });
      await carregarDados360();
      showToast(`Playback "${pb.nome_musica}" importado para o roteiro da cerimônia!`);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao importar playback.');
    }
  };

  const handleAdicionarMusica = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAdicionandoMusica(true);
      await eventosService.adicionarRepertorio(eventoId, {
        momento_cerimonia: momentoCerimonia,
        nome_musica: nomeMusica.trim(),
        artista_versao_referencia: artistaReferencia.trim() || null,
        tom_musica: tomMusica.trim() || null,
        andamento_bpm: andamentoBpm ? Number(andamentoBpm) : null,
        usa_playback: usaPlayback || Boolean(linkPlaybackUrl.trim()),
        link_playback_url: linkPlaybackUrl.trim() || null,
        nome_arquivo_playback: nomeArquivoPlayback.trim() || null,
        duracao_playback: duracaoPlayback.trim() || null,
        link_referencia_midia: linkMidia.trim() || null,
        link_partitura_cifra_pdf: linkPartituraPdf.trim() || null,
        observacoes_arranjo: obsArranjo.trim() || null,
      });

      // Se possui playback e o usuário marcou para salvar na biblioteca geral
      if (linkPlaybackUrl.trim() && salvarPlaybackNaBiblioteca) {
        const jaExiste = catalogoPlaybacks.some(
          (p) => p.arquivo_playback_url === linkPlaybackUrl.trim()
        );
        if (!jaExiste) {
          await playbacksService
            .criar({
              nome_musica: nomeMusica.trim(),
              artista_versao: artistaReferencia.trim() || null,
              tom_violino: tomMusica.trim() || null,
              andamento_bpm: andamentoBpm ? Number(andamentoBpm) : null,
              duracao_formatada: duracaoPlayback.trim() || null,
              momento_sugerido: momentoCerimonia,
              arquivo_playback_url: linkPlaybackUrl.trim(),
              nome_arquivo_original: nomeArquivoPlayback.trim() || null,
              link_partitura_violino_pdf: linkPartituraPdf.trim() || null,
              observacoes_execucao: obsArranjo.trim() || null,
              favorito: true,
            })
            .catch(() => null);
        }
      }

      setNomeMusica('');
      setArtistaReferencia('');
      setLinkMidia('');
      setLinkPartituraPdf('');
      setLinkPlaybackUrl('');
      setNomeArquivoPlayback('');
      setDuracaoPlayback('');
      setObsArranjo('');
      await carregarDados360();
      showToast('Música adicionada ao repertório da cerimônia!');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao adicionar música.');
    } finally {
      setAdicionandoMusica(false);
    }
  };

  const handleMoverMusica = async (indexAtual: number, direcao: -1 | 1) => {
    if (!evento) return;
    const lista = [...evento.repertorio];
    const novoIndex = indexAtual + direcao;
    if (novoIndex < 0 || novoIndex >= lista.length) return;

    const temp = lista[indexAtual];
    lista[indexAtual] = lista[novoIndex];
    lista[novoIndex] = temp;

    const payload = lista.map((item, idx) => ({
      id: item.id,
      ordem_execucao: idx + 1,
    }));

    await eventosService.reordenarRepertorio(eventoId, payload);
    await carregarDados360();
    showToast('Ordem de execução do repertório atualizada!');
  };

  const iniciarEdicaoMusica = (rep: any) => {
    setRepEditandoId(rep.id);
    setEditMomentoRep(rep.momento_cerimonia);
    setEditNomeMusicaRep(rep.nome_musica || '');
    setEditArtistaRep(rep.artista_versao_referencia || '');
    setEditTomRep(rep.tom_musica || '');
    setEditBpmRep(rep.andamento_bpm ? String(rep.andamento_bpm) : '');
    setEditObsRep(rep.observacoes_arranjo || '');
  };

  const handleSalvarEdicaoMusica = async (itemId: number) => {
    if (!editNomeMusicaRep.trim()) return;
    await eventosService.atualizarRepertorio(eventoId, itemId, {
      momento_cerimonia: editMomentoRep,
      nome_musica: editNomeMusicaRep.trim(),
      artista_versao_referencia: editArtistaRep.trim() || null,
      tom_musica: editTomRep.trim() || null,
      andamento_bpm: editBpmRep ? Number(editBpmRep) : null,
      observacoes_arranjo: editObsRep.trim() || null,
    });
    setRepEditandoId(null);
    await carregarDados360();
    showToast('Música do repertório atualizada com sucesso!');
  };

  const handleRemoverMusica = async (itemId: number) => {
    if (repEditandoId === itemId) setRepEditandoId(null);
    await eventosService.removerRepertorio(eventoId, itemId);
    await carregarDados360();
    showToast('Música removida do repertório.');
  };

  // --- Handlers Aba 4: Sonorização & Logística ---
  const salvarConfiguracaoSom = async (equipamentosAtualizados?: EquipamentoSomItem[]) => {
    try {
      setSalvandoSom(true);
      await eventosService.atualizarSonorizacao(eventoId, {
        necessita_som_proprio: necessitaSomProprio,
        lista_equipamentos: equipamentosAtualizados ?? listaEquipamentos,
        descricao_equipamentos_texto: descricaoSomTexto.trim() || null,
        responsavel_tecnico_som: responsavelSom.trim() || null,
        telefone_responsavel_som: telefoneSom.trim() || null,
        custo_locacao_tecnico_som: Number(custoSom || 0),
        status_pagamento_som: statusPagamentoSom,
        observacoes_logistica: obsLogistica.trim() || null,
      });
      await carregarDados360();
      showToast('Checklist de sonorização e custos de logística salvos!');
    } finally {
      setSalvandoSom(false);
    }
  };

  const handleCarregarKitViolinoSolo = async () => {
    const kit = obterKitEquipamentosPadrao('VIOLINO_SOLO').map((eq) => ({
      ...eq,
      conferido: false,
    }));
    setListaEquipamentos(kit);
    setNecessitaSomProprio(true);
    if (!obsLogistica.trim()) {
      setObsLogistica(
        'Setup compacto Violino Solo + Playback (VS): Celular/Tablet em MODO AVIÃO com arquivos WAV/MP3 offline + Captador Violino/Reverb ligados na mesa de som compacta e caixa ativa.'
      );
    }
    await salvarConfiguracaoSom(kit);
    showToast('Kit de Equipamentos para Violino Solo + Playback carregado!');
  };

  const handleCarregarKitBandaCompleta = async () => {
    const kit = obterKitEquipamentosPadrao('BANDA_COMPLETA').map((eq) => ({
      ...eq,
      conferido: false,
    }));
    setListaEquipamentos(kit);
    await salvarConfiguracaoSom(kit);
    showToast('Kit de Equipamentos para Banda Completa carregado!');
  };

  const handleCarregarKitMusicoFreelancer = async () => {
    const kit = obterKitEquipamentosPadrao('FREELANCER').map((eq) => ({
      ...eq,
      conferido: false,
    }));
    setListaEquipamentos(kit);
    setNecessitaSomProprio(false);
    await salvarConfiguracaoSom(kit);
    showToast('Kit Músico Freelancer (sem PA próprio) carregado!');
  };

  const handleConfirmarCacheFreelancer360 = async () => {
    try {
      await eventosService.confirmarCacheFreelancer(eventoId);
      await carregarDados360();
      showToast('Recebimento do seu cachê freelancer confirmado como PAGO!');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao confirmar recebimento do cachê freelancer.');
    }
  };

  const toggleEquipamentoConferido = async (idx: number) => {
    const novaLista = listaEquipamentos.map((eq, i) =>
      i === idx ? { ...eq, conferido: !eq.conferido } : eq
    );
    setListaEquipamentos(novaLista);
    await salvarConfiguracaoSom(novaLista);
  };

  const adicionarItemEquipamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEquipNome.trim()) return;
    const novaLista = [
      ...listaEquipamentos,
      {
        item: novoEquipNome.trim(),
        quantidade: Math.max(1, Number(novoEquipQtd || 1)),
        conferido: false,
      },
    ];
    setListaEquipamentos(novaLista);
    setNovoEquipNome('');
    setNovoEquipQtd(1);
    await salvarConfiguracaoSom(novaLista);
  };

  const iniciarEdicaoEquipamento = (idx: number) => {
    const alvo = listaEquipamentos[idx];
    if (!alvo) return;
    setIndiceEditandoEquip(idx);
    setTextoEditandoEquip(alvo.item);
    setQtdEditandoEquip(alvo.quantidade);
  };

  const salvarEdicaoEquipamento = async (idx: number) => {
    if (!textoEditandoEquip.trim()) return;
    const novaLista = listaEquipamentos.map((eq, i) =>
      i === idx
        ? {
            ...eq,
            item: textoEditandoEquip.trim(),
            quantidade: Math.max(1, Number(qtdEditandoEquip || 1)),
          }
        : eq
    );
    setIndiceEditandoEquip(null);
    setListaEquipamentos(novaLista);
    await salvarConfiguracaoSom(novaLista);
    showToast('Equipamento atualizado com sucesso!');
  };

  const alterarQuantidadeEquipamento = async (idx: number, delta: number) => {
    const novaLista = listaEquipamentos.map((eq, i) =>
      i === idx
        ? { ...eq, quantidade: Math.max(1, Number(eq.quantidade || 1) + delta) }
        : eq
    );
    setListaEquipamentos(novaLista);
    await salvarConfiguracaoSom(novaLista);
  };

  const moverItemEquipamento = async (idx: number, direcao: 'SUBIR' | 'DESCER') => {
    const destino = direcao === 'SUBIR' ? idx - 1 : idx + 1;
    if (destino < 0 || destino >= listaEquipamentos.length) return;
    const copia = [...listaEquipamentos];
    const [movido] = copia.splice(idx, 1);
    copia.splice(destino, 0, movido);
    setListaEquipamentos(copia);
    await salvarConfiguracaoSom(copia);
  };

  const marcarTodosEquipamentos = async (conferido: boolean) => {
    const novaLista = listaEquipamentos.map((eq) => ({ ...eq, conferido }));
    setListaEquipamentos(novaLista);
    await salvarConfiguracaoSom(novaLista);
  };

  const salvarListaAtualComoKitPadrao = (tipo: TipoKitEquipamento) => {
    salvarKitEquipamentosPadrao(
      tipo,
      listaEquipamentos.map((eq) => ({ ...eq, conferido: false }))
    );
    showToast('Esta lista foi salva como o seu novo Kit Padrão!');
  };

  const removerItemEquipamento = async (idx: number) => {
    if (indiceEditandoEquip === idx) setIndiceEditandoEquip(null);
    const novaLista = listaEquipamentos.filter((_, i) => i !== idx);
    setListaEquipamentos(novaLista);
    await salvarConfiguracaoSom(novaLista);
  };

  // --- Handlers Aba 5: Parcelas do Contrato ---
  const handleAdicionarParcela = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAdicionandoParcela(true);
      await eventosService.adicionarParcela(eventoId, {
        tipo_parcela: novaParcelaTipo,
        descricao: novaParcelaDesc.trim(),
        valor_parcela: Number(novaParcelaValor || 0),
        data_vencimento: novaParcelaVencimento,
        forma_pagamento: novaParcelaForma,
        status: 'ABERTO',
      });
      setNovaParcelaDesc('');
      setNovaParcelaValor('');
      await carregarDados360();
      showToast('Nova parcela adicionada ao cronograma financeiro dos noivos!');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao adicionar parcela.');
    } finally {
      setAdicionandoParcela(false);
    }
  };

  const handleBaixarParcela = async (parcelaId: number, descricao: string) => {
    await eventosService.baixarPagamentoParcela(eventoId, parcelaId);
    await carregarDados360();
    showToast(`Recebimento da parcela "${descricao}" confirmado como PAGO!`);
  };

  const handleReverterParcela = async (parcelaId: number, descricao: string) => {
    await eventosService.atualizarParcela(eventoId, parcelaId, {
      status: 'ABERTO',
    });
    await carregarDados360();
    showToast(`Status da parcela "${descricao}" revertido para EM ABERTO.`);
  };

  const iniciarEdicaoParcela = (p: any) => {
    setParcelaEditandoId(p.id);
    setEditDescParcela(p.descricao || '');
    setEditValorParcela(String(p.valor_parcela ?? 0));
    setEditVencimentoParcela(p.data_vencimento || '');
  };

  const handleSalvarEdicaoParcela = async (parcelaId: number) => {
    if (!editDescParcela.trim()) return;
    await eventosService.atualizarParcela(eventoId, parcelaId, {
      descricao: editDescParcela.trim(),
      valor_parcela: Number(editValorParcela || 0),
      data_vencimento: editVencimentoParcela,
    });
    setParcelaEditandoId(null);
    await carregarDados360();
    showToast('Parcela financeira atualizada com sucesso!');
  };

  const handleRemoverParcela = async (parcelaId: number) => {
    if (parcelaEditandoId === parcelaId) setParcelaEditandoId(null);
    await eventosService.removerParcela(eventoId, parcelaId);
    await carregarDados360();
    showToast('Parcela removida do contrato.');
  };

  const handleConfirmarExclusaoCerimonia = async () => {
    try {
      setExcluindoEvento(true);
      await eventosService.remover(eventoId);
      navigate('/casamentos');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Erro ao excluir cerimônia.');
      setExcluindoEvento(false);
    }
  };

  if (loading && !evento) {
    return (
      <div className="py-16 text-center text-slate-500">
        Carregando Visão 360º do Casamento...
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4">
        <p className="text-slate-700 font-semibold">Casamento não encontrado.</p>
        <Link
          to="/casamentos"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Casamentos
        </Link>
      </div>
    );
  }

  const dre = evento.resumo_financeiro;
  const isEventoFreelancer = evento.tipo_contratacao === 'FREELANCER_CACHE';
  const cacheFreelancerPendente =
    isEventoFreelancer && Number(dre.saldo_a_receber_noivos || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Toast Flutuante */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-amber-500/40 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{feedbackToast}</span>
        </div>
      )}

      {/* Navegação Superior */}
      <div className="flex items-center justify-between">
        <Link
          to="/casamentos"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Lista & Calendário de Casamentos
        </Link>
        {evento.link_arquivo_contrato_pdf && (
          <a
            href={evento.link_arquivo_contrato_pdf}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            Abrir PDF do Contrato
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Cabeçalho 360º do Casamento */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-mono text-xs font-bold">
                {evento.codigo_contrato || `#${evento.id}`}
              </span>
              {isEventoFreelancer ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold border border-indigo-400">
                  <Briefcase className="w-3.5 h-3.5" />
                  FREELANCER (CACHÊ) • Banda: {evento.nome_banda_contratante || 'Outra Banda'}
                </span>
              ) : (
                <span className="px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                  MEU CONTRATO (FECHEI COM CLIENTES)
                </span>
              )}
              <span
                className={`text-xs font-bold px-3 py-0.5 rounded-full border ${
                  STATUS_EVENTO_COLORS[evento.status]
                }`}
              >
                {STATUS_EVENTO_LABELS[evento.status]}
              </span>
              <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                {FORMACAO_LABELS[evento.tipo_formacao]}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {evento.nome_noivos}
            </h1>

            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <strong>{formatDateBR(evento.data_casamento)}</strong> • Passagem de Som:{' '}
                <strong>{formatTimeShort(evento.horario_chegada_banda)}</strong> | Cerimônia:{' '}
                <strong>{formatTimeShort(evento.horario_inicio_cerimonia)}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                {evento.local_cerimonia} — {evento.cidade_cerimonia}/{evento.estado_uf}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalModoAoVivoOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-colors"
              title="Abrir Modo Apresentação Ao Vivo para Violino + Playback"
            >
              <Play className="w-4 h-4 fill-current" />
              Modo Ao Vivo (Violino + Playback)
            </button>

            <button
              type="button"
              onClick={() => setModalFolhaPalcoOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              title="Gerar Folha de Palco / Setlist com Ordem das Entradas, Tons e Deixas para Impressão/PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              Folha de Palco / Setlist PDF
            </button>

            <button
              type="button"
              onClick={() => {
                exportarDRECasamento360CSV(evento);
                showToast('Planilha DRE & Roteiro deste casamento exportada para Excel (.CSV)!');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              title="Exportar DRE Financeiro e Roteiro deste Casamento para Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Exportar Excel
            </button>

            {cacheFreelancerPendente && (
              <button
                type="button"
                onClick={handleConfirmarCacheFreelancer360}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Check className="w-4 h-4" />
                Confirmar Meu Cachê Recebido
              </button>
            )}

            <a
              href={buildWhatsAppUrl(
                evento.telefone_contato,
                isEventoFreelancer
                  ? `Olá! Tudo bem? Aqui é o violinista Micael sobre o casamento (${evento.nome_noivos}) do dia ${formatDateBR(
                      evento.data_casamento
                    )}.`
                  : `Olá ${evento.nome_noivos}! Tudo bem? Aqui é da assessoria musical MM3 Música sobre o casamento do dia ${formatDateBR(
                      evento.data_casamento
                    )}.`
              )}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {isEventoFreelancer ? 'WhatsApp Banda' : 'WhatsApp Noivos'}
            </a>

            <button
              type="button"
              onClick={() => setModalExcluirOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              title="Excluir esta cerimônia"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>

        {/* Alerta de Conflito de Agenda no Cabeçalho (se houver) */}
        {evento.alerta_conflito_agenda?.possui_conflito && (
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs space-y-1">
            <div className="font-bold flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              Atenção: Conflito ou Margem Inferior a 90 min Detectado na Mesma Data
            </div>
            {evento.alerta_conflito_agenda.conflitos.map((c) => (
              <div key={c.evento_id} className="pl-6">
                • {c.mensagem_detalhada}
              </div>
            ))}
          </div>
        )}

        {/* 4 Cards Financeiros DRE do Casamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
          <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700/70">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{isEventoFreelancer ? 'Meu Cachê Combinado' : 'Receita Bruta Contrato'}</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {formatCurrency(dre.receita_bruta)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Recebido: <strong className="text-emerald-400">{formatCurrency(dre.receita_ja_recebida)}</strong>{' '}
              • Falta: {formatCurrency(dre.saldo_a_receber_noivos)}
            </div>
          </div>

          <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700/70">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Despesas Totais (Cachês + Som)</span>
              <Wallet className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-300 mt-1">
              {formatCurrency(dre.despesas_totais)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Cachês: {formatCurrency(dre.custo_caches)} • Desloc.:{' '}
              {formatCurrency(dre.custo_deslocamento)} • Som: {formatCurrency(dre.custo_sonorizacao)}
            </div>
          </div>

          <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700/70">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Lucro Líquido da Banda</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {formatCurrency(dre.lucro_liquido_banda)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Resultado operacional líquido do evento
            </div>
          </div>

          <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700/70">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Margem de Lucro (%)</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-indigo-300 mt-1">
              {dre.margem_lucro_percentual}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Equipe: {dre.musicos_confirmados}/{dre.total_musicos_escalados} músicos confirmados
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Navegação das 5 Abas (Tabs) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'CONTRATO', label: '1. Dados & Contrato', icon: FileText },
          {
            key: 'ESCALA',
            label: `2. Escala de Músicos (${evento.escalas.length})`,
            icon: Users,
          },
          {
            key: 'REPERTORIO',
            label: `3. Repertório da Cerimônia (${evento.repertorio.length})`,
            icon: ListMusic,
          },
          { key: 'SOM', label: '4. Equipamentos de Som', icon: Speaker },
          {
            key: 'FINANCEIRO',
            label: `5. Resumo Financeiro & Parcelas (${evento.parcelas.length})`,
            icon: DollarSign,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                active
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          ABA 1: DADOS & CONTRATO
         ===================================================================== */}
      {activeTab === 'CONTRATO' && (
        <form
          onSubmit={handleSalvarContrato}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Dados Cadastrais, Modalidade (Meu Contrato vs Freelancer) & Horários
              </h2>
              <p className="text-xs text-slate-500">
                Edite qualquer informação contratual do casal, banda contratante ou link do contrato assinado
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setModalExcluirOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Cerimônia
              </button>
              <button
                type="submit"
                disabled={salvandoContrato}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4 text-amber-400" />
                {salvandoContrato ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modalidade de Contratação *
              </label>
              <select
                value={formContrato.tipo_contratacao}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    tipo_contratacao: e.target.value as TipoContratacaoEventoEnum,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {(Object.keys(TIPO_CONTRATACAO_LABELS) as TipoContratacaoEventoEnum[]).map(
                  (tc) => (
                    <option key={tc} value={tc}>
                      {TIPO_CONTRATACAO_LABELS[tc]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Banda / Produtora que te Contratou (Se Freelancer)
              </label>
              <input
                type="text"
                placeholder="Ex: Orquestra Del Chiaro (Deixe em branco se for Seu Contrato Próprio)"
                value={formContrato.nome_banda_contratante}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    nome_banda_contratante: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome dos Noivos / Evento *
              </label>
              <input
                type="text"
                required
                value={formContrato.nome_noivos}
                onChange={(e) =>
                  setFormContrato({ ...formContrato, nome_noivos: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código do Contrato
              </label>
              <input
                type="text"
                value={formContrato.codigo_contrato}
                onChange={(e) =>
                  setFormContrato({ ...formContrato, codigo_contrato: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CPF / CNPJ Contratante *
              </label>
              <input
                type="text"
                required
                value={formContrato.cpf_cnpj_contratante}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    cpf_cnpj_contratante: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp *
              </label>
              <input
                type="text"
                required
                value={formContrato.telefone_contato}
                onChange={(e) =>
                  setFormContrato({ ...formContrato, telefone_contato: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Contratante
              </label>
              <input
                type="email"
                value={formContrato.email_contratante}
                onChange={(e) =>
                  setFormContrato({ ...formContrato, email_contratante: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data do Casamento *
              </label>
              <input
                type="date"
                required
                value={formContrato.data_casamento}
                onChange={(e) =>
                  setFormContrato({ ...formContrato, data_casamento: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chegada da Banda (Som) *
              </label>
              <input
                type="time"
                required
                value={formContrato.horario_chegada_banda}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    horario_chegada_banda: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Início da Cerimônia *
              </label>
              <input
                type="time"
                required
                value={formContrato.horario_inicio_cerimonia}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    horario_inicio_cerimonia: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Local da Cerimônia *
              </label>
              <input
                type="text"
                required
                value={formContrato.local_cerimonia}
                onChange={(e) =>
                  setFormContrato({ ...formContrato, local_cerimonia: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
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
                  value={formContrato.cidade_cerimonia}
                  onChange={(e) =>
                    setFormContrato({
                      ...formContrato,
                      cidade_cerimonia: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
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
                  value={formContrato.estado_uf}
                  onChange={(e) =>
                    setFormContrato({
                      ...formContrato,
                      estado_uf: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                value={formContrato.endereco_completo}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    endereco_completo: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Formação Musical Contratada *
              </label>
              <select
                value={formContrato.tipo_formacao}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    tipo_formacao: e.target.value as FormacaoMusicalEnum,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {(Object.keys(FORMACAO_LABELS) as FormacaoMusicalEnum[]).map((f) => (
                  <option key={f} value={f}>
                    {FORMACAO_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status do Casamento *
              </label>
              <select
                value={formContrato.status}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    status: e.target.value as StatusEventoEnum,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {(Object.keys(STATUS_EVENTO_LABELS) as StatusEventoEnum[]).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_EVENTO_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Total Bruto do Contrato (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formContrato.valor_total_bruto}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    valor_total_bruto: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-bold text-emerald-700"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detalhamento da Formação
              </label>
              <input
                type="text"
                value={formContrato.descricao_formacao}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    descricao_formacao: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link para o Arquivo PDF do Contrato
              </label>
              <input
                type="url"
                value={formContrato.link_arquivo_contrato_pdf}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    link_arquivo_contrato_pdf: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações Gerais do Cerimonial / Restrições da Igreja
              </label>
              <textarea
                rows={3}
                value={formContrato.observacoes_gerais}
                onChange={(e) =>
                  setFormContrato({
                    ...formContrato,
                    observacoes_gerais: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>
        </form>
      )}

      {/* =====================================================================
          ABA 2: ESCALA DE MÚSICOS (MÓDULO C)
         ===================================================================== */}
      {activeTab === 'ESCALA' && (
        <div className="space-y-6">
          {/* Card para Escalar Novo Músico */}
          <form
            onSubmit={handleEscalarMusico}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                Escalar Músico para este Casamento
              </h2>

              <button
                type="button"
                disabled={adicionandoEscala}
                onClick={handleEscalarModoEuSozinho}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                title="Escalar você sozinho com Violino + Playback (Cachê terceirizado R$ 0)"
              >
                <Headphones className="w-4 h-4 text-amber-600" />
                Modo Eu Sozinho (Violino Solo + Playback)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecionar Músico do Elenco *
                </label>
                <select
                  value={musicoSelecionadoId}
                  onChange={(e) => handleSelecionarMusicoDropdown(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {catalogoMusicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome_completo} ({m.instrumento_principal} — Base{' '}
                      {formatCurrency(m.valor_cache_base)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instrumento no Evento *
                </label>
                <input
                  type="text"
                  required
                  value={instrumentoEscala}
                  onChange={(e) => setInstrumentoEscala(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cachê Combinado (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={cacheCombinadoEscala}
                  onChange={(e) => setCacheCombinadoEscala(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Taxa Deslocamento (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxaDeslocamentoEscala}
                  onChange={(e) => setTaxaDeslocamentoEscala(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={adicionandoEscala}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  {adicionandoEscala ? 'Escalando...' : 'Escalar Músico'}
                </button>
              </div>
            </div>
          </form>

          {/* Tabela de Músicos Escalados */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Músicos Escalados ({evento.escalas.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Cachês Pagos: <strong>{formatCurrency(dre.total_pago_musicos)}</strong> •
                  Pendentes: <strong className="text-rose-600">{formatCurrency(dre.total_pendente_musicos)}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const texto = gerarTextoRoteiroGrupoWhatsApp(evento);
                    navigator.clipboard?.writeText(texto);
                    showToast('Roteiro completo e escala copiados para colar no grupo do WhatsApp!');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Copiar Escala & Roteiro p/ Grupo WhatsApp
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-3.5 px-4">Músico & Contato</th>
                    <th className="py-3.5 px-4">Instrumento / Função</th>
                    <th className="py-3.5 px-4 text-right">Cachê + Deslocamento</th>
                    <th className="py-3.5 px-4 text-center">Confirmação Presença</th>
                    <th className="py-3.5 px-4 text-center">Status Pagamento</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evento.escalas.map((esc) => {
                    const mus = esc.musico;
                    return (
                      <tr key={esc.id} className="hover:bg-slate-50/80">
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900">
                            {mus?.nome_completo || `Músico #${esc.musico_id}`}
                          </div>
                          {mus && (
                            <div className="text-xs text-slate-500 font-mono">
                              PIX: {mus.chave_pix}
                            </div>
                          )}
                          {esc.alerta_conflito?.possui_conflito && (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-semibold">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {esc.alerta_conflito.mensagem}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {escalaEditandoId === esc.id ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={editInstrumentoEscala}
                                onChange={(e) => setEditInstrumentoEscala(e.target.value)}
                                placeholder="Instrumento / Função"
                                className="w-full px-2.5 py-1 rounded-lg border border-indigo-400 text-xs font-semibold outline-none"
                              />
                              <input
                                type="text"
                                value={editObsEscala}
                                onChange={(e) => setEditObsEscala(e.target.value)}
                                placeholder="Observações da escala..."
                                className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs outline-none"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                                {esc.instrumento_no_evento}
                              </span>
                              {esc.observacoes_escala && (
                                <div className="text-xs text-slate-500 mt-1">
                                  {esc.observacoes_escala}
                                </div>
                              )}
                            </>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          {escalaEditandoId === esc.id ? (
                            <div className="inline-flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-slate-500">Cachê R$:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editCacheEscala}
                                  onChange={(e) => setEditCacheEscala(e.target.value)}
                                  className="w-24 px-2 py-1 rounded-lg border border-indigo-400 text-xs font-bold text-right outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-slate-500">Desloc. R$:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editDeslocamentoEscala}
                                  onChange={(e) => setEditDeslocamentoEscala(e.target.value)}
                                  className="w-24 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-right outline-none"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-bold text-slate-900">
                                {formatCurrency(esc.valor_total)}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Cachê {formatCurrency(esc.valor_cache_combinado)} + Desloc.{' '}
                                {formatCurrency(esc.taxa_deslocamento_combustivel)}
                              </div>
                            </>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <select
                            value={esc.status_confirmacao}
                            onChange={(e) =>
                              handleAlterarConfirmacaoEscala(
                                esc.id,
                                e.target.value as StatusConfirmacaoEscalaEnum
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border outline-none ${
                              esc.status_confirmacao === 'CONFIRMADO'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : esc.status_confirmacao === 'RECUSOU'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <option value="PENDENTE">PENDENTE</option>
                            <option value="CONFIRMADO">CONFIRMADO</option>
                            <option value="RECUSOU">RECUSOU</option>
                          </select>
                        </td>

                        <td className="py-4 px-4 text-center">
                          {esc.status_pagamento === 'PAGO' ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                PAGO
                              </span>
                              {esc.data_pagamento && (
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  em {formatDateBR(esc.data_pagamento)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  handleReverterPagamentoMusico(
                                    esc.id,
                                    mus?.nome_completo || 'Músico'
                                  )
                                }
                                className="mt-1 text-[10px] text-slate-500 hover:text-amber-700 underline"
                                title="Reverter status para Pendente"
                              >
                                Reverter p/ Pendente
                              </button>
                            </div>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                              PENDENTE
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {escalaEditandoId === esc.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSalvarEdicaoEscala(esc.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEscalaEditandoId(null)}
                                  className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                {esc.status_pagamento === 'PENDENTE' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleBaixarPagamentoMusico(
                                        esc.id,
                                        mus?.nome_completo || 'Músico'
                                      )
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Dar Baixa (Pago)
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => iniciarEdicaoEscala(esc)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700"
                                  title="Editar Cachê / Instrumento / Deslocamento"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {mus && (
                              <>
                                <a
                                  href={gerarLinkConvocacaoMusicoWhatsApp(evento, esc)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-sm"
                                  title="Enviar Convocação Completa no WhatsApp (com Horário de Início, Local, Cachê e Roteiro de Músicas)"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  Enviar Convocação
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const textoConv = gerarTextoConvocacaoMusicoWhatsApp(
                                      evento,
                                      esc
                                    );
                                    navigator.clipboard?.writeText(textoConv);
                                    showToast(
                                      `Convocação de ${mus.nome_completo} copiada para a área de transferência!`
                                    );
                                  }}
                                  className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                                  title="Copiar Texto da Convocação"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(mus.chave_pix);
                                    showToast(`PIX de ${mus.nome_completo} copiado!`);
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                                  title="Copiar Chave PIX"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoverEscala(esc.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                              title="Remover da escala"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 3: REPERTÓRIO DA CERIMÔNIA (MÓDULO D)
         ===================================================================== */}
      {activeTab === 'REPERTORIO' && (
        <div className="space-y-6">
          {/* Formulário de Nova Música do Setlist */}
          <form
            onSubmit={handleAdicionarMusica}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Music className="w-5 h-5 text-amber-600" />
                Adicionar Música ao Roteiro da Cerimônia
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalBibliotecaOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Disc3 className="w-4 h-4 text-amber-600" />
                  Importar da Biblioteca de Playbacks ({catalogoPlaybacks.length})
                </button>

                <Link
                  to="/playbacks"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Abrir Biblioteca Geral
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Momento da Cerimônia *
                </label>
                <select
                  value={momentoCerimonia}
                  onChange={(e) =>
                    setMomentoCerimonia(e.target.value as MomentoCerimoniaEnum)
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Música *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marcha Nupcial / A Thousand Years"
                  value={nomeMusica}
                  onChange={(e) => setNomeMusica(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Artista / Versão de Referência
                </label>
                <input
                  type="text"
                  placeholder="Ex: Brooklyn Duo / Andrea Bocelli"
                  value={artistaReferencia}
                  onChange={(e) => setArtistaReferencia(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tom da Música
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: D Maior"
                    value={tomMusica}
                    onChange={(e) => setTomMusica(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    BPM
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="260"
                    value={andamentoBpm}
                    onChange={(e) => setAndamentoBpm(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Bloco de Upload / Link de Playback (VS) */}
              <div className="lg:col-span-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usaPlayback}
                      onChange={(e) => setUsaPlayback(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded"
                    />
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Headphones className="w-4 h-4 text-amber-600" />
                      Esta música utiliza Playback / Backing Track (VS) para Violino Solo
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer shadow-sm transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingPlaybackRep
                      ? 'Enviando áudio...'
                      : 'Enviar Arquivo MP3 / WAV do Computador'}
                    <input
                      type="file"
                      accept=".mp3,.wav,.m4a,.ogg,.aac,.flac,audio/*"
                      onChange={handleUploadArquivoPlaybackRepertorio}
                      className="hidden"
                    />
                  </label>
                </div>

                {(usaPlayback || linkPlaybackUrl) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Arquivo de Playback Salvo ou Link Externo (Drive / Dropbox)
                      </label>
                      <input
                        type="text"
                        placeholder="/uploads/playbacks/arquivo.mp3 ou https://..."
                        value={linkPlaybackUrl}
                        onChange={(e) => setLinkPlaybackUrl(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Duração do Playback (Ex: 03:45)
                      </label>
                      <input
                        type="text"
                        placeholder="03:45"
                        value={duracaoPlayback}
                        onChange={(e) => setDuracaoPlayback(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-mono"
                      />
                    </div>

                    <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-2">
                      {nomeArquivoPlayback && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                          Arquivo anexado: {nomeArquivoPlayback}
                        </span>
                      )}
                      <label className="inline-flex items-center gap-1.5 text-xs text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={salvarPlaybackNaBiblioteca}
                          onChange={(e) => setSalvarPlaybackNaBiblioteca(e.target.checked)}
                          className="w-3.5 h-3.5 accent-amber-600 rounded"
                        />
                        Salvar também na Biblioteca Geral de Playbacks (reutilizar em outros casamentos)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link YouTube / Spotify (Referência)
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={linkMidia}
                  onChange={(e) => setLinkMidia(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link PDF da Partitura / Cifra Violino
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={linkPartituraPdf}
                  onChange={(e) => setLinkPartituraPdf(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações de Execução / Deixa
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entrar aos 0:12s do playback..."
                  value={obsArranjo}
                  onChange={(e) => setObsArranjo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={adicionandoMusica}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  Adicionar ao Repertório
                </button>
              </div>
            </div>
          </form>

          {/* Tabela Ordenada por Momento da Cerimônia */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Disc3 className="w-4 h-4 text-amber-400" />
                <span>
                  Setlist & Playbacks da Cerimônia ({evento.repertorio.length} músicas) • Início:{' '}
                  <strong className="text-amber-300">
                    {formatTimeShort(evento.horario_inicio_cerimonia)}
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalFolhaPalcoOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Folha de Palco / Setlist (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setModalModoAoVivoOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Abrir Modo Apresentação Ao Vivo
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-3.5 px-4 w-24">Ordem</th>
                    <th className="py-3.5 px-4">Momento da Cerimônia</th>
                    <th className="py-3.5 px-4">Música & Deixas</th>
                    <th className="py-3.5 px-4">Tom / BPM</th>
                    <th className="py-3.5 px-4">Player de Playback (VS) & Mídias</th>
                    <th className="py-3.5 px-4 text-right">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evento.repertorio.map((rep, idx) => (
                    <tr key={rep.id} className="hover:bg-slate-50/80">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center">
                            {rep.ordem_execucao}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoverMusica(idx, -1)}
                              className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-25"
                              title="Subir ordem"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === evento.repertorio.length - 1}
                              onClick={() => handleMoverMusica(idx, 1)}
                              className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-25"
                              title="Descer ordem"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {repEditandoId === rep.id ? (
                          <select
                            value={editMomentoRep}
                            onChange={(e) =>
                              setEditMomentoRep(e.target.value as MomentoCerimoniaEnum)
                            }
                            className="px-2 py-1.5 rounded-lg border border-amber-400 bg-white text-xs font-bold outline-none"
                          >
                            {Object.entries(MOMENTO_CERIMONIA_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                            {MOMENTO_CERIMONIA_LABELS[rep.momento_cerimonia]}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {repEditandoId === rep.id ? (
                          <div className="space-y-1.5 min-w-[200px]">
                            <input
                              type="text"
                              value={editNomeMusicaRep}
                              onChange={(e) => setEditNomeMusicaRep(e.target.value)}
                              placeholder="Nome da música"
                              className="w-full px-2.5 py-1 rounded-lg border border-amber-400 text-xs font-bold outline-none"
                            />
                            <input
                              type="text"
                              value={editArtistaRep}
                              onChange={(e) => setEditArtistaRep(e.target.value)}
                              placeholder="Artista / Versão referência"
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs outline-none"
                            />
                            <input
                              type="text"
                              value={editObsRep}
                              onChange={(e) => setEditObsRep(e.target.value)}
                              placeholder="Deixa de entrada / arranjo"
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs outline-none"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{rep.nome_musica}</span>
                              {rep.usa_playback && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                                  PLAYBACK VS
                                </span>
                              )}
                            </div>
                            {rep.artista_versao_referencia && (
                              <div className="text-xs text-slate-500">
                                {rep.artista_versao_referencia}
                              </div>
                            )}
                            {rep.observacoes_arranjo && (
                              <div className="text-[11px] text-amber-900 bg-amber-50/70 px-2 py-1 rounded mt-1 border border-amber-200/60">
                                <strong>Deixa:</strong> {rep.observacoes_arranjo}
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {repEditandoId === rep.id ? (
                          <div className="space-y-1.5 w-28">
                            <input
                              type="text"
                              value={editTomRep}
                              onChange={(e) => setEditTomRep(e.target.value)}
                              placeholder="Tom (ex: D Maior)"
                              className="w-full px-2 py-1 rounded-lg border border-amber-400 text-xs font-mono font-bold outline-none"
                            />
                            <input
                              type="number"
                              value={editBpmRep}
                              onChange={(e) => setEditBpmRep(e.target.value)}
                              placeholder="BPM"
                              className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs outline-none"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                              {rep.tom_musica || '—'}
                            </span>
                            {rep.andamento_bpm && (
                              <span className="ml-2 text-xs text-slate-500">
                                {rep.andamento_bpm} BPM
                              </span>
                            )}
                            {rep.duracao_playback && (
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Duração: {rep.duracao_playback}
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-2 min-w-[270px]">
                          {rep.link_playback_url ? (
                            <div className="p-2 rounded-xl bg-slate-900 text-white space-y-1.5">
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-amber-300 font-semibold truncate">
                                  {rep.nome_arquivo_playback || 'Playback pronto para tocar'}
                                </span>
                                <a
                                  href={resolvePlaybackUrl(rep.link_playback_url)}
                                  download={rep.nome_arquivo_playback || true}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-300 hover:text-amber-400 shrink-0"
                                  title="Baixar Playback para tocar offline"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Baixar
                                </a>
                              </div>
                              <audio
                                controls
                                preload="metadata"
                                src={resolvePlaybackUrl(rep.link_playback_url)}
                                className="w-full h-8"
                              />
                            </div>
                          ) : (
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5 text-amber-600" />
                              Anexar MP3/WAV de Playback
                              <input
                                type="file"
                                accept=".mp3,.wav,.m4a,.ogg,audio/*"
                                onChange={(e) => handleAnexarPlaybackItemExistente(rep.id, e)}
                                className="hidden"
                              />
                            </label>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            {rep.link_referencia_midia && (
                              <a
                                href={rep.link_referencia_midia}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors"
                              >
                                <Youtube className="w-3 h-3" />
                                Referência YouTube
                              </a>
                            )}

                            {rep.link_partitura_cifra_pdf && (
                              <a
                                href={rep.link_partitura_cifra_pdf}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                Partitura Violino
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {repEditandoId === rep.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSalvarEdicaoMusica(rep.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setRepEditandoId(null)}
                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => iniciarEdicaoMusica(rep)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 text-slate-600 hover:text-amber-800"
                              title="Editar Música / Momento / Tom / Deixa"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoverMusica(rep.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                            title="Remover música do repertório"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 4: EQUIPAMENTOS DE SOM & LOGÍSTICA (MÓDULO E)
         ===================================================================== */}
      {activeTab === 'SOM' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checklist Interativo de Equipamentos */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <Speaker className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Checklist de Equipamentos de Som & Iluminação
                  </h2>
                  <p className="text-xs text-slate-500">
                    Marque os itens conferidos no carregamento do carro / passagem de som
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={necessitaSomProprio}
                  onChange={(e) => setNecessitaSomProprio(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <span className="text-xs font-bold text-slate-800">
                  Necessita Som Próprio
                </span>
              </label>
            </div>

            {/* Botões de Preset Rápido: Kit Violino Solo + Playback vs Kit Freelancer vs Kit Banda */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                Carregar Kit Padrão de Equipamentos:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCarregarKitViolinoSolo}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Kit Violino Solo + Playback
                </button>
                <button
                  type="button"
                  onClick={handleCarregarKitMusicoFreelancer}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Kit Músico Freelancer
                </button>
                <button
                  type="button"
                  onClick={handleCarregarKitBandaCompleta}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  Kit Banda Completa
                </button>
              </div>
            </div>

            {/* Adicionar novo equipamento ao checklist */}
            <form onSubmit={adicionarItemEquipamento} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Adicionar equipamento (Ex: Microfone DPA 4099 Violino, Cabo XLR)..."
                value={novoEquipNome}
                onChange={(e) => setNovoEquipNome(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden">
                  <span className="px-2.5 text-[11px] font-bold text-slate-500 uppercase">
                    Qtd:
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={novoEquipQtd}
                    onChange={(e) => setNovoEquipQtd(Math.max(1, Number(e.target.value)))}
                    className="w-16 py-2 px-2 text-sm font-bold text-center outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  Incluir Item
                </button>
              </div>
            </form>

            {/* Barra de ações rápidas do checklist */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">
                Conferidos:{' '}
                <strong className="text-emerald-700">
                  {listaEquipamentos.filter((i) => i.conferido).length}/{listaEquipamentos.length}
                </strong>{' '}
                itens
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => marcarTodosEquipamentos(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={() => marcarTodosEquipamentos(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                >
                  Desmarcar Todos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    salvarListaAtualComoKitPadrao(
                      evento.tipo_contratacao === 'FREELANCER_CACHE'
                        ? 'FREELANCER'
                        : evento.tipo_formacao === 'VIOLINO_SOLO'
                        ? 'VIOLINO_SOLO'
                        : 'BANDA_COMPLETA'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-semibold flex items-center gap-1"
                  title="Salvar esta lista de equipamentos como o seu Kit Padrão para os próximos casamentos"
                >
                  <Save className="w-3.5 h-3.5 text-amber-600" />
                  Salvar como Meu Kit Padrão
                </button>
              </div>
            </div>

            {/* Lista de itens com checkbox, edição inline, ajuste de quantidade (-/+), reordenação e exclusão */}
            {listaEquipamentos.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs">
                Nenhum equipamento na lista desta cerimônia. Adicione um item acima ou clique em um dos Kits Padrão.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {listaEquipamentos.map((eq, idx) => {
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
                                salvarEdicaoEquipamento(idx);
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
                              onClick={() => salvarEdicaoEquipamento(idx)}
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
                              onChange={() => toggleEquipamentoConferido(idx)}
                              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                            />
                            <span
                              onClick={() => iniciarEdicaoEquipamento(idx)}
                              title="Clique para editar o nome deste equipamento"
                              className={`text-sm font-medium cursor-pointer hover:text-amber-700 truncate ${
                                eq.conferido ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {eq.item}
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 shrink-0">
                            {/* Botões rápidos - / + de quantidade */}
                            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-1 py-0.5 mr-1">
                              <button
                                type="button"
                                onClick={() => alterarQuantidadeEquipamento(idx, -1)}
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
                                onClick={() => alterarQuantidadeEquipamento(idx, 1)}
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
                              onClick={() => moverItemEquipamento(idx, 'SUBIR')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === listaEquipamentos.length - 1}
                              onClick={() => moverItemEquipamento(idx, 'DESCER')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão Editar Item */}
                            <button
                              type="button"
                              onClick={() => iniciarEdicaoEquipamento(idx)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                              title="Editar nome e quantidade"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Botão Remover Item */}
                            <button
                              type="button"
                              onClick={() => removerItemEquipamento(idx)}
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

          {/* Card Técnico de Som e Custo Logístico */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mic2 className="w-5 h-5 text-amber-600" />
              Técnico Responsável & Custo
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Técnico / Empresa de Som
              </label>
              <input
                type="text"
                value={responsavelSom}
                onChange={(e) => setResponsavelSom(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp do Técnico
              </label>
              <input
                type="text"
                value={telefoneSom}
                onChange={(e) => setTelefoneSom(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custo Locação / Técnico de Som (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={custoSom}
                onChange={(e) => setCustoSom(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-bold text-rose-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status do Pagamento do Som
              </label>
              <select
                value={statusPagamentoSom}
                onChange={(e) =>
                  setStatusPagamentoSom(e.target.value as StatusPagamentoEnum)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="PENDENTE">PENDENTE</option>
                <option value="PAGO">PAGO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição do Sistema / Observações Logísticas
              </label>
              <textarea
                rows={3}
                value={obsLogistica}
                onChange={(e) => setObsLogistica(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <button
              type="button"
              disabled={salvandoSom}
              onClick={() => salvarConfiguracaoSom()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4 text-amber-400" />
              {salvandoSom ? 'Salvando...' : 'Salvar Sonorização & Recalcular DRE'}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 5: RESUMO FINANCEIRO DO EVENTO & PARCELAS (MÓDULO F)
         ===================================================================== */}
      {activeTab === 'FINANCEIRO' && (
        <div className="space-y-6">
          {/* Nova Parcela dos Noivos */}
          <form
            onSubmit={handleAdicionarParcela}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Adicionar Parcela de Recebimento dos Noivos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Parcela
                </label>
                <select
                  value={novaParcelaTipo}
                  onChange={(e) => setNovaParcelaTipo(e.target.value as TipoParcelaEnum)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {(Object.keys(TIPO_PARCELA_LABELS) as TipoParcelaEnum[]).map((t) => (
                    <option key={t} value={t}>
                      {TIPO_PARCELA_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição da Parcela *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sinal 30% / Quitação Final"
                  value={novaParcelaDesc}
                  onChange={(e) => setNovaParcelaDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={novaParcelaValor}
                  onChange={(e) => setNovaParcelaValor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vencimento *
                </label>
                <input
                  type="date"
                  required
                  value={novaParcelaVencimento}
                  onChange={(e) => setNovaParcelaVencimento(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={adicionandoParcela}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  Adicionar Parcela
                </button>
              </div>
            </div>
          </form>

          {/* Grid Comparativo: Parcelas dos Noivos vs DRE / Pagamentos da Equipe */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tabela de Parcelas dos Noivos */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cronograma de Parcelas dos Noivos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total Recebido:{' '}
                    <strong className="text-emerald-700">
                      {formatCurrency(dre.receita_ja_recebida)}
                    </strong>{' '}
                    • Saldo a Receber:{' '}
                    <strong className="text-amber-700">
                      {formatCurrency(dre.saldo_a_receber_noivos)}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Descrição & Tipo</th>
                      <th className="py-3 px-4">Vencimento</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evento.parcelas.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {p.numero_parcela}ª
                        </td>
                        <td className="py-3.5 px-4">
                          {parcelaEditandoId === p.id ? (
                            <input
                              type="text"
                              value={editDescParcela}
                              onChange={(e) => setEditDescParcela(e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg border border-indigo-400 text-xs font-bold outline-none"
                            />
                          ) : (
                            <div className="font-bold text-slate-900">{p.descricao}</div>
                          )}
                          <div className="text-xs text-slate-500 mt-0.5">
                            {TIPO_PARCELA_LABELS[p.tipo_parcela]} •{' '}
                            {FORMA_PAGAMENTO_LABELS[p.forma_pagamento]}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {parcelaEditandoId === p.id ? (
                            <input
                              type="date"
                              value={editVencimentoParcela}
                              onChange={(e) => setEditVencimentoParcela(e.target.value)}
                              className="px-2 py-1 rounded-lg border border-indigo-400 text-xs font-medium outline-none"
                            />
                          ) : (
                            <>
                              <div className="font-medium text-slate-800">
                                {formatDateBR(p.data_vencimento)}
                              </div>
                              {p.data_pagamento && (
                                <div className="text-[11px] text-emerald-700">
                                  Pago em {formatDateBR(p.data_pagamento)}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          {parcelaEditandoId === p.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editValorParcela}
                              onChange={(e) => setEditValorParcela(e.target.value)}
                              className="w-28 px-2 py-1 rounded-lg border border-indigo-400 text-xs font-bold text-right outline-none"
                            />
                          ) : (
                            formatCurrency(p.valor_parcela)
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                p.status === 'PAGO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'ATRASADO'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {STATUS_PARCELA_LABELS[p.status]}
                            </span>
                            {p.status === 'PAGO' && (
                              <button
                                type="button"
                                onClick={() => handleReverterParcela(p.id, p.descricao)}
                                className="mt-1 text-[10px] text-slate-500 hover:text-amber-700 underline"
                                title="Reverter status para Em Aberto"
                              >
                                Reverter p/ Aberto
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {parcelaEditandoId === p.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSalvarEdicaoParcela(p.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setParcelaEditandoId(null)}
                                  className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                {p.status !== 'PAGO' && (
                                  <button
                                    type="button"
                                    onClick={() => handleBaixarParcela(p.id, p.descricao)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Confirmar Recebimento
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicaoParcela(p)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700"
                                  title="Editar Parcela"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoverParcela(p.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                              title="Excluir parcela"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Demonstrativo de Resultado do Evento (DRE Completo) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  DRE Analítico do Casamento
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    exportarDRECasamento360CSV(evento);
                    showToast('Planilha DRE deste casamento exportada para Excel (.CSV)!');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar Excel
                </button>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">(+) Receita Bruta do Contrato</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(dre.receita_bruta)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pl-3">
                  <span>• Já Recebido dos Noivos</span>
                  <span className="text-emerald-700 font-semibold">
                    {formatCurrency(dre.receita_ja_recebida)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pl-3">
                  <span>• Saldo a Receber dos Noivos</span>
                  <span className="text-amber-700 font-semibold">
                    {formatCurrency(dre.saldo_a_receber_noivos)}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-2.5 flex justify-between">
                  <span className="text-slate-600">(-) Custo de Cachês Músicos</span>
                  <span className="font-semibold text-rose-600">
                    - {formatCurrency(dre.custo_caches)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">(-) Taxas de Deslocamento</span>
                  <span className="font-semibold text-rose-600">
                    - {formatCurrency(dre.custo_deslocamento)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">(-) Sonorização & Logística</span>
                  <span className="font-semibold text-rose-600">
                    - {formatCurrency(dre.custo_sonorizacao)}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-2.5 flex justify-between font-bold">
                  <span className="text-slate-700">(=) Despesas Totais do Evento</span>
                  <span className="text-rose-700">
                    {formatCurrency(dre.despesas_totais)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white mt-4 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      Lucro Líquido da Banda
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                      Margem {dre.margem_lucro_percentual}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-amber-400">
                    {formatCurrency(dre.lucro_liquido_banda)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação Rápida da Biblioteca de Playbacks (VS) */}
      {modalBibliotecaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Disc3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-bold">
                    Importar Playback da Biblioteca para esta Cerimônia
                  </h2>
                  <p className="text-xs text-slate-400">
                    Escolha o momento da cerimônia e clique em Importar para adicionar com o áudio pronto
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBibliotecaOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Momento Padrão (caso o playback não tenha momento fixo):
                </label>
                <select
                  value={momentoImportarBiblioteca}
                  onChange={(e) =>
                    setMomentoImportarBiblioteca(e.target.value as MomentoCerimoniaEnum)
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
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
              <Link
                to="/playbacks"
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Gerenciar / Subir Novos Playbacks
              </Link>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {catalogoPlaybacks.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  Nenhum playback salvo na biblioteca ainda.
                </div>
              ) : (
                catalogoPlaybacks.map((pb) => (
                  <div
                    key={pb.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {pb.nome_musica}
                        </span>
                        {pb.tom_violino && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                            {pb.tom_violino}
                          </span>
                        )}
                        {pb.momento_sugerido && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                            {MOMENTO_CERIMONIA_LABELS[pb.momento_sugerido]}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {pb.artista_versao || 'Arranjo Violino + VS'}
                        {pb.duracao_formatada ? ` • Duração: ${pb.duracao_formatada}` : ''}
                      </div>
                      <audio
                        controls
                        preload="none"
                        src={resolvePlaybackUrl(pb.arquivo_playback_url)}
                        className="w-full max-w-md h-8 mt-1"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImportarDaBiblioteca(pb)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4 text-amber-400" />
                      Importar para Cerimônia
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão da Cerimônia */}
      {modalExcluirOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-base font-bold">Excluir Cerimônia</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalExcluirOpen(false)}
                className="text-rose-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Tem certeza que deseja excluir a cerimônia de{' '}
                <strong className="text-slate-900">{evento.nome_noivos}</strong> (
                {formatDateBR(evento.data_casamento)})?
              </p>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                Esta ação excluirá permanentemente o contrato, a escala de músicos, o
                repertório, o checklist de som e as parcelas vinculadas a este casamento.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={excluindoEvento}
                  onClick={() => setModalExcluirOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={excluindoEvento}
                  onClick={handleConfirmarExclusaoCerimonia}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold flex items-center gap-2 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  {excluindoEvento ? 'Excluindo...' : 'Sim, Excluir Cerimônia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Folha de Palco / Setlist Oficial para Impressão e PDF */}
      <FolhaDePalcoModal
        open={modalFolhaPalcoOpen}
        evento={evento}
        onClose={() => setModalFolhaPalcoOpen(false)}
      />

      {/* Modal 4: Modo de Apresentação Ao Vivo (Violino + Playback) */}
      <ModoApresentacaoAoVivoModal
        open={modalModoAoVivoOpen}
        evento={evento}
        onClose={() => setModalModoAoVivoOpen(false)}
      />
    </div>
  );
};
