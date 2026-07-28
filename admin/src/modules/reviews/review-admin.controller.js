const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');

/**
 * Get all reviews with filters (admin)
 * GET /api/v1/admin/reviews
 */
exports.getAllReviews = async (req, res, next) => {
  const pool = getMySQLPool();

  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      rating, 
      event_id,
      search,
      sort = 'recent'
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, 
             u.name as user_name, 
             u.email as user_email,
             e.title as event_title,
             e.organizer_id,
             (SELECT COUNT(*) FROM review_reports WHERE review_id = r.review_id AND status = 'pending') as pending_reports
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      JOIN events e ON r.event_id = e.event_id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (rating) {
      query += ' AND r.rating = ?';
      params.push(rating);
    }

    if (event_id) {
      query += ' AND r.event_id = ?';
      params.push(event_id);
    }

    if (search) {
      query += ' AND (r.review_text LIKE ? OR r.title LIKE ? OR u.name LIKE ? OR e.title LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Sorting
    switch (sort) {
      case 'recent':
        query += ' ORDER BY r.created_at DESC';
        break;
      case 'oldest':
        query += ' ORDER BY r.created_at ASC';
        break;
      case 'rating_high':
        query += ' ORDER BY r.rating DESC';
        break;
      case 'rating_low':
        query += ' ORDER BY r.rating ASC';
        break;
      case 'most_reported':
        query += ' ORDER BY r.report_count DESC';
        break;
      default:
        query += ' ORDER BY r.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [reviews] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM reviews r WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND r.status = ?';
      countParams.push(status);
    }
    if (rating) {
      countQuery += ' AND r.rating = ?';
      countParams.push(rating);
    }
    if (event_id) {
      countQuery += ' AND r.event_id = ?';
      countParams.push(event_id);
    }
    if (search) {
      countQuery += ' AND EXISTS (SELECT 1 FROM users u WHERE u.user_id = r.user_id AND u.name LIKE ?)';
      countParams.push(`%${search}%`);
    }

    const [[{ total }]] = await pool.query(countQuery, countParams);

    // Get statistics
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_reviews,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reviews,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_reviews,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_reviews,
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as flagged_reviews,
        SUM(CASE WHEN report_count > 0 THEN 1 ELSE 0 END) as reviews_with_reports,
        AVG(rating) as average_rating
      FROM reviews
    `);

    res.json({
      success: true,
      data: {
        reviews: reviews.map(formatReview),
        statistics: stats[0],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching reviews (admin)', { error: error.message });
    next(error);
  }
};

/**
 * Update review status
 * PUT /api/v1/admin/reviews/:reviewId/status
 */
exports.updateReviewStatus = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();

  try {
    const { reviewId } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.user.id;

    if (!['pending', 'approved', 'rejected', 'flagged'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
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

    // Update review status
    await connection.query(
      'UPDATE reviews SET status = ?, admin_notes = ?, updated_at = NOW() WHERE review_id = ?',
      [status, admin_notes || null, reviewId]
    );

    // Update rating summary if status changed to/from approved
    await updateEventRatingSummary(connection, reviews[0].event_id);

    await connection.commit();

    logger.info('Review status updated', { reviewId, status, adminId });

    res.json({
      success: true,
      message: 'Review status updated successfully',
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
 * Delete review (admin)
 * DELETE /api/v1/admin/reviews/:reviewId
 */
exports.deleteReview = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();

  try {
    const { reviewId } = req.params;
    const adminId = req.user.id;

    // Get review details
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

    logger.info('Review deleted by admin', { reviewId, adminId });

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
 * Get review reports
 * GET /api/v1/admin/reviews/reports
 */
exports.getReviewReports = async (req, res, next) => {
  const pool = getMySQLPool();

  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const offset = (page - 1) * limit;

    const [reports] = await pool.query(
      `SELECT rr.*, 
              r.review_text, r.rating, r.status as review_status,
              u.name as reporter_name, u.email as reporter_email,
              ru.name as review_author_name,
              e.title as event_title
       FROM review_reports rr
       JOIN reviews r ON rr.review_id = r.review_id
       JOIN users u ON rr.user_id = u.user_id
       JOIN users ru ON r.user_id = ru.user_id
       JOIN events e ON r.event_id = e.event_id
       WHERE rr.status = ?
       ORDER BY rr.created_at DESC
       LIMIT ? OFFSET ?`,
      [status, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM review_reports WHERE status = ?',
      [status]
    );

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching review reports', { error: error.message });
    next(error);
  }
};

/**
 * Update report status
 * PUT /api/v1/admin/reviews/reports/:reportId
 */
exports.updateReportStatus = async (req, res, next) => {
  const pool = getMySQLPool();

  try {
    const { reportId } = req.params;
    const { status, admin_notes } = req.body;

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    await pool.query(
      'UPDATE review_reports SET status = ?, admin_notes = ?, updated_at = NOW() WHERE id = ?',
      [status, admin_notes || null, reportId]
    );

    res.json({
      success: true,
      message: 'Report status updated successfully',
    });
  } catch (error) {
    logger.error('Error updating report status', { error: error.message, reportId: req.params.reportId });
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
    booking_id: review.booking_id,
    user_id: review.user_id,
    user_name: review.user_name,
    user_email: review.user_email,
    rating: review.rating,
    title: review.title,
    review_text: review.review_text,
    images: review.images ? JSON.parse(review.images) : [],
    is_verified_purchase: Boolean(review.is_verified_purchase),
    helpful_count: review.helpful_count || 0,
    report_count: review.report_count || 0,
    pending_reports: review.pending_reports || 0,
    status: review.status,
    organizer_response: review.organizer_response,
    organizer_response_date: review.organizer_response_date,
    admin_notes: review.admin_notes,
    created_at: review.created_at,
    updated_at: review.updated_at,
  };
}

module.exports = exports;
