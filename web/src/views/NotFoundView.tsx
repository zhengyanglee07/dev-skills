import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';

export function NotFoundView() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <EmptyState
        icon="404"
        title="Not found"
        description={
          <>
            That URL doesn't match any view. Try the{' '}
            <Link to="/dashboard" className="text-accent hover:underline">dashboard</Link>{' '}
            or any of the views in the header.
          </>
        }
      />
    </div>
  );
}
