const { getMySQLPool } = require('../../database/mysql');

const SETTLEMENT_SELECT = `
  s.*,
  u.name as organizer_name,
  u.email as organizer_email,
  e.title as event_title,
  e.end_date as event_end_date
`;

const getPool = () => getMySQLPool();

const findBankAccountByOrganizer = async (organizerId) => {
  const [rows] = await getPool().query(
    `SELECT * FROM organizer_bank_accounts
     WHERE organizer_id = ? AND is_active = 1`,
    [organizerId]
  );
  return rows[0] || null;
};

const upsertBankAccount = async (organizerId, data) => {
  const bankDocuments = data.bankDocuments ? JSON.stringify(data.bankDocuments) : null;
  const verificationStatus = data.verificationStatus || 'pending';
  
  await getPool().execute(
    `INSERT INTO organizer_bank_accounts
       (organizer_id, account_holder_name, bank_account_number, bank_ifsc_code, 
        bank_name, upi_id, bank_documents, verification_status, verified_by, 
        verified_at, rejection_reason, is_verified, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
     ON DUPLICATE KEY UPDATE
       account_holder_name = VALUES(account_holder_name),
       bank_account_number = VALUES(bank_account_number),
       bank_ifsc_code = VALUES(bank_ifsc_code),
       bank_name = VALUES(bank_name),
       upi_id = VALUES(upi_id),
       bank_documents = COALESCE(VALUES(bank_documents), bank_documents),
       verification_status = VALUES(verification_status),
       verified_by = VALUES(verified_by),
       verified_at = VALUES(verified_at),
       rejection_reason = VALUES(rejection_reason),
       is_verified = 0,
       is_active = 1`,
    [
      organizerId,
      data.accountHolderName,
      data.bankAccountNumber,
      data.bankIfscCode,
      data.bankName || null,
      data.upiId || null,
      bankDocuments,
      verificationStatus,
      data.verifiedBy || null,
      data.verifiedAt || null,
      data.rejectionReason || null
    ]
  );

  return findBankAccountByOrganizer(organizerId);
};

const findPaymentForSettlement = async (orderId) => {
  const [rows] = await getPool().query(
    `SELECT p.*, e.organizer_id, e.end_date, e.status as event_status
     FROM payments p
     JOIN events e ON p.event_id = e.event_id
     WHERE p.order_id = ?`,
    [orderId]
  );
  return rows[0] || null;
};

const findSettlementItemByPaymentId = async (paymentId) => {
  const [rows] = await getPool().query(
    'SELECT * FROM settlement_items WHERE payment_id = ?',
    [paymentId]
  );
  return rows[0] || null;
};

const createSettlementItem = async (data) => {
  await getPool().execute(
    `INSERT INTO settlement_items
       (payment_id, booking_id, event_id, organizer_id, gross_amount, platform_fee_percent,
        platform_fee_amount, net_amount, currency, eligible_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
     ON DUPLICATE KEY UPDATE
       gross_amount = VALUES(gross_amount),
       platform_fee_percent = VALUES(platform_fee_percent),
       platform_fee_amount = VALUES(platform_fee_amount),
       net_amount = VALUES(net_amount),
       eligible_at = VALUES(eligible_at),
       updated_at = NOW()`,
    [
      data.paymentId,
      data.bookingId || null,
      data.eventId,
      data.organizerId,
      data.grossAmount,
      data.platformFeePercent,
      data.platformFeeAmount,
      data.netAmount,
      data.currency || 'INR',
      data.eligibleAt,
    ]
  );

  return findSettlementItemByPaymentId(data.paymentId);
};

