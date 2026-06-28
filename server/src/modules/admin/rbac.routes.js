const express = require('express');
const permissionService = require('../../services/permission.service');
const userGroupService = require('../../services/user-group.service');
const { authenticate, authorize } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);

// ==================== PERMISSIONS ====================

// Get all permissions
router.get('/permissions', async (req, res, next) => {
  try {
    const { module } = req.query;
    const permissions = await permissionService.getAllPermissions(module);
    res.status(200).json({ status: 'success', data: permissions });
  } catch (error) {
    next(error);
  }
});

// Get permissions grouped by module
router.get('/permissions/by-module', async (req, res, next) => {
  try {
    const permissions = await permissionService.getPermissionsByModule();
    res.status(200).json({ status: 'success', data: permissions });
  } catch (error) {
    next(error);
  }
});

// Get user's permissions
router.get('/permissions/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const permissions = await permissionService.getUserPermissions(userId);
    res.status(200).json({ status: 'success', data: permissions });
  } catch (error) {
    next(error);
  }
});

// Assign permission to user
router.post('/permissions/user/assign', async (req, res, next) => {
  try {
    const { userId, permissionId } = req.body;
    const result = await permissionService.assignPermissionToUser(
      userId,
      permissionId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Revoke permission from user
router.post('/permissions/user/revoke', async (req, res, next) => {
  try {
    const { userId, permissionId } = req.body;
    const result = await permissionService.revokePermissionFromUser(
      userId,
      permissionId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Assign permission to group
router.post('/permissions/group/assign', async (req, res, next) => {
  try {
    const { groupId, permissionId } = req.body;
    const result = await permissionService.assignPermissionToGroup(
      groupId,
      permissionId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Revoke permission from group
router.post('/permissions/group/revoke', async (req, res, next) => {
  try {
    const { groupId, permissionId } = req.body;
    const result = await permissionService.revokePermissionFromGroup(
      groupId,
      permissionId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Delegate to admin (super_admin only)
router.post('/permissions/delegate', authorize('super_admin'), async (req, res, next) => {
  try {
    const { adminUserId, permissions } = req.body;
    const result = await permissionService.delegateToAdmin(
      adminUserId,
      permissions,
      req.user.id
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Revoke delegation (super_admin only)
router.post('/permissions/delegate/revoke', authorize('super_admin'), async (req, res, next) => {
  try {
    const { adminUserId } = req.body;
    const result = await permissionService.revokeDelegation(adminUserId, req.user.id);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Get all delegations (super_admin only)
router.get('/permissions/delegations', authorize('super_admin'), async (req, res, next) => {
  try {
    const delegations = await permissionService.getAllDelegations();
    res.status(200).json({ status: 'success', data: delegations });
  } catch (error) {
    next(error);
  }
});

// Get audit logs
router.get('/permissions/audit-logs', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { targetType, targetId, performedBy, limit, offset } = req.query;
    const logs = await permissionService.getAuditLogs({
      targetType,
      targetId: targetId ? parseInt(targetId) : undefined,
      performedBy: performedBy ? parseInt(performedBy) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    res.status(200).json({ status: 'success', data: logs });
  } catch (error) {
    next(error);
  }
});

// ==================== USER GROUPS ====================

// Create user group
router.post('/groups', async (req, res, next) => {
  try {
    const result = await userGroupService.createGroup(req.body, req.user.id, req.user.role);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Get all groups
router.get('/groups', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await userGroupService.getAllGroups(parseInt(page), parseInt(limit));
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Get group by ID
router.get('/groups/:groupId', async (req, res, next) => {
  try {
    const group = await userGroupService.getGroupById(req.params.groupId);
    res.status(200).json({ status: 'success', data: group });
  } catch (error) {
    next(error);
  }
});

// Update group
router.put('/groups/:groupId', async (req, res, next) => {
  try {
    const result = await userGroupService.updateGroup(
      req.params.groupId,
      req.body,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Delete group
router.delete('/groups/:groupId', async (req, res, next) => {
  try {
    const result = await userGroupService.deleteGroup(
      req.params.groupId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Add user to group
router.post('/groups/:groupId/members', async (req, res, next) => {
  try {
    const { userId } = req.body;
    const result = await userGroupService.addUserToGroup(
      req.params.groupId,
      userId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Remove user from group
router.delete('/groups/:groupId/members/:userId', async (req, res, next) => {
  try {
    const result = await userGroupService.removeUserFromGroup(
      req.params.groupId,
      req.params.userId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Get group members
router.get('/groups/:groupId/members', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await userGroupService.getGroupMembers(
      req.params.groupId,
      parseInt(page),
      parseInt(limit)
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

// Get user's groups
router.get('/users/:userId/groups', async (req, res, next) => {
  try {
    const groups = await userGroupService.getUserGroups(req.params.userId);
    res.status(200).json({ status: 'success', data: groups });
  } catch (error) {
    next(error);
  }
});

// Bulk add users to group
router.post('/groups/:groupId/members/bulk', async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const result = await userGroupService.bulkAddUsersToGroup(
      req.params.groupId,
      userIds,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
