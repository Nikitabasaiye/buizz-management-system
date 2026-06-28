const bcrypt = require('bcryptjs');
const { getMySQLPool } = require('../../database/mysql');

const SELECT_USER = `user_id as id, display_id as displayId, name, email, phone, role,
                    organization_id as organizationId, avatar,
                    is_verified as isVerified, is_active as isActive,
                    last_login as lastLogin, created_at as createdAt, updated_at as updatedAt`;

const getPool = () => {
  const pool = getMySQLPool();
  if (!pool) {
    throw new Error('MySQL is not connected.');
  }
  return pool;
};

const findById = async (id) => {
  const [rows] = await getPool().query(
    `SELECT ${SELECT_USER} FROM users WHERE user_id = ? AND is_active = 1`,
    [id]
  );
  return rows[0] || null;
};

const findByEmail = async (email) => {
  const [rows] = await getPool().query(
    `SELECT ${SELECT_USER} FROM users WHERE email = ? AND is_active = 1`,
    [email]
  );
  return rows[0] || null;
};

const findByEmailWithPassword = async (email) => {
  const [rows] = await getPool().query(
    `SELECT user_id as id, display_id as displayId, name, email, password, phone, role,
            organization_id as organizationId, avatar,
            is_verified as isVerified, is_active as isActive,
            last_login as lastLogin, created_at as createdAt, updated_at as updatedAt
     FROM users WHERE email = ?`,
    [email]
  );

  if (rows[0]) {
    rows[0].comparePassword = async function comparePassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    };
  }

  return rows[0] || null;
};

const updateLastLogin = async (id) => {
  await getPool().query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [id]);
};

module.exports = {
  findById,
  findByEmail,
  findByEmailWithPassword,
  updateLastLogin,
};
