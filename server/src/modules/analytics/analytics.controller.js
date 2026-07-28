const analyticsService = require('./analytics.service');

class AnalyticsController {
  async trackVisitor(req, res, next) {
    try {
      const result = await analyticsService.trackVisitor(req.body, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getVisitorSummary(req, res, next) {
    try {
      const summary = await analyticsService.getVisitorSummary(req.query.days);
      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const stats = await analyticsService.getDashboardStats(req.user.id, req.user.role);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventAnalytics(req, res, next) {
    try {
      const analytics = await analyticsService.getEventAnalytics(
        req.params.eventId,
        req.user.id,
        req.user.role
      );
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
