const eventService = require('./event.service');
const uploadService = require('../../services/upload.service');
const mediaService = require('../../services/media.service');
const logger = require('../../utils/logger');

const createEvent = async (req, res, next) => {
  try {
    const result = await eventService.createEvent(req.body, req.user.id, req.user.role);
    const status = result.requiresApproval ? 202 : 201;
    res.status(status).json({ status: 'success', data: result });
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

const getDraftEvents = async (req, res, next) => {
  try {
    const result = await eventService.getDraftEvents(req.user.id, req.user.role);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

const saveDraft = async (req, res, next) => {
  try {
    const result = await eventService.saveDraft(req.body, req.user.id, req.user.role);
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
    const result = await eventService.updateEvent(req.params.id, req.body, req.user.id, req.user.role);
    const status = result.requiresApproval ? 202 : 200;
    res.status(status).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const result = await eventService.deleteEvent(req.params.id, req.user.id, req.user.role);
    const message = result.requiresApproval ? 'Delete request submitted' : 'Event deleted successfully';
    res.status(200).json({ status: 'success', message, data: result });
  } catch (error) {
    next(error);
  }
};

const publishEvent = async (req, res, next) => {
  try {
    const event = await eventService.publishEvent(req.params.id, req.user.id, req.user.role);
    res.status(200).json({ status: 'success', data: event });
  } catch (error) {
    next(error);
  }
};

const submitEventForReview = async (req, res, next) => {
  try {
    const event = await eventService.submitEventForReview(req.params.id, req.user.id, req.user.role);
    res.status(200).json({ status: 'success', message: 'Event submitted for review.', data: event });
  } catch (error) {
    next(error);
  }
};

const uploadEventImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    logger.info('Event image upload attempt', {
      userId: req.user.id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Check if Cloudinary is configured
    if (mediaService.isReady()) {
      try {
        // Use Media Service for Cloudinary upload
        const uploadData = await mediaService.uploadFile(
          req.file,
          'events',
          req.user.id,
          {
            image_type: req.body.imageType || 'banner',
            is_primary: req.body.isPrimary === 'true'
          }
        );

        res.status(200).json({
          status: 'success',
          message: 'Image uploaded successfully',
          data: {
            url: uploadData.url,
            publicId: uploadData.publicId,
            fileName: req.file.originalname,
            fileSize: uploadData.size,
            mimeType: req.file.mimetype,
            width: uploadData.width,
            height: uploadData.height,
            format: uploadData.format,
            resourceType: uploadData.resourceType
          }
        });
      } catch (cloudinaryError) {
        if (mediaService.isRequired()) throw cloudinaryError;
        // Cloudinary failed, fall back to local storage
        logger.warn('Cloudinary upload failed, falling back to local storage', {
          error: cloudinaryError.message,
          userId: req.user.id
        });
        
        try {
          const fileData = await uploadService.processUpload(
            req.file,
            req.user.id,
            `events/${req.user.id}/event-images`,
            false // Don't try Cloudinary again
          );

          // Convert local file path to accessible URL
          const baseUrl = process.env.BASE_URL || process.env.BACKEND_URL || 'https://api.buizz.com';
          const relativePath = fileData.filePath.replace('/home/u943298757/domains/api.buizz.com/nodejs/storage', '/storage');
          const accessibleUrl = `${baseUrl}${relativePath}`;

          res.status(200).json({
            status: 'success',
            message: 'Image uploaded successfully (local storage)',
            data: {
              url: accessibleUrl,
              fileName: fileData.fileName,
              fileSize: fileData.fileSize,
              mimeType: fileData.mimeType
            }
          });
        } catch (localUploadError) {
          logger.error('Local storage upload also failed', {
            error: localUploadError.message,
            userId: req.user.id
          });
          throw new AppError('Both Cloudinary and local storage uploads failed', 500);
        }
      }
    } else {
      if (mediaService.isRequired()) {
        throw new AppError('Media storage is temporarily unavailable', 503);
      }
      // Fallback to local storage
      try {
        const fileData = await uploadService.processUpload(
          req.file,
          req.user.id,
          `events/${req.user.id}/event-images`,
          false // Don't try Cloudinary
        );

        // Convert local file path to accessible URL
        const baseUrl = process.env.BASE_URL || process.env.BACKEND_URL || 'https://api.buizz.com';
        const relativePath = fileData.filePath.replace('/home/u943298757/domains/api.buizz.com/nodejs/storage', '/storage');
        const accessibleUrl = `${baseUrl}${relativePath}`;

        res.status(200).json({
          status: 'success',
          message: 'Image uploaded successfully (local storage)',
          data: {
            url: accessibleUrl,
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            mimeType: fileData.mimeType
          }
        });
      } catch (localUploadError) {
        logger.error('Local storage upload failed', {
          error: localUploadError.message,
          userId: req.user.id
        });
        throw new AppError('Local storage upload failed', 500);
      }
    }
  } catch (error) {
    logger.error('Event image upload error', {
      error: error.message,
      userId: req.user?.id,
      fileName: req.file?.originalname
    });
    next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getDraftEvents,
  saveDraft,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  publishEvent,
  submitEventForReview,
  uploadEventImage,
};
