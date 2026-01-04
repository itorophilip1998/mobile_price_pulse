import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsAPI, ReviewsResponse, RatingStats, CreateReviewDto } from '@/lib/api/reviews';
import { useToast } from '@/components/ui/toast-provider';

export const REVIEWS_QUERY_KEY = 'reviews';
export const RATING_STATS_QUERY_KEY = 'rating-stats';

export function useProductReviews(productId: string, limit: number = 10) {
  return useInfiniteQuery<ReviewsResponse>({
    queryKey: [REVIEWS_QUERY_KEY, productId, limit],
    queryFn: ({ pageParam = 1 }) =>
      reviewsAPI.getProductReviews(productId, pageParam as number, limit),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (pagination.page < pagination.totalPages) {
        return pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProductRatingStats(productId: string) {
  return useQuery<RatingStats>({
    queryKey: [RATING_STATS_QUERY_KEY, productId],
    queryFn: () => reviewsAPI.getProductRatingStats(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateReview(productId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateReviewDto) => reviewsAPI.createReview(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REVIEWS_QUERY_KEY, productId] });
      queryClient.invalidateQueries({ queryKey: [RATING_STATS_QUERY_KEY, productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      showToast('Review submitted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(
        error?.response?.data?.message || 'Failed to submit review',
        'error',
      );
    },
  });
}

export function useUpdateReview(productId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateReviewDto) => reviewsAPI.updateReview(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REVIEWS_QUERY_KEY, productId] });
      queryClient.invalidateQueries({ queryKey: [RATING_STATS_QUERY_KEY, productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      showToast('Review updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(
        error?.response?.data?.message || 'Failed to update review',
        'error',
      );
    },
  });
}

export function useDeleteReview(productId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => reviewsAPI.deleteReview(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REVIEWS_QUERY_KEY, productId] });
      queryClient.invalidateQueries({ queryKey: [RATING_STATS_QUERY_KEY, productId] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      showToast('Review deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(
        error?.response?.data?.message || 'Failed to delete review',
        'error',
      );
    },
  });
}

