import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { 
  useGetAllReviewsQuery, 
  useUpdateReviewStatusMutation,
  useDeleteReviewAdminMutation,
  useGetReviewReportsQuery,
  useUpdateReportStatusMutation,
  useAdminEditReviewMutation,
  useAdminUpdateReviewStatusMutation,
  useAdminDeleteReviewMutation,
  useAdminGetAllReviewsQuery
} from '../../../store/api/reviewsApi';
import { Star, Flag, Trash2, Filter, Search, Edit2, X } from 'lucide-react';

interface ReviewsPageProps {
  userRole: string;
}

export const ReviewsPage: React.FC<ReviewsPageProps> = ({ userRole }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReports, setShowReports] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ rating: 0, title: '', review_text: '', admin_notes: '' });

  // Use super admin hooks if user is super admin, otherwise use regular admin hooks
  const isSuperAdmin = userRole === 'super-admin';
  
  const { 
    data: reviews, 
    isLoading: reviewsLoading, 
    error: reviewsError 
  } = isSuperAdmin 
    ? useAdminGetAllReviewsQuery({
        status: statusFilter === 'all' ? undefined : statusFilter,
        rating: ratingFilter ?? undefined,
        search: searchQuery || undefined
      })
    : useGetAllReviewsQuery({
        status: statusFilter === 'all' ? undefined : statusFilter,
        rating: ratingFilter ?? undefined,
        search: searchQuery || undefined
      });

  const { 
    data: reports, 
    isLoading: reportsLoading 
  } = useGetReviewReportsQuery({}, { skip: !showReports });

  const [updateReviewStatus] = useUpdateReviewStatusMutation();
  const [deleteReview] = useDeleteReviewAdminMutation();
  const [updateReportStatus] = useUpdateReportStatusMutation();
  const [adminEditReview] = useAdminEditReviewMutation();
  const [adminUpdateReviewStatus] = useAdminUpdateReviewStatusMutation();
  const [adminDeleteReview] = useAdminDeleteReviewMutation();

  const handleStatusUpdate = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      await updateReviewStatus({ reviewId, status }).unwrap();
    } catch (error) {
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        if (isSuperAdmin) {
          await adminDeleteReview(reviewId).unwrap();
        } else {
          await deleteReview(reviewId).unwrap();
        }
      } catch (error) {
      }
    }
  };

  const handleEditReview = (review: any) => {
    setEditingReview(review);
    setEditFormData({
      rating: review.rating,
      title: review.title || '',
      review_text: review.review_text || '',
      admin_notes: review.admin_notes || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      await adminEditReview({
        reviewId: editingReview.review_id,
        ...editFormData
      }).unwrap();
      setEditingReview(null);
    } catch (error) {
    }
  };

  const handleAdminStatusUpdate = async (reviewId: string, status: 'approved' | 'rejected' | 'pending' | 'flagged') => {
    try {
      await adminUpdateReviewStatus({ 
        reviewId, 
        status,
        rejection_reason: status === 'rejected' ? 'Rejected by super admin' : undefined
      }).unwrap();
    } catch (error) {
    }
  };

  const handleReportStatusUpdate = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await updateReportStatus({ reportId: Number(reportId), status }).unwrap();
    } catch (error) {
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  const getStatusBadgeTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'neutral';
    }
  };

  const filteredReviews = useMemo(() => {
    if (!reviews?.data?.reviews) return [];
    return reviews.data.reviews.filter(review => {
      if (statusFilter !== 'all' && review.status !== statusFilter) return false;
      if (ratingFilter && review.rating !== ratingFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (review.review_text?.toLowerCase().includes(query)) ||
          (review.user_name?.toLowerCase().includes(query)) ||
          (review.event_title?.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [reviews, statusFilter, ratingFilter, searchQuery]);

  if (reviewsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading reviews...</div>
      </div>
    );
  }

  if (reviewsError) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          Error loading reviews: {reviewsError.toString()}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews & Ratings Management</h1>
          <p className="text-gray-600 mt-2">Manage event reviews and user feedback</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showReports ? 'primary' : 'outline'}
            onClick={() => setShowReports(!showReports)}
            leftIcon={<Flag size={16} />}
          >
            {showReports ? 'Show Reviews' : 'Show Reports'}
          </Button>
        </div>
      </div>

      {!showReports ? (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter size={16} />
                <span className="font-medium">Filters:</span>
              </div>
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Rating Filter */}
              <select
                value={ratingFilter || ''}
                onChange={(e) => setRatingFilter(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              {/* Search */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reviews, users, events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </Card>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-gray-500">No reviews found matching your criteria.</div>
              </Card>
            ) : (
              filteredReviews.map((review) => (
                <Card key={review.review_id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                          <span className="font-medium">{review.rating}/5</span>
                        </div>
                        <Badge tone={getStatusBadgeTone(review.status)}>
                          {review.status}
                        </Badge>
                        {review.report_count > 0 && (
                          <Badge tone="danger">
                            <Flag size={12} className="mr-1" />
                            {review.report_count} Report{review.report_count > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {review.is_verified_purchase && (
                          <Badge tone="success">
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>By: <strong>{review.user_name}</strong></span>
                          <span>•</span>
                          <span>Event: <strong>{review.event_title}</strong></span>
                          <span>•</span>
                          <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {review.title && (
                          <h3 className="font-semibold text-gray-900">{review.title}</h3>
                        )}
                        
                        <p className="text-gray-900">{review.review_text}</p>
                        
                        {review.helpful_count > 0 && (
                          <div className="text-sm text-gray-500">
                            {review.helpful_count} users found this helpful
                          </div>
                        )}
                        
                        {review.organizer_response && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-blue-900 mb-1">Organizer Response:</div>
                            <p className="text-sm text-blue-800">{review.organizer_response}</p>
                            {review.organizer_response_date && (
                              <div className="text-xs text-blue-600 mt-1">
                                {new Date(review.organizer_response_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {review.status === 'pending' && userRole === 'super-admin' && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleAdminStatusUpdate(review.review_id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdminStatusUpdate(review.review_id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditReview(review)}
                          leftIcon={<Edit2 size={14} />}
                        />
                      )}
                      
                      {userRole === 'super-admin' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteReview(review.review_id)}
                          leftIcon={<Trash2 size={14} />}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {reviews && reviews.data && reviews.data.pagination && reviews.data.pagination.pages > 1 && (
            <div className="flex justify-center">
              <div className="text-sm text-gray-600">
                Showing {filteredReviews.length} of {reviews.data.pagination.total} reviews
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Reports Section */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Review Reports</h2>
            
            {reportsLoading ? (
              <div className="text-center">Loading reports...</div>
            ) : !reports || !reports.data || reports.data.reports.length === 0 ? (
              <div className="text-center text-gray-500">No reports found.</div>
            ) : (
              <div className="space-y-4">
                {reports.data.reports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge tone="neutral">
                            {report.reason}
                          </Badge>
                          <Badge tone={report.status === 'resolved' ? 'success' : 'warning'}>
                            {report.status}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          Reported by: <strong>{report.reporter_name}</strong> on{' '}
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                        
                        {report.description && (
                          <p className="text-gray-800 mb-2">{report.description}</p>
                        )}
                        
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-sm font-medium mb-1">Reported Review:</div>
                          <div className="flex items-center gap-2 mb-1">
                            {report.rating && renderStars(report.rating)}
                            <span>by {report.review_author_name}</span>
                          </div>
                          <p className="text-sm text-gray-700">{report.review_text}</p>
                          {report.event_title && (
                            <div className="text-xs text-gray-500 mt-1">Event: {report.event_title}</div>
                          )}
                        </div>
                      </div>
                      
                      {report.status === 'pending' && userRole === 'super-admin' && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleReportStatusUpdate(report.id.toString(), 'resolved')}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReportStatusUpdate(report.id.toString(), 'dismissed')}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Review</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingReview(null)}
                leftIcon={<X size={16} />}
              />
            </div>

            <div className="space-y-4">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, rating: star })}
                      className="text-2xl"
                    >
                      <Star
                        size={24}
                        className={star <= editFormData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Review title"
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-medium mb-2">Review</label>
                <textarea
                  value={editFormData.review_text}
                  onChange={(e) => setEditFormData({ ...editFormData, review_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md h-32"
                  placeholder="Write your review..."
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Admin Notes (Internal)</label>
                <textarea
                  value={editFormData.admin_notes}
                  onChange={(e) => setEditFormData({ ...editFormData, admin_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                  placeholder="Reason for editing this review..."
                />
              </div>

              {/* Original Review Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-2">Original Review Info</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>By: {editingReview.user_name}</div>
                  <div>Event: {editingReview.event_title}</div>
                  <div>Original Rating: {editingReview.rating}/5</div>
                  {editingReview.admin_edited && (
                    <div className="text-orange-600">
                      Previously edited by admin on {new Date(editingReview.admin_edited_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setEditingReview(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
