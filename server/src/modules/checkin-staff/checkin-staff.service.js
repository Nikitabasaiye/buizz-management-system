const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const bcrypt = require('bcryptjs');

const STAFF_ROLES = ['organizer', 'checkin_staff', 'admin', 'super_admin', 'super-admin'];
const ADMIN_ROLES = ['admin', 'super_admin', 'super-admin'];

const createTemporaryPassword = () => `Buizz@${Math.floor(100000 + Math.random() * 900000)}`;

class CheckinStaffService {
  /**
   * Assign check-in staff to an event
   * @param {Object} data - Staff assignment data
   * @param {number} organizerId - Organizer user ID
   * @returns {Promise<Object>} Created staff assignment
   */
  async assignStaff(data, requester) {
    const pool = getMySQLPool();
    const { event_id, permissions } = data;
    let { staff_id } = data;
    let temporaryPassword = null;

    // Verify event belongs to organizer
    const [events] = await pool.query(
      'SELECT event_id, organizer_id FROM events WHERE event_id = ?',
      [event_id]
    );
    if (!events.length) {
      throw new AppError('Event not found', 404);
    }
    if (!ADMIN_ROLES.includes(requester.role) && String(events[0].organizer_id) !== String(requester.id)) {
      throw new AppError('Not authorized to assign staff to this event', 403);
    }

    if (!staff_id && data.email) {
      const email = String(data.email).trim().toLowerCase();
      const name = String(data.name || email.split('@')[0] || 'Check-in Staff').trim();
      const phone = data.phone ? String(data.phone).trim() : null;

      const [existingUsers] = await pool.query(
        'SELECT user_id, role FROM users WHERE email = ? AND is_active = 1 LIMIT 1',
        [email]
      );

      if (existingUsers.length) {
        staff_id = existingUsers[0].user_id;
      } else {
        temporaryPassword = data.password || createTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
        const [created] = await pool.execute(
          `INSERT INTO users (name, email, password, phone, role, is_verified, is_active)
           VALUES (?, ?, ?, ?, 'checkin_staff', 1, 1)`,
          [name, email, hashedPassword, phone]
        );
        staff_id = created.insertId;
        await pool.query(
          'UPDATE users SET display_id = ? WHERE user_id = ? AND display_id IS NULL',
          [staff_id, staff_id]
        );
      }
    }

    if (!staff_id) {
      throw new AppError('staff_id or staff email is required', 400);
    }

    // Verify staff user exists and has appropriate role
    const [staff] = await pool.query(
      'SELECT user_id, name, email, role FROM users WHERE user_id = ?',
      [staff_id]
    );
    if (!staff.length) {
      throw new AppError('Staff user not found', 404);
    }
    if (!STAFF_ROLES.includes(staff[0].role)) {
      throw new AppError('User does not have appropriate role for check-in staff', 400);
    }

    // Check if staff already assigned to this event
    const [existing] = await pool.query(
      'SELECT id FROM event_checkin_staff WHERE event_id = ? AND staff_id = ? AND is_active = 1',
      [event_id, staff_id]
    );
    if (existing.length) {
      throw new AppError('Staff already assigned to this event', 400);
    }

    // Assign staff
    const [result] = await pool.execute(
      `INSERT INTO event_checkin_staff (event_id, staff_id, assigned_by, permissions, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [event_id, staff_id, requester.id, JSON.stringify(permissions || { scan: true, view: true })]
    );

    logger.info('Check-in staff assigned', { assignmentId: result.insertId, eventId: event_id, staffId });
    
    const assignment = await this.getAssignmentById(result.insertId);
    if (temporaryPassword) {
      assignment.temporaryPassword = temporaryPassword;
    }
    return assignment;
  }

  /**
   * Get all staff assignments for an event
   * @param {number} eventId - Event ID
   * @param {number} organizerId - Organizer user ID
   * @returns {Promise<Array>} Staff assignments
   */
  async getEventStaff(eventId, requester) {
    const pool = getMySQLPool();

    // Verify event belongs to organizer
    const [events] = await pool.query(
      'SELECT event_id, organizer_id FROM events WHERE event_id = ?',
      [eventId]
    );
    if (!events.length) {
      throw new AppError('Event not found', 404);
    }
    if (!ADMIN_ROLES.includes(requester.role) && String(events[0].organizer_id) !== String(requester.id)) {
      throw new AppError('Not authorized to view staff for this event', 403);
    }

    const [staff] = await pool.query(
      `SELECT 
        ecs.id,
        ecs.event_id,
        ecs.staff_id,
        ecs.assigned_by,
        ecs.permissions,
        ecs.is_active,
        ecs.assigned_at,
        u.name as staff_name,
        u.email as staff_email,
        u.role as staff_role,
        u.avatar as staff_avatar
       FROM event_checkin_staff ecs
       JOIN users u ON ecs.staff_id = u.user_id
       WHERE ecs.event_id = ?
       ORDER BY ecs.assigned_at DESC`,
      [eventId]
    );

    return staff.map(s => ({
      ...s,
      permissions: JSON.parse(s.permissions || '{}')
    }));
  }

  /**
   * Update staff assignment
   * @param {number} assignmentId - Assignment ID
   * @param {Object} updateData - Data to update
   * @param {number} organizerId - Organizer user ID
   * @returns {Promise<Object>} Updated assignment
   */
  async updateAssignment(assignmentId, updateData, requester) {
    const pool = getMySQLPool();

    // Get assignment
    const [assignments] = await pool.query(
      `SELECT ecs.*, e.organizer_id 
       FROM event_checkin_staff ecs
       JOIN events e ON ecs.event_id = e.event_id
       WHERE ecs.id = ?`,
      [assignmentId]
    );
    if (!assignments.length) {
      throw new AppError('Staff assignment not found', 404);
    }
    if (!ADMIN_ROLES.includes(requester.role) && String(assignments[0].organizer_id) !== String(requester.id)) {
      throw new AppError('Not authorized to update this assignment', 403);
    }

    // Update
    const updates = [];
    const values = [];

    if (updateData.permissions !== undefined) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(updateData.permissions));
    }
    if (updateData.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(updateData.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return await this.getAssignmentById(assignmentId);
    }

    values.push(assignmentId);
    await pool.execute(
      `UPDATE event_checkin_staff SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    logger.info('Check-in staff assignment updated', { assignmentId });
    return await this.getAssignmentById(assignmentId);
  }

  /**
   * Remove staff assignment (deactivate)
   * @param {number} assignmentId - Assignment ID
   * @param {Object} requester - Authenticated requester
   * @returns {Promise<Object>} Updated assignment
   */
  async removeStaff(assignmentId, requester) {
    return await this.updateAssignment(assignmentId, { is_active: false }, requester);
  }

  /**
   * Get assignment by ID
   * @param {number} assignmentId - Assignment ID
   * @returns {Promise<Object>} Assignment details
   */
  async getAssignmentById(assignmentId) {
    const pool = getMySQLPool();
    const [assignments] = await pool.query(
      `SELECT 
        ecs.id,
        ecs.event_id,
        ecs.staff_id,
        ecs.assigned_by,
        ecs.permissions,
        ecs.is_active,
        ecs.assigned_at,
        u.name as staff_name,
        u.email as staff_email,
        u.role as staff_role,
        u.avatar as staff_avatar
       FROM event_checkin_staff ecs
       JOIN users u ON ecs.staff_id = u.user_id
       WHERE ecs.id = ?`,
      [assignmentId]
    );

    if (!assignments.length) {
      throw new AppError('Staff assignment not found', 404);
    }

    const assignment = assignments[0];
    assignment.permissions = JSON.parse(assignment.permissions || '{}');
    return assignment;
  }

  /**
   * Get events where user is assigned as check-in staff
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Events
   */
  async getStaffEvents(userId) {
    const pool = getMySQLPool();
    const [events] = await pool.query(
      `SELECT 
        e.event_id,
        e.title,
        e.slug,
        e.start_date,
        e.end_date,
        e.venue_name,
        e.venue_address,
        e.venue_city,
        e.status,
        ecs.permissions,
        ecs.assigned_at
       FROM event_checkin_staff ecs
       JOIN events e ON ecs.event_id = e.event_id
       WHERE ecs.staff_id = ? AND ecs.is_active = 1
       ORDER BY e.start_date ASC`,
      [userId]
    );

    return events.map(e => ({
      ...e,
      permissions: JSON.parse(e.permissions || '{}')
    }));
  }
}

module.exports = new CheckinStaffService();
