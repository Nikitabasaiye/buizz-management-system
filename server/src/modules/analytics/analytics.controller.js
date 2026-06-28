const analyticsService = require('./analytics.service');

class AnalyticsController {
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
