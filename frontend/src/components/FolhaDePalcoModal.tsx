import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Disc3,
  FileText,
  MapPin,
  Music,
  Printer,
  X,
} from 'lucide-react';
import { EventoCasamento360 } from '../types';
import {
  MOMENTO_CERIMONIA_LABELS,
  formatDateBR,
  formatTimeShort,
} from '../utils/formatters';
import {
  gerarTextoRoteiroGrupoWhatsApp,
  imprimirFolhaDePalcoPDF,
} from '../utils/exportadores';

interface FolhaDePalcoModalProps {
  open: boolean;
  evento: EventoCasamento360;
  onClose: () => void;
}

export const FolhaDePalcoModal: React.FC<FolhaDePalcoModalProps> = ({
  open,
  evento,
  onClose,
}) => {
  const [copiadoWhatsApp, setCopiadoWhatsApp] = useState(false);

  if (!open) return null;

  const handleCopiarRoteiroWhatsApp = () => {
    const texto = gerarTextoRoteiroGrupoWhatsApp(evento);
    navigator.clipboard?.writeText(texto);
    setCopiadoWhatsApp(true);
    setTimeout(() => setCopiadoWhatsApp(false), 2600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Barra Superior de Controle */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Folha de Palco & Roteiro da Cerimônia
              </h2>
              <p className="text-xs text-slate-300">
                Visualização limpa para estante de partitura, impressão A4/PDF ou envio no WhatsApp
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopiarRoteiroWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiadoWhatsApp ? (
                <>
                  <Check className="w-4 h-4" />
                  Roteiro Copiado p/ WhatsApp!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Roteiro p/ WhatsApp
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => imprimirFolhaDePalcoPDF(evento)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar em PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo da Folha de Palco */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/60">
          {/* Cabeçalho da Cerimônia com Horário de Início em Grande Destaque */}
          <div className="bg-white rounded-2xl border-2 border-slate-900 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-extrabold uppercase tracking-wider">
                Folha de Palco & Roteiro da Cerimônia
              </div>
              <h1 className="text-2xl font-black text-slate-900">
                {evento.nome_noivos}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                  📅 Data: {formatDateBR(evento.data_casamento)}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  {evento.local_cerimonia} ({evento.cidade_cerimonia}/{evento.estado_uf})
                </span>
              </div>
              {evento.endereco_completo && (
                <div className="text-xs text-slate-500">
                  <strong>Endereço:</strong> {evento.endereco_completo}
                </div>
              )}
            </div>

            {/* Quadro de Horários da Cerimônia (Apenas Chegada e Início da Cerimônia) */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-center">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Chegada / Som
                </div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {formatTimeShort(evento.horario_chegada_banda)}
                </div>
              </div>

              <div className="px-5 py-3 rounded-xl border-2 border-slate-900 bg-amber-100 text-center shadow-sm">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-950 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-800" />
                  Início Cerimônia
                </div>
                <div className="text-2xl font-black text-slate-950 mt-0.5">
                  {formatTimeShort(evento.horario_inicio_cerimonia)}
                </div>
              </div>
            </div>
          </div>

          {/* Tabela Oficial: Ordem Exata das Músicas com Nome das Entradas, Tons e Deixas */}
          <div className="bg-white rounded-2xl border-2 border-slate-900 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
                <Music className="w-4 h-4 text-amber-400" />
                <span>
                  Ordem Exata das Músicas & Entradas da Cerimônia ({evento.repertorio.length})
                </span>
              </div>
              <span className="text-[11px] text-amber-300 font-semibold">
                Início Marcado: {formatTimeShort(evento.horario_inicio_cerimonia)}
              </span>
            </div>

            {evento.repertorio.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Nenhuma música cadastrada no repertório deste casamento ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {evento.repertorio.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 hover:bg-amber-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      {/* Número da Ordem */}
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-black text-base flex items-center justify-center shrink-0 mt-0.5">
                        {rep.ordem_execucao}º
                      </div>

                      <div className="space-y-1.5 flex-1">
                        {/* Nome da Entrada (Entrada do Noivo, Entrada das Alianças, etc.) */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 rounded-lg bg-amber-100 border border-amber-400 text-amber-950 text-xs font-black uppercase tracking-wide">
                            {MOMENTO_CERIMONIA_LABELS[rep.momento_cerimonia]}
                          </span>
                          {rep.usa_playback && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900 text-amber-300 text-[11px] font-extrabold">
                              <Disc3 className="w-3 h-3" />
                              PLAYBACK VS
                            </span>
                          )}
                          {rep.duracao_playback && (
                            <span className="text-xs font-mono font-semibold text-slate-500">
                              ⏱ {rep.duracao_playback}
                            </span>
                          )}
                        </div>

                        {/* Nome da Música e Artista */}
                        <div>
                          <div className="text-lg font-black text-slate-900">
                            {rep.nome_musica}
                          </div>
                          {rep.artista_versao_referencia && (
                            <div className="text-xs font-medium text-slate-600">
                              Versão / Referência: {rep.artista_versao_referencia}
                            </div>
                          )}
                        </div>

                        {/* Deixa de Entrada / Arranjo */}
                        {rep.observacoes_arranjo && (
                          <div className="px-3 py-2 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-xs text-amber-950 font-medium">
                            <strong className="uppercase tracking-wider text-[10px] font-black text-amber-800 mr-1.5">
                              Deixa de Entrada:
                            </strong>
                            {rep.observacoes_arranjo}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coluna Direita: Tom da Música e BPM em Destaque */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-center min-w-[110px]">
                        <div className="text-[10px] font-bold uppercase text-amber-400">
                          Tom da Música
                        </div>
                        <div className="text-base font-mono font-black">
                          {rep.tom_musica || '—'}
                        </div>
                      </div>
                      {rep.andamento_bpm && (
                        <span className="text-xs font-bold text-slate-600 font-mono">
                          {rep.andamento_bpm} BPM
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
