const bcrypt = require('bcryptjs');
const pool = require('../../database/mysql');

const UPDATABLE_COLUMNS = [
  'name', 'phone', 'avatar', 'bio', 'niche',
  'instagram_handle', 'youtube_handle', 'twitter_handle', 'facebook_handle',
  'total_followers', 'bank_account_name', 'bank_account_number', 'bank_ifsc', 'bank_name',
  'is_verified', 'is_active',
];

const CAMEL_TO_SNAKE = {
  instagramHandle: 'instagram_handle', youtubeHandle: 'youtube_handle',
  twitterHandle: 'twitter_handle', facebookHandle: 'facebook_handle',
  totalFollowers: 'total_followers',
  bankAccountName: 'bank_account_name', bankAccountNumber: 'bank_account_number',
  bankIfsc: 'bank_ifsc', bankName: 'bank_name',
  isVerified: 'is_verified', isActive: 'is_active',
};

class InfluencerRepository {
  async create(data) {
    const connection = await pool.getConnection();
    try {
      const hashed = await bcrypt.hash(data.password, 12);
      const [result] = await connection.execute(
        `INSERT INTO influencers
           (name, email, password, phone, avatar, bio, niche,
            instagram_handle, youtube_handle, twitter_handle, facebook_handle)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name, data.email, hashed,
          data.phone             || null,
          data.avatar            || null,
          data.bio               || null,
          data.niche             || null,
          data.instagramHandle   || null,
          data.youtubeHandle     || null,
          data.twitterHandle     || null,
          data.facebookHandle    || null,
        ]
      );
      return this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, avatar, bio, niche,
              instagram_handle, youtube_handle, twitter_handle, facebook_handle,
              total_followers, total_promotions, total_earnings,
              bank_account_name, bank_account_number, bank_ifsc, bank_name,
              is_verified, is_active, last_login, created_at, updated_at
       FROM influencers WHERE id = ? AND is_active = 1`,
      [id]
    );
    return rows[0] || null;
  }

  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, avatar, niche,
              total_followers, total_promotions, is_verified, is_active, last_login, created_at
       FROM influencers WHERE email = ? AND is_active = 1`,
      [email]
    );
    return rows[0] || null;
  }

  async findByEmailWithPassword(email) {
    const [rows] = await pool.execute(
      `SELECT id, name, email, password, phone, niche,
              is_verified, is_active, last_login
       FROM influencers WHERE email = ?`,
      [email]
    );
    if (!rows[0]) return null;
    rows[0].comparePassword = async (candidate) =>
      bcrypt.compare(candidate, rows[0].password);
    return rows[0];
  }

  async updateById(id, data) {
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];
      for (const [key, value] of Object.entries(data)) {
        const col = CAMEL_TO_SNAKE[key] || key;
        if (UPDATABLE_COLUMNS.includes(col)) {
          fields.push(`${col} = ?`);
          values.push(value);
        }
      }
      if (fields.length === 0) return this.findById(id);
      values.push(id);
      await connection.execute(`UPDATE influencers SET ${fields.join(', ')} WHERE id = ?`, values);
      return this.findById(id);
    } finally {
      connection.release();
    }
  }

  async updatePassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE influencers SET password = ? WHERE id = ?', [hashed, id]);
  }

  async updateLastLogin(id) {
    await pool.execute('UPDATE influencers SET last_login = NOW() WHERE id = ?', [id]);
  }

  async verifyInfluencer(id) {
    await pool.execute('UPDATE influencers SET is_verified = 1 WHERE id = ?', [id]);
  }

  async deleteById(id) {
    await pool.execute('UPDATE influencers SET is_active = 0 WHERE id = ?', [id]);
  }

  async findAll(options = {}) {
    const { page = 1, limit = 10, search, niche, is_verified } = options;
    const offset = (page - 1) * limit;
    let where = 'WHERE is_active = 1';
    const params = [];

    if (search) {
      where += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (niche) { where += ' AND niche = ?'; params.push(niche); }
    if (is_verified !== undefined) { where += ' AND is_verified = ?'; params.push(is_verified ? 1 : 0); }

    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, avatar, niche,
              total_followers, total_promotions, total_earnings, is_verified, created_at
       FROM influencers ${where} ORDER BY total_followers DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM influencers ${where}`, params
    );
    return {
      influencers: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    };
  }

  async addEarnings(id, amount) {
    await pool.execute(
      'UPDATE influencers SET total_earnings = total_earnings + ?, total_promotions = total_promotions + 1 WHERE id = ?',
      [amount, id]
    );
  }
}

module.exports = new InfluencerRepository();
