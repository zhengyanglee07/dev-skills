import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useUIStore } from './state/store';
import './styles/globals.css';

// React Query — keep cache small and always invalidate on mount so the user
// always sees the freshest data after a refresh button click.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  },
});

// Apply theme as early as possible (before first paint) to avoid FOUC.
function applyTheme(mode: 'auto' | 'light' | 'dark') {
  const root = document.documentElement;
  if (mode === 'auto') {
    root.classList.remove('light', 'dark');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
  }
}

// Initial sync from localStorage (Zustand persist runs after store creation)
const initialTheme = useUIStore.getState().theme;
applyTheme(initialTheme);

// Follow system changes when in 'auto' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useUIStore.getState().theme === 'auto') applyTheme('auto');
});

// Subscribe to theme changes
useUIStore.subscribe((state) => {
  if (state.theme !== useUIStore.getState().theme) return;
  applyTheme(state.theme);
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
