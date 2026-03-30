import axios from 'axios';
import { API_CONFIG } from '../config';
import { attachAuthInterceptors } from './auth-interceptor';

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL.replace(/\/+$/, ''),
  timeout: API_CONFIG.TIMEOUT,
});

attachAuthInterceptors(client);

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface CreateReviewDto {
  rating: number;
  comment?: string;
}

export const reviewsAPI = {
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ReviewsResponse> {
    const response = await client.get(`/reviews/product/${productId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  async getProductRatingStats(productId: string): Promise<RatingStats> {
    const response = await client.get(`/reviews/product/${productId}/stats`);
    return response.data;
  },

  async createReview(productId: string, data: CreateReviewDto): Promise<Review> {
    const response = await client.post(`/reviews/product/${productId}`, data);
    return response.data;
  },

  async updateReview(productId: string, data: CreateReviewDto): Promise<Review> {
    const response = await client.put(`/reviews/product/${productId}`, data);
    return response.data;
  },

  async deleteReview(productId: string): Promise<void> {
    await client.delete(`/reviews/product/${productId}`);
  },
};

