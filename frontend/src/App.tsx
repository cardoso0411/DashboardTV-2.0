import { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { CatalogPage } from './pages/CatalogPage';
import { EmptyPage } from './pages/EmptyPage';
import { PlatformPage } from './pages/PlatformPage';
import { LmsPage } from './pages/LmsPage';
import { TvPage } from './pages/Tvpage';

export default function App() {
  const [activePage, setActivePage] = useState(() =>
    window.location.hash === '#painel-tv' ? 'Painel TV' : 'Visão Geral',
  );

  function navigate(item: string) {
    setActivePage(item);
    const target = item === 'Painel TV'
      ? `${window.location.pathname}${window.location.search}#painel-tv`
      : `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', target);
  }

  if (activePage === 'Catálogo Digital') {
    return <CatalogPage onNavigate={navigate} />;
  }

  if (activePage === 'Visão Geral') {
    return <DashboardPage onNavigate={navigate} />;
  }

  if (activePage === 'Painel TV') {
    return <TvPage onNavigate={navigate} />;
  }

  if (activePage === 'Plataforma Demo') {
    return <PlatformPage onNavigate={navigate} />;
  }

  if (activePage === 'Ambiente LMS') {
    return <LmsPage onNavigate={navigate} />;
  }

  return <EmptyPage title={activePage} onNavigate={navigate} />;
}