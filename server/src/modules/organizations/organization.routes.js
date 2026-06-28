const express = require('express');
const organizationController = require('./organization.controller');
const { authenticate, requirePermission, auditLog } = require('../../middleware/rbac');
const { validate } = require('../../validators');
const {
  createOrganizationValidator,
  updateOrganizationValidator,
  getOrganizationValidator,
  addMemberValidator,
  removeMemberValidator
} = require('./organization.validator');
const { PERMISSIONS } = require('../../config/permissions');

const router = express.Router();

router.use(authenticate);

router.post('/', requirePermission(PERMISSIONS.ORG_CREATE), validate(createOrganizationValidator), auditLog('org:create'), organizationController.createOrganization);
router.get('/', requirePermission(PERMISSIONS.ORG_READ), auditLog('org:list'), organizationController.getAllOrganizations);
router.get('/:id', validate(getOrganizationValidator), auditLog('org:read'), organizationController.getOrganizationById);
router.put('/:id', requirePermission(PERMISSIONS.ORG_UPDATE), validate(updateOrganizationValidator), auditLog('org:update'), organizationController.updateOrganization);
router.delete('/:id', requirePermission(PERMISSIONS.ORG_DELETE), validate(getOrganizationValidator), auditLog('org:delete'), organizationController.deleteOrganization);

router.get('/:id/members', validate(getOrganizationValidator), organizationController.getMembers);
router.post('/:id/members', requirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS), validate(addMemberValidator), auditLog('org:add_member'), organizationController.addMember);
router.delete('/:id/members/:memberId', requirePermission(PERMISSIONS.ORG_MANAGE_MEMBERS), validate(removeMemberValidator), auditLog('org:remove_member'), organizationController.removeMember);

module.exports = router;
