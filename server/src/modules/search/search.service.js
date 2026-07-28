const { AppError } = require('../../middleware/errorHandler');
const { getMySQLPool } = require('../../database/mysql');
const { USER_ROLES } = require('../../constants');
const logger = require('../../utils/logger');

/**
 * Search Service
 * Handles public and private search functionality
 */

const searchEvents = async (filters = {}) => {
  const pool = getMySQLPool();
  
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT e.*,
           u.name as organizer_name,
           u.email as organizer_email,
           u.phone as organizer_phone,
           MIN(tt.price) as min_price,
           MAX(tt.price) as max_price
    FROM events e
    JOIN users u ON e.organizer_id = u.user_id
    LEFT JOIN ticket_types tt ON tt.event_id = e.event_id
    WHERE e.status = 'published'
  `;
  const params = [];

  if (filters.q) {
    query += ` AND (e.title LIKE ? OR e.description LIKE ? OR e.venue_name LIKE ?)`;
    const searchTerm = `%${filters.q}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (filters.category) {
    query += ' AND e.category = ?';
    params.push(filters.category);
  }

  if (filters.type) {
    query += ' AND e.type = ?';
    params.push(filters.type);
  }

  if (filters.startDate) {
    query += ' AND e.start_date >= ?';
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ' AND e.end_date <= ?';
    params.push(filters.endDate);
  }

  if (filters.city) {
    query += ' AND e.venue_city LIKE ?';
    params.push(`%${filters.city}%`);
  }

  if (filters.state) {
    query += ' AND e.venue_state LIKE ?';
    params.push(`%${filters.state}%`);
  }

  query += ' GROUP BY e.event_id, u.user_id';

  // Price filters applied via HAVING (aggregate)
  const havingClauses = [];
  if (filters.minPrice !== undefined && filters.minPrice !== '' && Number(filters.minPrice) > 0) {
    havingClauses.push('min_price >= ?');
    params.push(Number(filters.minPrice));
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== '' && Number(filters.maxPrice) < 10000) {
    havingClauses.push('max_price <= ?');
    params.push(Number(filters.maxPrice));
  }
  if (havingClauses.length) query += ' HAVING ' + havingClauses.join(' AND ');

  if (filters.availableOnly) {
    query += havingClauses.length ? ' AND e.available_seats > 0' : ' HAVING e.available_seats > 0';
  }

  query += ' ORDER BY e.start_date ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [events] = await pool.query(query, params);
  
  // Get total count
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM events WHERE status = ?',
    ['published']
  );
  
  // Get categories and types for filters
  const [categories] = await pool.query(
    'SELECT DISTINCT category FROM events WHERE category IS NOT NULL ORDER BY category'
  );
  
  const [types] = await pool.query(
    'SELECT DISTINCT type FROM events WHERE type IS NOT NULL ORDER BY type'
  );
  
  return {
    events: events.map(e => ({
      id: e.event_id,
      title: e.title,
      description: e.description,
      startDate: e.start_date,
      endDate: e.end_date,
      type: e.type,
      category: e.category,
      venueName: e.venue_name,
      venueCity: e.venue_city,
      venueState: e.venue_state,
      minPrice: e.min_price,
      maxPrice: e.max_price,
      availableSeats: e.available_seats,
      totalSeats: e.total_seats,
      banner: e.banner,
      organizer: {
        name: e.organizer_name,
        email: e.organizer_email,
        phone: e.organizer_phone
      }
    })),
    pagination: {
      page,
      limit,
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    },
    filters: {
      categories: categories.map(c => c.category),
      types: types.map(t => t.type)
    }
  };
};

