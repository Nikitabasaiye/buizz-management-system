const auditService = require('../../services/audit.service');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Get all audit logs (Super Admin only)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user activity history
 */
const getUserActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await auditService.getUserActivity(userId, req.query);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organizer complete history with profile
 */
const getOrganizerHistory = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const result = await auditService.getOrganizerHistory(organizerId);
    
    if (!result) {
      throw new AppError('Organizer not found', 404);
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event approval history
 */
const getEventApprovalHistory = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await auditService.getEventApprovalHistory(eventId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const result = await auditService.getDashboardStats(req.query);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my activity (for users)
 */
const getMyActivity = async (req, res, next) => {
  try {
    const result = await auditService.getUserActivity(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export audit logs (CSV/JSON)
 */
const exportAuditLogs = async (req, res, next) => {
  try {
    const { format = 'json' } = req.query;
    const result = await auditService.getAuditLogs({
      ...req.query,
      limit: 10000 // Get more for export
    });
    
    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(result.logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
      res.json(result.logs);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to convert logs to CSV
 */
function convertToCSV(logs) {
  if (logs.length === 0) return '';
  
  const headers = ['id', 'user_name', 'user_email', 'user_role', 'action', 'action_type', 
                   'resource_type', 'resource_id', 'description', 'severity', 'created_at'];
  
  const rows = logs.map(log => 
    headers.map(header => {
      const value = log[header];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

module.exports = {
  getAuditLogs,
  getUserActivity,
  getOrganizerHistory,
  getEventApprovalHistory,
  getDashboardStats,
  getMyActivity,
  exportAuditLogs
};
