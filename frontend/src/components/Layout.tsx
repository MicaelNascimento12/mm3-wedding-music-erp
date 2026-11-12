import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarHeart,
  Headphones,
  LayoutDashboard,
  Music4,
  Plane,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users2,
  Wifi,
} from 'lucide-react';
import { assinarStatusConexao, obterUltimoStatusOnline } from '../services/api';
import { SincronizacaoDispositivosModal } from './SincronizacaoDispositivosModal';

export const Layout: React.FC = () => {
  const location = useLocation();
  const [online, setOnline] = useState<boolean>(obterUltimoStatusOnline());
  const [modalSyncOpen, setModalSyncOpen] = useState(false);

  useEffect(() => {
    return assinarStatusConexao((status) => setOnline(status));
  }, []);

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard Executivo',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
      description: 'KPIs, DRE & Vencimentos',
    },
    {
      to: '/casamentos',
      label: 'Casamentos & Agenda',
      shortLabel: 'Casamentos',
      icon: CalendarHeart,
      description: 'Tabela, Calendário & Conflitos',
    },
    {
      to: '/musicos',
      label: 'Elenco de Músicos',
      shortLabel: 'Músicos',
      icon: Users2,
      description: 'Cachês, PIX & WhatsApp',
    },
    {
      to: '/playbacks',
      label: 'Playbacks & Violino Solo',
      shortLabel: 'Playbacks',
      icon: Headphones,
      description: 'Acervo VS, Player & Som Solo',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      {/* Barra Superior Mobile / Tablet Compacto (Poco X6 / Redmi Pad Retrato) */}
      <header className="lg:hidden bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow">
            <Music4 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">Gestão Casamentos</span>
              <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                App
              </span>
            </div>
            <p className="text-[10px] text-slate-400">PC • Redmi Pad Pro • Poco X6</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalSyncOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
            online
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}
        >
          {online ? <Wifi className="w-3.5 h-3.5" /> : <Plane className="w-3.5 h-3.5" />}
          <span>{online ? 'Sincronizar' : 'Modo Offline'}</span>
        </button>
      </header>

      {/* Navegação Horizontal Mobile / Tablet Retrato */}
      <nav className="lg:hidden bg-slate-900/95 text-slate-200 px-3 py-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto sticky top-[61px] z-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCasamentoDetail =
            item.to === '/casamentos' && location.pathname.startsWith('/casamentos/');
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => {
                const active = isActive || isCasamentoDetail;
                return `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`;
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{item.shortLabel}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Lateral Fixa (Desktop & Redmi Pad Pro Paisagem) */}
      <aside className="hidden lg:flex w-72 bg-slate-900 text-slate-100 flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
            <Music4 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white">MM3 Música</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ERP Pro
              </span>
            </div>
            <p className="text-xs text-slate-400">Assessoria Musical de Casamentos</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Módulos de Gestão
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCasamentoDetail =
              item.to === '/casamentos' && location.pathname.startsWith('/casamentos/');

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => {
                  const active = isActive || isCasamentoDetail;
                  return `group flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-150 ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/15'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`;
                }}
              >
                {({ isActive }) => {
                  const active = isActive || isCasamentoDetail;
                  return (
                    <>
                      <div
                        className={`p-2 rounded-lg transition-colors ${
                          active
                            ? 'bg-slate-950/15 text-slate-950'
                            : 'bg-slate-800 text-amber-400 group-hover:bg-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm leading-tight">{item.label}</span>
                        <span
                          className={`text-[11px] mt-0.5 ${
                            active ? 'text-slate-900/80' : 'text-slate-400'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </nav>

        {/* Botão de Sincronização Tablet / Celular / Modo Avião */}
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setModalSyncOpen(true)}
            className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Tablet & Celular (APK)</span>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  online
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {online ? <Wifi className="w-2.5 h-2.5" /> : <Plane className="w-2.5 h-2.5" />}
                {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 group-hover:text-slate-300 leading-snug">
              Sincronizar Redmi Pad Pro, Poco X6 e Backup para Modo Avião
            </p>
          </button>
        </div>

        <div className="p-4 m-4 mt-2 rounded-xl bg-slate-800/70 border border-slate-700/60">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Detector de Conflito Ativo</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Janela de segurança configurada em <strong>90 minutos</strong> entre cerimônias e passagens de som.
          </p>
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Micael • Diretor Musical</span>
          </div>
          <span className="text-[11px] text-slate-500">v2.0 App</span>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {modalSyncOpen && (
        <SincronizacaoDispositivosModal
          onClose={() => setModalSyncOpen(false)}
          onDataSynchronized={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};
