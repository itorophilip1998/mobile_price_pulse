import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { productsAPI, ProductsResponse } from '@/lib/api/products';

const PRODUCTS_QUERY_KEY = 'products';
const CATEGORIES_QUERY_KEY = 'categories';

export interface UseProductsParams {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  condition?: 'BRAND_NEW' | 'FOREIGN_USED' | 'LOCAL_USED';
  limit?: number;
  enabled?: boolean;
}

export function useProducts(params: UseProductsParams = {}) {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    condition,
    limit = 20,
    enabled = true,
  } = params;

  return useInfiniteQuery<ProductsResponse>({
    queryKey: [PRODUCTS_QUERY_KEY, category, search, minPrice, maxPrice, sortBy, sortOrder, condition],
    queryFn: ({ pageParam = 1 }) =>
      productsAPI.getProducts({
        page: pageParam as number,
        limit,
        category,
        search,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
        condition,
      }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (pagination.page < pagination.totalPages) {
        return pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: () => productsAPI.getCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes - categories don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

