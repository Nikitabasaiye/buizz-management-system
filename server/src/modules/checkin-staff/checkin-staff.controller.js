const checkinStaffService = require('./checkin-staff.service');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const assignStaff = async (req, res, next) => {
  try {
    const result = await checkinStaffService.assignStaff(req.body, req.user);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getEventStaff = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await checkinStaffService.getEventStaff(eventId, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const updateAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const result = await checkinStaffService.updateAssignment(assignmentId, req.body, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const removeStaff = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const result = await checkinStaffService.removeStaff(assignmentId, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getStaffEvents = async (req, res, next) => {
  try {
    const result = await checkinStaffService.getStaffEvents(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignStaff,
  getEventStaff,
  updateAssignment,
  removeStaff,
  getStaffEvents
};
