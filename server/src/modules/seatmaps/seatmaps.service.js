const { AppError } = require('../../middleware/errorHandler');
const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');

/**
 * Seat Map Service
 * Handles seat map templates, overrides, and seat management for events
 */

const createSeatMapTemplate = async (templateData) => {
  const pool = getMySQLPool();
  
  const { name, description, layout, rows, columns, seat_types = [], is_active = true } = templateData;
  
  if (!name || !rows || !columns) {
    throw new AppError('Template name, rows, and columns are required', 400);
  }
  
  const [result] = await pool.execute(
    `INSERT INTO seat_map_templates (name, description, layout, \`rows\`, columns, seat_types, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, description || null, JSON.stringify(layout), rows, columns, JSON.stringify(seat_types), is_active ? 1 : 0]
  );
  
  return {
    id: result.insertId,
    name,
    description,
    layout,
    rows,
    columns,
    seat_types,
    is_active
  };
};

const getSeatMapTemplate = async (id) => {
  const pool = getMySQLPool();
  const [templates] = await pool.query(
    'SELECT * FROM seat_map_templates WHERE id = ?',
    [id]
  );
  
  if (!templates[0]) {
    throw new AppError('Seat map template not found', 404);
  }
  
  const template = templates[0];
  return {
    ...template,
    layout: template.layout ? JSON.parse(template.layout) : null,
    seat_types: template.seat_types ? JSON.parse(template.seat_types) : []
  };
};

const updateSeatMapTemplate = async (id, updateData) => {
  const pool = getMySQLPool();
  
  const [existing] = await pool.query(
    'SELECT * FROM seat_map_templates WHERE id = ?',
    [id]
  );
  
  if (!existing[0]) {
    throw new AppError('Seat map template not found', 404);
  }
  
  const updateFields = {};
  if (updateData.name !== undefined) updateFields.name = updateData.name;
  if (updateData.description !== undefined) updateFields.description = updateData.description;
  if (updateData.layout !== undefined) updateFields.layout = JSON.stringify(updateData.layout);
  if (updateData.rows !== undefined) updateFields.rows = updateData.rows;
  if (updateData.columns !== undefined) updateFields.columns = updateData.columns;
  if (updateData.seat_types !== undefined) updateFields.seat_types = JSON.stringify(updateData.seat_types);
  if (updateData.is_active !== undefined) updateFields.is_active = updateData.is_active ? 1 : 0;
  
  const setClause = Object.keys(updateFields).map(k => `\`${k}\` = ?`).join(', ');
  const values = [...Object.values(updateFields), id];
  
  await pool.execute(`UPDATE seat_map_templates SET ${setClause} WHERE id = ?`, values);
  
  return getSeatMapTemplate(id);
};

const deleteSeatMapTemplate = async (id) => {
  const pool = getMySQLPool();
  
  const [existing] = await pool.query(
    'SELECT * FROM seat_map_templates WHERE id = ?',
    [id]
  );
  
  if (!existing[0]) {
    throw new AppError('Seat map template not found', 404);
  }
  
  // Check if template is in use
  const [inUse] = await pool.query(
    'SELECT COUNT(*) as count FROM events WHERE seat_map_template_id = ?',
    [id]
  );
  
  if (inUse[0].count > 0) {
    throw new AppError('Cannot delete template - it is in use by one or more events', 400);
  }
  
  await pool.execute('DELETE FROM seat_map_templates WHERE id = ?', [id]);
  return { message: 'Template deleted successfully' };
};

