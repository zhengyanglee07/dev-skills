import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { useUIStore } from '@/state/store';

// App shell: header (sticky) + main area. The main area renders the current
// view via <Outlet />. Each view is responsible for its own internal layout
// (single column for Dashboard; 2-column sidebar+detail for Items/Docs/...).
export function Layout() {
  const paletteOpen = useUIStore(s => s.paletteOpen);
  return (
    <div className="h-full flex flex-col bg-bg text-ink">
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
      {paletteOpen && <CommandPalette />}
    </div>
  );
}
