const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../../constants');
const { getMySQLPool } = require('../../database/mysql');

const publicColumns = `
  id, name, email, phone, role, organization_id, avatar,
  is_verified, is_active, last_login, created_at, updated_at
`;

const getPool = () => {
  const pool = getMySQLPool();
  if (!pool) {
    throw new Error('MySQL is not connected.');
  }

  return pool;
};

const mapUser = (row, includePassword = false) => {
  if (!row) return null;

  const user = {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    organizationId: row.organization_id,
    avatar: row.avatar,
    isVerified: Boolean(row.is_verified),
    isActive: Boolean(row.is_active),
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (includePassword) {
    user.password = row.password;
    user.comparePassword = async (candidatePassword) => bcrypt.compare(candidatePassword, row.password);
  }

  return user;
};

const create = async (userData) => {
  const pool = getPool();
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  const role = userData.role || USER_ROLES.USER;
  const email = userData.email.toLowerCase().trim();

  const [result] = await pool.execute(
    `
      INSERT INTO users (name, email, password, phone, role, organization_id, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userData.name,
      email,
      hashedPassword,
      userData.phone || null,
      role,
      userData.organizationId || null,
      userData.avatar || null
    ]
  );

  return findById(result.insertId);
};

const findById = async (id) => {
  const pool = getPool();
  const [rows] = await pool.execute(`SELECT ${publicColumns} FROM users WHERE id = ? LIMIT 1`, [id]);
  return mapUser(rows[0]);
};

const findByEmail = async (email) => {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT ${publicColumns} FROM users WHERE email = ? LIMIT 1`,
    [email.toLowerCase().trim()]
  );
  return mapUser(rows[0]);
};

const findByEmailWithPassword = async (email) => {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT ${publicColumns}, password FROM users WHERE email = ? LIMIT 1`,
    [email.toLowerCase().trim()]
  );
  return mapUser(rows[0], true);
};

const updateById = async (id, updateData) => {
  const allowedFields = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    role: 'role',
    organizationId: 'organization_id',
    avatar: 'avatar',
    isVerified: 'is_verified',
    isActive: 'is_active'
  };

  const entries = Object.entries(updateData).filter(([key]) => allowedFields[key]);
  if (entries.length === 0) {
    return findById(id);
  }

  const assignments = entries.map(([key]) => `${allowedFields[key]} = ?`).join(', ');
  const values = entries.map(([key, value]) => {
    if (key === 'email') return value.toLowerCase().trim();
    if (key === 'isVerified' || key === 'isActive') return value ? 1 : 0;
    return value;
  });

  const pool = getPool();
  await pool.execute(`UPDATE users SET ${assignments} WHERE id = ?`, [...values, id]);
  return findById(id);
};

const updateLastLogin = async (id) => {
  const pool = getPool();
  await pool.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return findById(id);
};

const verifyUser = async (id) => {
  const pool = getPool();
  await pool.execute('UPDATE users SET is_verified = 1 WHERE id = ?', [id]);
  return findById(id);
};

const updatePassword = async (id, password) => {
  const pool = getPool();
  const hashedPassword = await bcrypt.hash(password, 12);
  await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
};

const deleteById = async (id) => {
  const pool = getPool();
  await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
  return findById(id);
};

const findAll = async (filter = {}, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [];
  const values = [];

  if (filter.role) {
    conditions.push('role = ?');
    values.push(filter.role);
  }

  if (filter.organizationId) {
    conditions.push('organization_id = ?');
    values.push(filter.organizationId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const pool = getPool();
  const [users] = await pool.execute(
    `SELECT ${publicColumns} FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, Number(limit), offset]
  );
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM users ${where}`, values);
  const total = Number(countRows[0].total);

  return {
    users: users.map((user) => mapUser(user)),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
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
  findAll
};