const listSeatMapTemplates = async (filters = {}) => {
  const pool = getMySQLPool();
  
  let query = 'SELECT * FROM seat_map_templates WHERE 1=1';
  const params = [];
  
  if (filters.is_active !== undefined) {
    query += ' AND is_active = ?';
    params.push(filters.is_active ? 1 : 0);
  }
  
  if (filters.search) {
    query += ' AND name LIKE ?';
    params.push(`%${filters.search}%`);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const [templates] = await pool.query(query, params);
  
  return templates.map(t => ({
    ...t,
    layout: t.layout ? JSON.parse(t.layout) : null,
    seat_types: t.seat_types ? JSON.parse(t.seat_types) : []
  }));
};

const createSeatMapOverride = async (overrideData) => {
  const pool = getMySQLPool();
  
  const { event_id, template_id, custom_layout, seat_status = {} } = overrideData;
  
  if (!event_id) {
    throw new AppError('Event ID is required', 400);
  }
  
  // Check if event exists
  const [events] = await pool.query('SELECT * FROM events WHERE event_id = ?', [event_id]);
  if (!events[0]) {
    throw new AppError('Event not found', 404);
  }
  
  // Check if template exists
  if (template_id) {
    const [templates] = await pool.query('SELECT * FROM seat_map_templates WHERE id = ?', [template_id]);
    if (!templates[0]) {
      throw new AppError('Template not found', 404);
    }
  }
  
  const [result] = await pool.execute(
    `INSERT INTO seat_map_overrides (event_id, template_id, custom_layout, seat_status)
     VALUES (?, ?, ?, ?)`,
    [event_id, template_id || null, custom_layout ? JSON.stringify(custom_layout) : null, JSON.stringify(seat_status)]
  );
  
  return {
    id: result.insertId,
    event_id,
    template_id,
    custom_layout,
    seat_status
  };
};

const getSeatMapOverride = async (eventId) => {
  const pool = getMySQLPool();
  
  // Check if event exists
  const [events] = await pool.query('SELECT * FROM events WHERE event_id = ?', [eventId]);
  if (!events[0]) {
    throw new AppError('Event not found', 404);
  }
  
  const [overrides] = await pool.query(
    `SELECT o.*, t.name as template_name, t.layout as template_layout
     FROM seat_map_overrides o
     LEFT JOIN seat_map_templates t ON o.template_id = t.id
     WHERE o.event_id = ?`,
    [eventId]
  );
  
  if (!overrides[0]) {
    // Return null if no override exists
    return null;
  }
  
  const override = overrides[0];
  return {
    ...override,
    custom_layout: override.custom_layout ? JSON.parse(override.custom_layout) : null,
    seat_status: override.seat_status ? JSON.parse(override.seat_status) : {},
    template_layout: override.template_layout ? JSON.parse(override.template_layout) : null
  };
};

const updateSeatMapOverride = async (eventId, updateData) => {
  const pool = getMySQLPool();
  
  // Check if override exists
  const [existing] = await pool.query(
    'SELECT * FROM seat_map_overrides WHERE event_id = ?',
    [eventId]
  );
  
  if (!existing[0]) {
    // Create new override if none exists
    return createSeatMapOverride({ event_id: eventId, ...updateData });
  }
  
  const updateFields = {};
  if (updateData.template_id !== undefined) updateFields.template_id = updateData.template_id;
  if (updateData.custom_layout !== undefined) updateFields.custom_layout = JSON.stringify(updateData.custom_layout);
  if (updateData.seat_status !== undefined) updateFields.seat_status = JSON.stringify(updateData.seat_status);
  
  if (Object.keys(updateFields).length === 0) {
    return getSeatMapOverride(eventId);
  }
  
  const setClause = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updateFields), eventId];
  
  await pool.execute(`UPDATE seat_map_overrides SET ${setClause} WHERE event_id = ?`, values);
  
  return getSeatMapOverride(eventId);
};

const deleteSeatMapOverride = async (eventId) => {
  const pool = getMySQLPool();
  
  const [existing] = await pool.query(
    'SELECT * FROM seat_map_overrides WHERE event_id = ?',
    [eventId]
  );
  
  if (!existing[0]) {
    throw new AppError('Seat map override not found', 404);
  }
  
  await pool.execute('DELETE FROM seat_map_overrides WHERE event_id = ?', [eventId]);
  return { message: 'Override deleted successfully' };
};

