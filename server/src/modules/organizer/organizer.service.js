const organizerRepository = require('./organizer.repository');
const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const getTableColumns = async (pool, tableName) => {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
};

const ensureOrganizerBankTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizer_bank_accounts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      organizer_id BIGINT UNSIGNED NOT NULL,
      account_holder_name VARCHAR(180) NOT NULL,
      bank_account_number VARCHAR(80) NULL,
      bank_ifsc_code VARCHAR(20) NULL,
      bank_name VARCHAR(160) NULL,
      upi_id VARCHAR(100) NULL,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY organizer_bank_accounts_organizer_index (organizer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

class OrganizerService {
  async getProfile(organizerId) {
    const organizer = await organizerRepository.findById(organizerId);
    if (!organizer) throw new AppError('Organizer not found', 404);
    return organizer;
  }

  async updateProfile(organizerId, data) {
    await this.getProfile(organizerId);
    const updated = await organizerRepository.updateById(organizerId, data);
    logger.info('Organizer profile updated', { organizerId });
    return updated;
  }

  async updateBankDetails(organizerId, bankData) {
    await this.getProfile(organizerId);
    const pool = getMySQLPool();
    const accountHolderName = bankData.accountHolderName || bankData.bankAccountName;
    const bankAccountNumber = bankData.bankAccountNumber || bankData.accountNumber;
    const bankIfscCode = bankData.bankIfscCode || bankData.bankIfsc || bankData.ifscCode;
    const bankName = bankData.bankName || null;
    const upiId = bankData.upiId || null;

    if (!accountHolderName || !bankAccountNumber || !bankIfscCode) {
      throw new AppError('Account holder name, account number, and IFSC are required', 400);
    }

    try {
      await ensureOrganizerBankTable(pool);
      const columns = await getTableColumns(pool, 'organizer_bank_accounts');
      const hasNewAccountColumns = columns.has('bank_account_number') && columns.has('bank_ifsc_code');
      const hasLegacyAccountColumns = columns.has('account_number') && columns.has('ifsc_code');

      if (!hasNewAccountColumns && !hasLegacyAccountColumns) {
        throw new Error('organizer_bank_accounts is missing account number / IFSC columns');
      }

      const [existingRows] = await pool.execute(
        'SELECT id FROM organizer_bank_accounts WHERE organizer_id = ? ORDER BY id DESC LIMIT 1',
        [organizerId]
      );

      const bankFields = {
        account_holder_name: accountHolderName,
        bank_account_number: bankAccountNumber,
        bank_ifsc_code: bankIfscCode,
        account_number: bankAccountNumber,
        ifsc_code: bankIfscCode,
        bank_name: bankName,
        upi_id: upiId,
        is_verified: 0,
        is_active: 1,
      };

      const writableEntries = Object.entries(bankFields).filter(([column]) => columns.has(column));

      if (existingRows.length) {
        await pool.execute(
          `UPDATE organizer_bank_accounts
           SET ${writableEntries.map(([column]) => `${column} = ?`).join(', ')}
           WHERE id = ?`,
          [...writableEntries.map(([, value]) => value), existingRows[0].id]
        );
      } else {
        const insertEntries = [
          ['organizer_id', organizerId],
          ...writableEntries,
        ].filter(([column]) => columns.has(column));

        await pool.execute(
          `INSERT INTO organizer_bank_accounts (${insertEntries.map(([column]) => column).join(', ')})
           VALUES (${insertEntries.map(() => '?').join(', ')})`,
          insertEntries.map(([, value]) => value)
        );
      }

      await organizerRepository.updateById(organizerId, { bankVerificationStatus: 'pending' });
      const updated = await this.getProfile(organizerId);
      logger.info('Organizer bank details updated', { organizerId });
      return updated;
    } catch (error) {
      logger.error('Failed to update bank details', {
        organizerId,
        error: error.message,
        code: error.code,
        errno: error.errno,
        sqlMessage: error.sqlMessage
      });
      throw new AppError('Failed to update bank details. Please check your database schema.', 500);
    }
  }

  async changePassword(organizerId, currentPassword, newPassword) {
    const organizer = await organizerRepository.findById(organizerId);
    if (!organizer) throw new AppError('Organizer not found', 404);

    const withPwd = await organizerRepository.findByEmailWithPassword(organizer.email);
    const isMatch = await withPwd.comparePassword(currentPassword);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    await organizerRepository.updatePassword(organizerId, newPassword);
    logger.info('Organizer password changed', { organizerId });
    return { message: 'Password changed successfully' };
  }

  async getAllOrganizers(options) {
    return organizerRepository.findAll(options);
  }

  async getOrganizerById(id) {
    const organizer = await organizerRepository.findById(id);
    if (!organizer) throw new AppError('Organizer not found', 404);
    return organizer;
  }

  async verifyKyc(organizerId) {
    await this.getOrganizerById(organizerId);
    const pool = getMySQLPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE users
         SET kyc_status = 'verified',
             bank_verification_status = 'verified',
             is_verified = 1,
             kyc_verified_at = NOW()
         WHERE user_id = ? AND role = 'organizer'`,
        [organizerId],
      );
      await connection.execute(
        `UPDATE organizations
         SET is_verified = 1, is_active = 1
         WHERE owner_id = ?`,
        [organizerId],
      );
      await connection.execute(
        `UPDATE organizer_bank_accounts
         SET is_verified = 1
         WHERE organizer_id = ?`,
        [organizerId],
      );
      await connection.execute(
        `UPDATE user_kyc_verifications
         SET status = 'verified',
             bank_status = 'verified',
             reviewed_at = COALESCE(reviewed_at, NOW()),
             updated_at = NOW()
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [organizerId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    logger.info('Organizer KYC verified', { organizerId });
    return this.getOrganizerById(organizerId);
  }

  async deactivate(organizerId) {
    await this.getOrganizerById(organizerId);
    await organizerRepository.deleteById(organizerId);
    logger.info('Organizer deactivated', { organizerId });
    return { message: 'Organizer account deactivated' };
  }

  async getAnalytics(organizerId, filters = {}) {
    const pool = getMySQLPool();
    const { startDate, endDate } = filters;
    const dateClause = startDate && endDate ? 'AND e.start_date BETWEEN ? AND ?' : '';
    const params = startDate && endDate ? [organizerId, startDate, endDate] : [organizerId];

    const [[events]] = await pool.query(
      `SELECT
         COUNT(*) AS totalEvents,
         SUM(status = 'published') AS publishedEvents,
         SUM(status = 'completed') AS completedEvents,
         SUM(status = 'draft') AS draftEvents
       FROM events e
       WHERE e.organizer_id = ? ${dateClause}`,
      params
    );

    const [[bookings]] = await pool.query(
      `SELECT
         COUNT(DISTINCT b.booking_id) AS totalBookings,
         COALESCE(SUM(CASE WHEN b.booking_status = 'confirmed' THEN b.quantity ELSE 0 END), 0) AS totalTickets,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS totalRevenue
       FROM events e
       LEFT JOIN bookings b ON b.event_id = e.event_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       WHERE e.organizer_id = ? ${dateClause}`,
      params
    );

    const [[attendees]] = await pool.query(
      `SELECT
         COUNT(*) AS totalAttendees,
         COALESCE(SUM(t.checked_in = 1), 0) AS checkedIn
       FROM tickets t
       JOIN events e ON e.event_id = t.event_id
       WHERE e.organizer_id = ? ${dateClause}`,
      params
    );

    return {
      totalEvents: Number(events.totalEvents || 0),
      publishedEvents: Number(events.publishedEvents || 0),
      completedEvents: Number(events.completedEvents || 0),
      draftEvents: Number(events.draftEvents || 0),
      totalBookings: Number(bookings.totalBookings || 0),
      totalTickets: Number(bookings.totalTickets || 0),
      totalRevenue: Number(bookings.totalRevenue || 0),
      totalAttendees: Number(attendees.totalAttendees || 0),
      checkedIn: Number(attendees.checkedIn || 0),
    };
  }

  async getEvents(organizerId, filters = {}) {
    const pool = getMySQLPool();
    const { status, page = 1, limit = 20 } = filters;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    let where = 'WHERE e.organizer_id = ?';
    const params = [organizerId];

    if (status) {
      where += ' AND e.status = ?';
      params.push(status);
    }

    const [events] = await pool.query(
      `SELECT
         e.event_id AS id,
         e.title,
         e.slug,
         e.description,
         e.category,
         e.type,
         e.status,
         e.start_date AS startDate,
         e.end_date AS endDate,
         e.venue_name AS venueName,
         e.venue_city AS city,
         e.banner,
         e.total_seats AS totalSeats,
         e.available_seats AS availableSeats,
         e.created_at AS createdAt,
         COUNT(DISTINCT b.booking_id) AS bookingCount,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS revenue
       FROM events e
       LEFT JOIN bookings b ON b.event_id = e.event_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       ${where}
       GROUP BY e.event_id
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM events e ${where}`,
      params
    );

    return {
      events,
      pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    };
  }

  async getBookings(organizerId, filters = {}) {
    const pool = getMySQLPool();
    const { eventId, status, page = 1, limit = 20 } = filters;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    let where = 'WHERE e.organizer_id = ?';
    const params = [organizerId];

    if (eventId) {
      where += ' AND b.event_id = ?';
      params.push(eventId);
    }
    if (status) {
      where += ' AND b.booking_status = ?';
      params.push(status);
    }

    const [bookings] = await pool.query(
      `SELECT
         b.booking_id AS id,
         b.booking_number AS bookingNumber,
         b.event_id AS eventId,
         e.title AS eventTitle,
         e.start_date AS eventStartDate,
         e.end_date AS eventEndDate,
         b.quantity,
         b.total_amount AS totalAmount,
         b.booking_status AS bookingStatus,
         b.payment_status AS paymentStatus,
         b.booking_method AS source,
         b.created_at AS createdAt,
         u.name AS customerName,
         u.email AS customerEmail,
         u.phone AS customerPhone,
         tt.name AS ticketType,
         p.transaction_id AS transactionId
       FROM bookings b
       JOIN events e ON e.event_id = b.event_id
       JOIN users u ON u.user_id = b.user_id
       LEFT JOIN ticket_types tt ON tt.id = b.ticket_type_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM bookings b
       JOIN events e ON e.event_id = b.event_id
       ${where}`,
      params
    );

    return {
      bookings,
      pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    };
  }

  async getRevenue(organizerId, filters = {}) {
    const pool = getMySQLPool();
    const { startDate, endDate } = filters;
    const dateClause = startDate && endDate ? 'AND p.created_at BETWEEN ? AND ?' : '';
    const params = startDate && endDate ? [organizerId, startDate, endDate] : [organizerId];

    const [[summary]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS totalRevenue,
         COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.payment_id END) AS totalTransactions,
         COALESCE(AVG(CASE WHEN p.status = 'completed' THEN p.amount END), 0) AS averageTransactionValue
       FROM payments p
       JOIN events e ON e.event_id = p.event_id
       WHERE e.organizer_id = ? ${dateClause}`,
      params
    );

    const [byEvent] = await pool.query(
      `SELECT
         e.event_id AS eventId,
         e.title AS eventTitle,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS revenue,
         COUNT(DISTINCT b.booking_id) AS bookings
       FROM events e
       LEFT JOIN bookings b ON b.event_id = e.event_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       WHERE e.organizer_id = ?
       GROUP BY e.event_id
       ORDER BY revenue DESC`,
      [organizerId]
    );

    return {
      totalRevenue: Number(summary.totalRevenue || 0),
      totalTransactions: Number(summary.totalTransactions || 0),
      averageTransactionValue: Number(summary.averageTransactionValue || 0),
      byEvent,
    };
  }

  async getAttendees(organizerId, filters = {}) {
    const pool = getMySQLPool();
    const { eventId, page = 1, limit = 20 } = filters;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    let where = 'WHERE e.organizer_id = ?';
    const params = [organizerId];

    if (eventId) {
      where += ' AND t.event_id = ?';
      params.push(eventId);
    }

    const [attendees] = await pool.query(
      `SELECT
         t.ticket_id AS ticketId,
         t.ticket_number AS ticketNumber,
         t.status AS ticketStatus,
         t.checked_in AS checkedIn,
         t.checked_in_at AS checkedInAt,
         t.event_id AS eventId,
         e.title AS eventTitle,
         u.name AS attendeeName,
         u.email AS attendeeEmail,
         u.phone AS attendeePhone,
         b.booking_number AS bookingNumber,
         tt.name AS ticketType
       FROM tickets t
       JOIN events e ON e.event_id = t.event_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN bookings b ON b.booking_id = t.booking_id
       LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM tickets t
       JOIN events e ON e.event_id = t.event_id
       ${where}`,
      params
    );

    return {
      attendees,
      pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    };
  }
}

module.exports = new OrganizerService();
