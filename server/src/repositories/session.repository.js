const { getMySQLPool } = require('../database/mysql');
const logger = require('../utils/logger');

class SessionRepository {
  /**
   * Create a new user session
   * @param {Object} sessionData - Session data
   * @returns {Promise<Object>} Created session
   */
  async create(sessionData) {
    const pool = getMySQLPool();
    const {
      user_id,
      session_token,
      refresh_token,
      role,
      ip_address,
      user_agent,
      device_type,
      browser,
      os,
      expires_at,
      session_data,
      location_data
    } = sessionData;

    try {
      const [result] = await pool.execute(
        `INSERT INTO user_sessions 
         (user_id, session_token, refresh_token, role, ip_address, user_agent, 
          device_type, browser, os, expires_at, session_data, location_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          session_token,
          refresh_token,
          role,
          ip_address,
          user_agent,
          device_type,
          browser,
          os,
          expires_at,
          session_data ? JSON.stringify(session_data) : null,
          location_data ? JSON.stringify(location_data) : null
        ]
      );

      const sessionId = result.insertId;
      logger.info('Session created', { sessionId, user_id, role });
      
      return await this.findById(sessionId);
    } catch (error) {
      logger.error('Failed to create session', { error: error.message, user_id });
      throw error;
    }
  }

  /**
   * Find session by ID
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object|null>} Session object or null
   */
  async findById(sessionId) {
    const pool = getMySQLPool();
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM user_sessions WHERE session_id = ?',
        [sessionId]
      );
      
      if (rows.length === 0) return null;
      
      return this._parseSessionData(rows[0]);
    } catch (error) {
      logger.error('Failed to find session by ID', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Find session by token
   * @param {string} token - Session token
   * @returns {Promise<Object|null>} Session object or null
   */
  async findByToken(token) {
    const pool = getMySQLPool();
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM user_sessions WHERE session_token = ? AND is_active = 1',
        [token]
      );
      
      if (rows.length === 0) return null;
      
      return this._parseSessionData(rows[0]);
    } catch (error) {
      logger.error('Failed to find session by token', { error: error.message });
      throw error;
    }
  }

  /**
   * Find session by refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object|null>} Session object or null
   */
  async findByRefreshToken(refreshToken) {
    const pool = getMySQLPool();
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM user_sessions WHERE refresh_token = ? AND is_active = 1',
        [refreshToken]
      );
      
      if (rows.length === 0) return null;
      
      return this._parseSessionData(rows[0]);
    } catch (error) {
      logger.error('Failed to find session by refresh token', { error: error.message });
      throw error;
    }
  }

  /**
   * Find all active sessions for a user
   * @param {number} userId - User ID
   * @param {string} role - User role (optional)
   * @returns {Promise<Array>} Array of active sessions
   */
  async findActiveByUser(userId, role = null) {
    const pool = getMySQLPool();
    try {
      let query = 'SELECT * FROM user_sessions WHERE user_id = ? AND is_active = 1';
      const params = [userId];
      
      if (role) {
        query += ' AND role = ?';
        params.push(role);
      }
      
      query += ' ORDER BY last_activity DESC';
      
      const [rows] = await pool.execute(query, params);
      
      return rows.map(row => this._parseSessionData(row));
    } catch (error) {
      logger.error('Failed to find active sessions for user', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update session last activity timestamp
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object>} Updated session
   */
  async updateLastActivity(sessionId) {
    const pool = getMySQLPool();
    try {
      await pool.execute(
        'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?',
        [sessionId]
      );
      
      return await this.findById(sessionId);
    } catch (error) {
      logger.error('Failed to update session activity', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Update session token (for token rotation)
   * @param {number} sessionId - Session ID
   * @param {string} newToken - New session token
   * @param {string} newRefreshToken - New refresh token
   * @returns {Promise<Object>} Updated session
   */
  async updateTokens(sessionId, newToken, newRefreshToken) {
    const pool = getMySQLPool();
    try {
      await pool.execute(
        'UPDATE user_sessions SET session_token = ?, refresh_token = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
        [newToken, newRefreshToken, sessionId]
      );
      
      logger.info('Session tokens updated', { sessionId });
      return await this.findById(sessionId);
    } catch (error) {
      logger.error('Failed to update session tokens', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Revoke a session
   * @param {number} sessionId - Session ID
   * @param {number} revokedBy - User ID who revoked the session
   * @param {string} reason - Reason for revocation
   * @returns {Promise<Object>} Updated session
   */
  async revoke(sessionId, revokedBy = null, reason = null) {
    const pool = getMySQLPool();
    try {
      await pool.execute(
        `UPDATE user_sessions 
         SET is_active = 0, is_revoked = 1, revoked_at = CURRENT_TIMESTAMP, 
             revoked_by = ?, revoke_reason = ?
         WHERE session_id = ?`,
        [revokedBy, reason, sessionId]
      );
      
      logger.info('Session revoked', { sessionId, revokedBy, reason });
      return await this.findById(sessionId);
    } catch (error) {
      logger.error('Failed to revoke session', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user except current session
   * @param {number} userId - User ID
   * @param {number} exceptSessionId - Session ID to keep active
   * @param {number} revokedBy - User ID who revoked the sessions
   * @returns {Promise<number>} Number of revoked sessions
   */
  async revokeAllForUser(userId, exceptSessionId = null, revokedBy = null) {
    const pool = getMySQLPool();
    try {
      let query = `UPDATE user_sessions 
                   SET is_active = 0, is_revoked = 1, revoked_at = CURRENT_TIMESTAMP, 
                       revoked_by = ?, revoke_reason = 'Session cleanup'
                   WHERE user_id = ? AND is_active = 1`;
      const params = [revokedBy, userId];
      
      if (exceptSessionId) {
        query += ' AND session_id != ?';
        params.push(exceptSessionId);
      }
      
      const [result] = await pool.execute(query, params);
      
      logger.info('All user sessions revoked', { userId, exceptSessionId, count: result.affectedRows });
      return result.affectedRows;
    } catch (error) {
      logger.error('Failed to revoke all user sessions', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user by role
   * @param {number} userId - User ID
   * @param {string} role - User role
   * @param {number} revokedBy - User ID who revoked the sessions
   * @returns {Promise<number>} Number of revoked sessions
   */
  async revokeAllByRole(userId, role, revokedBy = null) {
    const pool = getMySQLPool();
    try {
      const [result] = await pool.execute(
        `UPDATE user_sessions 
         SET is_active = 0, is_revoked = 1, revoked_at = CURRENT_TIMESTAMP, 
             revoked_by = ?, revoke_reason = 'Role-based revocation'
         WHERE user_id = ? AND role = ? AND is_active = 1`,
        [revokedBy, userId, role]
      );
      
      logger.info('All role sessions revoked', { userId, role, count: result.affectedRows });
      return result.affectedRows;
    } catch (error) {
      logger.error('Failed to revoke role sessions', { error: error.message, userId, role });
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   * @returns {Promise<number>} Number of cleaned sessions
   */
  async cleanupExpiredSessions() {
    const pool = getMySQLPool();
    try {
      const [result] = await pool.execute(
        `UPDATE user_sessions 
         SET is_active = 0, is_revoked = 1, revoked_at = CURRENT_TIMESTAMP, 
             revoke_reason = 'Session expired'
         WHERE is_active = 1 AND expires_at < CURRENT_TIMESTAMP`
      );
      
      if (result.affectedRows > 0) {
        logger.info('Expired sessions cleaned up', { count: result.affectedRows });
      }
      
      return result.affectedRows;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if user has exceeded session limit
   * @param {number} userId - User ID
   * @param {string} role - User role
   * @returns {Promise<boolean>} True if limit exceeded
   */
  async isSessionLimitExceeded(userId, role) {
    const pool = getMySQLPool();
    try {
      // Get session limit for user role
      const [limitRows] = await pool.execute(
        'SELECT max_concurrent_sessions FROM user_session_limits WHERE user_id = ? AND role = ?',
        [userId, role]
      );
      
      const maxSessions = limitRows.length > 0 ? limitRows[0].max_concurrent_sessions : 5;
      
      // Count active sessions
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ? AND role = ? AND is_active = 1',
        [userId, role]
      );
      
      const activeCount = countRows[0].count;
      return activeCount >= maxSessions;
    } catch (error) {
      logger.error('Failed to check session limit', { error: error.message, userId, role });
      throw error;
    }
  }

  /**
   * Log session activity
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} Created activity log
   */
  async logActivity(activityData) {
    const pool = getMySQLPool();
    const {
      session_id,
      user_id,
      action,
      ip_address,
      user_agent,
      action_details
    } = activityData;

    try {
      const [result] = await pool.execute(
        `INSERT INTO session_activity_logs 
         (session_id, user_id, action, ip_address, user_agent, action_details)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          session_id,
          user_id,
          action,
          ip_address,
          user_agent,
          action_details ? JSON.stringify(action_details) : null
        ]
      );

      const logId = result.insertId;
      
      const [rows] = await pool.execute(
        'SELECT * FROM session_activity_logs WHERE log_id = ?',
        [logId]
      );
      
      return rows[0];
    } catch (error) {
      logger.error('Failed to log session activity', { error: error.message, session_id, action });
      throw error;
    }
  }

  /**
   * Get session activity logs
   * @param {number} sessionId - Session ID
   * @param {number} limit - Number of logs to return
   * @returns {Promise<Array>} Array of activity logs
   */
  async getActivityLogs(sessionId, limit = 50) {
    const pool = getMySQLPool();
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM session_activity_logs 
         WHERE session_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [sessionId, limit]
      );
      
      return rows.map(row => ({
        ...row,
        action_details: row.action_details ? JSON.parse(row.action_details) : null
      }));
    } catch (error) {
      logger.error('Failed to get session activity logs', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Parse session data (convert JSON strings to objects)
   * @private
   * @param {Object} row - Database row
   * @returns {Object} Parsed session object
   */
  _parseSessionData(row) {
    return {
      ...row,
      session_data: row.session_data ? JSON.parse(row.session_data) : null,
      location_data: row.location_data ? JSON.parse(row.location_data) : null
    };
  }
}

module.exports = new SessionRepository();
