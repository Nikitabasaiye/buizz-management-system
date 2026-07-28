const { getMySQLPool } = require('../../database/mysql');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

/**
 * Submit a new review
 * POST /api/v1/reviews
 */
exports.createReview = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const { event_id, booking_id, rating, title, review_text, images } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Check if event exists
    const [events] = await connection.query(
      'SELECT event_id, organizer_id FROM events WHERE event_id = ?',
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Check if user has already reviewed this event
    const [existingReviews] = await connection.query(
      'SELECT review_id FROM reviews WHERE event_id = ? AND user_id = ?',
      [event_id, userId]
    );

    if (existingReviews.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this event',
      });
    }

    // Check if user has a booking for this event (verified purchase)
    let isVerifiedPurchase = false;
    if (booking_id) {
      const [bookings] = await connection.query(
        'SELECT booking_id FROM bookings WHERE booking_id = ? AND user_id = ? AND event_id = ? AND booking_status = "confirmed"',
        [booking_id, userId, event_id]
      );
      isVerifiedPurchase = bookings.length > 0;
    }

    await connection.beginTransaction();

    // Create review
    const reviewId = uuidv4();
    await connection.query(
      `INSERT INTO reviews 
      (review_id, event_id, booking_id, user_id, rating, title, review_text, images, is_verified_purchase, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewId,
        event_id,
        booking_id || null,
        userId,
        rating,
        title || null,
        review_text || null,
        images ? JSON.stringify(images) : null,
        isVerifiedPurchase,
        'approved', // Auto-approve for now, can add moderation later
      ]
    );

    // Update rating summary
    await updateEventRatingSummary(connection, event_id);

    await connection.commit();

    // Fetch the created review with user details
    const [newReview] = await connection.query(
      `SELECT r.*, u.name as user_name, u.email as user_email, u.profile_picture
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.review_id = ?`,
      [reviewId]
    );

    logger.info('Review created successfully', { reviewId, userId, eventId: event_id });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: formatReview(newReview[0]),
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error creating review', { error: error.message, userId: req.user?.id });
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Get reviews for an event
 * GET /api/v1/reviews/event/:eventId
 */
exports.getEventReviews = async (req, res, next) => {
  const pool = getMySQLPool();

  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10, rating, sort = 'recent' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, 
             u.name as user_name, 
             u.profile_picture,
             (SELECT COUNT(*) FROM review_helpful WHERE review_id = r.review_id AND is_helpful = TRUE) as helpful_count
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.event_id = ? AND r.status = 'approved'
    `;

    const params = [eventId];

    // Filter by rating
    if (rating) {
      query += ' AND r.rating = ?';
      params.push(rating);
    }

    // Sorting
    switch (sort) {
      case 'recent':
        query += ' ORDER BY r.created_at DESC';
        break;
      case 'helpful':
        query += ' ORDER BY helpful_count DESC, r.created_at DESC';
        break;
      case 'rating_high':
        query += ' ORDER BY r.rating DESC, r.created_at DESC';
        break;
      case 'rating_low':
        query += ' ORDER BY r.rating ASC, r.created_at DESC';
        break;
      default:
        query += ' ORDER BY r.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [reviews] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE event_id = ? AND status = "approved"';
    const countParams = [eventId];
    if (rating) {
      countQuery += ' AND rating = ?';
      countParams.push(rating);
    }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    // Get rating summary
    const [summary] = await pool.query(
      'SELECT * FROM event_rating_summary WHERE event_id = ?',
      [eventId]
    );

    res.json({
      success: true,
      data: {
        reviews: reviews.map(formatReview),
        summary: summary[0] || {
          total_reviews: 0,
          average_rating: 0,
          rating_5_star: 0,
          rating_4_star: 0,
          rating_3_star: 0,
          rating_2_star: 0,
          rating_1_star: 0,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching event reviews', { error: error.message, eventId: req.params.eventId });
    next(error);
  }
};

/**
 * Get user's own reviews
 * GET /api/v1/reviews/my-reviews
 */
exports.getUserReviews = async (req, res, next) => {
  const pool = getMySQLPool();

  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [reviews] = await pool.query(
      `SELECT r.*, 
              e.title as event_title, 
              e.banner as event_image,
              (SELECT COUNT(*) FROM review_helpful WHERE review_id = r.review_id AND is_helpful = TRUE) as helpful_count
       FROM reviews r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM reviews WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      data: {
        reviews: reviews.map(formatReview),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching user reviews', { error: error.message, userId: req.user?.id });
    next(error);
  }
};

/**
 * Update a review
 * PUT /api/v1/reviews/:reviewId
 */
exports.updateReview = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { rating, title, review_text, images } = req.body;

    // Check if review exists and belongs to user
    const [reviews] = await connection.query(
      'SELECT * FROM reviews WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to edit it',
      });
    }

    await connection.beginTransaction();

    // Update review
    await connection.query(
      `UPDATE reviews 
       SET rating = ?, title = ?, review_text = ?, images = ?, updated_at = NOW()
       WHERE review_id = ?`,
      [
        rating || reviews[0].rating,
        title !== undefined ? title : reviews[0].title,
        review_text !== undefined ? review_text : reviews[0].review_text,
        images ? JSON.stringify(images) : reviews[0].images,
        reviewId,
      ]
    );

    // Update rating summary
    await updateEventRatingSummary(connection, reviews[0].event_id);

    await connection.commit();

    // Fetch updated review
    const [updatedReview] = await connection.query(
      `SELECT r.*, u.name as user_name, u.profile_picture
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.review_id = ?`,
      [reviewId]
    );

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: formatReview(updatedReview[0]),
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error updating review', { error: error.message, reviewId: req.params.reviewId });
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Delete a review
 * DELETE /api/v1/reviews/:reviewId
 */
exports.deleteReview = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    // Check if review exists and belongs to user
    const [reviews] = await connection.query(
      'SELECT event_id FROM reviews WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to delete it',
      });
    }

    await connection.beginTransaction();

    // Delete review
    await connection.query('DELETE FROM reviews WHERE review_id = ?', [reviewId]);

    // Update rating summary
    await updateEventRatingSummary(connection, reviews[0].event_id);

    await connection.commit();

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error deleting review', { error: error.message, reviewId: req.params.reviewId });
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Mark review as helpful
 * POST /api/v1/reviews/:reviewId/helpful
 */
exports.markHelpful = async (req, res, next) => {
  const pool = getMySQLPool();

  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { is_helpful = true } = req.body;

    // Check if review exists
    const [reviews] = await pool.query('SELECT review_id FROM reviews WHERE review_id = ?', [reviewId]);

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Insert or update helpful vote
    await pool.query(
      `INSERT INTO review_helpful (review_id, user_id, is_helpful) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE is_helpful = ?`,
      [reviewId, userId, is_helpful, is_helpful]
    );

    // Update helpful count
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) as count FROM review_helpful WHERE review_id = ? AND is_helpful = TRUE',
      [reviewId]
    );

    await pool.query('UPDATE reviews SET helpful_count = ? WHERE review_id = ?', [count, reviewId]);

    res.json({
      success: true,
      message: 'Thank you for your feedback',
      data: { helpful_count: count },
    });
  } catch (error) {
    logger.error('Error marking review helpful', { error: error.message, reviewId: req.params.reviewId });
    next(error);
  }
};

/**
 * Report a review
 * POST /api/v1/reviews/:reviewId/report
 */
exports.reportReview = async (req, res, next) => {
  const pool = getMySQLPool();

  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required',
      });
    }

    // Check if review exists
    const [reviews] = await pool.query('SELECT review_id FROM reviews WHERE review_id = ?', [reviewId]);

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Create report
    await pool.query(
      'INSERT INTO review_reports (review_id, user_id, reason, description) VALUES (?, ?, ?, ?)',
      [reviewId, userId, reason, description || null]
    );

    // Increment report count
    await pool.query(
      'UPDATE reviews SET report_count = report_count + 1 WHERE review_id = ?',
      [reviewId]
    );

    res.json({
      success: true,
      message: 'Review reported successfully. We will review it shortly.',
    });
  } catch (error) {
    logger.error('Error reporting review', { error: error.message, reviewId: req.params.reviewId });
    next(error);
  }
};

/**
 * Super Admin: Edit any review
 * PUT /api/v1/reviews/:reviewId/admin-edit
 */
exports.adminEditReview = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const { reviewId } = req.params;
    const { rating, title, review_text, images, admin_notes } = req.body;

    // Check if user is super admin
    if (!['super_admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can edit reviews',
      });
    }

    // Check if review exists
    const [reviews] = await connection.query(
      'SELECT * FROM reviews WHERE review_id = ?',
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await connection.beginTransaction();

    // Update review with admin edit tracking
    await connection.query(
      `UPDATE reviews 
       SET rating = ?, 
           title = ?, 
           review_text = ?, 
           images = ?, 
           admin_edited = TRUE,
           admin_edited_by = ?,
           admin_edited_at = NOW(),
           admin_notes = ?,
           updated_at = NOW()
       WHERE review_id = ?`,
      [
        rating || reviews[0].rating,
        title !== undefined ? title : reviews[0].title,
        review_text !== undefined ? review_text : reviews[0].review_text,
        images ? JSON.stringify(images) : reviews[0].images,
        adminId,
        admin_notes || null,
        reviewId,
      ]
    );

    // Update rating summary
    await updateEventRatingSummary(connection, reviews[0].event_id);

    await connection.commit();

    // Fetch updated review
    const [updatedReview] = await connection.query(
      `SELECT r.*, u.name as user_name, u.profile_picture,
              admin.name as admin_name
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN users admin ON r.admin_edited_by = admin.user_id
       WHERE r.review_id = ?`,
      [reviewId]
    );

    logger.info('Review edited by super admin', { reviewId, adminId });

    res.json({
      success: true,
      message: 'Review edited successfully by super admin',
      data: formatReview(updatedReview[0]),
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error editing review by admin', { error: error.message, reviewId: req.params.reviewId });
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Super Admin: Approve/Reject review
 * PATCH /api/v1/reviews/:reviewId/status
 */
exports.updateReviewStatus = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const { reviewId } = req.params;
    const { status, rejection_reason } = req.body;

    // Check if user is super admin
    if (!['super_admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can change review status',
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'flagged'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    // Check if review exists
    const [reviews] = await connection.query(
      'SELECT * FROM reviews WHERE review_id = ?',
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await connection.beginTransaction();

    // Update review status
    await connection.query(
      `UPDATE reviews 
       SET status = ?, 
           admin_notes = ?,
           updated_at = NOW()
       WHERE review_id = ?`,
      [status, rejection_reason || null, reviewId]
    );

    // Update rating summary if status changed to/from approved
    if (reviews[0].status !== status) {
      await updateEventRatingSummary(connection, reviews[0].event_id);
    }

    await connection.commit();

    logger.info('Review status updated by super admin', { reviewId, adminId, status });

    res.json({
      success: true,
      message: `Review ${status} successfully`,
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error updating review status', { error: error.message, reviewId: req.params.reviewId });
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Super Admin: Delete any review
 * DELETE /api/v1/reviews/:reviewId/admin-delete
 */
exports.adminDeleteReview = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const { reviewId } = req.params;

    // Check if user is super admin
    if (!['super_admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can delete reviews',
      });
    }

    // Check if review exists
    const [reviews] = await connection.query(
      'SELECT event_id FROM reviews WHERE review_id = ?',
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    await connection.beginTransaction();

    // Delete review
    await connection.query('DELETE FROM reviews WHERE review_id = ?', [reviewId]);

    // Update rating summary
    await updateEventRatingSummary(connection, reviews[0].event_id);

    await connection.commit();

    logger.info('Review deleted by super admin', { reviewId, adminId });

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Error deleting review by admin', { error: error.message, reviewId: req.params.reviewId });
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Super Admin: Get all reviews with filters
 * GET /api/v1/reviews/admin/all
 */
exports.getAllReviews = async (req, res, next) => {
  const pool = getMySQLPool();

  try {
    // Check if user is super admin
    if (!['super_admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can view all reviews',
      });
    }

    const { page = 1, limit = 20, status, rating, event_id, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, 
             u.name as user_name, 
             u.email as user_email,
             e.title as event_title,
             (SELECT COUNT(*) FROM review_helpful WHERE review_id = r.review_id AND is_helpful = TRUE) as helpful_count
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      JOIN events e ON r.event_id = e.event_id
      WHERE 1=1
    `;

    const params = [];

    // Filter by status
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    // Filter by rating
    if (rating) {
      query += ' AND r.rating = ?';
      params.push(rating);
    }

    // Filter by event
    if (event_id) {
      query += ' AND r.event_id = ?';
      params.push(event_id);
    }

    // Search by user name or review text
    if (search) {
      query += ' AND (u.name LIKE ? OR r.review_text LIKE ? OR r.title LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
    const [[{ total }]] = await pool.query(countQuery, params);

    // Add sorting and pagination
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [reviews] = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        reviews: reviews.map(formatReview),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching all reviews', { error: error.message });
    next(error);
  }
};

/**
 * Helper function to update event rating summary
 */
async function updateEventRatingSummary(connection, eventId) {
  const [stats] = await connection.query(
    `SELECT 
      COUNT(*) as total_reviews,
      AVG(rating) as average_rating,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5_star,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4_star,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3_star,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2_star,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1_star
     FROM reviews
     WHERE event_id = ? AND status = 'approved'`,
    [eventId]
  );

  await connection.query(
    `INSERT INTO event_rating_summary 
     (event_id, total_reviews, average_rating, rating_5_star, rating_4_star, rating_3_star, rating_2_star, rating_1_star)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
     total_reviews = VALUES(total_reviews),
     average_rating = VALUES(average_rating),
     rating_5_star = VALUES(rating_5_star),
     rating_4_star = VALUES(rating_4_star),
     rating_3_star = VALUES(rating_3_star),
     rating_2_star = VALUES(rating_2_star),
     rating_1_star = VALUES(rating_1_star)`,
    [
      eventId,
      stats[0].total_reviews,
      parseFloat(stats[0].average_rating || 0).toFixed(2),
      stats[0].rating_5_star,
      stats[0].rating_4_star,
      stats[0].rating_3_star,
      stats[0].rating_2_star,
      stats[0].rating_1_star,
    ]
  );
}

/**
 * Helper function to format review object
 */
function formatReview(review) {
  return {
    review_id: review.review_id,
    event_id: review.event_id,
    event_title: review.event_title,
    event_image: review.event_image,
    booking_id: review.booking_id,
    user_id: review.user_id,
    user_name: review.user_name,
    user_email: review.user_email,
    profile_picture: review.profile_picture,
    rating: review.rating,
    title: review.title,
    review_text: review.review_text,
    images: review.images ? JSON.parse(review.images) : [],
    is_verified_purchase: Boolean(review.is_verified_purchase),
    helpful_count: review.helpful_count || 0,
    report_count: review.report_count || 0,
    status: review.status,
    organizer_response: review.organizer_response,
    organizer_response_date: review.organizer_response_date,
    created_at: review.created_at,
    updated_at: review.updated_at,
  };
}

module.exports = exports;
