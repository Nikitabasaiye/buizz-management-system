import React from 'react';
import { ReviewSummary } from '@/store/api/reviewsApi';
import { Star } from 'lucide-react';

interface RatingStatsProps {
  summary: ReviewSummary;
}

const RatingStats: React.FC<RatingStatsProps> = ({ summary }) => {
  const totalReviews = summary.total_reviews;
  const averageRating = parseFloat(summary.average_rating.toFixed(1));

  const getRatingPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  const ratingBreakdown = [
    { stars: 5, count: summary.rating_5_star, percentage: getRatingPercentage(summary.rating_5_star) },
    { stars: 4, count: summary.rating_4_star, percentage: getRatingPercentage(summary.rating_4_star) },
    { stars: 3, count: summary.rating_3_star, percentage: getRatingPercentage(summary.rating_3_star) },
    { stars: 2, count: summary.rating_2_star, percentage: getRatingPercentage(summary.rating_2_star) },
    { stars: 1, count: summary.rating_1_star, percentage: getRatingPercentage(summary.rating_1_star) },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-6">Ratings & Reviews</h3>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Overall Rating */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {totalReviews > 0 ? averageRating : '0.0'}
          </div>
          <div className="flex items-center mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${
                  star <= Math.round(averageRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-gray-600">
            Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Rating Breakdown */}
        <div className="space-y-3">
          {ratingBreakdown.map(({ stars, count, percentage }) => (
            <div key={stars} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-16">
                <span className="text-sm font-medium text-gray-700">{stars}</span>
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </div>

              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="w-16 text-right">
                <span className="text-sm text-gray-600">{count}</span>
                <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RatingStats;
