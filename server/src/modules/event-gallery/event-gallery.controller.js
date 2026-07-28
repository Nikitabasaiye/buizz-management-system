const eventGalleryService = require('./event-gallery.service');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const addImage = async (req, res, next) => {
  try {
    const result = await eventGalleryService.addImage(
      { ...req.body, event_id: req.body.event_id || req.params.eventId },
      req.user.id
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getEventImages = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await eventGalleryService.getEventImages(eventId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const updateImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const result = await eventGalleryService.updateImage(imageId, req.body, req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const deleteImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    await eventGalleryService.deleteImage(imageId, req.user.id);
    res.status(200).json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const reorderImages = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { imageOrders } = req.body;
    await eventGalleryService.reorderImages(eventId, imageOrders, req.user.id);
    res.status(200).json({ success: true, message: 'Images reordered successfully' });
  } catch (error) {
    next(error);
  }
};

const setFeaturedImage = async (req, res, next) => {
  try {
    const { eventId, imageId } = req.params;
    const result = await eventGalleryService.setFeaturedImage(eventId, imageId, req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getFeaturedImage = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await eventGalleryService.getFeaturedImage(eventId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addImage,
  getEventImages,
  updateImage,
  deleteImage,
  reorderImages,
  setFeaturedImage,
  getFeaturedImage
};
