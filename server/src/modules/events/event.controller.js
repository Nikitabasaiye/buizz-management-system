const eventService = require('./event.service');

const createEvent = async (req, res, next) => {
  try {
    const event = await eventService.createEvent(req.body, req.user.id);
    res.status(201).json({ status: 'success', data: event });
  } catch (error) {
    next(error);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const result = await eventService.getEvents(req.query);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.status(200).json({ status: 'success', data: event });
  } catch (error) {
    next(error);
  }
};

const getEventBySlug = async (req, res, next) => {
  try {
    const event = await eventService.getEventBySlug(req.params.slug);
    res.status(200).json({ status: 'success', data: event });
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body, req.user.id);
    res.status(200).json({ status: 'success', data: event });
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    await eventService.deleteEvent(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const publishEvent = async (req, res, next) => {
  try {
    const event = await eventService.publishEvent(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', data: event });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  publishEvent
};
