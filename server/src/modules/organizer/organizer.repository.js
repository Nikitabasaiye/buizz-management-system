const bcrypt = require('bcryptjs');
const pool = require('../../database/mysql');

const USER_FIELDS = `
  u.user_id AS id,
  u.display_id AS display_id,
  u.name,
  u.email,
  u.phone,
  u.role,
  u.avatar,
  u.is_verified,
  u.is_active,
  u.kyc_status,
  u.bank_verification_status,
  u.last_login,
  u.created_at,
  u.updated_at,
  org.org_id AS organization_id,
  org.name AS business_name,
  org.description AS business_description,
  org.website AS business_website,
  org.email AS business_email,
  org.phone AS business_phone,
  org.address_city,
  org.address_state,
  org.address_country,
  COALESCE(event_stats.total_events, 0) AS total_events,
  COALESCE(revenue_stats.total_revenue, 0) AS total_revenue
`;

const CAMEL_TO_USER_COLUMN = {
  name: 'name',
  phone: 'phone',
  avatar: 'avatar',
  isVerified: 'is_verified',
  isActive: 'is_active',
  kycStatus: 'kyc_status',
  bankVerificationStatus: 'bank_verification_status',
};

const CAMEL_TO_ORG_COLUMN = {
  businessName: 'name',
  organizationName: 'name',
  businessDescription: 'description',
  organizationDescription: 'description',
  businessWebsite: 'website',
  website: 'website',
  businessEmail: 'email',
  businessPhone: 'phone',
  addressCity: 'address_city',
  city: 'address_city',
  addressState: 'address_state',
  state: 'address_state',
  addressCountry: 'address_country',
  country: 'address_country',
};

