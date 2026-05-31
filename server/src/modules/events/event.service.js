const eventRepository = require('./event.repository');
const { AppError } = require('../../middleware/errorHandler');
const { EVENT_STATUS } = require('../../constants');
const { getIO } = require('../../sockets');

const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
};

const createEvent = async (eventData, userId) => {
  eventData.organizerId = userId;
  eventData.slug = generateSlug(eventData.title);
  eventData.availableSeats = eventData.totalSeats;
  
  const event = await eventRepository.create(eventData);
  return event;
};

const getEvents = async (filters) => {
  return await eventRepository.findAll(filters);
};

const getEventById = async (id) => {
  const event = await eventRepository.findById(id);
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  await eventRepository.incrementViews(id);
  return event;
};

const getEventBySlug = async (slug) => {
  const event = await eventRepository.findBySlug(slug);
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  await eventRepository.incrementViews(event._id);
  return event;
};

const updateEvent = async (id, updateData, userId) => {
  const event = await eventRepository.findById(id);
  
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  if (String(event.organizerId) !== String(userId)) {
    throw new AppError('Not authorized to update this event', 403);
  }

  const updatedEvent = await eventRepository.updateById(id, updateData);
  
  // Emit socket event for live updates
  const io = getIO();
  io.to(`event:${id}`).emit('event:updated', updatedEvent);
  
  return updatedEvent;
};

const deleteEvent = async (id, userId) => {
  const event = await eventRepository.findById(id);
  
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  if (String(event.organizerId) !== String(userId)) {
    throw new AppError('Not authorized to delete this event', 403);
  }

  await eventRepository.updateById(id, { status: EVENT_STATUS.CANCELLED });
};

const publishEvent = async (id, userId) => {
  const event = await eventRepository.findById(id);
  
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  if (String(event.organizerId) !== String(userId)) {
    throw new AppError('Not authorized to publish this event', 403);
  }

  return await eventRepository.updateById(id, { status: EVENT_STATUS.PUBLISHED });
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
