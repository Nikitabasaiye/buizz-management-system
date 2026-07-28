const { getMySQLPool } = require('../../database/mysql');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../../constants');

const SEL = `user_id as id, display_id as displayId, name, email, phone, role,
            organization_id as organizationId, avatar, google_id as googleId, facebook_id as facebookId,
            is_verified as isVerified, is_email_verified as isEmailVerified,
            is_phone_verified as isPhoneVerified, is_active as isActive,
            kyc_status as kycStatus, bank_verification_status as bankVerificationStatus,
            kyc_verified_at as kycVerifiedAt, kyc_verified_by as kycVerifiedBy,
            last_login as lastLogin, created_at as createdAt, updated_at as updatedAt`;

const create = async (userData) => {
  const pool = getMySQLPool();
  const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 12) : null;

  const values = [
    userData.name,
    userData.email,
    hashedPassword,
    userData.phone || null,
    userData.role || USER_ROLES.CUSTOMER,
    userData.organizationId || null,
    userData.avatar || null,
    userData.googleId || null,
    userData.facebookId || null,
    userData.isVerified ? 1 : 0,
    userData.isEmailVerified ? 1 : 0,
    userData.isPhoneVerified ? 1 : 0,
  ];

  const [result] = await pool.query(
    `INSERT INTO users (name, email, password, phone, role, organization_id, avatar, google_id, facebook_id, is_verified, is_email_verified, is_phone_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );
  await pool.query('UPDATE users SET display_id = ? WHERE user_id = ? AND display_id IS NULL', [result.insertId, result.insertId]);

  return await findById(result.insertId);
};

const findById = async (id) => {
  const pool = getMySQLPool();
  const [rows] = await pool.query(
    `SELECT ${SEL} FROM users WHERE user_id = ? AND is_active = 1`,
    [id]
  );
  return rows[0] || null;
};

const findByEmail = async (email) => {
  const pool = getMySQLPool();
  const [rows] = await pool.query(
    `SELECT ${SEL} FROM users WHERE email = ? AND is_active = 1`,
    [email]
  );
  return rows[0] || null;
};

const findByEmailWithPassword = async (email) => {
  const pool = getMySQLPool();
  const [rows] = await pool.query(
    `SELECT user_id as id, display_id as displayId, name, email, password, phone, role,
            organization_id as organizationId, avatar, google_id as googleId, facebook_id as facebookId,
            is_verified as isVerified, is_active as isActive,
            is_email_verified as isEmailVerified, is_phone_verified as isPhoneVerified,
            kyc_status as kycStatus, bank_verification_status as bankVerificationStatus,
            kyc_verified_at as kycVerifiedAt, kyc_verified_by as kycVerifiedBy,
            last_login as lastLogin, created_at as createdAt, updated_at as updatedAt
     FROM users WHERE email = ? AND is_active = 1`,
    [email]
  );

  if (rows[0]) {
    rows[0].comparePassword = async function (candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    };
  }

  return rows[0] || null;
};

const updateById = async (id, updateData) => {
  const pool = getMySQLPool();
  const fields = [];
  const values = [];

  if (updateData.name !== undefined)           { fields.push('name = ?');           values.push(updateData.name); }
  if (updateData.phone !== undefined)          { fields.push('phone = ?');          values.push(updateData.phone); }
  if (updateData.avatar !== undefined)         { fields.push('avatar = ?');         values.push(updateData.avatar); }
  if (updateData.role !== undefined)           { fields.push('role = ?');           values.push(updateData.role); }
  if (updateData.isActive !== undefined)       { fields.push('is_active = ?');      values.push(updateData.isActive ? 1 : 0); }
  if (updateData.isVerified !== undefined)     { fields.push('is_verified = ?');    values.push(updateData.isVerified ? 1 : 0); }
  if (updateData.isEmailVerified !== undefined) { fields.push('is_email_verified = ?'); values.push(updateData.isEmailVerified ? 1 : 0); }
  if (updateData.isPhoneVerified !== undefined) { fields.push('is_phone_verified = ?'); values.push(updateData.isPhoneVerified ? 1 : 0); }
  if (updateData.organizationId !== undefined) { fields.push('organization_id = ?'); values.push(updateData.organizationId); }

  if (fields.length === 0) return await findById(id);

  values.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, values);
  return await findById(id);
};

const updateLastLogin = async (id) => {
  const pool = getMySQLPool();
  await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [id]);
};

const verifyUser = async (id) => {
  const pool = getMySQLPool();
  await pool.query('UPDATE users SET is_verified = 1 WHERE user_id = ?', [id]);
};

const updatePassword = async (id, password) => {
  const pool = getMySQLPool();
  const hashedPassword = await bcrypt.hash(password, 12);
  await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, id]);
};

const deleteById = async (id) => {
  const pool = getMySQLPool();
  await pool.query('UPDATE users SET is_active = 0 WHERE user_id = ?', [id]);
};

const findAll = async (options = {}) => {
  const pool = getMySQLPool();
  const { page = 1, limit = 10, sort = 'created_at', order = 'DESC', role, search } = options;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE is_active = 1';
  const params = [];

  if (role === USER_ROLES.CUSTOMER || role === USER_ROLES.LEGACY_CUSTOMER) {
    whereClause += ' AND role IN (?, ?)';
    params.push(USER_ROLES.CUSTOMER, USER_ROLES.LEGACY_CUSTOMER);
  } else if (role) {
    whereClause += ' AND role = ?';
    params.push(role);
  }
  if (search) {
    whereClause += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await pool.query(
    `SELECT ${SEL} FROM users ${whereClause} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    params
  );

  return {
    users: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult[0].total,
      pages: Math.ceil(countResult[0].total / limit),
    },
  };
};

const findByGoogleId = async (googleId) => {
  const pool = getMySQLPool();
  const [rows] = await pool.query(
    `SELECT ${SEL} FROM users WHERE google_id = ? AND is_active = 1`,
    [googleId]
  );
  return rows[0] || null;
};

const findByFacebookId = async (facebookId) => {
  const pool = getMySQLPool();
  const [rows] = await pool.query(
    `SELECT ${SEL} FROM users WHERE facebook_id = ? AND is_active = 1`,
    [facebookId]
  );
  return rows[0] || null;
};

const findByPhone = async (phone) => {
  const pool = getMySQLPool();
  const [rows] = await pool.query(
    `SELECT ${SEL} FROM users WHERE phone = ? AND is_active = 1`,
    [phone]
  );
  return rows[0] || null;
};

const updateGoogleId = async (id, googleId) => {
  const pool = getMySQLPool();
  await pool.query('UPDATE users SET google_id = ? WHERE user_id = ?', [googleId, id]);
};

const updateFacebookId = async (id, facebookId) => {
  const pool = getMySQLPool();
  await pool.query('UPDATE users SET facebook_id = ? WHERE user_id = ?', [facebookId, id]);
};

module.exports = {
  create,
  findById,
  findByEmail,
  findByEmailWithPassword,
  findByPhone,
  findByGoogleId,
  findByFacebookId,
  updateGoogleId,
  updateFacebookId,
  updateById,
  updateLastLogin,
  verifyUser,
  updatePassword,
  deleteById,
  findAll,
};
