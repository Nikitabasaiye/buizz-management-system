const express = require('express');
const { getMySQLPool } = require('../../database/mysql');
const { authenticate, authorize } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// Dashboard overview
router.get('/dashboard', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    
    const [[users]] = await pool.query(
      'SELECT COUNT(*) as total, SUM(role = "organizer") as organizers FROM users WHERE is_active = 1'
    );
    
    const [[events]] = await pool.query(
      'SELECT COUNT(*) as total FROM events'
    );
    
    const [[bookings]] = await pool.query(
      'SELECT COUNT(*) as total FROM bookings WHERE booking_status = "confirmed"'
    );
    
    const [[revenue]] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = "completed"'
    );
    
    res.json({ 
      success: true, 
      data: { 
        users: users.total,
        organizers: users.organizers,
        events: events.total,
        bookings: bookings.total,
        revenue: revenue.total
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Revenue analytics
router.get('/revenue', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT DATE(created_at) as date, SUM(amount) as revenue FROM payments WHERE status = "completed"';
    const params = [];
    
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }
    
    query += ' GROUP BY DATE(created_at) ORDER BY date DESC';
    
    const [revenue] = await pool.query(query, params);
    res.json({ success: true, data: revenue });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
