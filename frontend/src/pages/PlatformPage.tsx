import { useEffect, useState } from 'react';
import { MetricChart } from '../components/charts/MetricChart';
import { Sidebar } from '../components/layout/Sidebar';
import type { PlatformData } from '../types/dashboard';
import { fetchJsonWithRetry } from '../utils/api';

type PlatformPageProps = {
  onNavigate: (item: string) => void;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function AccessCard({
  name,
  accesses,
  color,
}: {
  name: string;
  accesses: { label: string; value: number }[];
  color: string;
}) {
  return (
    <article className="panel platform-chart-card">
      <div className="panel-header">
        <div>
          <h2>{name}</h2>
          <span>Acessos por dia</span>
        </div>
      </div>
      <div className="chart-box small">
        <MetricChart
          type="bar"
          labels={accesses.map((point) => point.label)}
          values={accesses.map((point) => point.value)}
          color={color}
          title="Acessos"
        />
      </div>
    </article>
  );
}

export function PlatformPage({ onNavigate }: PlatformPageProps) {
  const [data, setData] = useState<PlatformData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    let refreshTimer: number;

    async function loadPlatform() {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await fetchJsonWithRetry<PlatformData>('/api/platform', controller.signal);
        setData(result);
        setError(result.stale ? 'Dados anteriores exibidos: a atualização mais recente falhou.' : null);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError('Não foi possível atualizar os dados. Uma nova tentativa será feita automaticamente.');
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) refreshTimer = window.setTimeout(() => void loadPlatform(), 15 * 60 * 1000);
      }
    }

    void loadPlatform();

    return () => {
      controller.abort();
      window.clearTimeout(refreshTimer);
    };
  }, []);

  return (
    <div className="dashboard-shell">
      <Sidebar activeItem="Plataforma Demo" onNavigate={onNavigate} />
      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>Site e plataformas</h1>
            {data && (
              <p className="last-update">
                Atualizado em {new Date(data.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </header>

        {error && !data && <div className="error-state">{error}</div>}
        {error && data && <div className="inline-alert" role="status">{error}</div>}
        {!data && !error && <div className="loading-state">Carregando dados da Plataforma Demo...</div>}
        {data && (
          <>
            <section className="stats-grid">
              <article className="stat-card">
                <span>Acessos do site</span>
                <strong>{formatNumber(data.site.totalAccesses)}</strong>
                <small>Últimos 30 dias</small>
              </article>
              <article className="stat-card">
                <span>Acessos LMS hoje</span>
                <strong>{formatNumber(data.lms.accessesToday)}</strong>
                <small className="up">Usuários conectados</small>
              </article>
              <article className="stat-card">
                <span>Cadastros LMS Plataforma Demo</span>
                <strong>{formatNumber(data.lms.registrations)}</strong>
                <small>Total de usuários</small>
              </article>
            </section>

            <section className="platform-chart-grid">
              <AccessCard name={data.site.name} accesses={data.site.accesses} color="#facc15" />
              <AccessCard name={data.lms.name} accesses={data.lms.accesses} color="#38bdf8" />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
