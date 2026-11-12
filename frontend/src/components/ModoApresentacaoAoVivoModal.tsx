import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Disc3,
  FileText,
  Music,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
  Youtube,
} from 'lucide-react';
import { EventoCasamento360, RepertorioItem } from '../types';
import {
  FORMACAO_LABELS,
  MOMENTO_CERIMONIA_LABELS,
  formatDateBR,
  formatTimeShort,
  resolvePlaybackUrl,
} from '../utils/formatters';

interface ModoApresentacaoAoVivoModalProps {
  open: boolean;
  evento: EventoCasamento360;
  onClose: () => void;
}

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ModoApresentacaoAoVivoModal: React.FC<
  ModoApresentacaoAoVivoModalProps
> = ({ open, evento, onClose }) => {
  const repertorio = evento.repertorio || [];
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [concluidosIds, setConcluidosIds] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [horaAtual, setHoraAtual] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  const itemAtual: RepertorioItem | undefined = repertorio[indiceAtual];
  const proximoItem: RepertorioItem | undefined = repertorio[indiceAtual + 1];

  // Relógio de palco em tempo real
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      setHoraAtual(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  // Limpa fade e pausa áudio ao trocar de música ou fechar modal
  const limparFade = () => {
    if (fadeIntervalRef.current) {
      window.clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    setIsFadingOut(false);
  };

  useEffect(() => {
    limparFade();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVolume(1);
  }, [indiceAtual, open]);

  useEffect(() => {
    return () => {
      limparFade();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (!open) return null;

  const handleTogglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !itemAtual?.link_playback_url) return;

    limparFade();
    if (audio.paused) {
      audio.volume = volume;
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Erro ao reproduzir playback:', err);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleReiniciarZero = () => {
    const audio = audioRef.current;
    if (!audio) return;
    limparFade();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    setVolume(1);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  /**
   * Fade Out Suave (3 segundos): ideal quando a noiva/padrinhos chegam ao altar antes da música acabar
   */
  const handleFadeOutSuave = () => {
    const audio = audioRef.current;
    if (!audio || audio.paused || isFadingOut) return;

    limparFade();
    setIsFadingOut(true);
    const startVol = audio.volume;
    const steps = 30;
    const stepTime = 100; // 30 * 100ms = 3.0 segundos
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep += 1;
      const novoVol = Math.max(0, startVol * (1 - currentStep / steps));
      if (audioRef.current) {
        audioRef.current.volume = novoVol;
      }
      setVolume(novoVol);

      if (currentStep >= steps) {
        limparFade();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.volume = 1;
        }
        setIsPlaying(false);
        setVolume(1);
      }
    }, stepTime);
  };

  const toggleConcluido = (id: number) => {
    setConcluidosIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const avancarParaProxima = (marcarAtualConcluida = true) => {
    if (marcarAtualConcluida && itemAtual && !concluidosIds.includes(itemAtual.id)) {
      setConcluidosIds((prev) => [...prev, itemAtual.id]);
    }
    if (indiceAtual < repertorio.length - 1) {
      setIndiceAtual(indiceAtual + 1);
    }
  };

  const voltarParaAnterior = () => {
    if (indiceAtual > 0) {
      setIndiceAtual(indiceAtual - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Elemento de Áudio Único Controlado */}
      {itemAtual?.link_playback_url && (
        <audio
          ref={audioRef}
          src={resolvePlaybackUrl(itemAtual.link_playback_url)}
          preload="auto"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onEnded={() => {
            setIsPlaying(false);
            if (itemAtual && !concluidosIds.includes(itemAtual.id)) {
              setConcluidosIds((prev) => [...prev, itemAtual.id]);
            }
          }}
        />
      )}

      {/* Barra Superior de Palco */}
      <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Disc3 className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} />
            Modo Palco Ao Vivo • Violino + Playback
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
              {evento.nome_noivos}
            </h2>
            <p className="text-xs text-slate-400">
              {formatDateBR(evento.data_casamento)} • {evento.local_cerimonia} •{' '}
              {FORMACAO_LABELS[evento.tipo_formacao]}
            </p>
          </div>
        </div>

        {/* Relógio e Horário de Início da Cerimônia */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Trava Anti-Duplo Áudio Ativa
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>
              Início Cerimônia:{' '}
              <strong className="text-white text-sm">
                {formatTimeShort(evento.horario_inicio_cerimonia)}
              </strong>
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono text-sm font-black text-amber-400">
            {horaAtual}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
            Sair do Modo Palco
          </button>
        </div>
      </div>

      {/* Área Principal dividida entre Console da Música Atual (Esquerda) e Fila do Roteiro (Direita) */}
      {repertorio.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Music className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-xl font-bold text-white">
            Nenhuma música cadastrada no repertório
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Adicione as músicas na aba Repertório & Playbacks para usar o Modo Apresentação Ao Vivo.
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Painel Principal da Música / Entrada Atual (8 colunas) */}
          <div className="lg:col-span-8 p-5 sm:p-8 overflow-y-auto flex flex-col justify-between space-y-6">
            {itemAtual && (
              <>
                <div className="space-y-5">
                  {/* Topo do Card: Ordem Exata + Nome da Entrada */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2.5">
                      <span className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-base sm:text-lg">
                        {itemAtual.ordem_execucao}ª ENTRADA
                      </span>
                      <span className="px-4 py-1.5 rounded-xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black text-base sm:text-xl uppercase tracking-wide">
                        {MOMENTO_CERIMONIA_LABELS[itemAtual.momento_cerimonia]}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleConcluido(itemAtual.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                        concluidosIds.includes(itemAtual.id)
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {concluidosIds.includes(itemAtual.id)
                        ? 'Entrada Realizada ✓'
                        : 'Marcar Entrada Realizada'}
                    </button>
                  </div>

                  {/* Título Gigante da Música */}
                  <div>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                      {itemAtual.nome_musica}
                    </h1>
                    {itemAtual.artista_versao_referencia && (
                      <p className="text-base sm:text-xl text-slate-300 font-medium mt-1">
                        {itemAtual.artista_versao_referencia}
                      </p>
                    )}
                  </div>

                  {/* Cards Gigantes de TOM, BPM e Modo Playback */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-2xl bg-slate-900 border-2 border-amber-400/80">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                        Tom (Violino / Banda)
                      </div>
                      <div className="text-2xl sm:text-3xl font-mono font-black text-white mt-1">
                        {itemAtual.tom_musica || 'Original'}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        Andamento / BPM
                      </div>
                      <div className="text-2xl sm:text-3xl font-mono font-black text-slate-100 mt-1">
                        {itemAtual.andamento_bpm ? `${itemAtual.andamento_bpm} BPM` : 'Livre'}
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        Partitura & Apoio
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {itemAtual.link_partitura_cifra_pdf ? (
                          <a
                            href={itemAtual.link_partitura_cifra_pdf}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <FileText className="w-4 h-4" />
                            Abrir Partitura PDF
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">Sem PDF anexado</span>
                        )}
                        {itemAtual.link_referencia_midia && (
                          <a
                            href={itemAtual.link_referencia_midia}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Youtube className="w-3.5 h-3.5" />
                            Ref.
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Deixa de Entrada em Fonte Grande para Leitura na Estante */}
                  <div className="p-5 rounded-2xl bg-amber-500/15 border-2 border-amber-400/70">
                    <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      Deixa de Entrada / Orientação de Execução Ao Vivo
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-amber-100 leading-snug">
                      {itemAtual.observacoes_arranjo ||
                        'Aguardar sinal do cerimonialista para iniciar a execução.'}
                    </div>
                  </div>
                </div>

                {/* Console de Disparo do Playback (VS) */}
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  {itemAtual.link_playback_url ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-xs font-black">
                            PLAYBACK VS PRONTO
                          </span>
                          <span className="text-xs text-slate-300 font-mono truncate max-w-xs sm:max-w-md">
                            {itemAtual.nome_arquivo_playback || itemAtual.nome_musica}
                          </span>
                        </div>
                        <div className="font-mono text-lg sm:text-xl font-black text-amber-400">
                          {formatSeconds(currentTime)}{' '}
                          <span className="text-slate-500 text-sm">/</span>{' '}
                          {duration > 0
                            ? formatSeconds(duration)
                            : itemAtual.duracao_playback || '00:00'}
                        </div>
                      </div>

                      {/* Barra de Progresso Deslizante */}
                      <input
                        type="range"
                        min={0}
                        max={duration > 0 ? duration : 100}
                        step={0.1}
                        value={currentTime}
                        onChange={(e) => {
                          const novoTempo = Number(e.target.value);
                          setCurrentTime(novoTempo);
                          if (audioRef.current) {
                            audioRef.current.currentTime = novoTempo;
                          }
                        }}
                        className="w-full h-3 bg-slate-800 rounded-lg accent-amber-400 cursor-pointer"
                      />

                      {/* Botões Gigantes de Controle de Palco */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={handleTogglePlayPause}
                            className={`px-7 py-4 rounded-2xl font-black text-base sm:text-lg flex items-center gap-2.5 shadow-lg transition-all ${
                              isPlaying
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="w-6 h-6 fill-current" />
                                PAUSAR PLAYBACK
                              </>
                            ) : (
                              <>
                                <Play className="w-6 h-6 fill-current" />
                                TOCAR PLAYBACK (VS)
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleFadeOutSuave}
                            disabled={!isPlaying || isFadingOut}
                            className="px-4 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-colors"
                            title="Abaixa o volume suavemente em 3 segundos quando a entrada termina no altar"
                          >
                            <VolumeX className="w-5 h-5" />
                            {isFadingOut ? 'Fazendo Fade Out...' : 'Fade Out Suave (3s)'}
                          </button>

                          <button
                            type="button"
                            onClick={handleReiniciarZero}
                            className="px-4 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-1.5"
                            title="Voltar playback para 00:00"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Voltar 0:00
                          </button>
                        </div>

                        {/* Controle de Volume */}
                        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800">
                          <Volume2 className="w-4 h-4 text-amber-400" />
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.02}
                            value={volume}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setVolume(v);
                              if (audioRef.current) {
                                audioRef.current.volume = v;
                              }
                            }}
                            className="w-24 accent-amber-400 cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold text-slate-300 w-9 text-right">
                            {Math.round(volume * 100)}%
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
                      <div>
                        <div className="text-sm font-bold text-amber-300">
                          Execução Acústica / Ao Vivo (Sem arquivo de áudio anexado nesta faixa)
                        </div>
                        <p className="text-xs text-slate-400">
                          Caso queira tocar com base (VS), anexe o arquivo MP3/WAV na aba Repertório & Playbacks.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Barra de Navegação Rápida Entre Entradas */}
                  <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={indiceAtual === 0}
                      onClick={voltarParaAnterior}
                      className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs sm:text-sm font-bold flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Entrada Anterior
                    </button>

                    {proximoItem && (
                      <div className="hidden sm:block text-center text-xs text-slate-400">
                        Próxima entrada ({proximoItem.ordem_execucao}º):{' '}
                        <strong className="text-amber-300">
                          {MOMENTO_CERIMONIA_LABELS[proximoItem.momento_cerimonia]}
                        </strong>{' '}
                        — {proximoItem.nome_musica} ({proximoItem.tom_musica || '—'})
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={indiceAtual >= repertorio.length - 1}
                      onClick={() => avancarParaProxima(true)}
                      className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 text-xs sm:text-sm font-black flex items-center gap-2"
                    >
                      Concluir & Próxima Entrada
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Barra Lateral Direita: Fila Completa das Entradas da Cerimônia (4 colunas) */}
          <div className="lg:col-span-4 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Ordem das Entradas ({concluidosIds.length}/{repertorio.length} concluídas)
              </span>
              <span className="text-[11px] text-amber-400 font-bold">
                Toque para selecionar
              </span>
            </div>

            <div className="p-3.5 overflow-y-auto space-y-2 flex-1">
              {repertorio.map((rep, idx) => {
                const selecionada = idx === indiceAtual;
                const concluida = concluidosIds.includes(rep.id);
                return (
                  <div
                    key={rep.id}
                    onClick={() => setIndiceAtual(idx)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selecionada
                        ? 'bg-amber-500/20 border-2 border-amber-400 shadow-md'
                        : concluida
                        ? 'bg-emerald-950/30 border-emerald-800/50 opacity-75 hover:opacity-100'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                            selecionada
                              ? 'bg-amber-400 text-slate-950'
                              : concluida
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {concluida ? '✓' : rep.ordem_execucao}
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                          {MOMENTO_CERIMONIA_LABELS[rep.momento_cerimonia]}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-mono text-xs font-bold shrink-0">
                        {rep.tom_musica || '—'}
                      </span>
                    </div>

                    <div className="mt-1.5 pl-8">
                      <div className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span>{rep.nome_musica}</span>
                        {rep.usa_playback && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black">
                            VS
                          </span>
                        )}
                      </div>
                      {rep.observacoes_arranjo && (
                        <div className="text-[11px] text-amber-200/80 mt-0.5 line-clamp-1">
                          Deixa: {rep.observacoes_arranjo}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
