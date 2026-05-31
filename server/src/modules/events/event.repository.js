const { getMySQLPool } = require('../../database/mysql');

const selectColumns = `
  id, title, slug, description, organization_id, organizer_id, category, type,
  status, start_date, end_date, venue, online_link, banner, images,
  ticket_types, tags, is_featured, total_seats, available_seats, views,
  created_at, updated_at
`;

const getPool = () => {
  const pool = getMySQLPool();
  if (!pool) {
    throw new Error('MySQL is not connected.');
  }

  return pool;
};

const parseJson = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const toJson = (value) => {
  if (value == null) return null;
  return JSON.stringify(value);
};

const mapEvent = (row) => {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    organizationId: row.organization_id,
    organizerId: row.organizer_id,
    category: row.category,
    type: row.type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    venue: parseJson(row.venue, null),
    onlineLink: row.online_link,
    banner: row.banner,
    images: parseJson(row.images, []),
    ticketTypes: parseJson(row.ticket_types, []),
    tags: parseJson(row.tags, []),
    isFeatured: Boolean(row.is_featured),
    totalSeats: row.total_seats,
    availableSeats: row.available_seats,
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const create = async (eventData) => {
  const pool = getPool();
  const [result] = await pool.execute(
    `
      INSERT INTO events (
        title, slug, description, organization_id, organizer_id, category, type,
        status, start_date, end_date, venue, online_link, banner, images,
        ticket_types, tags, is_featured, total_seats, available_seats
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      eventData.title,
      eventData.slug,
      eventData.description,
      eventData.organizationId || null,
      eventData.organizerId,
      eventData.category,
      eventData.type || 'offline',
      eventData.status || 'draft',
      eventData.startDate,
      eventData.endDate,
      toJson(eventData.venue),
      eventData.onlineLink || null,
      eventData.banner || null,
      toJson(eventData.images || []),
      toJson(eventData.ticketTypes || []),
      toJson(eventData.tags || []),
      eventData.isFeatured ? 1 : 0,
      eventData.totalSeats || null,
      eventData.availableSeats || eventData.totalSeats || null
    ]
  );

  return findById(result.insertId);
};

const findById = async (id) => {
  const pool = getPool();
  const [rows] = await pool.execute(`SELECT ${selectColumns} FROM events WHERE id = ? LIMIT 1`, [id]);
  return mapEvent(rows[0]);
};

const findBySlug = async (slug) => {
  const pool = getPool();
  const [rows] = await pool.execute(`SELECT ${selectColumns} FROM events WHERE slug = ? LIMIT 1`, [slug]);
  return mapEvent(rows[0]);
};

const updateById = async (id, updateData) => {
  const fields = {
    title: 'title',
    slug: 'slug',
    description: 'description',
    organizationId: 'organization_id',
    organizerId: 'organizer_id',
    category: 'category',
    type: 'type',
    status: 'status',
    startDate: 'start_date',
    endDate: 'end_date',
    venue: 'venue',
    onlineLink: 'online_link',
    banner: 'banner',
    images: 'images',
    ticketTypes: 'ticket_types',
    tags: 'tags',
    isFeatured: 'is_featured',
    totalSeats: 'total_seats',
    availableSeats: 'available_seats',
    views: 'views'
  };

  const jsonFields = new Set(['venue', 'images', 'ticketTypes', 'tags']);
  const booleanFields = new Set(['isFeatured']);
  const entries = Object.entries(updateData).filter(([key]) => fields[key]);

  if (entries.length === 0) {
    return findById(id);
  }

  const assignments = entries.map(([key]) => `${fields[key]} = ?`).join(', ');
  const values = entries.map(([key, value]) => {
    if (jsonFields.has(key)) return toJson(value);
    if (booleanFields.has(key)) return value ? 1 : 0;
    return value;
  });

  const pool = getPool();
  await pool.execute(`UPDATE events SET ${assignments} WHERE id = ?`, [...values, id]);
  return findById(id);
};

const incrementViews = async (id) => {
  const pool = getPool();
  await pool.execute('UPDATE events SET views = views + 1 WHERE id = ?', [id]);
};

const findAll = async (filters = {}) => {
  const { page = 1, limit = 10, status, category, search, sort = '-createdAt' } = filters;
  const currentPage = Number(page);
  const pageSize = Number(limit);
  const offset = (currentPage - 1) * pageSize;
  const conditions = [];
  const values = [];

  if (status) {
    conditions.push('status = ?');
    values.push(status);
  }

  if (category) {
    conditions.push('category = ?');
    values.push(category);
  }

  if (search) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    values.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortMap = {
    createdAt: 'created_at',
    '-createdAt': 'created_at DESC',
    startDate: 'start_date',
    '-startDate': 'start_date DESC',
    title: 'title',
    '-title': 'title DESC'
  };
  const orderBy = sortMap[sort] || 'created_at DESC';

  const pool = getPool();
  const [events] = await pool.execute(
    `SELECT ${selectColumns} FROM events ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM events ${where}`, values);
  const total = Number(countRows[0].total);

  return {
    events: events.map((event) => mapEvent(event)),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize)
    }
  };
};

const updateSeatCount = async (eventId, ticketTypeIndex, quantity) => {
  const event = await findById(eventId);
  if (!event) return null;

  const ticketTypes = [...(event.ticketTypes || [])];
  if (ticketTypes[ticketTypeIndex]) {
    ticketTypes[ticketTypeIndex].sold = Number(ticketTypes[ticketTypeIndex].sold || 0) + Number(quantity);
  }

  return updateById(eventId, {
    ticketTypes,
    availableSeats: Math.max(Number(event.availableSeats || 0) - Number(quantity), 0)
  });
};

module.exports = {
  create,
  findById,
  findBySlug,
  updateById,
  incrementViews,
  findAll,
  updateSeatCount
};
