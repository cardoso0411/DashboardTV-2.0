import { useEffect, useMemo, useState } from 'react';
import { PropertyCard } from '../components/charts/PropertyCard';
import { Sidebar } from '../components/layout/Sidebar';
import type { CatalogData } from '../types/dashboard';
import { fetchJsonWithRetry } from '../utils/api';

type CatalogPageProps = {
  onNavigate: (item: string) => void;
};

const companyPropertyIds: Record<string, string[]> = {
  'Cliente A': ['cliente-a'],
  'Cliente B': ['cliente-b', 'cliente-b-pro', 'revista-exemplo'],
  'Cliente C': ['cliente-c'],
};

export function CatalogPage({ onNavigate }: CatalogPageProps) {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState('Todas');
  const [days, setDays] = useState(7);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    let refreshTimer: number;
    setData(null);
    setError(null);

    async function loadCatalog() {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await fetchJsonWithRetry<CatalogData>(`/api/catalog?days=${days}`, controller.signal);
        setData(result);
        setError(result.stale ? 'Dados anteriores exibidos: a atualização mais recente falhou.' : null);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError('Não foi possível atualizar os dados do catálogo. Uma nova tentativa será feita automaticamente.');
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) refreshTimer = window.setTimeout(() => void loadCatalog(), 60 * 60 * 1000);
      }
    }

    void loadCatalog();

    return () => {
      controller.abort();
      window.clearTimeout(refreshTimer);
    };
  }, [days]);

  const properties = useMemo(
    () =>
      data?.properties.filter((property) =>
        company === 'Todas' ? true : companyPropertyIds[company]?.includes(property.id),
      ) ?? [],
    [company, data],
  );

  return (
    <div className="dashboard-shell">
      <Sidebar activeItem="Catálogo Digital" onNavigate={onNavigate} />
      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>Catálogos e Revistas</h1>
            {data && (
              <p className="last-update">
                Atualizado em {new Date(data.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <div className="filter-actions">
            <label>
              Empresa
              <select value={company} onChange={(event) => setCompany(event.target.value)}>
                <option value="Todas">Todas</option>
                <option value="Cliente A">Cliente A</option>
                <option value="Cliente B">Cliente B</option>
                <option value="Cliente C">Cliente C</option>
              </select>
            </label>
            <label>
              Período
              <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
                <option value={7}>7 dias</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
              </select>
            </label>
          </div>
        </header>

        {error && !data && <div className="error-state">{error}</div>}
        {error && data && <div className="inline-alert" role="status">{error}</div>}
        {!data && !error && <div className="loading-state">Carregando dados dos últimos {days} dias...</div>}
        {data && (
          <section className="property-grid catalog-grid">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} days={days} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
