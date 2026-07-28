import React, { useState } from 'react';
import { useGetEventReviewsQuery } from '@/store/api/reviewsApi';
import ReviewCard from './ReviewCard';
import RatingStats from './RatingStats';
import { Star, TrendingUp, Clock, ThumbsUp } from 'lucide-react';

interface ReviewListProps {
  eventId: string;
}

const ReviewList: React.FC<ReviewListProps> = ({ eventId }) => {
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating_high' | 'rating_low'>('recent');

  const { data, isLoading, error } = useGetEventReviewsQuery({
    eventId,
    page,
    limit: 10,
    rating: ratingFilter,
    sort: sortBy,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load reviews. Please try again later.</p>
      </div>
    );
  }

  const reviews = data?.data.reviews ?? [];
  const summary = data?.data.summary ?? null;
  const pagination = data?.data.pagination ?? null;

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {summary && <RatingStats summary={summary} />}

      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setRatingFilter(undefined)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !ratingFilter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => setRatingFilter(rating)}
              className={`px-4 py-2 rounded-lg flex items-center gap-1 transition-colors ${
                ratingFilter === rating
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {rating} <Star className="w-4 h-4 fill-current" />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('recent')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              sortBy === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Recent
          </button>
          <button
            onClick={() => setSortBy('helpful')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              sortBy === 'helpful'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            Most Helpful
          </button>
          <button
            onClick={() => setSortBy('rating_high')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              sortBy === 'rating_high'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Highest Rated
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Star className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No reviews yet</p>
            <p className="text-gray-500 text-sm mt-2">Be the first to review this event!</p>
          </div>
        ) : (
          reviews.map((review) => <ReviewCard key={review.review_id} review={review} />)
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
