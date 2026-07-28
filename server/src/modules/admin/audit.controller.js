const auditService = require('../../services/audit.service');
const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');

const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getAuditLogById = async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.execute('SELECT * FROM audit_logs WHERE id = ?', [req.params.id]);
    if (!rows[0]) throw new AppError('Audit log not found', 404);
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

const getUserActivity = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.params.id;
    const result = await auditService.getUserActivity(userId, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getUserSessions = async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const [rows] = await pool.execute(
      `SELECT * FROM user_sessions WHERE user_id = ? ORDER BY login_at DESC LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), offset]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) { next(error); }
};

const getOrganizerHistory = async (req, res, next) => {
  try {
    const organizerId = req.params.organizerId || req.params.id;
    const result = await auditService.getOrganizerHistory(organizerId);
    if (!result) throw new AppError('Organizer not found', 404);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getEventApprovalHistory = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id;
    const result = await auditService.getEventApprovalHistory(eventId);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const result = await auditService.getDashboardStats(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const getMyActivity = async (req, res, next) => {
  try {
    const result = await auditService.getUserActivity(req.user.id, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

const exportAuditLogs = async (req, res, next) => {
  try {
    const { format = 'json' } = req.query;
    const result = await auditService.getAuditLogs({ ...req.query, limit: 10000 });

    if (format === 'csv') {
      const headers = ['id','user_name','user_email','user_role','action','action_type',
                       'resource_type','resource_id','description','severity','created_at'];
      const rows = result.logs.map(log =>
        headers.map(h => {
          const v = log[h];
          if (typeof v === 'string' && (v.includes(',') || v.includes('"')))
            return `"${v.replace(/"/g, '""')}"`;
          return v || '';
        }).join(',')
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      return res.send([headers.join(','), ...rows].join('\n'));
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
    res.json(result.logs);
  } catch (error) { next(error); }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getUserActivity,
  getUserSessions,
  getOrganizerHistory,
  getEventApprovalHistory,
  getDashboardStats,
  getMyActivity,
  exportAuditLogs,
};