function slugify(value, fallback) {
  const base = String(value || fallback || 'organizer')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'organizer'}-${Date.now()}`;
}

function normalizeOrganizer(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayId: row.display_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: 'organizer',
    avatar: row.avatar,
    businessName: row.business_name,
    businessDescription: row.business_description,
    businessWebsite: row.business_website,
    businessEmail: row.business_email,
    businessPhone: row.business_phone,
    addressCity: row.address_city,
    addressState: row.address_state,
    addressCountry: row.address_country,
    organizationId: row.organization_id,
    totalEvents: Number(row.total_events || 0),
    totalRevenue: Number(row.total_revenue || 0),
    isVerified: Boolean(row.is_verified),
    isActive: Boolean(row.is_active),
    isKycVerified: row.kyc_status === 'verified',
    kycStatus: row.kyc_status,
    bankVerificationStatus: row.bank_verification_status,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class OrganizerRepository {
  async create(data) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const hashed = await bcrypt.hash(data.password, 12);
      const [userResult] = await conn.execute(
        `INSERT INTO users
          (name, email, password, phone, role, avatar, is_verified, is_email_verified, is_phone_verified, is_active)
         VALUES (?, ?, ?, ?, 'organizer', ?, 0, ?, ?, 1)`,
        [
          data.name,
          data.email,
          hashed,
          data.phone || null,
          data.avatar || null,
          data.isEmailVerified ? 1 : 0,
          data.isPhoneVerified ? 1 : 0,
        ]
      );

      const organizerId = userResult.insertId;
      await conn.execute(
        'UPDATE users SET display_id = ? WHERE user_id = ? AND display_id IS NULL',
        [organizerId, organizerId]
      );
      const businessName = data.businessName || data.organizationName || data.name;
      const businessEmail = data.businessEmail || data.email;
      const businessPhone = data.businessPhone || data.phone || null;

      const [orgResult] = await conn.execute(
        `INSERT INTO organizations
          (name, slug, description, logo, website, email, phone, address_city, address_state, address_country, owner_id, is_verified, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          businessName,
          slugify(businessName, data.email),
          data.businessDescription || data.organizationDescription || null,
          data.avatar || null,
          data.businessWebsite || data.website || null,
          businessEmail,
          businessPhone,
          data.city || data.addressCity || null,
          data.state || data.addressState || null,
          data.country || data.addressCountry || 'India',
          organizerId,
        ]
      );

      await conn.execute(
        'UPDATE users SET organization_id = ? WHERE user_id = ?',
        [orgResult.insertId, organizerId]
      );

      await conn.commit();
      return this.findById(organizerId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ${USER_FIELDS}
       FROM users u
       LEFT JOIN organizations org ON org.owner_id = u.user_id AND org.is_active = 1
       LEFT JOIN (
         SELECT organizer_id, COUNT(*) AS total_events
         FROM events
         GROUP BY organizer_id
       ) event_stats ON event_stats.organizer_id = u.user_id
       LEFT JOIN (
         SELECT e.organizer_id, SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) AS total_revenue
         FROM events e
         LEFT JOIN payments p ON p.event_id = e.event_id
         GROUP BY e.organizer_id
       ) revenue_stats ON revenue_stats.organizer_id = u.user_id
       WHERE u.user_id = ? AND u.role = 'organizer' AND u.is_active = 1
       LIMIT 1`,
      [id]
    );
    return normalizeOrganizer(rows[0]);
  }

  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT user_id AS id, display_id AS display_id, name, email, phone, is_verified, is_active, kyc_status, bank_verification_status, last_login, created_at
       FROM users
       WHERE email = ? AND role = 'organizer' AND is_active = 1
       LIMIT 1`,
      [email]
    );
    return normalizeOrganizer(rows[0]);
  }

  async findByEmailWithPassword(email) {
    const [rows] = await pool.execute(
      `SELECT user_id AS id, display_id AS display_id, name, email, password, phone, is_verified, is_active, kyc_status, bank_verification_status, last_login FROM users WHERE email = ? AND role = 'organizer' AND is_active = 1 LIMIT 1`,
      [email]
    );
    if (!rows[0]) return null;
    const organizer = normalizeOrganizer(rows[0]);
    organizer.comparePassword = async (candidate) => bcrypt.compare(candidate, rows[0].password);
    return organizer;
  }

  async findByPhone(phone) {
    const [rows] = await pool.execute(
      `SELECT user_id AS id, display_id AS display_id, name, email, phone, is_verified, is_active, kyc_status, bank_verification_status, last_login, created_at
       FROM users
       WHERE phone = ? AND role = 'organizer' AND is_active = 1
       LIMIT 1`,
      [phone]
    );
    return normalizeOrganizer(rows[0]);
  }

  async updateById(id, data) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const userFields = [];
      const userValues = [];
      const orgFields = [];
      const orgValues = [];

      for (const [key, value] of Object.entries(data)) {
        const userColumn = CAMEL_TO_USER_COLUMN[key] || (Object.values(CAMEL_TO_USER_COLUMN).includes(key) ? key : null);
        const orgColumn = CAMEL_TO_ORG_COLUMN[key] || (Object.values(CAMEL_TO_ORG_COLUMN).includes(key) ? key : null);

        if (userColumn) {
          userFields.push(`${userColumn} = ?`);
          userValues.push(value);
        } else if (orgColumn) {
          orgFields.push(`${orgColumn} = ?`);
          orgValues.push(value);
        }
      }

      if (userFields.length) {
        userValues.push(id);
        await conn.execute(`UPDATE users SET ${userFields.join(', ')} WHERE user_id = ? AND role = 'organizer'`, userValues);
      }

      if (orgFields.length) {
        const [existing] = await conn.execute('SELECT org_id FROM organizations WHERE owner_id = ? AND is_active = 1 LIMIT 1', [id]);
        if (existing.length) {
          orgValues.push(id);
          await conn.execute(`UPDATE organizations SET ${orgFields.join(', ')} WHERE owner_id = ? AND is_active = 1`, orgValues);
        } else {
          const name = data.businessName || data.organizationName || data.name || 'Organizer Business';
          await conn.execute(
            `INSERT INTO organizations (name, slug, email, phone, address_city, address_state, address_country, owner_id, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              name,
              slugify(name, id),
              data.businessEmail || data.email || `organizer-${id}@buizz.local`,
              data.businessPhone || data.phone || null,
              data.city || data.addressCity || null,
              data.state || data.addressState || null,
              data.country || data.addressCountry || 'India',
              id,
            ]
          );
        }
      }

      await conn.commit();
      return this.findById(id);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async updatePassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE users SET password = ? WHERE user_id = ? AND role = "organizer"', [hashed, id]);
  }

  async updateLastLogin(id) {
    await pool.execute('UPDATE users SET last_login = NOW() WHERE user_id = ? AND role = "organizer"', [id]);
  }

  async verifyOrganizer(id) {
    await pool.execute('UPDATE users SET is_verified = 1 WHERE user_id = ? AND role = "organizer"', [id]);
    await pool.execute('UPDATE organizations SET is_verified = 1 WHERE owner_id = ?', [id]);
  }

  async deleteById(id) {
    await pool.execute('UPDATE users SET is_active = 0 WHERE user_id = ? AND role = "organizer"', [id]);
    await pool.execute('UPDATE organizations SET is_active = 0 WHERE owner_id = ?', [id]);
  }

  async findAll(options = {}) {
    const { page = 1, limit = 10, search, is_verified, is_kyc_verified } = options;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    let where = "WHERE u.role = 'organizer' AND u.is_active = 1";
    const params = [];

    if (search) {
      where += ' AND (u.name LIKE ? OR u.email LIKE ? OR org.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (is_verified !== undefined) {
      where += ' AND u.is_verified = ?';
      params.push(is_verified === true || is_verified === 'true' ? 1 : 0);
    }
    if (is_kyc_verified !== undefined) {
      where += ' AND u.kyc_status = ?';
      params.push(is_kyc_verified === true || is_kyc_verified === 'true' ? 'verified' : 'not_submitted');
    }

    const [rows] = await pool.execute(
      `SELECT ${USER_FIELDS}
       FROM users u
       LEFT JOIN organizations org ON org.owner_id = u.user_id AND org.is_active = 1
       LEFT JOIN (
         SELECT organizer_id, COUNT(*) AS total_events
         FROM events
         GROUP BY organizer_id
       ) event_stats ON event_stats.organizer_id = u.user_id
       LEFT JOIN (
         SELECT e.organizer_id, SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) AS total_revenue
         FROM events e
         LEFT JOIN payments p ON p.event_id = e.event_id
         GROUP BY e.organizer_id
       ) revenue_stats ON revenue_stats.organizer_id = u.user_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM users u
       LEFT JOIN organizations org ON org.owner_id = u.user_id AND org.is_active = 1
       ${where}`,
      params
    );

    return {
      organizers: rows.map(normalizeOrganizer),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }
}

module.exports = new OrganizerRepository();
