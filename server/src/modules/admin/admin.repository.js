const bcrypt = require('bcryptjs');
const pool = require('../../database/mysql');

class AdminRepository {
  async create(data) {
    const connection = await pool.getConnection();
    try {
      const hashed = await bcrypt.hash(data.password, 12);
      const [result] = await connection.execute(
        `INSERT INTO admins (name, email, password, phone, avatar, permissions, is_super_admin)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          data.email,
          hashed,
          data.phone           || null,
          data.avatar          || null,
          data.permissions ? JSON.stringify(data.permissions) : null,
          data.isSuperAdmin ? 1 : 0,
        ]
      );
      return this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, avatar, permissions,
              is_super_admin, is_active, last_login, created_at, updated_at
       FROM admins WHERE id = ? AND is_active = 1`,
      [id]
    );
    if (!rows[0]) return null;
    if (rows[0].permissions) rows[0].permissions = JSON.parse(rows[0].permissions);
    return rows[0];
  }

  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, avatar, permissions,
              is_super_admin, is_active, last_login, created_at
       FROM admins WHERE email = ? AND is_active = 1`,
      [email]
    );
    if (!rows[0]) return null;
    if (rows[0].permissions) rows[0].permissions = JSON.parse(rows[0].permissions);
    return rows[0];
  }

  async findByEmailWithPassword(email) {
    const [rows] = await pool.execute(
      `SELECT id, name, email, password, phone, avatar,
              permissions, is_super_admin, is_active, last_login
       FROM admins WHERE email = ?`,
      [email]
    );
    if (!rows[0]) return null;
    rows[0].comparePassword = async (candidate) =>
      bcrypt.compare(candidate, rows[0].password);
    if (rows[0].permissions) rows[0].permissions = JSON.parse(rows[0].permissions);
    return rows[0];
  }

  async updateById(id, data) {
    const connection = await pool.getConnection();
    try {
      const map = { name: 'name', phone: 'phone', avatar: 'avatar', isActive: 'is_active', isSuperAdmin: 'is_super_admin' };
      const fields = [];
      const values = [];

      for (const [key, col] of Object.entries(map)) {
        if (data[key] !== undefined) {
          fields.push(`${col} = ?`);
          values.push(data[key]);
        }
      }
      if (data.permissions !== undefined) {
        fields.push('permissions = ?');
        values.push(JSON.stringify(data.permissions));
      }
      if (fields.length === 0) return this.findById(id);
      values.push(id);
      await connection.execute(`UPDATE admins SET ${fields.join(', ')} WHERE id = ?`, values);
      return this.findById(id);
    } finally {
      connection.release();
    }
  }

  async updatePassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE admins SET password = ? WHERE id = ?', [hashed, id]);
  }

  async updateLastLogin(id) {
    await pool.execute('UPDATE admins SET last_login = NOW() WHERE id = ?', [id]);
  }

  async deleteById(id) {
    await pool.execute('UPDATE admins SET is_active = 0 WHERE id = ?', [id]);
  }

  async findAll(options = {}) {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;
    let where = 'WHERE is_active = 1';
    const params = [];

    if (search) {
      where += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, avatar, is_super_admin, is_active, last_login, created_at
       FROM admins ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM admins ${where}`, params
    );
    return {
      admins: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    };
  }
}

module.exports = new AdminRepository();
