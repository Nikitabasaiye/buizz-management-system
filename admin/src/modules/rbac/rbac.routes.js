const express = require('express');
const { authenticate, authorize } = require('../../middleware/rbac');
const permissionService = require('../../services/permission.service');
const userGroupService = require('../../services/user-group.service');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// ===== Permissions =====
router.get('/permissions', async (req, res, next) => {
  try {
    const permissions = await permissionService.getAllPermissions();
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
});

router.get('/permissions/user/:userId', async (req, res, next) => {
  try {
    const permissions = await permissionService.getUserPermissions(req.params.userId);
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
});

router.post('/permissions/assign', async (req, res, next) => {
  try {
    await permissionService.assignPermissionToUser(req.body.userId, req.body.permissionId);
    res.json({ success: true, message: 'Permission assigned successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/permissions/revoke', async (req, res, next) => {
  try {
    await permissionService.revokePermissionFromUser(req.body.userId, req.body.permissionId);
    res.json({ success: true, message: 'Permission revoked successfully' });
  } catch (error) {
    next(error);
  }
});

// ===== Groups =====
router.get('/groups', async (req, res, next) => {
  try {
    const groups = await userGroupService.getAllGroups();
    res.json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
});

router.post('/groups', async (req, res, next) => {
  try {
    const group = await userGroupService.createGroup(req.body);
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
});

router.post('/groups/:groupId/members', async (req, res, next) => {
  try {
    await userGroupService.addMember(req.params.groupId, req.body.userId);
    res.json({ success: true, message: 'Member added to group' });
  } catch (error) {
    next(error);
  }
});

router.delete('/groups/:groupId/members/:userId', async (req, res, next) => {
  try {
    await userGroupService.removeMember(req.params.groupId, req.params.userId);
    res.json({ success: true, message: 'Member removed from group' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
