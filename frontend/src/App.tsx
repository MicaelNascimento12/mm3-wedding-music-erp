import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CasamentosPage } from './pages/CasamentosPage';
import { CasamentoDetalhe360Page } from './pages/CasamentoDetalhe360Page';
import { MusicosPage } from './pages/MusicosPage';
import { PlaybacksPage } from './pages/PlaybacksPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="casamentos" element={<CasamentosPage />} />
          <Route path="casamentos/:id" element={<CasamentoDetalhe360Page />} />
          <Route path="musicos" element={<MusicosPage />} />
          <Route path="playbacks" element={<PlaybacksPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
