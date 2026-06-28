const { getMySQLPool } = require('../database/mysql');

const create = async (logData) => {
  const pool = getMySQLPool();
  
  const [result] = await pool.query(
    `INSERT INTO audit_logs (
      action, user_id, user_email, user_role, resource_type, resource_id,
      method, path, ip, user_agent, status, error_message, request_body,
      response_status, duration, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logData.action,
      logData.userId || null,
      logData.userEmail || null,
      logData.userRole || null,
      logData.resourceType || null,
      logData.resourceId || null,
      logData.method || null,
      logData.path || null,
      logData.ip || null,
      logData.userAgent || null,
      logData.status || 'success',
      logData.errorMessage || null,
      logData.requestBody ? JSON.stringify(logData.requestBody) : null,
      logData.responseStatus || null,
      logData.duration || null,
      logData.metadata ? JSON.stringify(logData.metadata) : null
    ]
  );

  return result.insertId;
};

const findByUserId = async (userId, options = {}) => {
  const pool = getMySQLPool();
  const { page = 1, limit = 50, startDate, endDate } = options;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE user_id = ?';
  const params = [userId];

  if (startDate) {
    whereClause += ' AND created_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND created_at <= ?';
    params.push(endDate);
  }

  const [rows] = await pool.query(
    `SELECT * FROM audit_logs ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
    params
  );

  return {
    logs: rows.map(formatLog),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult[0].total,
      pages: Math.ceil(countResult[0].total / limit)
    }
  };
};

const findByAction = async (action, options = {}) => {
  const pool = getMySQLPool();
  const { page = 1, limit = 50, status } = options;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE action = ?';
  const params = [action];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const [rows] = await pool.query(
    `SELECT * FROM audit_logs ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  return rows.map(formatLog);
};

const findFailedLogins = async (hours = 24) => {
  const pool = getMySQLPool();
  
  const [rows] = await pool.query(
    `SELECT * FROM audit_logs
     WHERE action = 'auth:login'
     AND status = 'failure'
     AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
     ORDER BY created_at DESC`,
    [hours]
  );

  return rows.map(formatLog);
};

const findSuspiciousActivity = async (hours = 24) => {
  const pool = getMySQLPool();
  
  const [rows] = await pool.query(
    `SELECT * FROM audit_logs
     WHERE status = 'error'
     AND (error_message LIKE '%suspicious%' 
          OR error_message LIKE '%injection%'
          OR error_message LIKE '%attack%')
     AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
     ORDER BY created_at DESC`,
    [hours]
  );

  return rows.map(formatLog);
};

const getStatsByUser = async (userId, days = 30) => {
  const pool = getMySQLPool();
  
  const [rows] = await pool.query(
    `SELECT 
       action,
       COUNT(*) as count,
       SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
       SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failure_count
     FROM audit_logs
     WHERE user_id = ?
     AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY action
     ORDER BY count DESC`,
    [userId, days]
  );

  return rows;
};

const cleanOldLogs = async (days = 90) => {
  const pool = getMySQLPool();
  
  const [result] = await pool.query(
    `DELETE FROM audit_logs
     WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [days]
  );

  return result.affectedRows;
};

// Helper function to format log data
const formatLog = (row) => {
  return {
    id: row.id,
    action: row.action,
    userId: row.user_id,
    userEmail: row.user_email,
    userRole: row.user_role,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    method: row.method,
    path: row.path,
    ip: row.ip,
    userAgent: row.user_agent,
    status: row.status,
    errorMessage: row.error_message,
    requestBody: row.request_body ? JSON.parse(row.request_body) : null,
    responseStatus: row.response_status,
    duration: row.duration,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.created_at
  };
};

module.exports = {
  create,
  findByUserId,
  findByAction,
  findFailedLogins,
  findSuspiciousActivity,
  getStatsByUser,
  cleanOldLogs
};
