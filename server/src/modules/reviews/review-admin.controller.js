const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');

exports.getAllReviews = async (req, res, next) => {
  const pool = getMySQLPool();
  try {
    const { page = 1, limit = 20, status, rating, event_id, search, sort = 'recent' } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT r.*,
             u.name as user_name, u.email as user_email,
             e.title as event_title, e.organizer_id,
             (SELECT COUNT(*) FROM review_reports WHERE review_id = r.review_id AND status = 'pending') as pending_reports
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      JOIN events e ON r.event_id = e.event_id
      WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND r.status = ?'; params.push(status); }
    if (rating) { query += ' AND r.rating = ?'; params.push(rating); }
    if (event_id) { query += ' AND r.event_id = ?'; params.push(event_id); }
    if (search) {
      query += ' AND (r.review_text LIKE ? OR r.title LIKE ? OR u.name LIKE ? OR e.title LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    const sortMap = { recent: 'r.created_at DESC', oldest: 'r.created_at ASC', rating_high: 'r.rating DESC', rating_low: 'r.rating ASC', most_reported: 'r.report_count DESC' };
    query += ` ORDER BY ${sortMap[sort] || 'r.created_at DESC'} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [reviews] = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM reviews r WHERE 1=1';
    const countParams = [];
    if (status) { countQuery += ' AND r.status = ?'; countParams.push(status); }
    if (rating) { countQuery += ' AND r.rating = ?'; countParams.push(rating); }
    if (event_id) { countQuery += ' AND r.event_id = ?'; countParams.push(event_id); }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    const [stats] = await pool.query(`
      SELECT COUNT(*) as total_reviews,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_reviews,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved_reviews,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected_reviews,
        SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END) as flagged_reviews,
        SUM(CASE WHEN report_count > 0 THEN 1 ELSE 0 END) as reviews_with_reports,
        AVG(rating) as average_rating
      FROM reviews`);

    res.json({
      success: true,
      data: {
        reviews: reviews.map(formatReview),
        statistics: stats[0],
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Error fetching reviews (admin)', { error: error.message });
    next(error);
  }
};

exports.updateReviewStatus = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();
  try {
    const { reviewId } = req.params;
    const { status, admin_notes } = req.body;
    if (!['pending', 'approved', 'rejected', 'flagged'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const [rows] = await connection.query('SELECT event_id FROM reviews WHERE review_id = ?', [reviewId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Review not found' });

    await connection.beginTransaction();
    await connection.query('UPDATE reviews SET status = ?, admin_notes = ?, updated_at = NOW() WHERE review_id = ?', [status, admin_notes || null, reviewId]);
    await updateEventRatingSummary(connection, rows[0].event_id);
    await connection.commit();

    res.json({ success: true, message: 'Review status updated successfully' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

exports.deleteReview = async (req, res, next) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();
  try {
    const { reviewId } = req.params;
    const [rows] = await connection.query('SELECT event_id FROM reviews WHERE review_id = ?', [reviewId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Review not found' });

    await connection.beginTransaction();
    await connection.query('DELETE FROM reviews WHERE review_id = ?', [reviewId]);
    await updateEventRatingSummary(connection, rows[0].event_id);
    await connection.commit();

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

async function updateEventRatingSummary(connection, eventId) {
  const [stats] = await connection.query(
    `SELECT COUNT(*) as total_reviews, AVG(rating) as average_rating,
      SUM(CASE WHEN rating=5 THEN 1 ELSE 0 END) as rating_5_star,
      SUM(CASE WHEN rating=4 THEN 1 ELSE 0 END) as rating_4_star,
      SUM(CASE WHEN rating=3 THEN 1 ELSE 0 END) as rating_3_star,
      SUM(CASE WHEN rating=2 THEN 1 ELSE 0 END) as rating_2_star,
      SUM(CASE WHEN rating=1 THEN 1 ELSE 0 END) as rating_1_star
     FROM reviews WHERE event_id = ? AND status = 'approved'`, [eventId]);
  await connection.query(
    `INSERT INTO event_rating_summary (event_id, total_reviews, average_rating, rating_5_star, rating_4_star, rating_3_star, rating_2_star, rating_1_star)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE total_reviews=VALUES(total_reviews), average_rating=VALUES(average_rating),
     rating_5_star=VALUES(rating_5_star), rating_4_star=VALUES(rating_4_star), rating_3_star=VALUES(rating_3_star),
     rating_2_star=VALUES(rating_2_star), rating_1_star=VALUES(rating_1_star)`,
    [eventId, stats[0].total_reviews, parseFloat(stats[0].average_rating || 0).toFixed(2),
     stats[0].rating_5_star, stats[0].rating_4_star, stats[0].rating_3_star, stats[0].rating_2_star, stats[0].rating_1_star]);
}

function formatReview(r) {
  return {
    review_id: r.review_id, event_id: r.event_id, event_title: r.event_title,
    booking_id: r.booking_id, user_id: r.user_id, user_name: r.user_name, user_email: r.user_email,
    rating: r.rating, title: r.title, review_text: r.review_text,
    images: r.images ? JSON.parse(r.images) : [],
    is_verified_purchase: Boolean(r.is_verified_purchase),
    helpful_count: r.helpful_count || 0, report_count: r.report_count || 0,
    pending_reports: r.pending_reports || 0, status: r.status,
    organizer_response: r.organizer_response, organizer_response_date: r.organizer_response_date,
    admin_notes: r.admin_notes, created_at: r.created_at, updated_at: r.updated_at,
  };
}
