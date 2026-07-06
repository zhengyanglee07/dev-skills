import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetJson, apiGetText, spacesFileUrl } from './client';
import type { IndexFile, IndexStatusResponse, WorkItem } from '@/lib/types';

export const queryKeys = {
  index: ['index'] as const,
  status: ['status'] as const,
  item: (path: string) => ['item', path] as const,
  doc: (path: string) => ['doc', path] as const,
};

export function useIndex() {
  return useQuery({
    queryKey: queryKeys.index,
    queryFn: () => apiGetJson<IndexFile>('/api/index'),
    staleTime: 0,    // data is live; never treat as fresh
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}

export function useIndexStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => apiGetJson<IndexStatusResponse>('/api/status'),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}

export function useItem(path: string | null | undefined) {
  return useQuery({
    queryKey: path ? queryKeys.item(path) : ['item', '__none__'],
    queryFn: () => {
      if (!path) throw new Error('no path');
      return apiGetJson<WorkItem>(spacesFileUrl(path));
    },
    enabled: !!path,
    staleTime: 0,
  });
}

export function useDoc(path: string | null | undefined) {
  return useQuery({
    queryKey: path ? queryKeys.doc(path) : ['doc', '__none__'],
    queryFn: () => {
      if (!path) throw new Error('no path');
      return apiGetText(spacesFileUrl(path));
    },
    enabled: !!path,
    staleTime: 0,
  });
}

export function useRefresh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // No mutation endpoint — refresh is a client-side cache invalidation.
      // The user is expected to run `update_index.py` externally first; this
      // hook just re-fetches the index.
      return Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.index }),
        qc.invalidateQueries({ queryKey: queryKeys.status }),
      ]);
    },
  });
}
