const organizerAnalyticsService = require('../../services/organizer-analytics.service');
const auditService = require('../../services/audit.service');

/**
 * Get comprehensive organizer dashboard
 */
const getOrganizerDashboard = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const dashboard = await organizerAnalyticsService.getOrganizerDashboard(organizerId);
    
    // Log audit
    await auditService.logAction({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'organizer_dashboard_viewed',
      actionType: 'read',
      resourceType: 'organizer_analytics',
      resourceId: organizerId,
      description: `Super admin viewed organizer ${organizerId} dashboard`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { targetOrganizerId: organizerId },
      severity: 'medium'
    });
    
    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all organizers with summary stats
 */
const getAllOrganizers = async (req, res, next) => {
  try {
    const { page, limit, status, search } = req.query;
    const result = await organizerAnalyticsService.getAllOrganizers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      search
    });
    
    // Log audit
    await auditService.logAction({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'organizers_list_viewed',
      actionType: 'read',
      resourceType: 'organizer_analytics',
      description: 'Super admin viewed organizers list',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { filters: { page, limit, status, search } },
      severity: 'low'
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organizer profile details
 */
const getOrganizerProfile = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const profile = await organizerAnalyticsService.getOrganizerProfile(organizerId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organizer events with performance metrics
 */
const getOrganizerEvents = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const events = await organizerAnalyticsService.getOrganizerEvents(organizerId);
    
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organizer revenue analysis
 */
const getOrganizerRevenue = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const revenue = await organizerAnalyticsService.getRevenueAnalysis(organizerId);
    
    res.status(200).json({
      success: true,
      data: revenue
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organizer booking summary
 */
const getOrganizerBookings = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const bookings = await organizerAnalyticsService.getBookingSummary(organizerId);
    
    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event performance metrics
 */
const getEventPerformance = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const performance = await organizerAnalyticsService.getEventPerformance(organizerId);
    
    res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get KYC details
 */
const getKycDetails = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const kyc = await organizerAnalyticsService.getKycDetails(organizerId);
    
    res.status(200).json({
      success: true,
      data: kyc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get settlement history
 */
const getSettlementHistory = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const settlements = await organizerAnalyticsService.getSettlementHistory(organizerId);
    
    res.status(200).json({
      success: true,
      data: settlements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit history
 */
const getAuditHistory = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const audit = await organizerAnalyticsService.getAuditHistory(organizerId);
    
    res.status(200).json({
      success: true,
      data: audit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export organizer data
 */
const exportOrganizerData = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const { format = 'json' } = req.query;
    
    const data = await organizerAnalyticsService.exportOrganizerData(organizerId, format);
    
    // Log audit
    await auditService.logAction({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'organizer_data_exported',
      actionType: 'read',
      resourceType: 'organizer_analytics',
      resourceId: organizerId,
      description: `Super admin exported organizer ${organizerId} data in ${format} format`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { targetOrganizerId: organizerId, format },
      severity: 'high'
    });
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=organizer-${organizerId}-data.csv`);
      res.send(data);
    } else {
      res.status(200).json({
        success: true,
        data
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrganizerDashboard,
  getAllOrganizers,
  getOrganizerProfile,
  getOrganizerEvents,
  getOrganizerRevenue,
  getOrganizerBookings,
  getEventPerformance,
  getKycDetails,
  getSettlementHistory,
  getAuditHistory,
  exportOrganizerData
};