const { AppError } = require('../../middleware/errorHandler');
const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');
const { emailQueue } = require('../../queues');

class CheckinStaffService {
  /**
   * Assign check-in staff to an event (by organizer)
   */
  async assignStaffToEvent(eventId, staffUserId, assignedBy, notes = null, scannerId = null) {
    const pool = getMySQLPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify event exists and belongs to organizer
      const [events] = await connection.query(
        'SELECT event_id, organizer_id, title FROM events WHERE event_id = ?',
        [eventId]
      );

      if (!events[0]) {
        await connection.rollback();
        throw new AppError('Event not found', 404);
      }

      const event = events[0];

      // Verify the assigner is the event organizer
      if (String(event.organizer_id) !== String(assignedBy.id)) {
        await connection.rollback();
        throw new AppError('Only event organizer can assign check-in staff', 403);
      }

      // Verify staff user exists and has checkin_staff role
      const [staff] = await connection.query(
        'SELECT user_id, name, email, role FROM users WHERE user_id = ? AND role = ?',
        [staffUserId, 'checkin_staff']
      );

      if (!staff[0]) {
        await connection.rollback();
        throw new AppError('Check-in staff user not found or invalid role', 404);
      }

      // Check if already assigned
      const [existing] = await connection.query(
        'SELECT id, status FROM event_checkin_staff WHERE event_id = ? AND staff_user_id = ?',
        [eventId, staffUserId]
      );

      if (existing[0]) {
        await connection.rollback();
        throw new AppError('Staff already assigned to this event', 400);
      }

      // Create assignment
      const [result] = await connection.execute(
        `INSERT INTO event_checkin_staff 
         (event_id, staff_user_id, assigned_by, status, scanner_id, notes)
         VALUES (?, ?, ?, 'pending', ?, ?)`,
        [eventId, staffUserId, assignedBy.id, scannerId, notes]
      );

      await connection.commit();

      // Send notification to super admin for approval
      try {
        await emailQueue.add('checkin_staff_assigned', {
          to: 'admin@buizz.com', // Should be dynamic based on super admin email
          subject: `Check-in Staff Assignment Pending Approval`,
          eventName: event.title,
          eventId: event.event_id,
          staffName: staff[0].name,
          staffEmail: staff[0].email,
          organizerName: assignedBy.name,
          notes: notes || 'No notes provided',
        });
      } catch (emailError) {
        logger.error('Failed to send check-in staff assignment notification', { error: emailError.message });
      }

      logger.info('Check-in staff assigned to event', { eventId, staffUserId, assignedBy: assignedBy.id });

      return {
        id: result.insertId,
        eventId,
        staffUserId,
        staffName: staff[0].name,
        staffEmail: staff[0].email,
        status: 'pending',
        assignedBy: assignedBy.name,
        assignedAt: new Date(),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Approve check-in staff assignment (by super admin)
   */
  async approveStaffAssignment(assignmentId, approvedBy) {
    const pool = getMySQLPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify assignment exists and is pending
      const [assignments] = await connection.query(
        `SELECT ecs.*, e.title as event_title, u.name as staff_name, u.email as staff_email
         FROM event_checkin_staff ecs
         JOIN events e ON ecs.event_id = e.event_id
         JOIN users u ON ecs.staff_user_id = u.user_id
         WHERE ecs.id = ? AND ecs.status = 'pending'`,
        [assignmentId]
      );

      if (!assignments[0]) {
        await connection.rollback();
        throw new AppError('Assignment not found or not in pending status', 404);
      }

      const assignment = assignments[0];

      // Update assignment status
      await connection.execute(
        `UPDATE event_checkin_staff 
         SET status = 'approved', approved_by = ?, approved_at = NOW()
         WHERE id = ?`,
        [approvedBy.id, assignmentId]
      );

      await connection.commit();

      // Send notification to staff
      try {
        await emailQueue.add('checkin_staff_approved', {
          to: assignment.staff_email,
          subject: 'Check-in Staff Assignment Approved',
          eventName: assignment.event_title,
          eventId: assignment.event_id,
          staffName: assignment.staff_name,
          approvedBy: approvedBy.name,
        });
      } catch (emailError) {
        logger.error('Failed to send check-in staff approval notification', { error: emailError.message });
      }

      logger.info('Check-in staff assignment approved', { assignmentId, approvedBy: approvedBy.id });

      return {
        id: assignmentId,
        status: 'approved',
        approvedBy: approvedBy.name,
        approvedAt: new Date(),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Reject check-in staff assignment (by super admin)
   */
  async rejectStaffAssignment(assignmentId, rejectionReason, approvedBy) {
    const pool = getMySQLPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify assignment exists and is pending
      const [assignments] = await connection.query(
        `SELECT ecs.*, e.title as event_title, u.name as staff_name, u.email as staff_email
         FROM event_checkin_staff ecs
         JOIN events e ON ecs.event_id = e.event_id
         JOIN users u ON ecs.staff_user_id = u.user_id
         WHERE ecs.id = ? AND ecs.status = 'pending'`,
        [assignmentId]
      );

      if (!assignments[0]) {
        await connection.rollback();
        throw new AppError('Assignment not found or not in pending status', 404);
      }

      const assignment = assignments[0];

      // Update assignment status
      await connection.execute(
        `UPDATE event_checkin_staff 
         SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ?
         WHERE id = ?`,
        [approvedBy.id, rejectionReason, assignmentId]
      );

      await connection.commit();

      // Send notification to organizer
      try {
        await emailQueue.add('checkin_staff_rejected', {
          to: assignment.assigned_by_email, // Need to fetch this
          subject: 'Check-in Staff Assignment Rejected',
          eventName: assignment.event_title,
          eventId: assignment.event_id,
          staffName: assignment.staff_name,
          rejectionReason: rejectionReason,
          approvedBy: approvedBy.name,
        });
      } catch (emailError) {
        logger.error('Failed to send check-in staff rejection notification', { error: emailError.message });
      }

      logger.info('Check-in staff assignment rejected', { assignmentId, approvedBy: approvedBy.id, rejectionReason });

      return {
        id: assignmentId,
        status: 'rejected',
        rejectionReason,
        approvedBy: approvedBy.name,
        approvedAt: new Date(),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all check-in staff assignments for an event
   */
  async getEventStaffAssignments(eventId, requester) {
    const pool = getMySQLPool();

    // Verify event exists
    const [events] = await pool.query(
      'SELECT event_id, organizer_id FROM events WHERE event_id = ?',
      [eventId]
    );

    if (!events[0]) {
      throw new AppError('Event not found', 404);
    }

    const event = events[0];

    // Check access permissions
    if (requester.role !== 'super_admin' && String(event.organizer_id) !== String(requester.id)) {
      throw new AppError('Access denied', 403);
    }

    const [assignments] = await pool.query(
      `SELECT ecs.*, 
              u.name as staff_name, u.email as staff_email, u.phone as staff_phone,
              assigner.name as assigned_by_name,
              approver.name as approved_by_name
       FROM event_checkin_staff ecs
       JOIN users u ON ecs.staff_user_id = u.user_id
       LEFT JOIN users assigner ON ecs.assigned_by = assigner.user_id
       LEFT JOIN users approver ON ecs.approved_by = approver.user_id
       WHERE ecs.event_id = ?
       ORDER BY ecs.created_at DESC`,
      [eventId]
    );

    return assignments.map(a => ({
      id: a.id,
      eventId: a.event_id,
      staffUserId: a.staff_user_id,
      staffName: a.staff_name,
      staffEmail: a.staff_email,
      staffPhone: a.staff_phone,
      assignedBy: a.assigned_by_name,
      assignedAt: a.assigned_at,
      status: a.status,
      scannerId: a.scanner_id,
      notes: a.notes,
      approvedBy: a.approved_by_name,
      approvedAt: a.approved_at,
      rejectionReason: a.rejection_reason,
    }));
  }

  /**
   * Get all pending assignments for super admin approval
   */
  async getPendingAssignments(page = 1, limit = 20) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    const [assignments] = await pool.query(
      `SELECT ecs.*, 
              e.title as event_title, e.start_date as event_date,
              u.name as staff_name, u.email as staff_email,
              assigner.name as assigned_by_name
       FROM event_checkin_staff ecs
       JOIN events e ON ecs.event_id = e.event_id
       JOIN users u ON ecs.staff_user_id = u.user_id
       LEFT JOIN users assigner ON ecs.assigned_by = assigner.user_id
       WHERE ecs.status = 'pending'
       ORDER BY ecs.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM event_checkin_staff WHERE status = ?',
      ['pending']
    );

    return {
      assignments: assignments.map(a => ({
        id: a.id,
        eventId: a.event_id,
        eventTitle: a.event_title,
        eventDate: a.event_date,
        staffUserId: a.staff_user_id,
        staffName: a.staff_name,
        staffEmail: a.staff_email,
        assignedBy: a.assigned_by_name,
        assignedAt: a.assigned_at,
        scannerId: a.scanner_id,
        notes: a.notes,
      })),
      pagination: {
        page,
        limit,
        total: parseInt(total),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Remove check-in staff assignment
   */
  async removeStaffAssignment(assignmentId, requester) {
    const pool = getMySQLPool();

    const [assignments] = await pool.query(
      `SELECT ecs.*, e.organizer_id
       FROM event_checkin_staff ecs
       JOIN events e ON ecs.event_id = e.event_id
       WHERE ecs.id = ?`,
      [assignmentId]
    );

    if (!assignments[0]) {
      throw new AppError('Assignment not found', 404);
    }

    const assignment = assignments[0];

    // Only organizer who assigned or super admin can remove
    if (requester.role !== 'super_admin' && String(assignment.assigned_by) !== String(requester.id)) {
      throw new AppError('Access denied', 403);
    }

    await pool.execute('DELETE FROM event_checkin_staff WHERE id = ?', [assignmentId]);

    logger.info('Check-in staff assignment removed', { assignmentId, requester: requester.id });

    return { message: 'Assignment removed successfully' };
  }

  /**
   * Get staff performance metrics
   */
  async getStaffPerformance(staffUserId, eventId = null, startDate = null, endDate = null) {
    const pool = getMySQLPool();

    let where = 'WHERE staff_user_id = ?';
    const params = [staffUserId];

    if (eventId) {
      where += ' AND event_id = ?';
      params.push(eventId);
    }

    if (startDate) {
      where += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      where += ' AND date <= ?';
      params.push(endDate);
    }

    const [performance] = await pool.query(
      `SELECT * FROM checkin_staff_performance ${where} ORDER BY date DESC`,
      params
    );

    return performance.map(p => ({
      staffUserId: p.staff_user_id,
      eventId: p.event_id,
      date: p.date,
      totalScans: p.total_scans,
      successfulScans: p.successful_scans,
      failedScans: p.failed_scans,
      avgScanTimeMs: p.avg_scan_time_ms,
      scannerId: p.scanner_id,
      successRate: p.total_scans > 0 ? ((p.successful_scans / p.total_scans) * 100).toFixed(1) : '0.0',
    }));
  }
}

module.exports = new CheckinStaffService();
