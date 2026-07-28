const pool = require('../../database/mysql');

class OrganizationRepository {
  async create(orgData) {
    const connection = await pool.getConnection();
    try {
      const {
        name, slug, description, logo, website, email, phone,
        address_street, address_city, address_state, address_country, address_zip_code,
        owner_id
      } = orgData;

      const [result] = await connection.execute(
        `INSERT INTO organizations 
         (name, slug, description, logo, website, email, phone, 
          address_street, address_city, address_state, address_country, address_zip_code, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, description || null, logo || null, website || null, email, phone || null,
         address_street || null, address_city || null, address_state || null, 
         address_country || null, address_zip_code || null, owner_id]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT o.*, u.name as owner_name, u.email as owner_email
       FROM organizations o
       LEFT JOIN users u ON o.owner_id = u.user_id
       WHERE o.org_id = ? AND o.is_active = 1`,
      [id]
    );
    return rows[0] || null;
  }

  async findBySlug(slug) {
    const [rows] = await pool.execute(
      'SELECT * FROM organizations WHERE slug = ? AND is_active = 1',
      [slug]
    );
    return rows[0] || null;
  }

  async updateById(id, updateData) {
    const connection = await pool.getConnection();
    try {
      const fields = [];
      const values = [];

      const allowedFields = ['name', 'description', 'logo', 'website', 'email', 'phone',
        'address_street', 'address_city', 'address_state', 'address_country', 'address_zip_code',
        'is_verified', 'is_active'];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });

      if (fields.length === 0) {
        return await this.findById(id);
      }

      values.push(id);
      await connection.execute(
        `UPDATE organizations SET ${fields.join(', ')} WHERE org_id = ?`,
        values
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  async deleteById(id) {
    await pool.execute(
      'UPDATE organizations SET is_active = 0 WHERE org_id = ?',
      [id]
    );
  }

  async findAll(options = {}) {
    const { page = 1, limit = 10, search, is_verified } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE o.is_active = 1';
    const params = [];

    if (search) {
      whereClause += ' AND (o.name LIKE ? OR o.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (is_verified !== undefined) {
      whereClause += ' AND o.is_verified = ?';
      params.push(is_verified ? 1 : 0);
    }

    const [rows] = await pool.execute(
      `SELECT o.*, u.name as owner_name
       FROM organizations o
       LEFT JOIN users u ON o.owner_id = u.user_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM organizations o ${whereClause}`,
      params
    );

    return {
      organizations: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    };
  }

  async addMember(organizationId, userId, role = 'member') {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'INSERT INTO organization_members (organization_id, user_id, role) VALUES (?, ?, ?)',
        [organizationId, userId, role]
      );

      await connection.execute(
        'UPDATE users SET organization_id = ? WHERE user_id = ?',
        [organizationId, userId]
      );

      return { organizationId, userId, role };
    } finally {
      connection.release();
    }
  }

  async removeMember(organizationId, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'DELETE FROM organization_members WHERE organization_id = ? AND user_id = ?',
        [organizationId, userId]
      );

      await connection.execute(
        'UPDATE users SET organization_id = NULL WHERE user_id = ?',
        [userId]
      );
    } finally {
      connection.release();
    }
  }

  async getMembers(organizationId) {
    const [rows] = await pool.execute(
      `SELECT om.role, om.joined_at, u.user_id as id, u.name, u.email, u.avatar
       FROM organization_members om
       JOIN users u ON om.user_id = u.user_id
       WHERE om.organization_id = ? AND u.is_active = 1
       ORDER BY om.joined_at DESC`,
      [organizationId]
    );
    return rows;
  }

  async isOwnerOrAdmin(organizationId, userId) {
    const [rows] = await pool.execute(
      `SELECT role FROM organization_members 
       WHERE organization_id = ? AND user_id = ? AND role IN ('owner', 'admin')`,
      [organizationId, userId]
    );
    return rows.length > 0;
  }

  async isMember(organizationId, userId) {
    const [rows] = await pool.execute(
      'SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ?',
      [organizationId, userId]
    );
    return rows.length > 0;
  }
}

module.exports = new OrganizationRepository();
