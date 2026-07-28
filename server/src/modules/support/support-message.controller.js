const supportMessageService = require('./support-message.service');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const uploadService = require('../../services/upload.service');

class SupportMessageController {
  /**
   * Send a message in a support ticket
   */
  async sendMessage(req, res, next) {
    try {
      const { ticketId } = req.params;
      const { message, messageType, isInternal } = req.body;
      const senderId = req.user.id;
      const senderRole = req.user.role;

      if (!message) {
        throw new AppError('Message is required', 400);
      }

      const result = await supportMessageService.sendMessage(
        ticketId,
        senderId,
        senderRole,
        { message, messageType, isInternal }
      );

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all messages for a support ticket
   */
  async getTicketMessages(req, res, next) {
    try {
      const { ticketId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const messages = await supportMessageService.getTicketMessages(
        ticketId,
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload attachment to a message
   */
  async uploadAttachment(req, res, next) {
    try {
      const { messageId, ticketId } = req.params;
      const uploadedBy = req.user.id;

      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      // Upload to Cloudinary
      const fileData = await uploadService.processUpload(
        req.file,
        uploadedBy,
        `support-attachments/${ticketId}/${messageId}`,
        true
      );

      const attachmentData = {
        fileName: fileData.fileName,
        fileUrl: fileData.cloudinaryUrl || fileData.filePath,
        fileSize: fileData.fileSize,
        fileType: fileData.mimeType,
      };

      const result = await supportMessageService.uploadAttachment(
        messageId,
        ticketId,
        attachmentData,
        uploadedBy
      );

      res.status(201).json({
        success: true,
        message: 'Attachment uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ticket activity log
   */
  async getTicketActivity(req, res, next) {
    try {
      const { ticketId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const activities = await supportMessageService.getTicketActivity(
        ticketId,
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(req, res, next) {
    try {
      const { ticketId } = req.params;
      const userId = req.user.id;

      const result = await supportMessageService.markAsRead(ticketId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Escalate ticket to higher level
   */
  async escalateTicket(req, res, next) {
    try {
      const { ticketId } = req.params;
      const { escalationLevel, notes } = req.body;
      const escalatedBy = req.user.id;

      if (!escalationLevel) {
        throw new AppError('escalationLevel is required', 400);
      }

      const result = await supportMessageService.escalateTicket(
        ticketId,
        escalationLevel,
        escalatedBy,
        notes
      );

      res.status(200).json({
        success: true,
        message: 'Ticket escalated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit customer satisfaction rating
   */
  async submitSatisfaction(req, res, next) {
    try {
      const { ticketId } = req.params;
      const { satisfaction, notes } = req.body;
      const userId = req.user.id;

      if (!satisfaction) {
        throw new AppError('satisfaction rating is required', 400);
      }

      const validRatings = ['very_dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very_satisfied'];
      if (!validRatings.includes(satisfaction)) {
        throw new AppError('Invalid satisfaction rating', 400);
      }

      const result = await supportMessageService.submitSatisfaction(
        ticketId,
        userId,
        satisfaction,
        notes
      );

      res.status(200).json({
        success: true,
        message: 'Satisfaction rating submitted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SupportMessageController();
