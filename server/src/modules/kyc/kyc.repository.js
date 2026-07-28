const { getMySQLPool } = require('../../database/mysql');

const getPool = () => getMySQLPool();

const SELECT_REQUEST = `
  k.id,
  k.user_id,
  k.role,
  k.status,
  k.bank_status,
  k.legal_name,
  k.business_name,
  k.pan_number,
  k.gst_number,
  k.aadhaar_last4,
  k.address_line,
  k.city,
  k.state,
  k.pincode,
  k.bank_account_id,
  k.documents,
  k.bank_documents,
  k.submitted_at,
  k.reviewed_by,
  k.reviewed_at,
  k.rejection_reason,
  k.review_notes,
  k.created_at,
  k.updated_at,
  u.display_id as user_display_id,
  u.name as user_name,
  u.email as user_email,
  u.phone as user_phone,
  u.is_verified as user_is_verified,
  u.kyc_status as user_kyc_status,
  u.bank_verification_status as user_bank_verification_status,
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

const formatDocumentUrls = (documents) => {
  if (!documents || !Array.isArray(documents)) return [];
  const baseUrl = process.env.API_URL || process.env.FRONTEND_URL || 'https://api.buizz.com';
  return documents.map(doc => ({
    ...doc,
    url: doc.url && !doc.url.startsWith('http') ? `${baseUrl}/api/v1/kyc/documents/${doc.fileName || doc.url.split('/').pop()}` : doc.url
  }));
};

const formatRequest = (row) => {
  if (!row) return null;
  const documents = parseJsonField(row.documents, []);
  const bankDocuments = parseJsonField(row.bank_documents, []);
  
  return {
    ...row,
    documents: formatDocumentUrls(documents),
    bank_documents: formatDocumentUrls(bankDocuments),
  };
};

const findUserById = async (userId) => {
  const [rows] = await getPool().execute(
    `SELECT user_id, display_id, name, email, phone, role, is_verified, kyc_status, bank_verification_status
     FROM users
     WHERE user_id = ? AND is_active = 1`,
    [userId]
  );
  return rows[0] || null;
};

const findLatestByUserId = async (userId) => {
  const [rows] = await getPool().execute(
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
  const [rows] = await getPool().execute(
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

    const [existingRows] = await connection.execute(
      `SELECT id
       FROM user_kyc_verifications
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [data.userId]
    );

    const requestValues = [
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
    ];

    let requestId;

    if (existingRows.length) {
      requestId = existingRows[0].id;
      await connection.execute(
        `UPDATE user_kyc_verifications
         SET role = ?,
             status = 'pending',
             bank_status = 'pending',
             legal_name = ?,
             business_name = ?,
             pan_number = ?,
             gst_number = ?,
             aadhaar_last4 = ?,
             address_line = ?,
             city = ?,
             state = ?,
             pincode = ?,
             bank_account_id = ?,
             documents = ?,
             bank_documents = ?,
             submitted_at = NOW(),
             reviewed_by = NULL,
             reviewed_at = NULL,
             rejection_reason = NULL,
             review_notes = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [...requestValues, requestId]
      );
    } else {
      const [result] = await connection.execute(
        `INSERT INTO user_kyc_verifications
          (user_id, role, status, bank_status, legal_name, business_name, pan_number, gst_number,
           aadhaar_last4, address_line, city, state, pincode, bank_account_id, documents, bank_documents)
         VALUES (?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.userId, ...requestValues]
      );
      requestId = result.insertId;
    }

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
    return findById(requestId);
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

  const [rows] = await getPool().execute(
    `SELECT ${SELECT_REQUEST}
     FROM user_kyc_verifications k
     JOIN users u ON k.user_id = u.user_id
     LEFT JOIN users reviewer ON k.reviewed_by = reviewer.user_id
     WHERE ${where}
     ORDER BY k.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[count]] = await getPool().execute(
    `SELECT COUNT(*) as total FROM user_kyc_verifications k WHERE ${where}`,
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

    const [rows] = await connection.execute(
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

    const isFullyVerified = data.status === 'verified' && data.bankStatus === 'verified';
    const isRejected = data.status === 'rejected' || data.bankStatus === 'rejected';

    await connection.execute(
      `UPDATE users
       SET kyc_status = ?,
           bank_verification_status = ?,
           is_verified = CASE WHEN ? = 1 THEN 1 WHEN ? = 1 THEN 0 ELSE is_verified END,
           is_active = 1,
           kyc_verified_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END,
           kyc_verified_by = ?
       WHERE user_id = ?`,
      [
        data.status,
        data.bankStatus,
        isFullyVerified ? 1 : 0,
        isRejected ? 1 : 0,
        isFullyVerified ? 1 : 0,
        isFullyVerified ? data.reviewedBy : null,
        request.user_id,
      ]
    );

    if (isFullyVerified) {
      await connection.execute(
        'UPDATE organizations SET is_verified = 1, is_active = 1 WHERE owner_id = ?',
        [request.user_id]
      );
    } else if (isRejected) {
      await connection.execute(
        'UPDATE organizations SET is_verified = 0, is_active = 1 WHERE owner_id = ?',
        [request.user_id]
      );
    }

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
