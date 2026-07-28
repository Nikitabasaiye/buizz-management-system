const eventApprovalService = require('./event-approval.service');

const getAllRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;

    if (type === 'organizer') {
      const adminController = require('../admin/admin.controller');
      return adminController.getAllOrganizers(req, res, next);
    }

    const result = await eventApprovalService.getAllRequests(
      parseInt(page),
      parseInt(limit),
      status,
      req.user?.role
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await eventApprovalService.getApprovalStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

const getMyRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await eventApprovalService.getMyRequests(req.user.id, parseInt(page), parseInt(limit));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getRequestById = async (req, res, next) => {
  try {
    const request = await eventApprovalService.getRequestById(req.params.id);
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

const adminReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    
    let result;
    if (status === 'approved') {
      result = await eventApprovalService.approveByAdmin(id, req.user.id, comments);
      res.status(200).json({ 
        success: true, 
        message: 'Admin approval saved. Awaiting Super Admin final approval.',
        data: result 
      });
    } else if (status === 'rejected') {
      result = await eventApprovalService.rejectByAdmin(id, req.user.id, comments);
      res.status(200).json({ 
        success: true, 
        message: 'Approval request rejected.',
        data: result 
      });
    } else {
      throw new Error('Invalid status. Must be "approved" or "rejected"');
    }
  } catch (error) {
    next(error);
  }
};

const superAdminReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    
    let result;
    if (status === 'approved') {
      result = await eventApprovalService.approveBySuperAdmin(id, req.user.id, comments);
      res.status(200).json({ 
        success: true, 
        message: 'Event created successfully after approval',
        data: result 
      });
    } else if (status === 'rejected') {
      result = await eventApprovalService.rejectBySuperAdmin(id, req.user.id, comments);
      res.status(200).json({ 
        success: true, 
        message: 'Approval request rejected.',
        data: result 
      });
    } else {
      throw new Error('Invalid status. Must be "approved" or "rejected"');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRequests,
  getStats,
  getMyRequests,
  getRequestById,
  adminReview,
  superAdminReview
};
