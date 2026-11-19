import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from 'chart.js';
import type { ChartPoint } from '../../types/dashboard';

const chartValueFormatter = new Intl.NumberFormat('pt-BR');

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

function createValueLabelsPlugin(compact: boolean): Plugin<'bar'> {
  return {
    id: 'metric-value-labels',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea } = chart;
      const fontSize = compact ? 9 : 11;

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (meta.hidden) return;

        const isLine = datasetIndex > 0;

        meta.data.forEach((element, dataIndex) => {
          const rawValue = dataset.data[dataIndex];
          if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue === 0) return;

          const label = chartValueFormatter.format(rawValue);
          const position = element.tooltipPosition(false);
          if (position.x === null || position.y === null) return;

          ctx.save();
          ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.lineJoin = 'round';
          ctx.lineWidth = compact ? 2.5 : 3;
          ctx.strokeStyle = '#0f172a';
          ctx.fillStyle = '#e2e8f0';

          const halfWidth = ctx.measureText(label).width / 2;
          const x = Math.min(chartArea.right - halfWidth, Math.max(chartArea.left + halfWidth, position.x));
          let y = Math.min(chartArea.bottom - 2, Math.max(chartArea.top + fontSize, position.y - (isLine ? 7 : 4)));

          if (!isLine && chart.data.datasets.length > 1) {
            const lineMeta = chart.getDatasetMeta(1);
            const lineValue = chart.data.datasets[1].data[dataIndex];
            const lineElement = lineMeta.data[dataIndex];

            if (!lineMeta.hidden && lineElement && typeof lineValue === 'number' && Number.isFinite(lineValue) && lineValue !== 0) {
              const linePosition = lineElement.tooltipPosition(false);
              if (linePosition.x !== null && linePosition.y !== null) {
                const lineLabel = chartValueFormatter.format(lineValue);
                const lineHalfWidth = ctx.measureText(lineLabel).width / 2;
                const lineX = Math.min(chartArea.right - lineHalfWidth, Math.max(chartArea.left + lineHalfWidth, linePosition.x));
                const lineY = Math.min(chartArea.bottom - 2, Math.max(chartArea.top + fontSize, linePosition.y - 7));
                const horizontalOverlap = x - halfWidth < lineX + lineHalfWidth + 2
                  && x + halfWidth > lineX - lineHalfWidth - 2;
                const verticalOverlap = y - fontSize < lineY + 2
                  && y > lineY - fontSize - 2;

                if (horizontalOverlap && verticalOverlap) {
                  y = Math.min(chartArea.bottom - 2, lineY + fontSize + 4);
                }
              }
            }
          }

          ctx.strokeText(label, x, y);
          ctx.fillText(label, x, y);
          ctx.restore();
        });
      });
    },
  };
}

type MetricChartProps = {
  type: 'line' | 'bar' | 'doughnut';
  labels: string[];
  values: number[];
  color: string;
  title?: string;
  dataLabels?: string[];
  lineValues?: number[] | null;
  lineTitle?: string;
  lineColor?: string;
  secondaryValues?: number[] | null;
  secondaryTitle?: string;
  secondaryColor?: string;
  compact?: boolean;
  animated?: boolean;
  showValueLabels?: boolean;
};

export function MetricChart({
  type,
  labels,
  values,
  color,
  title,
  dataLabels,
  lineValues,
  lineTitle = 'Pedidos',
  lineColor = '#60a5fa',
  secondaryValues,
  secondaryTitle = 'Comparativo',
  secondaryColor = '#60a5fa',
  compact = false,
  animated = true,
  showValueLabels = false,
}: MetricChartProps) {
  const label = dataLabels?.[0] ?? title ?? 'Dados';

  if (type === 'line') {
    const data: ChartData<'line'> = {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: color,
          backgroundColor: 'rgba(250, 204, 21, 0.18)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        ...(secondaryValues
          ? [
              {
                label: secondaryTitle,
                data: secondaryValues,
                borderColor: secondaryColor,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [6, 5],
                tension: 0.4,
                pointRadius: 3,
                fill: false,
              },
            ]
          : []),
      ],
    };

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: animated ? { duration: 900, easing: 'easeOutQuart' } : false,
      plugins: {
        legend: {
          display: Boolean(secondaryValues),
          position: 'top',
          align: 'end',
          labels: {
            color: '#cbd5e1',
            usePointStyle: true,
            boxWidth: 8,
            font: compact ? { size: 10 } : undefined,
          },
        },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: compact ? { size: 10 } : undefined, maxRotation: 0 },
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.14)' },
          ticks: { color: '#94a3b8', font: compact ? { size: 10 } : undefined },
        },
      },
    };

    return <Line data={data} options={options} />;
  }

  if (type === 'bar') {
    const hasLine = Boolean(lineValues);
    const data: ChartData<'bar' | 'line'> = {
      labels,
      datasets: [
        {
          type: 'bar',
          label,
          data: values,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          yAxisID: 'y',
          order: 2,
        },
        ...(hasLine
          ? [
              {
                type: 'line' as const,
                label: lineTitle,
                data: lineValues ?? [],
                borderColor: lineColor,
                backgroundColor: lineColor,
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 3,
                fill: false,
                yAxisID: 'yOrders',
                order: 1,
              },
            ]
          : []),
      ],
    };

    const options: ChartOptions<'bar' | 'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: animated ? { duration: 900, easing: 'easeOutQuart' } : false,
      layout: showValueLabels ? { padding: { top: compact ? 14 : 18 } } : undefined,
      plugins: {
        legend: {
          display: hasLine,
          labels: {
            color: '#cbd5e1',
            usePointStyle: true,
            boxWidth: compact ? 7 : 12,
            padding: compact ? 8 : 10,
            font: compact ? { size: 10 } : undefined,
          },
        },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#94a3b8',
            autoSkip: true,
            maxTicksLimit: compact ? 6 : undefined,
            maxRotation: 0,
            font: compact ? { size: 10 } : undefined,
          },
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.14)' },
          ticks: {
            color: '#94a3b8',
            maxTicksLimit: compact ? 5 : undefined,
            font: compact ? { size: 10 } : undefined,
          },
        },
        ...(hasLine
          ? {
              yOrders: {
                position: 'right' as const,
                grid: { drawOnChartArea: false },
                ticks: {
                  color: lineColor,
                  maxTicksLimit: compact ? 5 : undefined,
                  font: compact ? { size: 10 } : undefined,
                },
              },
            }
          : {}),
      },
    };

    return (
      <Bar
        data={data as ChartData<'bar'>}
        options={options as ChartOptions<'bar'>}
        plugins={showValueLabels ? [createValueLabelsPlugin(compact)] : undefined}
      />
    );
  }

  const data: ChartData<'doughnut'> = {
    labels,
    datasets: [
      {
        label,
        data: values,
        backgroundColor: ['#facc15', '#FB7185', '#A78BFA', '#af3fb9', '#f98f16', '#34D399'],
        borderColor: '#0f172a',
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? { duration: 900, easing: 'easeOutQuart' } : false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  return <Doughnut data={data} options={options} />;
}

export function ChartList({ items }: { items: ChartPoint[] }) {
  return (
    <ul className="chart-list">
      {items.map((item) => (
        <li key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value.toLocaleString('pt-BR')}</strong>
        </li>
      ))}
    </ul>
  );
}
