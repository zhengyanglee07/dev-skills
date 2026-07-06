import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ItemsSortCol, ItemsSortDir } from '@/lib/sort';
import type { Priority, WorkType } from '@/lib/types';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type ViewName =
  | 'dashboard' | 'items' | 'gantt' | 'graph' | 'calendar' | 'tree' | 'docs' | 'plans' | 'warnings';
export type ItemsLayout = 'grouped' | 'table';
export type ShowOpen = 'all' | 'open' | 'done';
export type GanttZoom = 'week' | 'month' | 'quarter';

export interface PersistedState {
  // View
  view: ViewName;
  // Filters (any view that uses them)
  typeFilter: 'all' | WorkType;
  statusFilter: 'all' | string;
  priorityFilter: 'all' | Priority;
  tagFilter: 'all' | string;
  // Items view
  itemsLayout: ItemsLayout;
  showOpen: ShowOpen;
  itemsSort: { col: ItemsSortCol; dir: ItemsSortDir };
  // Gantt
  ganttZoom: GanttZoom;
  // Theme
  theme: ThemeMode;
  // Tree expansion
  expanded: Record<string, boolean>;
  // Recent search palette queries
  recentSearches: string[];
}

const DEFAULT_STATE: PersistedState = {
  view: 'dashboard',
  typeFilter: 'all',
  statusFilter: 'all',
  priorityFilter: 'all',
  tagFilter: 'all',
  itemsLayout: 'grouped',
  showOpen: 'all',
  itemsSort: { col: 'id', dir: 'asc' },
  ganttZoom: 'month',
  theme: 'auto',
  expanded: {},
  recentSearches: [],
};

export interface UIState extends PersistedState {
  // Transient (not persisted) state lives alongside the persisted slice
  search: string;
  docSearch: string;
  warnKindFilter: 'all' | string;
  paletteOpen: boolean;

  setView: (v: ViewName) => void;
  setTypeFilter: (v: 'all' | WorkType) => void;
  setStatusFilter: (v: 'all' | string) => void;
  setPriorityFilter: (v: 'all' | Priority) => void;
  setTagFilter: (v: 'all' | string) => void;
  setItemsLayout: (v: ItemsLayout) => void;
  setShowOpen: (v: ShowOpen) => void;
  setItemsSort: (col: ItemsSortCol, dir?: ItemsSortDir) => void;
  setGanttZoom: (v: GanttZoom) => void;
  setTheme: (v: ThemeMode) => void;
  toggleExpanded: (key: string) => void;
  setExpanded: (key: string, v: boolean) => void;

  setSearch: (s: string) => void;
  setDocSearch: (s: string) => void;
  setWarnKindFilter: (s: 'all' | string) => void;
  setPaletteOpen: (b: boolean) => void;
  pushRecentSearch: (s: string) => void;
  resetFilters: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      // transient
      search: '',
      docSearch: '',
      warnKindFilter: 'all',
      paletteOpen: false,

      setView: (v) => set({ view: v }),
      setTypeFilter: (v) => set({ typeFilter: v }),
      setStatusFilter: (v) => set({ statusFilter: v }),
      setPriorityFilter: (v) => set({ priorityFilter: v }),
      setTagFilter: (v) => set({ tagFilter: v }),
      setItemsLayout: (v) => set({ itemsLayout: v }),
      setShowOpen: (v) => set({ showOpen: v }),
      setItemsSort: (col, dir) => {
        const prev = get().itemsSort;
        if (dir) {
          set({ itemsSort: { col, dir } });
        } else if (prev.col === col) {
          set({ itemsSort: { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } });
        } else {
          set({ itemsSort: { col, dir: 'asc' } });
        }
      },
      setGanttZoom: (v) => set({ ganttZoom: v }),
      setTheme: (v) => set({ theme: v }),
      toggleExpanded: (key) =>
        set((s) => ({ expanded: { ...s.expanded, [key]: !s.expanded[key] } })),
      setExpanded: (key, v) =>
        set((s) => ({ expanded: { ...s.expanded, [key]: v } })),

      setSearch: (s) => set({ search: s }),
      setDocSearch: (s) => set({ docSearch: s }),
      setWarnKindFilter: (s) => set({ warnKindFilter: s }),
      setPaletteOpen: (b) => set({ paletteOpen: b }),
      pushRecentSearch: (s) => {
        if (!s.trim()) return;
        const cur = get().recentSearches;
        const next = [s, ...cur.filter(x => x !== s)].slice(0, 10);
        set({ recentSearches: next });
      },
      resetFilters: () =>
        set({
          typeFilter: 'all',
          statusFilter: 'all',
          priorityFilter: 'all',
          tagFilter: 'all',
          showOpen: 'all',
          search: '',
        }),
    }),
    {
      name: 'spaces.preview.v2',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        view: s.view,
        typeFilter: s.typeFilter,
        statusFilter: s.statusFilter,
        priorityFilter: s.priorityFilter,
        tagFilter: s.tagFilter,
        itemsLayout: s.itemsLayout,
        showOpen: s.showOpen,
        itemsSort: s.itemsSort,
        ganttZoom: s.ganttZoom,
        theme: s.theme,
        expanded: s.expanded,
        recentSearches: s.recentSearches,
      }),
    },
  ),
);
