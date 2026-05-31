const { getMySQLPool } = require('../../database/mysql');

const selectColumns = `
  id, ticket_number, event_id, user_id, payment_id, ticket_type, price,
  qr_code, status, scanned_at, scanned_by, created_at, updated_at
`;

const getPool = () => {
  const pool = getMySQLPool();
  if (!pool) {
    throw new Error('MySQL is not connected.');
  }

  return pool;
};

const mapTicket = (row) => {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    ticketNumber: row.ticket_number,
    eventId: row.event_id,
    userId: row.user_id,
    paymentId: row.payment_id,
    ticketType: row.ticket_type,
    price: Number(row.price),
    qrCode: row.qr_code,
    status: row.status,
    scannedAt: row.scanned_at,
    scannedBy: row.scanned_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findAll = async (filters = {}) => {
  const { page = 1, limit = 20, eventId, userId, status } = filters;
  const currentPage = Number(page);
  const pageSize = Number(limit);
  const offset = (currentPage - 1) * pageSize;
  const conditions = [];
  const values = [];

  if (eventId) {
    conditions.push('event_id = ?');
    values.push(eventId);
  }

  if (userId) {
    conditions.push('user_id = ?');
    values.push(userId);
  }

  if (status) {
    conditions.push('status = ?');
    values.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const pool = getPool();
  const [tickets] = await pool.execute(
    `SELECT ${selectColumns} FROM tickets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM tickets ${where}`, values);
  const total = Number(countRows[0].total);

  return {
    tickets: tickets.map((ticket) => mapTicket(ticket)),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize)
    }
  };
};

module.exports = {
  findAll
};
