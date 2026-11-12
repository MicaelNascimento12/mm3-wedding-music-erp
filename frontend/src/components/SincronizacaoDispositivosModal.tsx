import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  CloudDownload,
  Download,
  HardDrive,
  Laptop,
  Plane,
  RefreshCw,
  Smartphone,
  Tablet,
  Upload,
  Wifi,
  X,
} from 'lucide-react';
import {
  carregarDBLocal,
  exportarBackupCompletoJSON,
  importarBackupCompletoJSON,
  obterUrlServidorRemoto,
  salvarUrlServidorRemoto,
} from '../services/offlineStore';
import { puxarTudoDoServidorPC } from '../services/api';

interface SincronizacaoDispositivosModalProps {
  onClose: () => void;
  onDataSynchronized: () => void;
}

export const SincronizacaoDispositivosModal: React.FC<SincronizacaoDispositivosModalProps> = ({
  onClose,
  onDataSynchronized,
}) => {
  const dbAtual = carregarDBLocal();
  const [servidorUrl, setServidorUrl] = useState<string>(
    obterUrlServidorRemoto() || 'http://10.8.119.1:8000'
  );
  const [modoAutonomo, setModoAutonomo] = useState<boolean>(!obterUrlServidorRemoto());
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSincronizarComPC = async () => {
    setMensagemSucesso(null);
    setMensagemErro(null);
    const urlLimpa = servidorUrl.trim().replace(/\/+$/, '');
    if (!urlLimpa.startsWith('http://') && !urlLimpa.startsWith('https://')) {
      setMensagemErro('Informe o endereço completo começando com http:// (ex: http://10.8.119.1:8000)');
      return;
    }
    if (/\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(urlLimpa)) {
      setMensagemErro(
        '"localhost" aponta para o próprio Tablet/Celular, não para o PC. Use o IP do computador mostrado na janela do INICIAR_SISTEMA_REDE.bat (ex: http://192.168.100.32:8000).'
      );
      return;
    }

    setSincronizando(true);
    try {
      salvarUrlServidorRemoto(urlLimpa);
      setModoAutonomo(false);
      const res = await puxarTudoDoServidorPC(urlLimpa);
      setMensagemSucesso(
        `Sincronização concluída! ${res.totalEventos} casamento(s), ${res.totalMusicos} músico(s) e ${res.totalPlaybacks} playback(s) salvos na memória offline deste aparelho.`
      );
      onDataSynchronized();
    } catch (err: any) {
      setMensagemErro(
        'Não foi possível conectar ao PC neste endereço. Verifique se o sistema está aberto no computador e se o Tablet/Celular está no mesmo Wi-Fi.'
      );
    } finally {
      setSincronizando(false);
    }
  };

  const handleAtivarModoAutonomoOffline = () => {
    salvarUrlServidorRemoto('');
    setModoAutonomo(true);
    setMensagemErro(null);
    setMensagemSucesso(
      'Modo Aplicativo Offline / Modo Avião ativado! O aparelho agora usa 100% a memória interna com velocidade instantânea.'
    );
    onDataSynchronized();
  };

  const handleExportarBackup = () => {
    setMensagemErro(null);
    exportarBackupCompletoJSON();
    setMensagemSucesso(
      'Arquivo de backup (.json) gerado! Você pode enviá-lo pelo WhatsApp para abrir no seu Redmi Pad Pro, Poco X6 ou Computador.'
    );
  };

  const handleImportarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMensagemErro(null);
    setMensagemSucesso(null);
    try {
      const db = await importarBackupCompletoJSON(file);
      setMensagemSucesso(
        `Backup restaurado com sucesso! ${db.eventos360.length} casamento(s) e ${db.musicos.length} músico(s) carregados neste aparelho.`
      );
      onDataSynchronized();
    } catch (err: any) {
      setMensagemErro(err?.message || 'Erro ao importar arquivo de backup.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
              <Tablet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Central de Dispositivos & Modo Offline (PC • Redmi Pad Pro • Poco X6)
              </h2>
              <p className="text-xs text-slate-400">
                Use como aplicativo nativo no Tablet e Celular mesmo em Modo Avião na cerimônia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Status da Memória Interna deste Aparelho */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700 mt-0.5">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Memória Offline Deste Aparelho
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <Plane className="h-3 w-3" /> Pronto p/ Modo Avião
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Salvos localmente:{' '}
                  <strong>{dbAtual.eventos360.length} casamento(s)</strong>,{' '}
                  <strong>{dbAtual.musicos.length} músico(s)</strong> e{' '}
                  <strong>{dbAtual.playbacks.length} playback(s)</strong>.
                </p>
                {dbAtual.updatedAt && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Última atualização local:{' '}
                    {new Date(dbAtual.updatedAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAtivarModoAutonomoOffline}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
                modoAutonomo
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Plane className="h-3.5 w-3.5" />
              {modoAutonomo ? 'Modo Autônomo Ativo' : 'Ativar Modo Avião / Local'}
            </button>
          </div>

          {mensagemSucesso && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{mensagemSucesso}</span>
            </div>
          )}

          {mensagemErro && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-medium">
              {mensagemErro}
            </div>
          )}

          {/* Download direto do Instalador Android (.APK) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Tablet className="h-4 w-4 text-amber-600" />
                <span>Aplicativo Android Nativo (.APK) — Redmi Pad Pro & Poco X6</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Baixe o arquivo <strong>Gestao-de-Casamentos.apk</strong> diretamente ou envie pelo
                WhatsApp para instalar no seu Tablet e Celular. Funciona 100% offline.
              </p>
            </div>
            <a
              href="/baixar-apk"
              download="Gestao-de-Casamentos.apk"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-sm hover:bg-amber-400 transition"
            >
              <Download className="h-4 w-4" />
              Baixar APK Android
            </a>
          </div>

          {/* Opção 1: Backup via Arquivo (WhatsApp / Google Drive / Cabo USB) */}
          <div className="rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Smartphone className="h-4 w-4 text-indigo-600" />
              <span>1. Transferir Dados entre PC, Redmi Pad Pro e Poco X6 (Arquivo Backup)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Funciona <strong>sem precisar configurar rede ou IP</strong>: clique em{' '}
              <strong>Exportar Backup</strong> no computador (ou celular), envie o arquivo para você
              mesmo no WhatsApp e clique em <strong>Importar Backup</strong> dentro do aplicativo no
              Tablet/Celular.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportarBackup}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
              >
                <Download className="h-4 w-4" />
                Exportar Backup Completo (.json)
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportarArquivo}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Upload className="h-4 w-4 text-indigo-600" />
                Importar Backup (.json)
              </button>
            </div>
          </div>

          {/* Opção 2: Sincronização Direta via Wi-Fi com o Computador */}
          <div className="rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Wifi className="h-4 w-4 text-amber-600" />
              <span>2. Sincronizar Direto pelo Wi-Fi com o Computador</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Quando estiver em casa no mesmo Wi-Fi do seu computador (com o{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono">
                INICIAR_SISTEMA_REDE.bat
              </code>{' '}
              aberto no PC), informe o endereço IP do PC abaixo para puxar todos os casamentos de
              uma vez para o aplicativo do Tablet ou Celular:
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <div className="relative flex-1">
                <Laptop className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={servidorUrl}
                  onChange={(e) => setServidorUrl(e.target.value)}
                  placeholder="http://10.8.119.1:8000"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-xs font-mono text-slate-800 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                disabled={sincronizando}
                onClick={handleSincronizarComPC}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shrink-0"
              >
                {sincronizando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <CloudDownload className="h-4 w-4 text-amber-400" />
                    Conectar & Baixar Tudo do PC
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end bg-slate-50 px-6 py-3.5 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