const getEventSeatMap = async (eventId) => {
  const pool = getMySQLPool();
  
  // Get event
  const [events] = await pool.query(
    `SELECT e.*, o.name as organizer_name
     FROM events e
     JOIN users o ON e.organizer_id = o.user_id
     WHERE e.event_id = ?`,
    [eventId]
  );
  
  if (!events[0]) {
    throw new AppError('Event not found', 404);
  }
  
  const event = events[0];
  
  // Get override first, then fallback to template
  const override = await getSeatMapOverride(eventId);
  
  if (override) {
    return {
      event: {
        id: event.event_id,
        title: event.title,
        organizer: event.organizer_name
      },
      override: {
        id: override.id,
        template_id: override.template_id,
        custom_layout: override.custom_layout,
        seat_status: override.seat_status
      },
      template: override.template_id ? {
        id: override.template_id,
        name: override.template_name,
        layout: override.template_layout
      } : null
    };
  }
  
  // Get template from event
  if (event.seat_map_template_id) {
    const [templates] = await pool.query(
      'SELECT * FROM seat_map_templates WHERE id = ?',
      [event.seat_map_template_id]
    );
    
    if (templates[0]) {
      const template = templates[0];
      return {
        event: {
          id: event.event_id,
          title: event.title,
          organizer: event.organizer_name
        },
        override: null,
        template: {
          id: template.id,
          name: template.name,
          layout: template.layout ? JSON.parse(template.layout) : null,
          seat_types: template.seat_types ? JSON.parse(template.seat_types) : []
        }
      };
    }
  }
  
  // No seat map available
  return {
    event: {
      id: event.event_id,
      title: event.title,
      organizer: event.organizer_name
    },
    override: null,
    template: null
  };
};

const updateSeatStatus = async (eventId, seatUpdates) => {
  const pool = getMySQLPool();
  
  // Check if override exists
  const [existing] = await pool.query(
    'SELECT * FROM seat_map_overrides WHERE event_id = ?',
    [eventId]
  );
  
  if (!existing[0]) {
    throw new AppError('Seat map override not found for this event', 404);
  }
  
  const current = await getSeatMapOverride(eventId);
  const updatedStatus = { ...current.seat_status };
  
  // Apply updates
  for (const [seatId, status] of Object.entries(seatUpdates)) {
    updatedStatus[seatId] = status;
  }
  
  await pool.execute(
    'UPDATE seat_map_overrides SET seat_status = ? WHERE event_id = ?',
    [JSON.stringify(updatedStatus), eventId]
  );
  
  return {
    ...current,
    seat_status: updatedStatus
  };
};

const getAvailableSeats = async (eventId) => {
  const seatMap = await getEventSeatMap(eventId);
  
  if (!seatMap.override && !seatMap.template) {
    return { total: 0, available: 0, byType: {} };
  }
  
  const seatStatus = seatMap.override?.seat_status || {};
  const template = seatMap.template;
  
  if (!template?.layout) {
    return { total: 0, available: 0, byType: {} };
  }
  
  let total = 0;
  let available = 0;
  const byType = {};
  
  // Count seats from layout
  for (const row of template.layout) {
    for (const seat of row) {
      total++;
      
      const status = seatStatus[seat.id] || 'available';
      if (status === 'available') {
        available++;
      }
      
      // Count by type
      const seatType = seat.type || 'standard';
      if (!byType[seatType]) {
        byType[seatType] = { total: 0, available: 0 };
      }
      byType[seatType].total++;
      if (status === 'available') {
        byType[seatType].available++;
      }
    }
  }
  
  return { total, available, byType };
};

module.exports = {
  createSeatMapTemplate,
  getSeatMapTemplate,
  updateSeatMapTemplate,
  deleteSeatMapTemplate,
  listSeatMapTemplates,
  createSeatMapOverride,
  getSeatMapOverride,
  updateSeatMapOverride,
  deleteSeatMapOverride,
  getEventSeatMap,
  updateSeatStatus,
  getAvailableSeats
};
