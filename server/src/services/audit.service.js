const { getMySQLPool } = require('../database/mysql');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Log any action in the system
   */
  async logAction(data) {
    try {
      const pool = getMySQLPool();
      
      const {
        userId,
        userName,
        userEmail,
        userRole,
        action,
        actionType = 'other',
        resourceType,
        resourceId,
        description,
        ipAddress,
        userAgent,
        requestMethod,
        requestUrl,
        requestBody,
        responseStatus,
        oldValues,
        newValues,
        metadata,
        severity = 'low'
      } = data;

      const [result] = await pool.execute(
        `INSERT INTO audit_logs 
        (user_id, user_name, user_email, user_role, action, action_type, 
         resource_type, resource_id, description, ip_address, user_agent, 
         request_method, request_url, request_body, response_status, 
         old_values, new_values, metadata, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId || null,
          userName || null,
          userEmail || null,
          userRole || null,
          action,
          actionType,
          resourceType || null,
          resourceId || null,
          description || null,
          ipAddress || null,
          userAgent || null,
          requestMethod || null,
          requestUrl || null,
          requestBody ? JSON.stringify(requestBody) : null,
          responseStatus || null,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          metadata ? JSON.stringify(metadata) : null,
          severity
        ]
      );

      logger.info('Audit log created', { 
        auditId: result.insertId, 
        action, 
        userId, 
        resourceType 
      });

      return result.insertId;
    } catch (error) {
      logger.error('Failed to create audit log', { error: error.message, data });
      // Don't throw - audit logging should not break the application
      return null;
    }
  }

  /**
   * Log event approval action
   */
  async logEventApproval(data) {
    try {
      const pool = getMySQLPool();
      
      const {
        eventId,
        organizerId,
        organizerName,
        organizerEmail,
        reviewerId,
        reviewerName,
        reviewerEmail,
        reviewerRole,
        action,
        previousStatus,
        newStatus,
        comments,
        rejectionReason,
        metadata
      } = data;

      const [result] = await pool.execute(
        `INSERT INTO event_approval_history 
        (event_id, organizer_id, organizer_name, organizer_email, 
         reviewer_id, reviewer_name, reviewer_email, reviewer_role,
         action, previous_status, new_status, comments, rejection_reason, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          organizerId,
          organizerName,
          organizerEmail,
          reviewerId || null,
          reviewerName || null,
          reviewerEmail || null,
          reviewerRole || null,
          action,
          previousStatus || null,
          newStatus || null,
          comments || null,
          rejectionReason || null,
          metadata ? JSON.stringify(metadata) : null
        ]
      );

      // Also log in main audit log
      await this.logAction({
        userId: reviewerId,
        userName: reviewerName,
        userEmail: reviewerEmail,
        userRole: reviewerRole,
        action: `event_${action}`,
        actionType: action === 'approved' ? 'approve' : action === 'rejected' ? 'reject' : 'other',
        resourceType: 'event',
        resourceId: eventId,
        description: `Event ${action} for organizer ${organizerName}`,
        metadata: { ...metadata, organizerId, previousStatus, newStatus },
        severity: action === 'rejected' ? 'medium' : 'low'
      });

      return result.insertId;
    } catch (error) {
      logger.error('Failed to log event approval', { error: error.message, data });
      return null;
    }
  }

  /**
   * Log user session (login/logout)
   */
  async logSession(data) {
    try {
      const pool = getMySQLPool();
      
      const {
        userId,
        sessionToken,
        ipAddress,
        userAgent,
        action = 'login',
        metadata
      } = data;

      if (action === 'login') {
        const [result] = await pool.execute(
          `INSERT INTO user_sessions 
          (user_id, session_token, ip_address, user_agent, metadata)
          VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            sessionToken,
            ipAddress || null,
            userAgent || null,
            metadata ? JSON.stringify(metadata) : null
          ]
        );

        await this.logAction({
          userId,
          action: 'user_login',
          actionType: 'login',
          description: 'User logged in',
          ipAddress,
          userAgent,
          severity: 'low'
        });

        return result.insertId;
      } else if (action === 'logout') {
        await pool.execute(
          `UPDATE user_sessions 
          SET logout_at = NOW(), is_active = 0 
          WHERE user_id = ? AND session_token = ? AND is_active = 1`,
          [userId, sessionToken]
        );

        await this.logAction({
          userId,
          action: 'user_logout',
          actionType: 'logout',
          description: 'User logged out',
          ipAddress,
          userAgent,
          severity: 'low'
        });
      } else if (action === 'activity') {
        await pool.execute(
          `UPDATE user_sessions 
          SET last_activity = NOW() 
          WHERE user_id = ? AND session_token = ? AND is_active = 1`,
          [userId, sessionToken]
        );
      }
    } catch (error) {
      logger.error('Failed to log session', { error: error.message, data });
      return null;
    }
  }

  /**
   * Log file access (upload/download)
   */
  async logFileAccess(data) {
    try {
      const pool = getMySQLPool();
      
      const {
        userId,
        fileType,
        fileName,
        filePath,
        fileSize,
        action,
        resourceType,
        resourceId,
        ipAddress,
        status = 'success'
      } = data;

      const [result] = await pool.execute(
        `INSERT INTO file_access_logs 
        (user_id, file_type, file_name, file_path, file_size, action, 
         resource_type, resource_id, ip_address, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId || null,
          fileType,
          fileName,
          filePath || null,
          fileSize || null,
          action,
          resourceType || null,
          resourceId || null,
          ipAddress || null,
          status
        ]
      );

      await this.logAction({
        userId,
        action: `file_${action}`,
        actionType: action,
        resourceType: 'file',
        resourceId: result.insertId,
        description: `File ${action}: ${fileName}`,
        metadata: { fileType, fileName, fileSize },
        severity: action === 'delete' ? 'medium' : 'low'
      });

      return result.insertId;
    } catch (error) {
      logger.error('Failed to log file access', { error: error.message, data });
      return null;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters = {}) {
    try {
      const pool = getMySQLPool();
      
      const {
        userId,
        userRole,
        action,
        actionType,
        resourceType,
        resourceId,
        severity,
        startDate,
        endDate,
        page = 1,
        limit = 50,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = filters;

      let whereConditions = [];
      let params = [];

      if (userId) {
        whereConditions.push('user_id = ?');
        params.push(userId);
      }

      if (userRole) {
        whereConditions.push('user_role = ?');
        params.push(userRole);
      }

      if (action) {
        whereConditions.push('action = ?');
        params.push(action);
      }

      if (actionType) {
        whereConditions.push('action_type = ?');
        params.push(actionType);
      }

      if (resourceType) {
        whereConditions.push('resource_type = ?');
        params.push(resourceType);
      }

      if (resourceId) {
        whereConditions.push('resource_id = ?');
        params.push(resourceId);
      }

      if (severity) {
        whereConditions.push('severity = ?');
        params.push(severity);
      }

      if (startDate) {
        whereConditions.push('created_at >= ?');
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push('created_at <= ?');
        params.push(endDate);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ') 
        : '';

      const offset = (page - 1) * limit;

      const [logs] = await pool.query(
        `SELECT * FROM audit_logs 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), parseInt(offset)]
      );

      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        params
      );

      return {
        logs: logs.map(log => ({
          ...log,
          request_body: this.parseJSON(log.request_body),
          old_values: this.parseJSON(log.old_values),
          new_values: this.parseJSON(log.new_values),
          metadata: this.parseJSON(log.metadata)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get audit logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user activity history
   */
  async getUserActivity(userId, filters = {}) {
    try {
      const pool = getMySQLPool();
      
      const {
        startDate,
        endDate,
        actionType,
        page = 1,
        limit = 50
      } = filters;

      let whereConditions = ['user_id = ?'];
      let params = [userId];

      if (startDate) {
        whereConditions.push('created_at >= ?');
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push('created_at <= ?');
        params.push(endDate);
      }

      if (actionType) {
        whereConditions.push('action_type = ?');
        params.push(actionType);
      }

      const whereClause = whereConditions.join(' AND ');
      const offset = (page - 1) * limit;

      const [logs] = await pool.query(
        `SELECT * FROM audit_logs 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), parseInt(offset)]
      );

      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`,
        params
      );

      return {
        logs: logs.map(log => ({
          ...log,
          metadata: this.parseJSON(log.metadata)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get user activity', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get event approval history
   */
  async getEventApprovalHistory(eventId) {
    try {
      const pool = getMySQLPool();
      
      const [history] = await pool.query(
        `SELECT * FROM event_approval_history 
        WHERE event_id = ?
        ORDER BY created_at ASC`,
        [eventId]
      );

      return history.map(record => ({
        ...record,
        metadata: this.parseJSON(record.metadata)
      }));
    } catch (error) {
      logger.error('Failed to get event approval history', { error: error.message, eventId });
      throw error;
    }
  }

  /**
   * Get organizer complete history with profile
   */
  async getOrganizerHistory(organizerId) {
    try {
      const pool = getMySQLPool();
      
      // Get organizer profile
      const [[organizer]] = await pool.query(
        `SELECT u.*, 
                COUNT(DISTINCT e.event_id) as total_events,
                COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.event_id END) as published_events,
                COUNT(DISTINCT b.booking_id) as total_bookings,
                COALESCE(SUM(p.amount), 0) as total_revenue
        FROM users u
        LEFT JOIN events e ON u.user_id = e.organizer_id
        LEFT JOIN bookings b ON e.event_id = b.event_id
        LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.status = 'completed'
        WHERE u.user_id = ?
        GROUP BY u.user_id`,
        [organizerId]
      );

      if (!organizer) {
        return null;
      }

      // Get audit logs
      const [auditLogs] = await pool.query(
        `SELECT * FROM audit_logs 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 100`,
        [organizerId]
      );

      // Get events created
      const [events] = await pool.query(
        `SELECT e.*,
                u.name as approved_by_name,
                u.email as approved_by_email
        FROM events e
        LEFT JOIN users u ON e.approved_by = u.user_id
        WHERE e.organizer_id = ?
        ORDER BY e.created_at DESC`,
        [organizerId]
      );

      // Get KYC history
      const [kycHistory] = await pool.query(
        `SELECT * FROM user_kyc_verifications 
        WHERE user_id = ?
        ORDER BY created_at DESC`,
        [organizerId]
      );

      // Get login sessions
      const [sessions] = await pool.query(
        `SELECT * FROM user_sessions 
        WHERE user_id = ?
        ORDER BY login_at DESC
        LIMIT 50`,
        [organizerId]
      );

      return {
        profile: organizer,
        auditLogs: auditLogs.map(log => ({
          ...log,
          metadata: this.parseJSON(log.metadata)
        })),
        events,
        kycHistory: kycHistory.map(kyc => ({
          ...kyc,
          documents: this.parseJSON(kyc.documents),
          bank_documents: this.parseJSON(kyc.bank_documents)
        })),
        sessions
      };
    } catch (error) {
      logger.error('Failed to get organizer history', { error: error.message, organizerId });
      throw error;
    }
  }

  /**
   * Get dashboard statistics for super admin
   */
  async getDashboardStats(filters = {}) {
    try {
      const pool = getMySQLPool();
      
      const { startDate, endDate } = filters;
      let dateFilter = '';
      let params = [];

      if (startDate && endDate) {
        dateFilter = 'WHERE created_at BETWEEN ? AND ?';
        params = [startDate, endDate];
      }

      // Get statistics
      const [[stats]] = await pool.query(
        `SELECT 
          COUNT(DISTINCT CASE WHEN user_role = 'organizer' THEN user_id END) as organizer_count,
          COUNT(DISTINCT CASE WHEN user_role = 'customer' THEN user_id END) as customer_count,
          COUNT(DISTINCT CASE WHEN action_type = 'create' THEN id END) as create_actions,
          COUNT(DISTINCT CASE WHEN action_type = 'update' THEN id END) as update_actions,
          COUNT(DISTINCT CASE WHEN action_type = 'delete' THEN id END) as delete_actions,
          COUNT(DISTINCT CASE WHEN action_type = 'approve' THEN id END) as approve_actions,
          COUNT(DISTINCT CASE WHEN action_type = 'reject' THEN id END) as reject_actions,
          COUNT(DISTINCT CASE WHEN severity = 'high' OR severity = 'critical' THEN id END) as high_severity_count
        FROM audit_logs
        ${dateFilter}`,
        params
      );

      // Get action breakdown
      const [actionBreakdown] = await pool.query(
        `SELECT action_type, COUNT(*) as count
        FROM audit_logs
        ${dateFilter}
        GROUP BY action_type
        ORDER BY count DESC`,
        params
      );

      // Get recent activities
      const [recentActivities] = await pool.query(
        `SELECT * FROM audit_logs
        ${dateFilter}
        ORDER BY created_at DESC
        LIMIT 20`,
        params
      );

      return {
        stats,
        actionBreakdown,
        recentActivities: recentActivities.map(activity => ({
          ...activity,
          metadata: this.parseJSON(activity.metadata)
        }))
      };
    } catch (error) {
      logger.error('Failed to get dashboard stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Parse JSON safely
   */
  parseJSON(data) {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

module.exports = new AuditService();
