const express = require('express');
const { getMySQLPool } = require('../../database/mysql');
const { authenticate, authorize } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// Get all users
router.get('/', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const { page = 1, limit = 20, role, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT user_id, name, email, role, phone, is_active, is_verified, created_at, last_login FROM users WHERE 1=1';
    const params = [];
    
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      query += ' AND is_active = ?';
      params.push(status === 'active' ? 1 : 0);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [users] = await pool.query(query, params);
    
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM users');
    
    res.json({ 
      success: true, 
      data: { 
        users, 
        pagination: { page: parseInt(page), limit: parseInt(limit), total } 
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const [users] = await pool.query(
      'SELECT user_id, name, email, role, phone, is_active, is_verified, created_at, last_login FROM users WHERE user_id = ?',
      [req.params.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: users[0] });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const { name, phone, role, is_active } = req.body;
    
    const updates = [];
    const params = [];
    
    if (name) { updates.push('name = ?'); params.push(name); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (typeof is_active !== 'undefined') { updates.push('is_active = ?'); params.push(is_active); }
    
    params.push(req.params.id);
    
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    );
    
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete/Deactivate user
router.delete('/:id', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    await pool.execute(
      'UPDATE users SET is_active = 0 WHERE user_id = ?',
      [req.params.id]
    );
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
