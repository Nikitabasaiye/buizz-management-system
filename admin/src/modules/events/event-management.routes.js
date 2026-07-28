const express = require('express');
const { getMySQLPool } = require('../../database/mysql');
const { authenticate, authorize } = require('../../middleware/rbac');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const { page = 1, limit = 20, status, category, type, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    let where = 'WHERE 1=1';

    if (status) {
      where += ' AND e.status = ?';
      params.push(status);
    }
    if (category) {
      where += ' AND e.category = ?';
      params.push(category);
    }
    if (type) {
      where += ' AND e.type = ?';
      params.push(type);
    }
    if (search) {
      where += ' AND (e.title LIKE ? OR e.description LIKE ? OR u.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const [events] = await pool.query(
      `SELECT e.*, u.name AS organizer_name, u.email AS organizer_email
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.user_id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const [[count]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.user_id
       ${where}`,
      params
    );

    res.json({
      success: true,
      data: {
        events: events.map(mapEventRow),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count.total,
          pages: Math.ceil(count.total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const [events] = await pool.query(
      `SELECT e.*, u.name AS organizer_name, u.email AS organizer_email
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.user_id
       WHERE e.event_id = ?`,
      [req.params.id]
    );

    if (!events.length) throw new AppError('Event not found', 404);

    res.json({ success: true, data: mapEventRow(events[0]) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const body = req.body || {};
    const title = body.title || 'Untitled event';
    const slug = body.slug || buildSlug(title);
    const venue = body.venue || {};

    const [result] = await pool.execute(
      `INSERT INTO events
       (title, slug, description, organization_id, organizer_id, category, type, status, start_date, end_date,
        venue_name, venue_address, venue_city, venue_state, venue_country, online_link, banner, images, tags,
        is_featured, total_seats, available_seats)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        slug,
        body.description || '',
        body.organizationId || body.organization_id || null,
        body.organizerId || body.organizer_id || req.user.id,
        body.category || 'Event',
        body.type || 'offline',
        body.status || 'draft',
        body.startDate || body.start_date || new Date(),
        body.endDate || body.end_date || body.startDate || body.start_date || new Date(),
        venue.name || body.venueName || body.venue_name || null,
        venue.address || body.venueAddress || body.venue_address || null,
        venue.city || body.venueCity || body.venue_city || null,
        venue.state || body.venueState || body.venue_state || null,
        venue.country || body.venueCountry || body.venue_country || 'India',
        body.onlineLink || body.online_link || null,
        body.banner || null,
        JSON.stringify(body.images || []),
        JSON.stringify(body.tags || []),
        body.isFeatured || body.is_featured ? 1 : 0,
        body.totalSeats || body.total_seats || null,
        body.availableSeats || body.available_seats || body.totalSeats || body.total_seats || null,
      ]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, eventId: result.insertId } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const body = req.body || {};
    const venue = body.venue || {};
    const updates = [];
    const values = [];

    addUpdate(updates, values, 'title', body.title);
    addUpdate(updates, values, 'description', body.description);
    addUpdate(updates, values, 'category', body.category);
    addUpdate(updates, values, 'type', body.type);
    addUpdate(updates, values, 'status', body.status);
    addUpdate(updates, values, 'start_date', body.startDate || body.start_date);
    addUpdate(updates, values, 'end_date', body.endDate || body.end_date);
    addUpdate(updates, values, 'venue_name', venue.name || body.venueName || body.venue_name);
    addUpdate(updates, values, 'venue_address', venue.address || body.venueAddress || body.venue_address);
    addUpdate(updates, values, 'venue_city', venue.city || body.venueCity || body.venue_city);
    addUpdate(updates, values, 'venue_state', venue.state || body.venueState || body.venue_state);
    addUpdate(updates, values, 'venue_country', venue.country || body.venueCountry || body.venue_country);
    addUpdate(updates, values, 'online_link', body.onlineLink || body.online_link);
    addUpdate(updates, values, 'banner', body.banner);
    if (body.images) addUpdate(updates, values, 'images', JSON.stringify(body.images));
    if (body.tags) addUpdate(updates, values, 'tags', JSON.stringify(body.tags));
    addUpdate(updates, values, 'total_seats', body.totalSeats || body.total_seats);
    addUpdate(updates, values, 'available_seats', body.availableSeats || body.available_seats);

    if (!updates.length) throw new AppError('No fields to update', 400);

    values.push(req.params.id);
    await pool.execute(`UPDATE events SET ${updates.join(', ')} WHERE event_id = ?`, values);

    res.json({ success: true, message: 'Event updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    await pool.execute('UPDATE events SET status = ? WHERE event_id = ?', ['cancelled', req.params.id]);
    res.json({ success: true, message: 'Event cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

function addUpdate(updates, values, column, value) {
  if (value === undefined) return;
  updates.push(`${column} = ?`);
  values.push(value);
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapEventRow(row) {
  return {
    id: row.event_id,
    eventId: row.event_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    organizerEmail: row.organizer_email,
    category: row.category,
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
    },
    onlineLink: row.online_link,
    banner: row.banner,
    images: parseJson(row.images, []),
    tags: parseJson(row.tags, []),
    isFeatured: Boolean(row.is_featured),
    totalSeats: row.total_seats,
    availableSeats: row.available_seats,
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSlug(value) {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'event'}-${Date.now()}`;
}

module.exports = router;
