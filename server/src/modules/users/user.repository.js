const { getMySQLPool } = require('../../database/mysql');
const bcrypt = require('bcryptjs');

const ROLE_PREFIX = {
  user: 'USR',
  organizer: 'ORG',
  admin: 'ADM',
  super_admin: 'SAD',
  influencer: 'INF',
};

const generateDisplayId = async (pool, role) => {
  const prefix = ROLE_PREFIX[role] || 'USR';
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
  const seq = String(rows[0].count + 1).padStart(4, '0');
  return `${prefix}-${seq}`;
};

const SEL = `user_id as id, display_id as displayId, name, email, phone, role,
            organization_id as organizationId, avatar,
            is_verified as isVerified, is_active as isActive,
            kyc_status as kycStatus, bank_verification_status as bankVerificationStatus,
            kyc_verified_at as kycVerifiedAt, kyc_verified_by as kycVerifiedBy,
            last_login as lastLogin, created_at as createdAt, updated_at as updatedAt`;

const create = async (userData) => {
  const pool = getMySQLPool();
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  const displayId = await generateDisplayId(pool, userData.role || 'user');

  const [result] = await pool.query(
    `INSERT INTO users (name, email, password, phone, role, organization_id, avatar, display_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userData.name,
      userData.email,
      hashedPassword,
      userData.phone || null,
      userData.role || 'user',
      userData.organizationId || null,
      userData.avatar || null,
      displayId,
    ]
  );

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
            organization_id as organizationId, avatar,
            is_verified as isVerified, is_active as isActive,
            kyc_status as kycStatus, bank_verification_status as bankVerificationStatus,
            kyc_verified_at as kycVerifiedAt, kyc_verified_by as kycVerifiedBy,
            last_login as lastLogin, created_at as createdAt, updated_at as updatedAt
     FROM users WHERE email = ?`,
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

  if (role)   { whereClause += ' AND role = ?'; params.push(role); }
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

module.exports = {
  create,
  findById,
  findByEmail,
  findByEmailWithPassword,
  updateById,
  updateLastLogin,
  verifyUser,
  updatePassword,
  deleteById,
  findAll,
};
