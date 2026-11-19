const items = ['Visão Geral', 'Painel TV', 'Catálogo Digital', 'Ambiente LMS', 'Plataforma Demo'];

type SidebarProps = { activeItem: string; onNavigate: (item: string) => void };

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-box"><div className="brand-mark">D</div><span>Plataforma Demo</span></div>
      <nav className="nav-menu" aria-label="Menu principal">
        {items.map((item) => <button key={item} className={item === activeItem ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(item)}>{item}</button>)}
      </nav>
    </aside>
  );
}
