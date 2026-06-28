const offlineBookingService = require('./offline-booking.service');

const createOfflineBooking = async (req, res, next) => {
  try {
    const result = await offlineBookingService.createOfflineBooking(req.body, req.user.id);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

const getOfflineBookings = async (req, res, next) => {
  try {
    const { eventId, page = 1, limit = 20 } = req.query;
    const result = await offlineBookingService.getOfflineBookings(
      req.user.id,
      eventId,
      parseInt(page),
      parseInt(limit)
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

const checkTicketLimit = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await offlineBookingService.checkTicketLimit(req.user.id, eventId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOfflineBooking,
  getOfflineBookings,
  checkTicketLimit
};