const cancelSettlementItemByOrderId = async (orderId) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [items] = await connection.query(
      `SELECT si.*, os.status as settlement_status
       FROM settlement_items si
       JOIN payments p ON si.payment_id = p.payment_id
       LEFT JOIN organizer_settlements os ON si.settlement_id = os.settlement_id
       WHERE p.order_id = ?
       FOR UPDATE`,
      [orderId]
    );

    const item = items[0];
    if (!item) {
      await connection.rollback();
      return null;
    }

    if (item.status === 'settled' || item.settlement_status === 'paid') {
      await connection.rollback();
      return { alreadySettled: true, item };
    }

    await connection.execute(
      `UPDATE settlement_items
       SET status = 'cancelled', settlement_id = NULL, updated_at = NOW()
       WHERE id = ?`,
      [item.id]
    );

    if (item.settlement_id && ['pending', 'processing'].includes(item.settlement_status)) {
      const [[totals]] = await connection.query(
        `SELECT
           COUNT(*) as item_count,
           COALESCE(SUM(gross_amount), 0) as gross_amount,
           COALESCE(SUM(platform_fee_amount), 0) as platform_fee_amount,
           COALESCE(SUM(net_amount), 0) as net_amount,
           COALESCE(MAX(platform_fee_percent), 0) as platform_fee_percent
         FROM settlement_items
         WHERE settlement_id = ? AND status IN ('included', 'settled')`,
        [item.settlement_id]
      );

      if (Number(totals.item_count) === 0) {
        await connection.execute(
          `UPDATE organizer_settlements
           SET status = 'cancelled',
               gross_amount = 0.00,
               platform_fee_amount = 0.00,
               net_amount = 0.00,
               notes = COALESCE(notes, 'Cancelled because all settlement items were reversed')
           WHERE settlement_id = ?`,
          [item.settlement_id]
        );
      } else {
        await connection.execute(
          `UPDATE organizer_settlements
           SET gross_amount = ?,
               platform_fee_percent = ?,
               platform_fee_amount = ?,
               net_amount = ?
           WHERE settlement_id = ?`,
          [
            Number(totals.gross_amount).toFixed(2),
            Number(totals.platform_fee_percent).toFixed(2),
            Number(totals.platform_fee_amount).toFixed(2),
            Number(totals.net_amount).toFixed(2),
            item.settlement_id,
          ]
        );
      }
    }

    await connection.commit();
    return { cancelled: true, item };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getEligibleGroups = async (filters = {}) => {
  const params = [];
  let where = `
    si.status = 'pending'
    AND si.eligible_at <= NOW()
    AND e.status = 'completed'
  `;

  if (filters.organizerId) {
    where += ' AND si.organizer_id = ?';
    params.push(filters.organizerId);
  }

  if (filters.eventId) {
    where += ' AND si.event_id = ?';
    params.push(filters.eventId);
  }

  const [rows] = await getPool().query(
    `SELECT
       si.organizer_id,
       si.event_id,
       COUNT(*) as payment_count,
       SUM(si.gross_amount) as gross_amount,
       MAX(si.platform_fee_percent) as platform_fee_percent,
       SUM(si.platform_fee_amount) as platform_fee_amount,
       SUM(si.net_amount) as net_amount,
       MIN(si.eligible_at) as first_eligible_at,
       e.title as event_title,
       e.end_date as event_end_date,
       u.name as organizer_name,
       u.email as organizer_email
     FROM settlement_items si
     JOIN events e ON si.event_id = e.event_id
     JOIN users u ON si.organizer_id = u.user_id
     WHERE ${where}
     GROUP BY si.organizer_id, si.event_id, e.title, e.end_date, u.name, u.email
     ORDER BY first_eligible_at ASC`,
    params
  );

  return rows;
};

const getOrganizerSummary = async (organizerId) => {
  const [[itemTotals]] = await getPool().query(
    `SELECT
       COUNT(*) as total_payment_count,
       COALESCE(SUM(gross_amount), 0) as total_gross_amount,
       COALESCE(SUM(platform_fee_amount), 0) as total_platform_fee_amount,
       COALESCE(SUM(net_amount), 0) as total_net_amount,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END), 0) as pending_net_amount,
       COALESCE(SUM(CASE WHEN status = 'pending' AND eligible_at <= NOW() THEN net_amount ELSE 0 END), 0) as eligible_net_amount,
       COALESCE(SUM(CASE WHEN status = 'included' THEN net_amount ELSE 0 END), 0) as processing_net_amount,
       COALESCE(SUM(CASE WHEN status = 'settled' THEN net_amount ELSE 0 END), 0) as settled_net_amount,
       COALESCE(SUM(CASE WHEN status = 'cancelled' THEN net_amount ELSE 0 END), 0) as cancelled_net_amount
     FROM settlement_items
     WHERE organizer_id = ?`,
    [organizerId]
  );

  const [settlementRows] = await getPool().query(
    `SELECT
       status,
       COUNT(*) as settlement_count,
       COALESCE(SUM(net_amount), 0) as net_amount
     FROM organizer_settlements
     WHERE organizer_id = ?
     GROUP BY status`,
    [organizerId]
  );

  const [upcomingRows] = await getPool().query(
    `SELECT
       si.event_id,
       e.title as event_title,
       COUNT(*) as payment_count,
       COALESCE(SUM(si.net_amount), 0) as net_amount,
       MIN(si.eligible_at) as eligible_at,
       e.status as event_status
     FROM settlement_items si
     JOIN events e ON si.event_id = e.event_id
     WHERE si.organizer_id = ? AND si.status = 'pending'
     GROUP BY si.event_id, e.title, e.status
     ORDER BY eligible_at ASC
     LIMIT 10`,
    [organizerId]
  );

  return {
    totals: itemTotals,
    settlementsByStatus: settlementRows,
    upcoming: upcomingRows,
  };
};

