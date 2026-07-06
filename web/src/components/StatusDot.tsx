import { useIndex } from '@/api/queries';

export function StatusDot() {
  const { data: index } = useIndex();
  const n = index?.warnings?.length ?? 0;
  if (n === 0) {
    return <span className="w-2 h-2 rounded-full bg-emerald-500" title="no warnings" />;
  }
  if (n < 10) {
    return <span className="w-2 h-2 rounded-full bg-amber-500" title={`${n} warnings`} />;
  }
  return <span className="w-2 h-2 rounded-full bg-red-500" title={`${n} warnings`} />;
}
