const { getMySQLPool } = require('../../database/mysql');

const create = async (eventData) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Insert event WITHOUT ticket_types column
    const values = [
      eventData.title,
      eventData.subtitle || null,
      eventData.slug,
      eventData.description,
      (Number.isInteger(Number(eventData.organizationId)) && Number(eventData.organizationId) > 0) ? eventData.organizationId : null,
      eventData.organizerId,
      eventData.category,
      eventData.language || null,
      eventData.ageRestriction || null,
      eventData.duration || null,
      eventData.type || 'offline',
      eventData.status || 'draft',
      eventData.startDate,
      eventData.endDate,
      eventData.venue?.name || null,
      eventData.venue?.address || null,
      eventData.venue?.city || null,
      eventData.venue?.state || null,
      eventData.venue?.country || null,
      eventData.venue?.coordinates?.lat || null,
      eventData.venue?.coordinates?.lng || null,
      eventData.onlineLink || null,
      eventData.banner || null,
      eventData.images ? JSON.stringify(eventData.images) : null,
      eventData.tags ? JSON.stringify(eventData.tags) : null,
      eventData.isFeatured ? 1 : 0,
      eventData.totalSeats || null,
      eventData.availableSeats || null,
      eventData.termsConditions || null
    ];

    const placeholders = values.map(() => '?').join(', ');
    const [result] = await connection.query(
      `INSERT INTO events (
        title, subtitle, slug, description, organization_id, organizer_id, category, language, age_restriction, duration, type, status,
        start_date, end_date, venue_name, venue_address, venue_city, venue_state, venue_country,
        venue_lat, venue_lng, online_link, banner, images, tags,
        is_featured, total_seats, available_seats, terms_conditions
      ) VALUES (${placeholders})`,
      values
    );

    const eventId = result.insertId;

    // Insert ticket types into separate table
    if (eventData.ticketTypes && Array.isArray(eventData.ticketTypes)) {
      for (const ticketType of eventData.ticketTypes) {
        const ticketValues = [
          eventId,
          ticketType.name,
          ticketType.description || null,
          ticketType.price,
          ticketType.quantity,
          ticketType.quantity // Initially available = total
        ];
        const ticketPlaceholders = ticketValues.map(() => '?').join(', ');
        await connection.query(
          `INSERT INTO ticket_types (event_id, name, description, price, quantity, available_quantity)
           VALUES (${ticketPlaceholders})`,
          ticketValues
        );
      }
    }

    await connection.commit();
    return await findById(eventId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const findById = async (id) => {
  const pool = getMySQLPool();
  
  // Get event details
  const [rows] = await pool.query(
    `SELECT e.*, 
            u.name as organizer_name, u.email as organizer_email,
            o.name as organization_name
     FROM events e
     LEFT JOIN users u ON e.organizer_id = u.user_id
     LEFT JOIN organizations o ON e.organization_id = o.org_id
     WHERE e.event_id = ?`,
    [id]
  );

  if (!rows[0]) return null;

  // Get ticket types
  const [ticketTypes] = await pool.query(
    `SELECT id, name, description, price, quantity, available_quantity, is_active
     FROM ticket_types WHERE event_id = ? AND is_active = 1
     ORDER BY price ASC`,
    [id]
  );

  return formatEvent(rows[0], ticketTypes);
};

const findBySlug = async (slug) => {
  const pool = getMySQLPool();
  
  const [rows] = await pool.query(
    `SELECT e.*, 
            u.name as organizer_name, u.email as organizer_email,
            o.name as organization_name
     FROM events e
     LEFT JOIN users u ON e.organizer_id = u.user_id
     LEFT JOIN organizations o ON e.organization_id = o.org_id
     WHERE e.slug = ?`,
    [slug]
  );

  if (!rows[0]) return null;

  const [ticketTypes] = await pool.query(
    `SELECT id, name, description, price, quantity, available_quantity, is_active
     FROM ticket_types WHERE event_id = ? AND is_active = 1
     ORDER BY price ASC`,
    [rows[0].event_id]
  );

  return formatEvent(rows[0], ticketTypes);
};

const updateById = async (id, updateData) => {
  const pool = getMySQLPool();
  const fields = [];
  const values = [];

  if (updateData.title !== undefined) { fields.push('title = ?'); values.push(updateData.title); }
  if (updateData.subtitle !== undefined) { fields.push('subtitle = ?'); values.push(updateData.subtitle); }
  if (updateData.description !== undefined) { fields.push('description = ?'); values.push(updateData.description); }
  if (updateData.category !== undefined) { fields.push('category = ?'); values.push(updateData.category); }
  if (updateData.language !== undefined) { fields.push('language = ?'); values.push(updateData.language); }
  if (updateData.ageRestriction !== undefined) { fields.push('age_restriction = ?'); values.push(updateData.ageRestriction); }
  if (updateData.duration !== undefined) { fields.push('duration = ?'); values.push(updateData.duration); }
  if (updateData.type !== undefined) { fields.push('type = ?'); values.push(updateData.type); }
  if (updateData.status !== undefined) { fields.push('status = ?'); values.push(updateData.status); }
  if (updateData.startDate !== undefined) { fields.push('start_date = ?'); values.push(updateData.startDate); }
  if (updateData.endDate !== undefined) { fields.push('end_date = ?'); values.push(updateData.endDate); }
  if (updateData.venue !== undefined) {
    fields.push('venue_name = ?'); values.push(updateData.venue?.name || null);
    fields.push('venue_address = ?'); values.push(updateData.venue?.address || null);
    fields.push('venue_city = ?'); values.push(updateData.venue?.city || null);
    fields.push('venue_state = ?'); values.push(updateData.venue?.state || null);
    fields.push('venue_country = ?'); values.push(updateData.venue?.country || null);
    fields.push('venue_lat = ?'); values.push(updateData.venue?.coordinates?.lat || null);
    fields.push('venue_lng = ?'); values.push(updateData.venue?.coordinates?.lng || null);
  }
  if (updateData.onlineLink !== undefined) { fields.push('online_link = ?'); values.push(updateData.onlineLink || null); }
  if (updateData.banner !== undefined) { fields.push('banner = ?'); values.push(updateData.banner); }
  if (updateData.images !== undefined) { fields.push('images = ?'); values.push(updateData.images ? JSON.stringify(updateData.images) : null); }
  if (updateData.tags !== undefined) { fields.push('tags = ?'); values.push(updateData.tags ? JSON.stringify(updateData.tags) : null); }
  if (updateData.isFeatured !== undefined) { fields.push('is_featured = ?'); values.push(updateData.isFeatured ? 1 : 0); }
  if (updateData.totalSeats !== undefined) { fields.push('total_seats = ?'); values.push(updateData.totalSeats || null); }
  if (updateData.availableSeats !== undefined) { fields.push('available_seats = ?'); values.push(updateData.availableSeats || null); }
  if (updateData.termsConditions !== undefined) { fields.push('terms_conditions = ?'); values.push(updateData.termsConditions); }

  // Handle ticket types update if provided
  if (updateData.ticketTypes && Array.isArray(updateData.ticketTypes)) {
    // Delete old ticket types
    await pool.query('DELETE FROM ticket_types WHERE event_id = ?', [id]);
    
    // Insert new ones
    for (const ticketType of updateData.ticketTypes) {
      const ticketValues = [id, ticketType.name, ticketType.description || null, ticketType.price, ticketType.quantity, ticketType.quantity];
      await pool.query(
        `INSERT INTO ticket_types (event_id, name, description, price, quantity, available_quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ticketValues
      );
    }
  }

  if (fields.length > 0) {
    values.push(id);
    await pool.query(`UPDATE events SET ${fields.join(', ')} WHERE event_id = ?`, values);
  }

  return await findById(id);
};

const incrementViews = async (id) => {
  const pool = getMySQLPool();
  await pool.query('UPDATE events SET views = views + 1 WHERE event_id = ?', [id]);
};

const markPastPublishedEventsCompleted = async () => {
  const pool = getMySQLPool();
  await pool.query(
    `UPDATE events
     SET status = 'completed'
     WHERE status IN ('published', 'ongoing')
       AND COALESCE(end_date, start_date) IS NOT NULL
       AND COALESCE(end_date, start_date) < NOW()`
  );
};

const findAll = async (filters = {}) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();
  try {
    await markPastPublishedEventsCompleted();
    connection.queryTimeout = 15000; // 15 second timeout
    const { page = 1, limit = 10, status, category, search, sort = 'created_at', order = 'DESC', includeAllStatuses = false, organizerId } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    // By default, only show published events unless explicitly requested
    if (!includeAllStatuses && !status) {
      whereClause += ' AND e.status = ? AND COALESCE(e.end_date, e.start_date) >= NOW()';
      params.push('published');
    }

    if (status) { whereClause += ' AND e.status = ?'; params.push(status); }
    if (organizerId) { whereClause += ' AND e.organizer_id = ?'; params.push(organizerId); }
    if (category) { whereClause += ' AND e.category = ?'; params.push(category); }
    if (search) {
      whereClause += ' AND (e.title LIKE ? OR e.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await connection.query(
      `SELECT e.*, 
              u.name as organizer_name,
              o.name as organization_name
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.user_id
       LEFT JOIN organizations o ON e.organization_id = o.org_id
       ${whereClause}
       ORDER BY e.${sort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total FROM events e ${whereClause}`,
      params
    );

    // Get ticket types for all events in a single query to avoid N+1 problem
    const eventIds = rows.map(row => row.event_id);
    let ticketTypesMap = {};
    
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const [allTicketTypes] = await connection.query(
        `SELECT id, event_id, name, description, price, quantity, available_quantity
         FROM ticket_types WHERE event_id IN (${placeholders}) AND is_active = 1
         ORDER BY price ASC`,
        eventIds
      );
      
      // Group ticket types by event_id
      allTicketTypes.forEach(tt => {
        if (!ticketTypesMap[tt.event_id]) {
          ticketTypesMap[tt.event_id] = [];
        }
        ticketTypesMap[tt.event_id].push(tt);
      });
    }

    const eventsWithTickets = rows.map(row => {
      return formatEvent(row, ticketTypesMap[row.event_id] || []);
    });

    return {
      events: eventsWithTickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    };
  } finally {
    connection.release();
  }
};

const updateSeatCount = async (eventId, quantity) => {
  const pool = getMySQLPool();
  await pool.query(
    'UPDATE events SET available_seats = available_seats - ? WHERE event_id = ?',
    [quantity, eventId]
  );
};

// Helper to format event data
const formatEvent = (row, ticketTypes = []) => {
  return {
    id: row.event_id,
    title: row.title,
    subtitle: row.subtitle || null,
    slug: row.slug,
    description: row.description,
    organizationId: row.organization_id,
    organizerId: row.organizer_id,
    category: row.category,
    language: row.language || null,
    ageRestriction: row.age_restriction || null,
    duration: row.duration || null,
    type: row.type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    venue: {
      name: row.venue_name,
      address: row.venue_address,
      city: row.venue_city,
      state: row.venue_state,
      country: row.venue_country,
      coordinates: {
        lat: row.venue_lat,
        lng: row.venue_lng
      }
    },
    onlineLink: row.online_link,
    banner: row.banner,
    images: row.images ? JSON.parse(row.images) : [],
    ticketTypes: ticketTypes.map(tt => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price: parseFloat(tt.price),
      quantity: tt.quantity,
      availableQuantity: tt.available_quantity,
      isActive: tt.is_active === 1
    })),
    tags: row.tags ? JSON.parse(row.tags) : [],
    isFeatured: row.is_featured === 1,
    totalSeats: row.total_seats,
    availableSeats: row.available_seats,
    termsConditions: row.terms_conditions || null,
    views: row.views,
    organizerName: row.organizer_name,
    organizerEmail: row.organizer_email,
    organizationName: row.organization_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

module.exports = {
  create,
  findById,
  findBySlug,
  updateById,
  incrementViews,
  markPastPublishedEventsCompleted,
  findAll,
  updateSeatCount
};
