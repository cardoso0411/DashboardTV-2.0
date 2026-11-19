import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MetricChart } from '../components/charts/MetricChart';
import type {
  CatalogData,
  ChartPoint,
  DashboardProperty,
  PlatformData,
} from '../types/dashboard';
import { fetchJsonWithRetry } from '../utils/api';

const SLIDE_DURATION_SECONDS = 60;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const numberFormatter = new Intl.NumberFormat('pt-BR');

const periodOptions: Array<{ value: LmsPeriod; label: string; detail: string }> = [
  { value: 7, label: 'Semanal', detail: '7 dias' },
  { value: 15, label: 'Quinzenal', detail: '15 dias' },
  { value: 30, label: 'Mensal', detail: '30 dias' },
];
const PERIOD_DURATION_SECONDS = SLIDE_DURATION_SECONDS / periodOptions.length;

const colors: Record<string, string> = {
  'cliente-a': '#facc15',
  'cliente-b': '#fb7185',
  'cliente-b-pro': '#a78bfa',
  'revista-exemplo': '#c4b5fd',
  'cliente-c': '#34d399',
  'universidade-alfa': '#60a5fa',
  'universidade-beta': '#a78bfa',
  'site-platform': '#facc15',
  'lms-platform': '#38bdf8',
};

type TvPageProps = {
  onNavigate: (item: string) => void;
};

type LmsPeriod = 7 | 15 | 30;

type LmsApiResponse = {
  updatedAt: string;
  completions: number;
  accessesToday: number | null;
  activeCourses: number;
  students: number;
  accessesByPeriod: Record<LmsPeriod, ChartPoint[]>;
};

type TvInstitution = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  completions: number;
  accessesToday: number | null;
  activeCourses: number;
  students: number;
  accessesByPeriod: Record<LmsPeriod, ChartPoint[]>;
};

type CatalogSlide = {
  kind: 'catalog';
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  property: DashboardProperty;
};

type InstitutionSlide = {
  kind: 'institution';
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  institution: TvInstitution;
};

type PlatformSiteSlide = {
  kind: 'platform-site';
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  platform: PlatformData['site'];
};

type PlatformLmsSlide = {
  kind: 'platform-lms';
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  platform: PlatformData['lms'];
};

type TvSlide = CatalogSlide | InstitutionSlide | PlatformSiteSlide | PlatformLmsSlide;

type TvPanelSlots = {
  featured: TvSlide;
  compact: TvSlide[];
};

