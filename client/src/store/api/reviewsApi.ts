import { apiSlice } from '../apiSlice';

// Types
export interface Review {
  review_id: string;
  event_id: string;
  event_title?: string;
  event_image?: string;
  booking_id?: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  profile_picture?: string;
  rating: number;
  title?: string;
  review_text?: string;
  images?: string[];
  is_verified_purchase: boolean;
  helpful_count: number;
  report_count: number;
  pending_reports?: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  organizer_response?: string;
  organizer_response_date?: string;
  admin_notes?: string;
  admin_edited?: boolean;
  admin_edited_by?: string;
  admin_edited_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RatingSummary {
  event_id: string;
  total_reviews: number;
  average_rating: number;
  rating_5_star: number;
  rating_4_star: number;
  rating_3_star: number;
  rating_2_star: number;
  rating_1_star: number;
  last_updated?: string;
}

export type ReviewSummary = RatingSummary;

export interface CreateReviewRequest {
  event_id: string;
  booking_id?: string;
  rating: number;
  title?: string;
  review_text?: string;
  images?: string[];
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  review_text?: string;
  images?: string[];
}

export interface ReviewReport {
  id: number;
  review_id: string;
  review_text?: string;
  rating?: number;
  review_status?: string;
  user_id: string;
  reporter_name?: string;
  reporter_email?: string;
  review_author_name?: string;
  event_title?: string;
  reason: 'spam' | 'inappropriate' | 'offensive' | 'fake' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewStatistics {
  total_reviews: number;
  pending_reviews: number;
  approved_reviews: number;
  rejected_reviews: number;
  flagged_reviews: number;
  reviews_with_reports: number;
  average_rating: number;
}

interface EventReviewsResponse {
  success: boolean;
  data: {
    reviews: Review[];
    summary: RatingSummary;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface UserReviewsResponse {
  success: boolean;
  data: {
    reviews: Review[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface AdminReviewsResponse {
  success: boolean;
  data: {
    reviews: Review[];
    statistics: ReviewStatistics;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface ReportsResponse {
  success: boolean;
  data: {
    reports: ReviewReport[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export const reviewsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public: Get reviews for an event
    getEventReviews: builder.query<
      EventReviewsResponse,
      { eventId: string; page?: number; limit?: number; rating?: number; sort?: 'recent' | 'helpful' | 'rating_high' | 'rating_low' }
    >({
      query: ({ eventId, ...params }) => ({
        url: `/reviews/event/${eventId}`,
        params,
      }),
      providesTags: (result, error, { eventId }) => [
        { type: 'Review', id: `EVENT-${eventId}` },
        'Review',
      ],
    }),

    // User: Create a review
    createReview: builder.mutation<{ success: boolean; message: string; data: Review }, CreateReviewRequest>({
      query: (data) => ({
        url: '/reviews',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { event_id }) => [
        { type: 'Review', id: `EVENT-${event_id}` },
        'Review',
      ],
    }),

    // User: Get own reviews
    getUserReviews: builder.query<UserReviewsResponse, { page?: number; limit?: number }>({
      query: (params) => ({
        url: '/reviews/my-reviews',
        params,
      }),
      providesTags: ['Review'],
    }),

    // User: Update own review
    updateReview: builder.mutation<{ success: boolean; message: string; data: Review }, { reviewId: string; data: UpdateReviewRequest }>({
      query: ({ reviewId, data }) => ({
        url: `/reviews/${reviewId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { reviewId }) => [
        { type: 'Review', id: reviewId },
        'Review',
      ],
    }),

    // User: Delete own review
    deleteReview: builder.mutation<{ success: boolean; message: string }, string>({
      query: (reviewId) => ({
        url: `/reviews/${reviewId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Review'],
    }),

    // User: Mark review as helpful
    markReviewHelpful: builder.mutation<{ success: boolean; message: string; data: { helpful_count: number } }, { reviewId: string; is_helpful?: boolean }>({
      query: ({ reviewId, is_helpful }) => ({
        url: `/reviews/${reviewId}/helpful`,
        method: 'POST',
        body: { is_helpful },
      }),
      invalidatesTags: (result, error, { reviewId }) => [{ type: 'Review', id: reviewId }],
    }),

    // User: Report a review
    reportReview: builder.mutation<
      { success: boolean; message: string },
      { reviewId: string; reason: 'spam' | 'inappropriate' | 'offensive' | 'fake' | 'other'; description?: string }
    >({
      query: ({ reviewId, ...body }) => ({
        url: `/reviews/${reviewId}/report`,
        method: 'POST',
        body,
      }),
    }),

    // Admin: Get all reviews with filters
    getAllReviews: builder.query<
      AdminReviewsResponse,
      {
        page?: number;
        limit?: number;
        status?: 'pending' | 'approved' | 'rejected' | 'flagged';
        rating?: number;
        event_id?: string;
        search?: string;
        sort?: 'recent' | 'oldest' | 'rating_high' | 'rating_low' | 'most_reported';
      }
    >({
      query: (params) => ({
        url: '/reviews',
        params,
      }),
      providesTags: ['Review'],
    }),

    // Admin: Update review status
    updateReviewStatus: builder.mutation<
      { success: boolean; message: string },
      { reviewId: string; status: 'pending' | 'approved' | 'rejected' | 'flagged'; admin_notes?: string }
    >({
      query: ({ reviewId, ...body }) => ({
        url: `/reviews/${reviewId}/status`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Review'],
    }),

    // Admin: Delete review
    deleteReviewAdmin: builder.mutation<{ success: boolean; message: string }, string>({
      query: (reviewId) => ({
        url: `/reviews/${reviewId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Review'],
    }),

    // Admin: Get review reports
    getReviewReports: builder.query<ReportsResponse, { page?: number; limit?: number; status?: string }>({
      query: (params) => ({
        url: '/reviews/reports',
        params,
      }),
      providesTags: ['Review'],
    }),

    // Admin: Update report status
    updateReportStatus: builder.mutation<
      { success: boolean; message: string },
      { reportId: number; status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'; admin_notes?: string }
    >({
      query: ({ reportId, ...body }) => ({
        url: `/reviews/reports/${reportId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Review'],
    }),

    // Super Admin: Edit any review
    adminEditReview: builder.mutation<
      { success: boolean; message: string; data: Review },
      { reviewId: string; rating?: number; title?: string; review_text?: string; images?: string[]; admin_notes?: string }
    >({
      query: ({ reviewId, ...body }) => ({
        url: `/reviews/${reviewId}/admin-edit`,
        method: 'PUT',
        body,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      invalidatesTags: (result, error, { reviewId }) => [{ type: 'Review', id: reviewId }, 'Review'],
    }),

    // Super Admin: Update review status
    adminUpdateReviewStatus: builder.mutation<
      { success: boolean; message: string },
      { reviewId: string; status: 'pending' | 'approved' | 'rejected' | 'flagged'; rejection_reason?: string }
    >({
      query: ({ reviewId, ...body }) => ({
        url: `/reviews/${reviewId}/status`,
        method: 'PATCH',
        body,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      invalidatesTags: ['Review'],
    }),

    // Super Admin: Delete any review
    adminDeleteReview: builder.mutation<{ success: boolean; message: string }, string>({
      query: (reviewId) => ({
        url: `/reviews/${reviewId}/admin-delete`,
        method: 'DELETE',
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      invalidatesTags: ['Review'],
    }),

    // Super Admin: Get all reviews with filters
    adminGetAllReviews: builder.query<
      AdminReviewsResponse,
      {
        page?: number;
        limit?: number;
        status?: 'pending' | 'approved' | 'rejected' | 'flagged';
        rating?: number;
        event_id?: string;
        search?: string;
      }
    >({
      query: (params) => ({
        url: '/reviews/admin/all',
        params,
        headers: { 'x-buizz-role': 'super-admin' },
      }),
      providesTags: ['Review'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEventReviewsQuery,
  useCreateReviewMutation,
  useGetUserReviewsQuery,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
  useMarkReviewHelpfulMutation,
  useReportReviewMutation,
  useGetAllReviewsQuery,
  useUpdateReviewStatusMutation,
  useDeleteReviewAdminMutation,
  useGetReviewReportsQuery,
  useUpdateReportStatusMutation,
  useAdminEditReviewMutation,
  useAdminUpdateReviewStatusMutation,
  useAdminDeleteReviewMutation,
  useAdminGetAllReviewsQuery,
} = reviewsApi;
