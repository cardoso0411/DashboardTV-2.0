import { MetricChart } from './MetricChart';
import type { DashboardProperty } from '../../types/dashboard';

const numberFormatter = new Intl.NumberFormat('pt-BR');

const colors: Record<string, string> = {
  'cliente-a': '#facc15',
  'cliente-b': '#fb7185',
  'cliente-b-pro': '#a78bfa',
  'revista-exemplo': '#c4b5fd',
  'cliente-c': '#34d399',
};

function formatNumber(value: number | null) {
  return value === null ? '—' : numberFormatter.format(value);
}

type PropertyCardProps = {
  property: DashboardProperty;
  days: number;
};

export function PropertyCard({ property, days }: PropertyCardProps) {
  return (
    <article className="panel property-card">
      <div className="property-heading">
        <div>
          <h2>{property.name}</h2>
          <span>{property.description}</span>
        </div>
        <span className={`status-badge ${property.status === true ? 'online' : ''}`}>
          <i />
          {property.status === 'unknown'
            ? 'Status indisponível'
            : property.status
              ? 'Online'
              : 'Offline'}
        </span>
      </div>
      <div className="property-chart">
        <MetricChart
          type="bar"
          labels={property.accesses.map((point) => point.label)}
          values={property.accesses.map((point) => point.value)}
          color={colors[property.id] ?? '#facc15'}
          title="Acessos"
          lineValues={property.orders}
        />
      </div>
      <div className="property-summary">
        <span>
          Últimos {days} dias:{' '}
          <strong>{formatNumber(property.accesses.reduce((total, point) => total + point.value, 0))}</strong>
        </span>
        <span>
          Ciclo: <strong>{formatNumber(property.cycleAccesses)}</strong>
        </span>
        {property.cycleOrders !== null && (
          <span>
            Pedidos: <strong>{formatNumber(property.cycleOrders)}</strong>
          </span>
        )}
      </div>
    </article>
  );
}