function formatNumber(value: number | null | undefined) {
  return value == null ? '—' : numberFormatter.format(value);
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSlideAccesses(slide: TvSlide, period: LmsPeriod) {
  return slide.kind === 'catalog'
    ? slide.property.accesses.slice(-period)
    : slide.kind === 'institution'
      ? slide.institution.accessesByPeriod[period] ?? []
      : slide.platform.accessesByPeriod?.[period] ?? slide.platform.accesses.slice(-period);
}

function getSlideOrders(slide: TvSlide, period: LmsPeriod) {
  if (slide.kind !== 'catalog' || !slide.property.orders) return undefined;
  return slide.property.orders.slice(-period);
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}

function toInstitution(id: string, name: string, data: LmsApiResponse): TvInstitution {
  return {
    id,
    name,
    description: 'Ambiente de aprendizagem',
    updatedAt: data.updatedAt,
    students: data.students,
    activeCourses: data.activeCourses,
    completions: data.completions,
    accessesToday: data.accessesToday,
    accessesByPeriod: data.accessesByPeriod,
  };
}

function StatusCard({ status }: { status: boolean | 'unknown' }) {
  const statusLabel = status === 'unknown'
    ? 'Status indisponível'
    : status
      ? 'Online'
      : 'Offline';

  return (
    <article className="tv-metric-card">
      <span className={`tv-metric-icon status ${status === true ? 'online' : ''}`} aria-hidden="true">
        <i />
      </span>
      <div>
        <small>Status</small>
        <strong className={status === true ? 'online-text' : ''}>{statusLabel}</strong>
        <span>Disponibilidade simulada</span>
      </div>
    </article>
  );
}

type TvFeaturedPanelProps = {
  slide: TvSlide;
  period: LmsPeriod;
  periodSecondsLeft: number;
  animated: boolean;
};

function TvFeaturedPanel({ slide, period, periodSecondsLeft, animated }: TvFeaturedPanelProps) {
  const accent = colors[slide.id] ?? '#facc15';
  const accesses = getSlideAccesses(slide, period);
  const orders = getSlideOrders(slide, period);
  const activePeriod = periodOptions.find((option) => option.value === period) ?? periodOptions[0];

  return (
    <article
      className="panel tv-client-panel tv-featured-panel"
      style={{ '--tv-client-accent': accent } as CSSProperties}
    >
      <header className="tv-client-heading">
        <div>
          <p className="eyebrow">{slide.description}</p>
          <h2>{slide.name}</h2>
        </div>
        <time dateTime={slide.updatedAt}>Atualizado {formatUpdatedAt(slide.updatedAt)}</time>
      </header>

      {slide.kind === 'catalog' ? (
        <section className="tv-client-metrics" aria-label={`Indicadores de ${slide.name}`}>
          <StatusCard status={slide.property.status} />
          <article className="tv-metric-card">
            <span className="tv-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 19h16v2H2V3h2zm3-3 4-5 4 3 4-7 2 1-5 10-5-4-3 4z" /></svg>
            </span>
            <div><small>Acessos</small><strong>{formatNumber(slide.property.accessesLast30)}</strong><span>Últimos 30 dias</span></div>
          </article>
          {slide.property.cycleOrders !== null && (
            <article className="tv-metric-card">
              <span className="tv-metric-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7 7V6a5 5 0 0 1 10 0v1h4l-1 15H4L3 7zm2 0h6V6a3 3 0 0 0-6 0zm-3.9 2 .73 11h12.34l.73-11H17v2h-2V9H9v2H7V9z" /></svg>
              </span>
              <div><small>Pedidos</small><strong>{formatNumber(slide.property.cycleOrders)}</strong><span>Ciclo atual</span></div>
            </article>
          )}
        </section>
      ) : slide.kind === 'institution' ? (
        <section className="tv-client-metrics" aria-label={`Indicadores da ${slide.name}`}>
          <article className="tv-metric-card">
            <span className="tv-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3M8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3m0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5" /></svg>
            </span>
            <div><small>Educandos</small><strong>{formatNumber(slide.institution.students)}</strong><span>Usuários cadastrados</span></div>
          </article>
          <article className="tv-metric-card">
            <span className="tv-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m12 3 10 5-10 5L4 9v6H2V8zm-6 9 6 3 6-3v5c0 2-2.69 4-6 4s-6-2-6-4z" /></svg>
            </span>
            <div><small>Cursos ativos</small><strong>{formatNumber(slide.institution.activeCourses)}</strong><span>Cursos demonstrativos</span></div>
          </article>
          <article className="tv-metric-card">
            <span className="tv-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m-2 15-5-5 1.4-1.4L10 14.2l7.6-7.6L19 8z" /></svg>
            </span>
            <div><small>Conclusões</small><strong>{formatNumber(slide.institution.completions)}</strong><span>Cursos concluídos</span></div>
          </article>
          <article className="tv-metric-card">
            <span className="tv-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M11 8h2v5h4v2h-6zm1-6a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16" /></svg>
            </span>
            <div><small>Acessos hoje</small><strong>{formatNumber(slide.institution.accessesToday)}</strong><span>{slide.institution.accessesToday === null ? 'Não disponibilizado' : 'Usuários únicos'}</span></div>
          </article>
        </section>
      ) : slide.kind === 'platform-site' ? (
        <section className="tv-client-metrics" aria-label="Indicadores do Site Plataforma Demo">
          <StatusCard status={slide.platform.status} />
          <article className="tv-metric-card">
            <span className="tv-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 19h16v2H2V3h2zm3-3 4-5 4 3 4-7 2 1-5 10-5-4-3 4z" /></svg>
            </span>
            <div><small>Acessos</small><strong>{formatNumber(slide.platform.totalAccesses)}</strong><span>Últimos 30 dias</span></div>
          </article>
        </section>
      ) : (
        <section className="tv-client-metrics" aria-label="Indicadores do LMS Plataforma Demo">
          <StatusCard status={slide.platform.status} />
          <article className="tv-metric-card">
            <span className="tv-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 19h16v2H2V3h2zm3-3 4-5 4 3 4-7 2 1-5 10-5-4-3 4z" /></svg>
            </span>
            <div><small>Acessos</small><strong>{formatNumber(slide.platform.totalAccesses)}</strong><span>Últimos 30 dias</span></div>
          </article>
          <article className="tv-metric-card">
            <span className="tv-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3M8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3m0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5" /></svg>
            </span>
            <div><small>Total de usuários</small><strong>{formatNumber(slide.platform.totalUsers)}</strong><span>Usuários cadastrados</span></div>
          </article>
          <article className="tv-metric-card">
            <span className="tv-metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M11 8h2v5h4v2h-6zm1-6a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16" /></svg>
            </span>
            <div><small>Conectados</small><strong>{formatNumber(slide.platform.connectedUsers)}</strong><span>Atividade hoje</span></div>
          </article>
        </section>
      )}

      <section className="tv-client-chart" aria-label={`Evolução diária de ${slide.name}`}>
        <div
          className="tv-period-indicator"
          role="group"
          aria-label={`Período atual: ${activePeriod.label}. Próxima troca em ${periodSecondsLeft} segundos.`}
        >
          <strong>{activePeriod.label}</strong>
          <span className="tv-period-countdown" aria-hidden="true">{periodSecondsLeft}s</span>
        </div>
        <div
          key={`${slide.id}-${period}`}
          className="tv-chart tv-featured-chart-transition"
        >
          <MetricChart
            type="bar"
            labels={accesses.map((point) => point.label)}
            values={accesses.map((point) => point.value)}
            color={accent}
            title="Acessos"
            lineValues={orders}
            animated={animated}
            showValueLabels
          />
        </div>
      </section>
    </article>
  );
}

function TvCompactPanel({ slide, position }: { slide: TvSlide; position: 'superior' | 'inferior' }) {
  const accent = colors[slide.id] ?? '#facc15';
  const accesses = getSlideAccesses(slide, 15);
  const orders = getSlideOrders(slide, 15);

  return (
    <article
      className="panel tv-compact-panel"
      style={{ '--tv-client-accent': accent } as CSSProperties}
      aria-label={`${slide.name}, painel ${position}`}
    >
      <header className="tv-compact-heading">
        <h2>{slide.name}</h2>
        <span>Últimos 15 dias</span>
      </header>
      <div className="tv-compact-chart">
        <MetricChart
          type="bar"
          labels={accesses.map((point) => point.label)}
          values={accesses.map((point) => point.value)}
          color={accent}
          title="Acessos"
          lineValues={orders}
          compact
          animated={false}
          showValueLabels
        />
      </div>
    </article>
  );
}

export function TvPage({ onNavigate }: TvPageProps) {
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [institutions, setInstitutions] = useState<TvInstitution[]>([]);
  const [platformData, setPlatformData] = useState<PlatformData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SLIDE_DURATION_SECONDS);
  const prefersReducedMotion = usePrefersReducedMotion();

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    const [catalogResult, alfaResult, betaResult, platformResult] = await Promise.allSettled([
      fetchJsonWithRetry<CatalogData>('/api/catalog?days=30', signal),
      fetchJsonWithRetry<LmsApiResponse>('/api/lms/alfa', signal),
      fetchJsonWithRetry<LmsApiResponse>('/api/lms/beta', signal),
      fetchJsonWithRetry<PlatformData>('/api/platform', signal),
    ]);

    if (signal?.aborted) return;

    const unavailable: string[] = [];

    if (catalogResult.status === 'fulfilled') {
      setCatalogData(catalogResult.value);
    } else {
      unavailable.push('catálogos');
    }

    if (alfaResult.status === 'rejected') unavailable.push('Universidade Alfa');
    if (betaResult.status === 'rejected') unavailable.push('Universidade Beta');
    if (platformResult.status === 'fulfilled') {
      setPlatformData(platformResult.value);
    } else {
      unavailable.push('Plataforma Demo');
    }

    setInstitutions((current) => {
      const next = new Map(current.map((institution) => [institution.id, institution]));

      if (alfaResult.status === 'fulfilled') {
        next.set('universidade-alfa', toInstitution(
          'universidade-alfa',
          'Universidade Alfa',
          alfaResult.value,
        ));
      }

      if (betaResult.status === 'fulfilled') {
        next.set('universidade-beta', toInstitution(
          'universidade-beta',
          'Universidade Beta',
          betaResult.value,
        ));
      }

      return ['universidade-alfa', 'universidade-beta']
        .map((id) => next.get(id))
        .filter((institution): institution is TvInstitution => Boolean(institution));
    });

    setError(unavailable.length ? `Não foi possível atualizar: ${unavailable.join(', ')}.` : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    const refreshTimer = window.setInterval(() => void loadDashboard(controller.signal), REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, [loadDashboard]);

  const slides = useMemo<TvSlide[]>(() => [
    ...(catalogData?.properties.map<CatalogSlide>((property) => ({
      kind: 'catalog',
      id: property.id,
      name: property.name,
      description: property.description,
      updatedAt: catalogData.updatedAt,
      property,
    })) ?? []),
    ...institutions.map<InstitutionSlide>((institution) => ({
      kind: 'institution',
      id: institution.id,
      name: institution.name,
      description: institution.description,
      updatedAt: institution.updatedAt,
      institution,
    })),
    ...(platformData ? [
      {
        kind: 'platform-site' as const,
        id: 'site-platform',
        name: platformData.site.name,
        description: 'Site institucional',
        updatedAt: platformData.updatedAt,
        platform: platformData.site,
      },
      {
        kind: 'platform-lms' as const,
        id: 'lms-platform',
        name: platformData.lms.name,
        description: 'Ambiente de aprendizagem',
        updatedAt: platformData.updatedAt,
        platform: platformData.lms,
      },
    ] : []),
  ], [catalogData, institutions, platformData]);

  const activeIndex = slides.length ? currentIndex % slides.length : 0;

  const panelSlots = useMemo<TvPanelSlots | null>(() => {
    if (!slides.length) return null;

    const compactCount = Math.min(2, slides.length - 1);
    const compact = Array.from({ length: compactCount }, (_, offset) => {
      const index = (activeIndex - offset - 1 + slides.length) % slides.length;
      return slides[index];
    });

    return {
      featured: slides[activeIndex],
      compact,
    };
  }, [activeIndex, slides]);

  useEffect(() => {
    if (!slides.length || paused) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1;
        setCurrentIndex((index) => (index + 1) % slides.length);
        return SLIDE_DURATION_SECONDS;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  useEffect(() => {
    if (currentIndex >= slides.length && slides.length > 0) {
      setCurrentIndex(0);
      setSecondsLeft(SLIDE_DURATION_SECONDS);
    }
  }, [currentIndex, slides.length]);

  function showNext() {
    if (!slides.length) return;
    setCurrentIndex((index) => (index + 1) % slides.length);
    setSecondsLeft(SLIDE_DURATION_SECONDS);
  }

  function selectSlide(index: number) {
    setCurrentIndex(index);
    setSecondsLeft(SLIDE_DURATION_SECONDS);
  }

  if (loading && !slides.length) {
    return (
      <main className="tv-page tv-state" aria-busy="true">
        <span className="tv-loader" aria-hidden="true" />
        <h1>Preparando o Dashboard na TV</h1>
        <p>Carregando os Gráficos...</p>
      </main>
    );
  }

  if (!panelSlots) {
    return (
      <main className="tv-page tv-state">
        <span className="state-icon">!</span>
        <h1>Dashboard indisponível</h1>
        <p>{error ?? 'Nenhum catálogo ou ambiente de aprendizagem foi encontrado.'}</p>
        <button className="primary-button" onClick={() => void loadDashboard()}>Tentar novamente</button>
      </main>
    );
  }

  const { featured, compact } = panelSlots;
  const elapsedSeconds = SLIDE_DURATION_SECONDS - secondsLeft;
  const featuredPeriodIndex = Math.min(
    periodOptions.length - 1,
    Math.floor(elapsedSeconds / PERIOD_DURATION_SECONDS),
  );
  const featuredPeriod = periodOptions[featuredPeriodIndex].value;
  const periodElapsedSeconds = elapsedSeconds - (featuredPeriodIndex * PERIOD_DURATION_SECONDS);
  const periodSecondsLeft = Math.max(1, Math.ceil(PERIOD_DURATION_SECONDS - periodElapsedSeconds));
  const progress = ((SLIDE_DURATION_SECONDS - secondsLeft) / SLIDE_DURATION_SECONDS) * 360;

  return (
    <main className="tv-page">
      <header className="tv-topbar">
        <button className="tv-brand" onClick={() => onNavigate('Visão Geral')} title="Voltar para a visão geral">
          <span className="brand-mark">D</span>
          <span><strong>Sair do Painel TV</strong></span>
        </button>

        <div className="tv-header-status">
          {error && <span className="tv-update-warning">Atualização parcial</span>}
          <span><small>Em destaque</small><strong>{featured.name}</strong></span>
          <span className="tv-slide-count">{activeIndex + 1} / {slides.length}</span>
        </div>
      </header>

      <section className="tv-slide" key={featured.id}>
        <div className="tv-slide-heading">
          <div className="tv-controls">
            <button
              className={`tv-control-button ${paused ? 'active' : ''}`}
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? 'Retomar troca automática' : 'Pausar troca automática'}
              title={paused ? 'Retomar apresentação' : 'Pausar apresentação'}
            >
              {paused ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
              )}
            </button>
            <button className="tv-control-button" onClick={showNext} aria-label="Próximo painel" title="Próximo painel">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 5 7 7-7 7v-5H4v-4h9z" /></svg>
            </button>
          </div>
        </div>

        <div className={`tv-spotlight-layout tv-spotlight-layout-${compact.length + 1}`}>
          <TvFeaturedPanel
            slide={featured}
            period={featuredPeriod}
            periodSecondsLeft={periodSecondsLeft}
            animated={!prefersReducedMotion}
          />
          {compact.length > 0 && (
            <aside className={`tv-compact-stack tv-compact-stack-${compact.length}`} aria-label="Outros clientes em exibição">
              {compact.map((slide, index) => (
                <TvCompactPanel
                  key={slide.id}
                  slide={slide}
                  position={index === 0 ? 'superior' : 'inferior'}
                />
              ))}
            </aside>
          )}
        </div>
      </section>

      <footer className="tv-footer">
        <div className="tv-pagination" aria-label="Selecionar cliente em destaque">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              className={index === activeIndex ? 'active' : ''}
              onClick={() => selectSlide(index)}
              aria-label={`Destacar ${slide.name}`}
              title={slide.name}
            />
          ))}
        </div>
        <div className="tv-timer" aria-live="polite">
          <span
            className="tv-progress-ring"
            style={{ '--tv-progress': `${paused ? 360 : progress}deg` } as CSSProperties}
          >{paused ? 'II' : secondsLeft}</span>
          <span>{paused ? 'Apresentação pausada' : 'Próximo cliente em segundos'}</span>
        </div>
      </footer>
    </main>
  );
}
