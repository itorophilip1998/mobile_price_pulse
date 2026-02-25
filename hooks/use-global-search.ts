import { useQuery } from '@tanstack/react-query';
import { searchAPI } from '@/lib/api/search';

const GLOBAL_SEARCH_QUERY_KEY = 'globalSearch';

export function useGlobalSearch(params: {
  q?: string;
  category?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const { q, category, limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = params;

  return useQuery({
    queryKey: [GLOBAL_SEARCH_QUERY_KEY, q, category, page, limit, sortBy, sortOrder],
    queryFn: () =>
      searchAPI.getGlobalSearch({
        q,
        category,
        limit,
        page,
        sortBy,
        sortOrder,
      }),
    enabled: !!q && q.length >= 1,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
