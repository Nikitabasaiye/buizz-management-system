const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

class EventGalleryService {
  /**
   * Upload image to event gallery
   * @param {Object} data - Image data
   * @param {number} organizerId - Organizer user ID
   * @returns {Promise<Object>} Created gallery item
   */
  async addImage(data, organizerId) {
    const pool = getMySQLPool();
    const { event_id, image_url, caption, is_featured, sort_order } = data;

    // Verify event belongs to organizer
    const [events] = await pool.query(
      'SELECT event_id, organizer_id FROM events WHERE event_id = ?',
      [event_id]
    );
    if (!events.length) {
      throw new AppError('Event not found', 404);
    }
    if (String(events[0].organizer_id) !== String(organizerId)) {
      throw new AppError('Not authorized to add images to this event', 403);
    }

    // Add image to gallery
    const [result] = await pool.execute(
      `INSERT INTO event_gallery (event_id, image_url, caption, is_featured, sort_order, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        event_id,
        image_url,
        caption || null,
        is_featured ? 1 : 0,
        sort_order || 0,
        organizerId
      ]
    );

    logger.info('Event gallery image added', { galleryId: result.insertId, eventId: event_id });
    
    return await this.getImageById(result.insertId);
  }

  /**
   * Get all images for an event
   * @param {number} eventId - Event ID
   * @returns {Promise<Array>} Gallery images
   */
  async getEventImages(eventId) {
    const pool = getMySQLPool();

    // Verify event exists
    const [events] = await pool.query(
      'SELECT event_id FROM events WHERE event_id = ?',
      [eventId]
    );
    if (!events.length) {
      throw new AppError('Event not found', 404);
    }

    const [images] = await pool.query(
      `SELECT 
        eg.id,
        eg.event_id,
        eg.image_url,
        eg.caption,
        eg.is_featured,
        eg.sort_order,
        eg.uploaded_by,
        eg.created_at,
        u.name as uploader_name
       FROM event_gallery eg
       LEFT JOIN users u ON eg.uploaded_by = u.user_id
       WHERE eg.event_id = ?
       ORDER BY eg.sort_order ASC, eg.created_at DESC`,
      [eventId]
    );

    return images;
  }

  /**
   * Update gallery image
   * @param {number} imageId - Image ID
   * @param {Object} updateData - Data to update
   * @param {number} organizerId - Organizer user ID
   * @returns {Promise<Object>} Updated image
   */
  async updateImage(imageId, updateData, organizerId) {
    const pool = getMySQLPool();

    // Get image with event info
    const [images] = await pool.query(
      `SELECT eg.*, e.organizer_id 
       FROM event_gallery eg
       JOIN events e ON eg.event_id = e.event_id
       WHERE eg.id = ?`,
      [imageId]
    );
    if (!images.length) {
      throw new AppError('Gallery image not found', 404);
    }
    if (String(images[0].organizer_id) !== String(organizerId)) {
      throw new AppError('Not authorized to update this image', 403);
    }

    // Update
    const updates = [];
    const values = [];

    if (updateData.caption !== undefined) {
      updates.push('caption = ?');
      values.push(updateData.caption);
    }
    if (updateData.is_featured !== undefined) {
      updates.push('is_featured = ?');
      values.push(updateData.is_featured ? 1 : 0);
    }
    if (updateData.sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(updateData.sort_order);
    }
    if (updateData.image_url !== undefined) {
      updates.push('image_url = ?');
      values.push(updateData.image_url);
    }

    if (updates.length === 0) {
      return await this.getImageById(imageId);
    }

    values.push(imageId);
    await pool.execute(
      `UPDATE event_gallery SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    logger.info('Event gallery image updated', { imageId });
    return await this.getImageById(imageId);
  }

  /**
   * Delete gallery image
   * @param {number} imageId - Image ID
   * @param {number} organizerId - Organizer user ID
   * @returns {Promise<void>}
   */
  async deleteImage(imageId, organizerId) {
    const pool = getMySQLPool();

    // Get image with event info
    const [images] = await pool.query(
      `SELECT eg.*, e.organizer_id 
       FROM event_gallery eg
       JOIN events e ON eg.event_id = e.event_id
       WHERE eg.id = ?`,
      [imageId]
    );
    if (!images.length) {
      throw new AppError('Gallery image not found', 404);
    }
    if (String(images[0].organizer_id) !== String(organizerId)) {
      throw new AppError('Not authorized to delete this image', 403);
    }

    await pool.execute('DELETE FROM event_gallery WHERE id = ?', [imageId]);

    logger.info('Event gallery image deleted', { imageId });
  }

  /**
   * Get image by ID
   * @param {number} imageId - Image ID
   * @returns {Promise<Object>} Image details
   */
  async getImageById(imageId) {
    const pool = getMySQLPool();
    const [images] = await pool.query(
      `SELECT 
        eg.id,
        eg.event_id,
        eg.image_url,
        eg.caption,
        eg.is_featured,
        eg.sort_order,
        eg.uploaded_by,
        eg.created_at,
        u.name as uploader_name
       FROM event_gallery eg
       JOIN users u ON eg.uploaded_by = u.user_id
       WHERE eg.id = ?`,
      [imageId]
    );

    if (!images.length) {
      throw new AppError('Gallery image not found', 404);
    }

    return images[0];
  }

  /**
   * Reorder images in gallery
   * @param {number} eventId - Event ID
   * @param {Array} imageOrders - Array of {id, sort_order}
   * @param {number} organizerId - Organizer user ID
   * @returns {Promise<void>}
   */
  async reorderImages(eventId, imageOrders, organizerId) {
    const pool = getMySQLPool();

    // Verify event belongs to organizer
    const [events] = await pool.query(
      'SELECT event_id, organizer_id FROM events WHERE event_id = ?',
      [eventId]
    );
    if (!events.length) {
      throw new AppError('Event not found', 404);
    }
    if (String(events[0].organizer_id) !== String(organizerId)) {
      throw new AppError('Not authorized to reorder images for this event', 403);
    }

    // Update sort orders
    for (const item of imageOrders) {
      await pool.execute(
        'UPDATE event_gallery SET sort_order = ? WHERE id = ? AND event_id = ?',
        [item.sort_order, item.id, eventId]
      );
    }

    logger.info('Event gallery images reordered', { eventId, count: imageOrders.length });
  }

  /**
   * Set featured image for event
   * @param {number} eventId - Event ID
   * @param {number} imageId - Image ID to feature
   * @param {number} organizerId - Organizer user ID
   * @returns {Promise<Object>} Updated image
   */
  async setFeaturedImage(eventId, imageId, organizerId) {
    const pool = getMySQLPool();

    // Verify event belongs to organizer
    const [events] = await pool.query(
      'SELECT event_id, organizer_id FROM events WHERE event_id = ?',
      [eventId]
    );
    if (!events.length) {
      throw new AppError('Event not found', 404);
    }
    if (String(events[0].organizer_id) !== String(organizerId)) {
      throw new AppError('Not authorized to set featured image for this event', 403);
    }

    // Remove featured status from all images for this event
    await pool.execute(
      'UPDATE event_gallery SET is_featured = 0 WHERE event_id = ?',
      [eventId]
    );

    // Set featured status on specified image
    await pool.execute(
      'UPDATE event_gallery SET is_featured = 1 WHERE id = ? AND event_id = ?',
      [imageId, eventId]
    );

    logger.info('Event featured image set', { eventId, imageId });
    return await this.getImageById(imageId);
  }

  /**
   * Get featured image for event
   * @param {number} eventId - Event ID
   * @returns {Promise<Object|null>} Featured image
   */
  async getFeaturedImage(eventId) {
    const pool = getMySQLPool();
    const [images] = await pool.query(
      `SELECT 
        eg.id,
        eg.event_id,
        eg.image_url,
        eg.caption,
        eg.sort_order,
        eg.created_at
       FROM event_gallery eg
       WHERE eg.event_id = ? AND eg.is_featured = 1
       LIMIT 1`,
      [eventId]
    );

    return images.length ? images[0] : null;
  }
}

module.exports = new EventGalleryService();
