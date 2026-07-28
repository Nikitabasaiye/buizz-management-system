const checkinStaffService = require('./checkin-staff.service');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

class CheckinStaffController {
  /**
   * Assign check-in staff to an event (organizer only)
   */
  async assignStaff(req, res, next) {
    try {
      const { eventId } = req.params;
      const { staffUserId, notes, scannerId } = req.body;
      const assignedBy = req.user;

      if (!staffUserId) {
        throw new AppError('staffUserId is required', 400);
      }

      const result = await checkinStaffService.assignStaffToEvent(
        eventId,
        staffUserId,
        assignedBy,
        notes,
        scannerId
      );

      res.status(201).json({
        success: true,
        message: 'Check-in staff assigned successfully. Pending super admin approval.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve check-in staff assignment (super admin only)
   */
  async approveAssignment(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const approvedBy = req.user;

      const result = await checkinStaffService.approveStaffAssignment(assignmentId, approvedBy);

      res.status(200).json({
        success: true,
        message: 'Check-in staff assignment approved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject check-in staff assignment (super admin only)
   */
  async rejectAssignment(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const { rejectionReason } = req.body;
      const approvedBy = req.user;

      if (!rejectionReason) {
        throw new AppError('rejectionReason is required', 400);
      }

      const result = await checkinStaffService.rejectStaffAssignment(
        assignmentId,
        rejectionReason,
        approvedBy
      );

      res.status(200).json({
        success: true,
        message: 'Check-in staff assignment rejected successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all check-in staff assignments for an event
   */
  async getEventStaff(req, res, next) {
    try {
      const { eventId } = req.params;
      const requester = req.user;

      const assignments = await checkinStaffService.getEventStaffAssignments(eventId, requester);

      res.status(200).json({
        success: true,
        data: assignments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all pending assignments for super admin approval
   */
  async getPendingAssignments(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await checkinStaffService.getPendingAssignments(page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove check-in staff assignment
   */
  async removeAssignment(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const requester = req.user;

      const result = await checkinStaffService.removeStaffAssignment(assignmentId, requester);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get staff performance metrics
   */
  async getStaffPerformance(req, res, next) {
    try {
      const { staffUserId } = req.params;
      const { eventId, startDate, endDate } = req.query;

      const performance = await checkinStaffService.getStaffPerformance(
        staffUserId,
        eventId,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: performance,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CheckinStaffController();
