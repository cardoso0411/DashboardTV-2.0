import { Sidebar } from '../components/layout/Sidebar';

type EmptyPageProps = {
  title: string;
  onNavigate: (item: string) => void;
};

export function EmptyPage({ title, onNavigate }: EmptyPageProps) {
  return (
    <div className="dashboard-shell">
      <Sidebar activeItem={title} onNavigate={onNavigate} />
      <main className="main-panel" />
    </div>
  );
}