const createSettlementFromEligibleItems = async ({ organizerId, eventId, createdBy }) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [items] = await connection.query(
      `SELECT si.*
       FROM settlement_items si
       JOIN events e ON si.event_id = e.event_id
       WHERE si.organizer_id = ?
         AND si.event_id = ?
         AND si.status = 'pending'
         AND si.eligible_at <= NOW()
         AND e.status = 'completed'
       FOR UPDATE`,
      [organizerId, eventId]
    );

    if (items.length === 0) {
      await connection.rollback();
      return null;
    }

    const [existing] = await connection.query(
      `SELECT settlement_id FROM organizer_settlements
       WHERE organizer_id = ? AND event_id = ? AND status IN ('pending', 'processing', 'paid')
       LIMIT 1`,
      [organizerId, eventId]
    );

    if (existing[0]) {
      await connection.rollback();
      return { settlement_id: existing[0].settlement_id, alreadyExists: true };
    }

    const [bankRows] = await connection.query(
      `SELECT oba.*, u.kyc_status, u.bank_verification_status
       FROM organizer_bank_accounts oba
       JOIN users u ON oba.organizer_id = u.user_id
       WHERE oba.organizer_id = ? AND oba.is_active = 1
       LIMIT 1`,
      [organizerId]
    );

    const bankAccount = bankRows[0];
    if (!bankAccount) {
      await connection.rollback();
      return { missingBankAccount: true };
    }

    if (bankAccount.verification_status !== 'verified' || 
        bankAccount.kyc_status !== 'verified' || 
        bankAccount.bank_verification_status !== 'verified') {
      await connection.rollback();
      return { verificationRequired: true };
    }

    const grossAmount = items.reduce((sum, item) => sum + Number(item.gross_amount), 0);
    const platformFeeAmount = items.reduce((sum, item) => sum + Number(item.platform_fee_amount), 0);
    const netAmount = items.reduce((sum, item) => sum + Number(item.net_amount), 0);
    const platformFeePercent = Number(items[0].platform_fee_percent);
    const settlementNumber = `SET${Date.now()}${organizerId}${eventId}`;
    const bankSnapshot = {
      accountHolderName: bankAccount.account_holder_name,
      bankAccountNumber: bankAccount.bank_account_number,
      bankIfscCode: bankAccount.bank_ifsc_code,
      bankName: bankAccount.bank_name,
      upiId: bankAccount.upi_id,
      isVerified: Boolean(bankAccount.is_verified),
    };

    const [result] = await connection.execute(
      `INSERT INTO organizer_settlements
         (settlement_number, organizer_id, event_id, gross_amount, platform_fee_percent,
          platform_fee_amount, net_amount, currency, status, scheduled_at,
          bank_account_snapshot, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'pending', NOW(), ?, ?)`,
      [
        settlementNumber,
        organizerId,
        eventId,
        grossAmount.toFixed(2),
        platformFeePercent.toFixed(2),
        platformFeeAmount.toFixed(2),
        netAmount.toFixed(2),
        JSON.stringify(bankSnapshot),
        createdBy || null,
      ]
    );

    await connection.execute(
      `UPDATE settlement_items
       SET settlement_id = ?, status = 'included'
       WHERE organizer_id = ? AND event_id = ? AND status = 'pending' AND eligible_at <= NOW()`,
      [result.insertId, organizerId, eventId]
    );

    await connection.commit();
    return findSettlementById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const createSettlementsForAllEligibleGroups = async ({ createdBy } = {}) => {
  const groups = await getEligibleGroups();
  const results = [];

  for (const group of groups) {
    const settlement = await createSettlementFromEligibleItems({
      organizerId: group.organizer_id,
      eventId: group.event_id,
      createdBy,
    });

    results.push({
      organizerId: group.organizer_id,
      eventId: group.event_id,
      settlement,
    });
  }

  return results;
};

