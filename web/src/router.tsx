import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { ItemsView } from './views/ItemsView';
import { GanttView } from './views/GanttView';
import { GraphView } from './views/GraphView';
import { CalendarView } from './views/CalendarView';
import { TreeView } from './views/TreeView';
import { DocsView } from './views/DocsView';
import { PlansView } from './views/PlansView';
import { WarningsView } from './views/WarningsView';
import { NotFoundView } from './views/NotFoundView';

// React Router 6. Routes use the basename `/preview` (the Python server
// mounts the React build at /preview/*). Each view reads its current detail
// target from the URL params (e.g. :id) so deep links work on hard refresh.
export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: <DashboardView /> },
        { path: 'dashboard', element: <DashboardView /> },
        { path: 'items', element: <ItemsView /> },
        { path: 'items/:id', element: <ItemsView /> },
        { path: 'gantt', element: <GanttView /> },
        { path: 'graph', element: <GraphView /> },
        { path: 'calendar', element: <CalendarView /> },
        { path: 'tree', element: <TreeView /> },
        { path: 'docs', element: <DocsView /> },
        { path: 'docs/:id', element: <DocsView /> },
        { path: 'plans', element: <PlansView /> },
        { path: 'plans/:id', element: <PlansView /> },
        { path: 'warnings', element: <WarningsView /> },
        { path: '*', element: <NotFoundView /> },
      ],
    },
  ],
  { basename: '/preview' },
);
