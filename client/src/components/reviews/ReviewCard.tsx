import React, { useState } from 'react';
import { Review } from '@/store/api/reviewsApi';
import { useMarkReviewHelpfulMutation, useReportReviewMutation } from '@/store/api/reviewsApi';
import { Star, ThumbsUp, Flag, CheckCircle } from 'lucide-react';

interface ReviewCardProps {
  review: Review;
  showEventInfo?: boolean;
}

type ReviewReportReason = 'spam' | 'inappropriate' | 'offensive' | 'fake' | 'other';

const formatDistanceToNow = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return 'recently';

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const [unit, secondsPerUnit] =
    units.find(([, seconds]) => Math.abs(diffSeconds) >= seconds) ?? ['second', 1];

  return formatter.format(Math.round(diffSeconds / secondsPerUnit), unit);
};

const ReviewCard: React.FC<ReviewCardProps> = ({ review, showEventInfo = false }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReviewReportReason | ''>('');
  const [reportDescription, setReportDescription] = useState('');
  const displayName = review.user_name || 'Guest User';

  const [markHelpful, { isLoading: isMarkingHelpful }] = useMarkReviewHelpfulMutation();
  const [reportReview, { isLoading: isReporting }] = useReportReviewMutation();

  const handleMarkHelpful = async () => {
    try {
      await markHelpful({ reviewId: review.review_id }).unwrap();
    } catch (error) {
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason) return;

    try {
      await reportReview({
        reviewId: review.review_id,
        reason: reportReason,
        description: reportDescription,
      }).unwrap();
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
      alert('Review reported successfully');
    } catch (error) {
      alert('Failed to report review');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          {review.profile_picture ? (
            <img
              src={review.profile_picture}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{displayName}</h4>
              {review.is_verified_purchase && (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  <CheckCircle className="w-3 h-3" />
                  Verified Purchase
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(review.created_at)}
              </span>
            </div>

            {showEventInfo && review.event_title && (
              <p className="text-sm text-gray-600 mt-1">Event: {review.event_title}</p>
            )}
          </div>
        </div>
      </div>

      {/* Review Content */}
      {review.title && (
        <h5 className="font-semibold text-gray-900 mb-2">{review.title}</h5>
      )}

      {review.review_text && (
        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{review.review_text}</p>
      )}

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {review.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Review image ${index + 1}`}
              className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => window.open(image, '_blank')}
            />
          ))}
        </div>
      )}

      {/* Organizer Response */}
      {review.organizer_response && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">Organizer Response</p>
          <p className="text-sm text-blue-800">{review.organizer_response}</p>
          {review.organizer_response_date && (
            <p className="text-xs text-blue-600 mt-1">
              {formatDistanceToNow(review.organizer_response_date)}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleMarkHelpful}
          disabled={isMarkingHelpful}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>Helpful ({review.helpful_count})</span>
        </button>

        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
        >
          <Flag className="w-4 h-4" />
          <span>Report</span>
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Report Review</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ReviewReportReason | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="offensive">Offensive language</option>
                  <option value="fake">Fake review</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please provide more information..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleReportSubmit}
                disabled={!reportReason || isReporting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReporting ? 'Submitting...' : 'Submit Report'}
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
