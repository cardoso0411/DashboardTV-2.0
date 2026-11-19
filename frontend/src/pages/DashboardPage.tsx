import { useCallback, useEffect, useRef, useState } from 'react';
import { MetricChart } from '../components/charts/MetricChart';
import { Sidebar } from '../components/layout/Sidebar';
import type { DashboardData, PlatformData } from '../types/dashboard';
import { fetchJsonWithRetry } from '../utils/api';

const numberFormatter = new Intl.NumberFormat('pt-BR');

function formatNumber(value: number | null | undefined) {
  return value == null ? '—' : numberFormatter.format(value);
}

type DashboardPageProps = {
  onNavigate: (item: string) => void;
};

type EducationToday = {
  alfa: number | null;
  beta: number | null;
  alfaUpdatedAt?: string;
  betaUpdatedAt?: string;
};

async function fetchAccessesToday(endpoint: string, signal?: AbortSignal) {
  return fetchJsonWithRetry<{ accessesToday: number | null; updatedAt: string; stale?: boolean }>(endpoint, signal);
}

function UpdateStatus({ loading, updatedAt }: { loading: boolean; updatedAt?: string }) {
  if (loading || !updatedAt) {
    return (
      <div className="update-status loading" role="status" aria-live="polite">
        <i aria-hidden="true" />
        <div>
          <small>Atualizando</small>
          <strong>Cards e gráficos<span>Aguarde</span></strong>
        </div>
      </div>
    );
  }

  const date = new Date(updatedAt);
  const updatedDate = date.toLocaleDateString('pt-BR');
  const updatedTime = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="update-status" aria-label={`Última atualização em ${updatedDate} às ${updatedTime}`}>
      <i aria-hidden="true" />
      <div>
        <small>Última atualização</small>
        <strong>{updatedDate}<span>{updatedTime}</span></strong>
      </div>
    </div>
  );
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [platform, setPlatform] = useState<PlatformData | null>(null);
  const [educationToday, setEducationToday] = useState<EducationToday>({
    alfa: null,
    beta: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DashboardData['availability'] | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);

    try {
      const platformRequest = fetchJsonWithRetry<PlatformData>('/api/platform?metricsOnly=1', signal).then((result) => {
        if (!signal?.aborted) setPlatform(result);
        return result;
      });
      const availabilityRequest = fetchJsonWithRetry<DashboardData['availability']>('/api/dashboard/availability', signal).then((result) => {
        if (!signal?.aborted) setAvailability(result);
        return result;
      });
      const alfaRequest = fetchAccessesToday('/api/lms/alfa', signal).then((result) => {
        if (!signal?.aborted) setEducationToday((previous) => ({ ...previous, alfa: result.accessesToday, alfaUpdatedAt: result.updatedAt }));
        return result;
      });
      const betaRequest = fetchAccessesToday('/api/lms/beta', signal).then((result) => {
        if (!signal?.aborted) setEducationToday((previous) => ({ ...previous, beta: result.accessesToday, betaUpdatedAt: result.updatedAt }));
        return result;
      });
      const [platformResult, availabilityResult, alfaResult, betaResult] = await Promise.allSettled([
        platformRequest, availabilityRequest, alfaRequest, betaRequest,
      ]);
      if (signal?.aborted) return;
      const outdated = platformResult.status === 'rejected' || availabilityResult.status === 'rejected' || alfaResult.status === 'rejected'
        || betaResult.status === 'rejected' || (platformResult.status === 'fulfilled' && platformResult.value.stale)
        || (availabilityResult.status === 'fulfilled' && Boolean(availabilityResult.value.lastError))
        || (alfaResult.status === 'fulfilled' && alfaResult.value.stale)
        || (betaResult.status === 'fulfilled' && betaResult.value.stale);
      setError(outdated ? 'Uma ou mais fontes não puderam ser atualizadas. Os dados disponíveis mostram a última consulta bem-sucedida.' : null);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setError('Não foi possível carregar os dados. Verifique a conexão com o backend.');
    } finally {
      inFlight.current = false;
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let refreshTimer: number;
    async function refresh() {
      await loadDashboard(controller.signal);
      if (!controller.signal.aborted) refreshTimer = window.setTimeout(() => void refresh(), 30 * 60 * 1000);
    }
    void refresh();
    return () => {
      controller.abort();
      window.clearTimeout(refreshTimer);
    };
  }, [loadDashboard]);

  const latestUpdateDates = [
    platform?.updatedAt,
    educationToday.alfaUpdatedAt,
    educationToday.betaUpdatedAt,
  ].filter((value): value is string => Boolean(value)).map((value) => Date.parse(value));
  const latestCommonUpdate = latestUpdateDates.length
    ? new Date(Math.min(...latestUpdateDates)).toISOString()
    : undefined;

  if (error && !platform && !loading && !availability && educationToday.alfa === null && educationToday.beta === null) {
    return (
      <div className="dashboard-shell">
        <Sidebar activeItem="Visão Geral" onNavigate={onNavigate} />
        <main className="main-panel">
          <div className="error-state">
            <span className="state-icon">!</span>
            <h1>Dashboard indisponível</h1>
            <p>{error}</p>
            <button className="primary-button" onClick={() => void loadDashboard()}>Tentar novamente</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <Sidebar activeItem="Visão Geral" onNavigate={onNavigate} />

      <main className="main-panel overview-page">
        <header className="topbar overview-topbar">
          <div>
            <h1>Visão geral</h1>
          </div>

          <UpdateStatus loading={loading} updatedAt={latestCommonUpdate} />
        </header>

        {error && (
          <div className="inline-alert" role="status">
            Os dados exibidos são da última atualização. Não foi possível buscar uma versão mais recente.
          </div>
        )}

        <section className="stats-grid overview-stats" aria-label="Principais indicadores">
          <article className="stat-card domain-card education">
            <div className="stat-heading"><span className="domain-icon">A</span><span>Universidade Alfa</span></div>
            <strong>{formatNumber(educationToday.alfa)}</strong>
            <small>Acessos hoje</small>
          </article>
          <article className="stat-card domain-card beta-education">
            <div className="stat-heading"><span className="domain-icon">B</span><span>Universidade Beta</span></div>
            <strong>{formatNumber(educationToday.beta)}</strong>
            <small>Acessos hoje</small>
          </article>
          <article className="stat-card domain-card availability">
            <div className="stat-heading"><span className="domain-icon">D</span><span>Catálogos e Revistas Online</span></div>
            <strong>{availability ? `${availability.online}/${availability.monitored}` : '—'}</strong>
            <small>Disponibilidade simulada localmente</small>
            {availability?.lastError && <small className="down">{availability.lastSuccessAt ? 'Falha na consulta ao simulação local; último estado disponível' : 'Falha na consulta ao simulação local'}</small>}
          </article>
        </section>

        {!platform ? (
          <div className="dashboard-skeleton" role="status">
            {loading ? 'Carregando gráfico da Plataforma Demo…' : 'Gráfico da Plataforma Demo indisponível.'}
            {loading && <div className="skeleton-grid"><span className="skeleton-card" /></div>}
          </div>
        ) : (
          <section className="chart-grid overview-chart-grid single-chart">
            <article className="panel chart-panel large">
              <div className="panel-header">
                <div><h2>Site Plataforma Demo e logins</h2><span>Acessos do site comparados aos logins dos usuários no LMS</span></div>
                <span className="period-pill">Últimos 7 dias</span>
              </div>
              <div className="chart-box">
                <MetricChart
                  type="line"
                  labels={platform.site.accessesByPeriod[7].map((point) => point.label)}
                  values={platform.site.accessesByPeriod[7].map((point) => point.value)}
                  color="#facc15"
                  title="Acessos do Site"
                  secondaryValues={platform.lms.accessesByPeriod[7].map((point) => point.value)}
                  secondaryTitle="Logins de usuários"
                  secondaryColor="#60a5fa"
                />
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