const searchOrganizers = async (filters = {}) => {
  const pool = getMySQLPool();
  
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT u.user_id, u.name, u.email, u.phone, u.avatar,
           u.kyc_status, u.bank_verification_status,
           COUNT(DISTINCT e.event_id) as events_count,
           COUNT(DISTINCT CASE WHEN b.booking_status = 'confirmed' THEN b.booking_id END) as total_bookings
    FROM users u
    LEFT JOIN events e ON u.user_id = e.organizer_id
    LEFT JOIN bookings b ON e.event_id = b.event_id
    WHERE u.role = 'organizer'
  `;
  const params = [];
  
  if (filters.q) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  
  if (filters.kycStatus) {
    query += ' AND u.kyc_status = ?';
    params.push(filters.kycStatus);
  }
  
  query += ' GROUP BY u.user_id, u.name, u.email, u.phone, u.avatar, u.kyc_status, u.bank_verification_status';
  query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const [organizers] = await pool.query(query, params);
  
  // Get total count
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM users WHERE role = ?',
    ['organizer']
  );
  
  return {
    organizers: organizers.map(o => ({
      id: o.user_id,
      name: o.name,
      email: o.email,
      phone: o.phone,
      avatar: o.avatar,
      kycStatus: o.kyc_status,
      bankVerificationStatus: o.bank_verification_status,
      eventsCount: parseInt(o.events_count),
      totalBookings: parseInt(o.total_bookings)
    })),
    pagination: {
      page,
      limit,
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  };
};

const searchUsers = async (filters = {}) => {
  const pool = getMySQLPool();
  
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT user_id, display_id, name, email, phone, avatar, role, 
           kyc_status, bank_verification_status, created_at
    FROM users
    WHERE role IN (?, ?)
  `;
  const params = [USER_ROLES.CUSTOMER, USER_ROLES.LEGACY_CUSTOMER];
  
  if (filters.q) {
    query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
    params.push(`%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`);
  }
  
  if (filters.kycStatus) {
    query += ' AND kyc_status = ?';
    params.push(filters.kycStatus);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const [users] = await pool.query(query, params);
  
  // Get total count
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM users WHERE role IN (?, ?)',
    [USER_ROLES.CUSTOMER, USER_ROLES.LEGACY_CUSTOMER]
  );
  
  return {
    users: users.map(u => ({
      id: u.user_id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      role: u.role,
      kycStatus: u.kyc_status,
      bankVerificationStatus: u.bank_verification_status,
      createdAt: u.created_at
    })),
    pagination: {
      page,
      limit,
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  };
};

const advancedEventSearch = async (searchData) => {
  const pool = getMySQLPool();
  
  const { 
    query, 
    categories, 
    types, 
    dateRange, 
    location, 
    priceRange, 
    availability,
    sortBy = 'start_date',
    sortOrder = 'asc',
    page = 1,
    limit = 20
  } = searchData;
  
  const offset = (page - 1) * limit;
  
  let queryStr = `
    SELECT e.*,
           u.name as organizer_name,
           u.email as organizer_email,
           u.phone as organizer_phone,
           MIN(tt.price) as min_price,
           MAX(tt.price) as max_price
    FROM events e
    JOIN users u ON e.organizer_id = u.user_id
    LEFT JOIN ticket_types tt ON tt.event_id = e.event_id
    WHERE e.status = 'published'
  `;
  const params = [];
  
  // Full text search
  if (query) {
    queryStr += ` AND MATCH(e.title, e.description, e.venue_name) AGAINST (? IN BOOLEAN MODE)`;
    params.push(query);
  }
  
  // Category filter
  if (categories && categories.length > 0) {
    queryStr += ` AND e.category IN (${categories.map(() => '?').join(',')})`;
    params.push(...categories);
  }
  
  // Type filter
  if (types && types.length > 0) {
    queryStr += ` AND e.type IN (${types.map(() => '?').join(',')})`;
    params.push(...types);
  }
  
  // Date range
  if (dateRange?.start) {
    queryStr += ' AND e.start_date >= ?';
    params.push(dateRange.start);
  }
  
  if (dateRange?.end) {
    queryStr += ' AND e.end_date <= ?';
    params.push(dateRange.end);
  }
  
  // Location
  if (location?.city) {
    queryStr += ' AND e.venue_city LIKE ?';
    params.push(`%${location.city}%`);
  }
  
  if (location?.state) {
    queryStr += ' AND e.venue_state LIKE ?';
    params.push(`%${location.state}%`);
  }

  queryStr += ' GROUP BY e.event_id, u.user_id';

  // Price range via HAVING
  const havingClauses = [];
  if (priceRange?.min !== undefined) {
    havingClauses.push('min_price >= ?');
    params.push(priceRange.min);
  }
  if (priceRange?.max !== undefined) {
    havingClauses.push('max_price <= ?');
    params.push(priceRange.max);
  }
  if (havingClauses.length) queryStr += ' HAVING ' + havingClauses.join(' AND ');
  
  // Availability
  if (availability === 'available') {
    queryStr += havingClauses.length ? ' AND e.available_seats > 0' : ' HAVING e.available_seats > 0';
  } else if (availability === 'soldOut') {
    queryStr += havingClauses.length ? ' AND e.available_seats = 0' : ' HAVING e.available_seats = 0';
  }
  
  const validSortFields = ['start_date', 'end_date', 'created_at'];
  const sortField = validSortFields.includes(sortBy) ? `e.${sortBy}` : 'e.start_date';
  const sortDirection = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  
  queryStr += ` ORDER BY ${sortField} ${sortDirection}`;
  queryStr += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const [events] = await pool.query(queryStr, params);
  
  // Get total count
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM events WHERE status = ?',
    ['published']
  );
  
  return {
    events: events.map(e => ({
      id: e.event_id,
      title: e.title,
      description: e.description,
      startDate: e.start_date,
      endDate: e.end_date,
      type: e.type,
      category: e.category,
      venueName: e.venue_name,
      venueCity: e.venue_city,
      venueState: e.venue_state,
      minPrice: e.min_price,
      maxPrice: e.max_price,
      availableSeats: e.available_seats,
      totalSeats: e.total_seats,
      banner: e.banner,
      organizer: {
        name: e.organizer_name,
        email: e.organizer_email,
        phone: e.organizer_phone
      }
    })),
    pagination: {
      page,
      limit,
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  };
};

const autocomplete = async (filters = {}) => {
  const pool = getMySQLPool();
  
  const { q, type } = filters;
  
  if (!q || q.length < 2) {
    return { results: [] };
  }
  
  const results = {
    events: [],
    organizers: [],
    categories: [],
    locations: []
  };
  
  // Search events
  if (!type || type === 'events') {
    const [events] = await pool.query(
      `SELECT event_id as id, title as name, banner, start_date
       FROM events 
       WHERE status = 'published' AND title LIKE ?
       ORDER BY start_date ASC
       LIMIT 5`,
      [`%${q}%`]
    );
    results.events = events;
  }
  
  // Search organizers
  if (!type || type === 'organizers') {
    const [organizers] = await pool.query(
      `SELECT user_id as id, name as name, avatar
       FROM users 
       WHERE role = 'organizer' AND name LIKE ?
       LIMIT 5`,
      [`%${q}%`]
    );
    results.organizers = organizers;
  }
  
  // Search categories
  if (!type || type === 'categories') {
    const [categories] = await pool.query(
      `SELECT DISTINCT category as name
       FROM events 
       WHERE category LIKE ?
       LIMIT 5`,
      [`%${q}%`]
    );
    results.categories = categories;
  }
  
  // Search locations
  if (!type || type === 'locations') {
    const [cities] = await pool.query(
      `SELECT DISTINCT venue_city as name
       FROM events 
       WHERE venue_city LIKE ?
       LIMIT 5`,
      [`%${q}%`]
    );
    results.locations = cities;
  }
  
  return { results };
};

module.exports = {
  searchEvents,
  searchOrganizers,
  searchUsers,
  advancedEventSearch,
  autocomplete
};
