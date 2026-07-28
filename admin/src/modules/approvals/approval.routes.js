const express = require('express');
const { getMySQLPool } = require('../../database/mysql');
const { authenticate, authorize } = require('../../middleware/rbac');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await listRequests({ page: Number(page), limit: Number(limit), status });
    res.json({ success: true, data: result.requests, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const pool = getMySQLPool();
    const [stats] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM event_approval_requests
       GROUP BY status`
    );

    const data = { pending: 0, approved: 0, rejected: 0 };
    stats.forEach((row) => {
      data[row.status] = row.count;
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/my-requests', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await listRequests({ page: Number(page), limit: Number(limit), organizerId: req.user.id });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const request = await getRequestById(req.params.id);
    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/admin-review', authorize('admin'), async (req, res, next) => {
  try {
    const { status, comments } = req.body;
    const result = await reviewRequest({
      requestId: req.params.id,
      reviewerId: req.user.id,
      reviewerColumn: 'admin_id',
      statusColumn: 'admin_status',
      status,
      comments,
    });

    res.json({ success: true, message: result.message, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/super-admin-review', authorize('super_admin'), async (req, res, next) => {
  try {
    const { status, comments } = req.body;
    const result = await reviewRequest({
      requestId: req.params.id,
      reviewerId: req.user.id,
      reviewerColumn: 'super_admin_id',
      statusColumn: 'super_admin_status',
      status,
      comments,
    });

    res.json({ success: true, message: result.message, data: result });
  } catch (error) {
    next(error);
  }
});

async function listRequests({ page = 1, limit = 20, status, organizerId }) {
  const pool = getMySQLPool();
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (status) {
    where += ' AND ear.status = ?';
    params.push(status);
  }
  if (organizerId) {
    where += ' AND ear.organizer_id = ?';
    params.push(organizerId);
  }

  const [requests] = await pool.query(
    `SELECT ear.*, u.name AS organizer_name, u.email AS organizer_email, e.title AS event_title
     FROM event_approval_requests ear
     LEFT JOIN users u ON ear.organizer_id = u.user_id
     LEFT JOIN events e ON ear.event_id = e.event_id
     ${where}
     ORDER BY ear.requested_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[count]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM event_approval_requests ear
     ${where}`,
    params
  );

  return {
    requests: requests.map(mapApprovalRow),
    pagination: { page, limit, total: count.total, pages: Math.ceil(count.total / limit) },
  };
}

async function getRequestById(id) {
  const pool = getMySQLPool();
  const [requests] = await pool.query(
    `SELECT ear.*, u.name AS organizer_name, u.email AS organizer_email, e.title AS event_title
     FROM event_approval_requests ear
     LEFT JOIN users u ON ear.organizer_id = u.user_id
     LEFT JOIN events e ON ear.event_id = e.event_id
     WHERE ear.id = ?`,
    [id]
  );

  if (!requests.length) throw new AppError('Approval request not found', 404);
  return mapApprovalRow(requests[0]);
}

async function reviewRequest({ requestId, reviewerId, reviewerColumn, statusColumn, status, comments }) {
  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('Invalid status. Must be "approved" or "rejected"', 400);
  }

  const pool = getMySQLPool();
  const request = await getRequestById(requestId);

  if (status === 'rejected') {
    await pool.execute(
      `UPDATE event_approval_requests
       SET status = 'rejected', ${statusColumn} = 'rejected', ${reviewerColumn} = ?, rejection_reason = ?, processed_at = NOW()
       WHERE id = ?`,
      [reviewerId, comments || null, requestId]
    );
    return { requestId, message: 'Approval request rejected.' };
  }

  await pool.execute(
    `UPDATE event_approval_requests
     SET ${statusColumn} = 'approved', ${reviewerColumn} = ?
     WHERE id = ?`,
    [reviewerId, requestId]
  );

  const updated = await getRequestById(requestId);
  if (updated.adminStatus === 'approved' && updated.superAdminStatus === 'approved') {
    await pool.execute(
      `UPDATE event_approval_requests
       SET status = 'approved', processed_at = NOW()
       WHERE id = ?`,
      [requestId]
    );
  }

  return {
    requestId,
    actionType: request.actionType,
    message:
      updated.adminStatus === 'approved' && updated.superAdminStatus === 'approved'
        ? 'Approval request approved.'
        : 'Approval request updated successfully.',
  };
}

function mapApprovalRow(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    organizerEmail: row.organizer_email,
    actionType: row.action_type,
    requestData: parseJson(row.request_data, null),
    status: row.status,
    adminId: row.admin_id,
    superAdminId: row.super_admin_id,
    adminStatus: row.admin_status,
    superAdminStatus: row.super_admin_status,
    rejectionReason: row.rejection_reason,
    requestedAt: row.requested_at,
    processedAt: row.processed_at,
  };
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = router;