const findSettlementById = async (settlementId) => {
  const [rows] = await getPool().query(
    `SELECT ${SETTLEMENT_SELECT}
     FROM organizer_settlements s
     JOIN users u ON s.organizer_id = u.user_id
     JOIN events e ON s.event_id = e.event_id
     WHERE s.settlement_id = ?`,
    [settlementId]
  );
  return rows[0] || null;
};

const listSettlements = async (filters = {}) => {
  const params = [];
  let where = '1=1';

  if (filters.organizerId) {
    where += ' AND s.organizer_id = ?';
    params.push(filters.organizerId);
  }
  if (filters.eventId) {
    where += ' AND s.event_id = ?';
    params.push(filters.eventId);
  }
  if (filters.status) {
    where += ' AND s.status = ?';
    params.push(filters.status);
  }

  const limit = Number(filters.limit || 20);
  const offset = (Number(filters.page || 1) - 1) * limit;

  const [rows] = await getPool().query(
    `SELECT ${SETTLEMENT_SELECT}
     FROM organizer_settlements s
     JOIN users u ON s.organizer_id = u.user_id
     JOIN events e ON s.event_id = e.event_id
     WHERE ${where}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[count]] = await getPool().query(
    `SELECT COUNT(*) as total FROM organizer_settlements s WHERE ${where}`,
    params
  );

  return {
    settlements: rows,
    pagination: {
      page: Number(filters.page || 1),
      limit,
      total: count.total,
      pages: Math.ceil(count.total / limit),
    },
  };
};

const listSettlementItems = async (settlementId) => {
  const [rows] = await getPool().query(
    `SELECT si.*, p.order_id, p.transaction_id, p.created_at as payment_created_at,
            b.booking_number
     FROM settlement_items si
     JOIN payments p ON si.payment_id = p.payment_id
     LEFT JOIN bookings b ON si.booking_id = b.booking_id
     WHERE si.settlement_id = ?
     ORDER BY si.created_at ASC`,
    [settlementId]
  );
  return rows;
};

const updateSettlementStatus = async (settlementId, data) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE organizer_settlements
       SET status = ?,
           payout_reference = COALESCE(?, payout_reference),
           bank_reference_id = COALESCE(?, bank_reference_id),
           notes = COALESCE(?, notes),
           processed_at = CASE WHEN ? IN ('processing', 'paid', 'failed') THEN NOW() ELSE processed_at END,
           paid_at = CASE WHEN ? = 'paid' THEN NOW() ELSE paid_at END
       WHERE settlement_id = ?`,
      [
        data.status,
        data.payoutReference || null,
        data.bankReferenceId || null,
        data.notes || null,
        data.status,
        data.status,
        settlementId,
      ]
    );

    if (data.status === 'paid') {
      await connection.execute(
        `UPDATE settlement_items SET status = 'settled'
         WHERE settlement_id = ?`,
        [settlementId]
      );
    } else if (['failed', 'cancelled'].includes(data.status)) {
      await connection.execute(
        `UPDATE settlement_items
         SET settlement_id = NULL, status = 'pending'
         WHERE settlement_id = ? AND status = 'included'`,
        [settlementId]
      );
    }

    await connection.commit();
    return findSettlementById(settlementId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const verifyBankAccount = async (organizerId, data) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Update organizer_bank_accounts table
    await connection.execute(
      `UPDATE organizer_bank_accounts 
       SET verification_status = ?, 
           verified_by = ?, 
           verified_at = ?, 
           rejection_reason = ?, 
           is_verified = ?
       WHERE organizer_id = ?`,
      [
        data.verificationStatus,
        data.verifiedBy,
        data.verifiedAt,
        data.rejectionReason,
        data.isVerified,
        organizerId
      ]
    );
    
    // Update users table
    await connection.execute(
      `UPDATE users 
       SET bank_verification_status = ?, 
           bank_verified_by = ?, 
           bank_verified_at = ?, 
           bank_rejection_reason = ?
       WHERE user_id = ?`,
      [
        data.verificationStatus,
        data.verifiedBy,
        data.verifiedAt,
        data.rejectionReason,
        organizerId
      ]
    );
    
    await connection.commit();
    return await findBankAccountByOrganizer(organizerId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  findBankAccountByOrganizer,
  upsertBankAccount,
  verifyBankAccount,
  findPaymentForSettlement,
  createSettlementItem,
  cancelSettlementItemByOrderId,
  getEligibleGroups,
  getOrganizerSummary,
  createSettlementFromEligibleItems,
  createSettlementsForAllEligibleGroups,
  findSettlementById,
  listSettlements,
  listSettlementItems,
  updateSettlementStatus,
};
