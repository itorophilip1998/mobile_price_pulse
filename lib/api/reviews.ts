import axios from 'axios';
import { API_CONFIG } from '../config';
import { getClerkToken } from '../clerk-token';

const client = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/reviews`,
  timeout: API_CONFIG.TIMEOUT,
});

client.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    const response = await client.get(`/product/${productId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  async getProductRatingStats(productId: string): Promise<RatingStats> {
    const response = await client.get(`/product/${productId}/stats`);
    return response.data;
  },

  async createReview(productId: string, data: CreateReviewDto): Promise<Review> {
    const response = await client.post(`/product/${productId}`, data);
    return response.data;
  },

  async updateReview(productId: string, data: CreateReviewDto): Promise<Review> {
    const response = await client.put(`/product/${productId}`, data);
    return response.data;
  },

  async deleteReview(productId: string): Promise<void> {
    await client.delete(`/product/${productId}`);
  },
};

