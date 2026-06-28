const { getMySQLPool } = require('../../database/mysql');

const getPool = () => getMySQLPool();

const SELECT_REQUEST = `
  k.*,
  u.name as user_name,
  u.email as user_email,
  u.phone as user_phone,
  reviewer.name as reviewed_by_name
`;

const parseJsonField = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const formatRequest = (row) => {
  if (!row) return null;
  return {
    ...row,
    documents: parseJsonField(row.documents, []),
    bank_documents: parseJsonField(row.bank_documents, []),
  };
};

const findUserById = async (userId) => {
  const [rows] = await getPool().query(
    `SELECT user_id, name, email, phone, role, is_verified, kyc_status, bank_verification_status
     FROM users
     WHERE user_id = ? AND is_active = 1`,
    [userId]
  );
  return rows[0] || null;
};

const findLatestByUserId = async (userId) => {
  const [rows] = await getPool().query(
    `SELECT ${SELECT_REQUEST}
     FROM user_kyc_verifications k
     JOIN users u ON k.user_id = u.user_id
     LEFT JOIN users reviewer ON k.reviewed_by = reviewer.user_id
     WHERE k.user_id = ?
     ORDER BY k.created_at DESC
     LIMIT 1`,
    [userId]
  );
  return formatRequest(rows[0]);
};

const findById = async (id) => {
  const [rows] = await getPool().query(
    `SELECT ${SELECT_REQUEST}
     FROM user_kyc_verifications k
     JOIN users u ON k.user_id = u.user_id
     LEFT JOIN users reviewer ON k.reviewed_by = reviewer.user_id
     WHERE k.id = ?`,
    [id]
  );
  return formatRequest(rows[0]);
};

const createRequest = async (data) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE user_kyc_verifications
       SET status = 'rejected',
           bank_status = 'rejected',
           reviewed_at = NOW(),
           rejection_reason = COALESCE(rejection_reason, 'Superseded by a new KYC submission')
       WHERE user_id = ? AND status = 'pending'`,
      [data.userId]
    );

    const [result] = await connection.execute(
      `INSERT INTO user_kyc_verifications
        (user_id, role, status, bank_status, legal_name, business_name, pan_number, gst_number,
         aadhaar_last4, address_line, city, state, pincode, bank_account_id, documents, bank_documents)
       VALUES (?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId,
        data.role,
        data.legalName,
        data.businessName || null,
        data.panNumber,
        data.gstNumber || null,
        data.aadhaarLast4 || null,
        data.addressLine,
        data.city,
        data.state,
        data.pincode,
        data.bankAccountId || null,
        JSON.stringify(data.documents),
        JSON.stringify(data.bankDocuments),
      ]
    );

    await connection.execute(
      `UPDATE users
       SET kyc_status = 'pending',
           bank_verification_status = 'pending',
           kyc_verified_at = NULL,
           kyc_verified_by = NULL
       WHERE user_id = ?`,
      [data.userId]
    );

    if (data.bankAccountId) {
      await connection.execute(
        'UPDATE organizer_bank_accounts SET is_verified = 0 WHERE id = ?',
        [data.bankAccountId]
      );
    }

    await connection.commit();
    return findById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const listRequests = async (filters = {}) => {
  const params = [];
  let where = '1=1';

  if (filters.status) {
    where += ' AND k.status = ?';
    params.push(filters.status);
  }
  if (filters.role) {
    where += ' AND k.role = ?';
    params.push(filters.role);
  }
  if (filters.userId) {
    where += ' AND k.user_id = ?';
    params.push(filters.userId);
  }

  const limit = Number(filters.limit || 20);
  const page = Number(filters.page || 1);
  const offset = (page - 1) * limit;

  const [rows] = await getPool().query(
    `SELECT ${SELECT_REQUEST}
     FROM user_kyc_verifications k
     JOIN users u ON k.user_id = u.user_id
     LEFT JOIN users reviewer ON k.reviewed_by = reviewer.user_id
     WHERE ${where}
     ORDER BY k.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[count]] = await getPool().query(
    `SELECT COUNT(*) as total
     FROM user_kyc_verifications k
     WHERE ${where}`,
    params
  );

  return {
    requests: rows.map(formatRequest),
    pagination: {
      page,
      limit,
      total: Number(count.total || 0),
      pages: Math.ceil(Number(count.total || 0) / limit),
    },
  };
};

const reviewRequest = async (id, data) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT * FROM user_kyc_verifications WHERE id = ? FOR UPDATE',
      [id]
    );
    const request = rows[0];
    if (!request) {
      await connection.rollback();
      return null;
    }

    await connection.execute(
      `UPDATE user_kyc_verifications
       SET status = ?,
           bank_status = ?,
           reviewed_by = ?,
           reviewed_at = NOW(),
           rejection_reason = ?,
           review_notes = ?
       WHERE id = ?`,
      [
        data.status,
        data.bankStatus,
        data.reviewedBy,
        data.rejectionReason || null,
        data.reviewNotes || null,
        id,
      ]
    );

    await connection.execute(
      `UPDATE users
       SET kyc_status = ?,
           bank_verification_status = ?,
           kyc_verified_at = CASE WHEN ? = 'verified' AND ? = 'verified' THEN NOW() ELSE NULL END,
           kyc_verified_by = CASE WHEN ? = 'verified' AND ? = 'verified' THEN ? ELSE NULL END
       WHERE user_id = ?`,
      [
        data.status,
        data.bankStatus,
        data.status,
        data.bankStatus,
        data.status,
        data.bankStatus,
        data.reviewedBy,
        request.user_id,
      ]
    );

    if (request.bank_account_id) {
      await connection.execute(
        'UPDATE organizer_bank_accounts SET is_verified = ? WHERE id = ?',
        [data.bankStatus === 'verified' ? 1 : 0, request.bank_account_id]
      );
    }

    await connection.commit();
    return findById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  findUserById,
  findLatestByUserId,
  findById,
  createRequest,
  listRequests,
  reviewRequest,
};
