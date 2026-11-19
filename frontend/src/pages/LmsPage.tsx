import { MetricChart } from '../components/charts/MetricChart';
import { Sidebar } from '../components/layout/Sidebar';
import { useEffect, useMemo, useState } from 'react';
import type { LmsInstitution } from '../types/dashboard';
import { fetchJsonWithRetry } from '../utils/api';

type LmsPageProps = {
  onNavigate: (item: string) => void;
};

type LmsPeriod = 7 | 15 | 30;

// Contrato das métricas demonstrativas de LMS.
type LmsApiResponse = {
  updatedAt: string;
  stale?: boolean;
  completions: number;
  accessesToday: number | null;
  activeCourses: number;
  students: number;
  accessesByPeriod: Record<LmsPeriod, LmsInstitution['accesses']>;
};

type DashboardInstitution = Omit<LmsInstitution, 'accessesToday' | 'accesses'> & {
  updatedAt: string;
  accessesToday: number | null;
  accesses: LmsInstitution['accesses'];
  accessesByPeriod: Record<LmsPeriod, LmsInstitution['accesses']>;
  chartTitle: string;
  chartSubtitle: string;
  chartMetricTitle: string;
};

function useLmsInstitution(
  endpoint: string,
  name: string,
  chartTitle: string,
  chartSubtitle: string,
  chartMetricTitle: string,
): { institution: DashboardInstitution | null; error: string | null } {
  const [institution, setInstitution] = useState<DashboardInstitution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let inFlight = false;
    let refreshTimer: number;
    setError(null);

    async function loadInstitution() {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await fetchJsonWithRetry<LmsApiResponse>(endpoint, controller.signal);
        if (!active) return;

        setInstitution({
          name,
          updatedAt: data.updatedAt,
          students: data.students,
          activeCourses: data.activeCourses,
          completions: data.completions,
          accessesToday: data.accessesToday,
          accesses: data.accessesByPeriod[7],
          accessesByPeriod: data.accessesByPeriod,
          chartTitle,
          chartSubtitle,
          chartMetricTitle,
        });
        setError(data.stale ? `Dados anteriores da ${name} exibidos: a atualização mais recente falhou.` : null);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        console.error(`Erro ao carregar dados de ${name}:`, requestError);
        if (active) setError(`Não foi possível atualizar os dados da ${name}. Uma nova tentativa será feita automaticamente.`);
      } finally {
        inFlight = false;
        if (active) refreshTimer = window.setTimeout(() => void loadInstitution(), 15 * 60 * 1000);
      }
    }

    void loadInstitution();

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(refreshTimer);
    };
  }, [endpoint, name, chartTitle, chartSubtitle, chartMetricTitle]);

  return { institution, error };
}

function formatNumber(value: number | null) {
  if (value === null) return '—';

  return new Intl.NumberFormat('pt-BR').format(value);
}

function InstitutionDashboard({ institution }: { institution: DashboardInstitution }) {
  const [period, setPeriod] = useState<LmsPeriod>(7);

  const accesses = useMemo(
    () => institution.accessesByPeriod[period],
    [institution, period],
  );

  return (
    <section className="lms-institution">
      <div className="lms-institution-heading">
        <div>
          <h2>{institution.name}</h2>
          <p className="last-update">Atualizado em {new Date(institution.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
        </div>
      </div>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Total de Educandos</span>
          <strong>{formatNumber(institution.students)}</strong>
          <small>Usuários cadastrados</small>
        </article>
        <article className="stat-card">
          <span>Cursos Ativos</span>
          <strong>{formatNumber(institution.activeCourses)}</strong>
          <small>Cursos Ativos no momento</small>
        </article>
        <article className="stat-card">
          <span>Conclusões</span>
          <strong>{formatNumber(institution.completions)}</strong>
          <small>Cursos concluídos</small>
        </article>
        <article className="stat-card">
          <span>Acessos Hoje</span>
          <strong>{formatNumber(institution.accessesToday)}</strong>
           <small className={institution.accessesToday === null ? '' : 'up'}>
            {institution.accessesToday === null
            ? 'Não disponibilizado pela API': 'Último registro diário'}
           </small>
        </article>
      </section>

      <article className="panel lms-chart-panel">
        <div className="panel-header">
          <div>
            <h2>{institution.chartTitle} ({period} dias)</h2>
            <span>{institution.chartSubtitle}</span>
          </div>
          <label className="lms-period-filter">
            Período
            <select value={period} onChange={(event) => setPeriod(Number(event.target.value) as LmsPeriod)}>
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
            </select>
          </label>
        </div>
        <div className="chart-box">
          <MetricChart
            type="line"
            labels={accesses.map((point) => point.label)}
            values={accesses.map((point) => point.value)}
            color="#60a5fa"
            title={institution.chartMetricTitle}
          />
        </div>
      </article>
    </section>
  );
}

export function LmsPage({ onNavigate }: LmsPageProps) {
  const alfaResult = useLmsInstitution(
  '/api/lms/alfa',
  'Universidade Alfa',
  'Engajamento',
  'Volume de acessos à plataforma',
  'Acessos',
);

const betaResult = useLmsInstitution(
  '/api/lms/beta',
  'Universidade Beta',
  'Engajamento',
  'Volume de acessos à plataforma',
  'Acessos',
);

  return (
    <div className="dashboard-shell">
      <Sidebar activeItem="Ambiente LMS" onNavigate={onNavigate} />
      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>Ambientes de aprendizagem</h1>
          </div>
        </header>

        {alfaResult.institution ? (
          <>
            {alfaResult.error && <p className="inline-alert" role="status">{alfaResult.error}</p>}
            <InstitutionDashboard institution={alfaResult.institution} />
          </>
        ) : alfaResult.error ? (
          <p className="loading-state" role="alert">{alfaResult.error}</p>
        ) : (
          <p className="loading-state">Carregando dados da Alfa...</p>
        )}

        <div
          className="lms-institution-divider"
          role="separator"
          aria-label="Início dos dados da Universidade Beta"
        />

        {betaResult.institution ? (
          <>
            {betaResult.error && <p className="inline-alert" role="status">{betaResult.error}</p>}
            <InstitutionDashboard institution={betaResult.institution} />
          </>
        ) : betaResult.error ? (
          <p className="loading-state" role="alert">{betaResult.error}</p>
        ) : (
          <p className="loading-state">Carregando dados da Beta...</p>
        )}
      </main>
    </div>
  );
}
