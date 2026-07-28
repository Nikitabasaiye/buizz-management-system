const ticketScanService = require('./ticket-scan.service');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const scanTicket = async (req, res, next) => {
  try {
    const { ticketNumber } = req.params;
    const scanData = {
      location: req.body.location,
      device_info: req.body.device_info,
      latitude: req.body.latitude,
      longitude: req.body.longitude
    };
    const result = await ticketScanService.scanTicket(ticketNumber, req.user, scanData);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const verifyTicket = async (req, res, next) => {
  try {
    const { ticketNumber } = req.params;
    const result = await ticketScanService.verifyTicket(ticketNumber, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getEventScanStats = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await ticketScanService.getEventScanStats(eventId, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getRecentScans = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { limit = 50 } = req.query;
    const result = await ticketScanService.getRecentScans(eventId, req.user, parseInt(limit));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanTicket,
  verifyTicket,
  getEventScanStats,
  getRecentScans
};
