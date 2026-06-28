const { getMySQLPool } = require('../database/mysql');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class PermissionService {
  // Check if user has permission management delegation
  async hasDelegation(userId) {
    const pool = getMySQLPool();
    const [delegations] = await pool.query(
      'SELECT * FROM permission_delegations WHERE delegated_to = ? AND is_active = 1',
      [userId]
    );
    return delegations.length > 0 ? delegations[0] : null;
  }

  // Check if user can manage permissions (super_admin or delegated admin)
  async canManagePermissions(userId, userRole) {
    if (userRole === 'super_admin') return true;
    if (userRole === 'admin') {
      const delegation = await this.hasDelegation(userId);
      return delegation && delegation.can_assign_permissions;
    }
    return false;
  }

  // Get all available permissions
  async getAllPermissions(module = null) {
    const pool = getMySQLPool();
    let query = 'SELECT * FROM permissions WHERE is_active = 1';
    const params = [];

    if (module) {
      query += ' AND module = ?';
      params.push(module);
    }

    query += ' ORDER BY module, name';
    const [permissions] = await pool.query(query, params);
    return permissions;
  }

  // Get permissions by module
  async getPermissionsByModule() {
    const pool = getMySQLPool();
    const [permissions] = await pool.query(
      'SELECT * FROM permissions WHERE is_active = 1 ORDER BY module, name'
    );

    const grouped = {};
    permissions.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });

    return grouped;
  }

  // Get user's effective permissions (direct + group permissions)
  async getUserPermissions(userId) {
    const pool = getMySQLPool();
    
    // Get direct permissions
    const [directPerms] = await pool.query(
      `SELECT p.* FROM permissions p
       JOIN user_permissions up ON p.permission_id = up.permission_id
       WHERE up.user_id = ? AND p.is_active = 1`,
      [userId]
    );

    // Get group permissions
    const [groupPerms] = await pool.query(
      `SELECT DISTINCT p.* FROM permissions p
       JOIN user_group_permissions ugp ON p.permission_id = ugp.permission_id
       JOIN user_group_members ugm ON ugp.group_id = ugm.group_id
       WHERE ugm.user_id = ? AND p.is_active = 1`,
      [userId]
    );

    // Combine and deduplicate
    const allPerms = [...directPerms, ...groupPerms];
    const uniquePerms = Array.from(
      new Map(allPerms.map(p => [p.permission_id, p])).values()
    );

    return uniquePerms;
  }

  // Check if user has specific permission
  async userHasPermission(userId, permissionName) {
    const pool = getMySQLPool();
    
    // Check direct permission
    const [directPerm] = await pool.query(
      `SELECT 1 FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.permission_id
       WHERE up.user_id = ? AND p.name = ? AND p.is_active = 1
       LIMIT 1`,
      [userId, permissionName]
    );

    if (directPerm.length > 0) return true;

    // Check group permission
    const [groupPerm] = await pool.query(
      `SELECT 1 FROM user_group_permissions ugp
       JOIN user_group_members ugm ON ugp.group_id = ugm.group_id
       JOIN permissions p ON ugp.permission_id = p.permission_id
       WHERE ugm.user_id = ? AND p.name = ? AND p.is_active = 1
       LIMIT 1`,
      [userId, permissionName]
    );

    return groupPerm.length > 0;
  }

  // Assign permission to user
  async assignPermissionToUser(userId, permissionId, grantedBy, grantedByRole) {
    const canManage = await this.canManagePermissions(grantedBy, grantedByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to assign permissions', 403);
    }

    const pool = getMySQLPool();

    // Check if permission exists
    const [permissions] = await pool.query(
      'SELECT * FROM permissions WHERE permission_id = ? AND is_active = 1',
      [permissionId]
    );

    if (permissions.length === 0) {
      throw new AppError('Permission not found', 404);
    }

    // Check if already assigned
    const [existing] = await pool.query(
      'SELECT * FROM user_permissions WHERE user_id = ? AND permission_id = ?',
      [userId, permissionId]
    );

    if (existing.length > 0) {
      throw new AppError('Permission already assigned to user', 400);
    }

    // Assign permission
    await pool.execute(
      'INSERT INTO user_permissions (user_id, permission_id, granted_by) VALUES (?, ?, ?)',
      [userId, permissionId, grantedBy]
    );

    // Audit log
    await this.logPermissionChange('grant', 'user', userId, permissionId, permissions[0].name, grantedBy);

    logger.info('Permission assigned to user', { userId, permissionId, grantedBy });
    return { success: true, message: 'Permission assigned successfully' };
  }

  // Revoke permission from user
  async revokePermissionFromUser(userId, permissionId, revokedBy, revokedByRole) {
    const canManage = await this.canManagePermissions(revokedBy, revokedByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to revoke permissions', 403);
    }

    const pool = getMySQLPool();

    // Get permission name for audit
    const [permissions] = await pool.query(
      'SELECT name FROM permissions WHERE permission_id = ?',
      [permissionId]
    );

    const result = await pool.execute(
      'DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?',
      [userId, permissionId]
    );

    if (result[0].affectedRows === 0) {
      throw new AppError('Permission not found for this user', 404);
    }

    // Audit log
    await this.logPermissionChange('revoke', 'user', userId, permissionId, 
      permissions[0]?.name, revokedBy);

    logger.info('Permission revoked from user', { userId, permissionId, revokedBy });
    return { success: true, message: 'Permission revoked successfully' };
  }

  // Assign permission to group
  async assignPermissionToGroup(groupId, permissionId, grantedBy, grantedByRole) {
    const canManage = await this.canManagePermissions(grantedBy, grantedByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to assign permissions', 403);
    }

    const pool = getMySQLPool();

    // Check if already assigned
    const [existing] = await pool.query(
      'SELECT * FROM user_group_permissions WHERE group_id = ? AND permission_id = ?',
      [groupId, permissionId]
    );

    if (existing.length > 0) {
      throw new AppError('Permission already assigned to group', 400);
    }

    // Assign permission
    await pool.execute(
      'INSERT INTO user_group_permissions (group_id, permission_id, granted_by) VALUES (?, ?, ?)',
      [groupId, permissionId, grantedBy]
    );

    // Audit log
    const [permissions] = await pool.query('SELECT name FROM permissions WHERE permission_id = ?', [permissionId]);
    await this.logPermissionChange('grant', 'group', groupId, permissionId, permissions[0]?.name, grantedBy);

    logger.info('Permission assigned to group', { groupId, permissionId, grantedBy });
    return { success: true, message: 'Permission assigned to group successfully' };
  }

  // Revoke permission from group
  async revokePermissionFromGroup(groupId, permissionId, revokedBy, revokedByRole) {
    const canManage = await this.canManagePermissions(revokedBy, revokedByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to revoke permissions', 403);
    }

    const pool = getMySQLPool();

    const result = await pool.execute(
      'DELETE FROM user_group_permissions WHERE group_id = ? AND permission_id = ?',
      [groupId, permissionId]
    );

    if (result[0].affectedRows === 0) {
      throw new AppError('Permission not found for this group', 404);
    }

    // Audit log
    const [permissions] = await pool.query('SELECT name FROM permissions WHERE permission_id = ?', [permissionId]);
    await this.logPermissionChange('revoke', 'group', groupId, permissionId, permissions[0]?.name, revokedBy);

    logger.info('Permission revoked from group', { groupId, permissionId, revokedBy });
    return { success: true, message: 'Permission revoked from group successfully' };
  }

  // Delegate permission management to admin
  async delegateToAdmin(adminUserId, permissions, delegatedBy) {
    const pool = getMySQLPool();

    // Check if admin user exists and is an admin
    const [users] = await pool.query(
      'SELECT * FROM users WHERE user_id = ? AND role = ? AND is_active = 1',
      [adminUserId, 'admin']
    );

    if (users.length === 0) {
      throw new AppError('Admin user not found', 404);
    }

    // Check if already delegated
    const [existing] = await pool.query(
      'SELECT * FROM permission_delegations WHERE delegated_to = ? AND is_active = 1',
      [adminUserId]
    );

    if (existing.length > 0) {
      // Update existing delegation
      await pool.execute(
        `UPDATE permission_delegations 
         SET can_assign_permissions = ?, can_create_groups = ?, can_manage_users = ?
         WHERE delegated_to = ?`,
        [
          permissions.canAssignPermissions ? 1 : 0,
          permissions.canCreateGroups ? 1 : 0,
          permissions.canManageUsers ? 1 : 0,
          adminUserId
        ]
      );
    } else {
      // Create new delegation
      await pool.execute(
        `INSERT INTO permission_delegations (delegated_to, can_assign_permissions, can_create_groups, can_manage_users, delegated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          adminUserId,
          permissions.canAssignPermissions ? 1 : 0,
          permissions.canCreateGroups ? 1 : 0,
          permissions.canManageUsers ? 1 : 0,
          delegatedBy
        ]
      );
    }

    // Audit log
    await this.logPermissionChange('delegate', 'admin', adminUserId, null, null, delegatedBy, { permissions });

    logger.info('Permission management delegated to admin', { adminUserId, delegatedBy });
    return { success: true, message: 'Permissions delegated successfully' };
  }

  // Revoke delegation from admin
  async revokeDelegation(adminUserId, revokedBy) {
    const pool = getMySQLPool();

    const result = await pool.execute(
      'UPDATE permission_delegations SET is_active = 0, revoked_at = NOW() WHERE delegated_to = ?',
      [adminUserId]
    );

    if (result[0].affectedRows === 0) {
      throw new AppError('No active delegation found for this admin', 404);
    }

    // Audit log
    await this.logPermissionChange('revoke_delegation', 'admin', adminUserId, null, null, revokedBy);

    logger.info('Delegation revoked from admin', { adminUserId, revokedBy });
    return { success: true, message: 'Delegation revoked successfully' };
  }

  // Get all delegations
  async getAllDelegations() {
    const pool = getMySQLPool();
    const [delegations] = await pool.query(
      `SELECT pd.*, u.name as admin_name, u.email as admin_email
       FROM permission_delegations pd
       JOIN users u ON pd.delegated_to = u.user_id
       WHERE pd.is_active = 1`
    );
    return delegations;
  }

  // Log permission changes
  async logPermissionChange(action, targetType, targetId, permissionId, permissionName, performedBy, details = null) {
    const pool = getMySQLPool();
    await pool.execute(
      `INSERT INTO permission_audit_logs (action, target_type, target_id, permission_id, permission_name, performed_by, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [action, targetType, targetId, permissionId, permissionName, performedBy, JSON.stringify(details)]
    );
  }

  // Get permission audit logs
  async getAuditLogs(filters = {}) {
    const pool = getMySQLPool();
    const { targetType, targetId, performedBy, limit = 50, offset = 0 } = filters;

    let query = `
      SELECT pal.*, u.name as performed_by_name, u.email as performed_by_email
      FROM permission_audit_logs pal
      JOIN users u ON pal.performed_by = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (targetType) {
      query += ' AND pal.target_type = ?';
      params.push(targetType);
    }

    if (targetId) {
      query += ' AND pal.target_id = ?';
      params.push(targetId);
    }

    if (performedBy) {
      query += ' AND pal.performed_by = ?';
      params.push(performedBy);
    }

    query += ' ORDER BY pal.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [logs] = await pool.query(query, params);
    return logs;
  }
}

module.exports = new PermissionService();
