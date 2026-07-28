const express = require('express');
const userController = require('./user.controller');
const { authenticate, requirePermission, authorizeSelfOrRoles, auditLog, userRateLimit } = require('../../middleware/rbac');
// const { validate } = require('../../validators');
const {
  updateProfileValidator,
  updateUserValidator,
  getUserValidator,
  getAllUsersValidator,
  updateRoleValidator,
  changePasswordValidator
} = require('./user.validator');
const { PERMISSIONS } = require('../../config/permissions');
const { USER_ROLES } = require('../../constants');
const { validate } = require('../../validators');

const router = express.Router();

router.use(authenticate);

router.get('/profile', auditLog('user:profile:read'), userController.getProfile);
router.put('/profile', userRateLimit(20, 60 * 60 * 1000), validate(updateProfileValidator), auditLog('user:profile:update'), userController.updateProfile);
router.put('/change-password', validate(changePasswordValidator), auditLog('user:change_password'), userController.changePassword);

router.get('/', requirePermission(PERMISSIONS.USER_LIST), validate(getAllUsersValidator), auditLog('user:list'), userController.getAllUsers);
router.get('/:id', authorizeSelfOrRoles('id', USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), validate(getUserValidator), auditLog('user:read'), userController.getUserById);
router.put('/:id', authorizeSelfOrRoles('id', USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), validate(updateUserValidator), auditLog('user:update'), userController.updateUser);
router.delete('/:id', requirePermission(PERMISSIONS.USER_DELETE), validate(getUserValidator), auditLog('user:delete'), userController.deleteUser);
router.patch('/:id/role', requirePermission(PERMISSIONS.USER_UPDATE_ROLE), validate(updateRoleValidator), auditLog('user:update_role'), userController.updateUserRole);

module.exports = router;
