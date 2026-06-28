const { getMySQLPool } = require('../database/mysql');
const { AppError } = require('../middleware/errorHandler');
const permissionService = require('./permission.service');
const logger = require('../utils/logger');

class UserGroupService {
  // Check if user can manage groups
  async canManageGroups(userId, userRole) {
    if (userRole === 'super_admin') return true;
    if (userRole === 'admin') {
      const delegation = await permissionService.hasDelegation(userId);
      return delegation && delegation.can_create_groups;
    }
    return false;
  }

  // Create user group
  async createGroup(groupData, createdBy, createdByRole) {
    const canManage = await this.canManageGroups(createdBy, createdByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to create groups', 403);
    }

    const pool = getMySQLPool();
    const { name, description } = groupData;

    // Check if group name already exists
    const [existing] = await pool.query(
      'SELECT * FROM user_groups WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      throw new AppError('Group name already exists', 400);
    }

    const [result] = await pool.execute(
      'INSERT INTO user_groups (name, description, created_by) VALUES (?, ?, ?)',
      [name, description || null, createdBy]
    );

    logger.info('User group created', { groupId: result.insertId, name, createdBy });
    
    return {
      groupId: result.insertId,
      name,
      description,
      createdBy
    };
  }

  // Get all groups
  async getAllGroups(page = 1, limit = 20) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    const [groups] = await pool.query(
      `SELECT ug.*, u.name as created_by_name, u.email as created_by_email,
       (SELECT COUNT(*) FROM user_group_members WHERE group_id = ug.group_id) as member_count,
       (SELECT COUNT(*) FROM user_group_permissions WHERE group_id = ug.group_id) as permission_count
       FROM user_groups ug
       JOIN users u ON ug.created_by = u.user_id
       WHERE ug.is_active = 1
       ORDER BY ug.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return { groups, page, limit };
  }

  // Get group by ID
  async getGroupById(groupId) {
    const pool = getMySQLPool();

    const [groups] = await pool.query(
      `SELECT ug.*, u.name as created_by_name, u.email as created_by_email
       FROM user_groups ug
       JOIN users u ON ug.created_by = u.user_id
       WHERE ug.group_id = ? AND ug.is_active = 1`,
      [groupId]
    );

    if (groups.length === 0) {
      throw new AppError('Group not found', 404);
    }

    const group = groups[0];

    // Get members
    const [members] = await pool.query(
      `SELECT ugm.*, u.name, u.email, u.role
       FROM user_group_members ugm
       JOIN users u ON ugm.user_id = u.user_id
       WHERE ugm.group_id = ?`,
      [groupId]
    );

    // Get permissions
    const [permissions] = await pool.query(
      `SELECT p.*, ugp.granted_by, ugp.granted_at
       FROM user_group_permissions ugp
       JOIN permissions p ON ugp.permission_id = p.permission_id
       WHERE ugp.group_id = ? AND p.is_active = 1`,
      [groupId]
    );

    group.members = members;
    group.permissions = permissions;

    return group;
  }

  // Update group
  async updateGroup(groupId, updateData, updatedBy, updatedByRole) {
    const canManage = await this.canManageGroups(updatedBy, updatedByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to update groups', 403);
    }

    const pool = getMySQLPool();
    const { name, description, isActive } = updateData;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new AppError('No updates provided', 400);
    }

    params.push(groupId);

    await pool.execute(
      `UPDATE user_groups SET ${updates.join(', ')} WHERE group_id = ?`,
      params
    );

    logger.info('User group updated', { groupId, updatedBy });
    return { success: true, message: 'Group updated successfully' };
  }

  // Delete group
  async deleteGroup(groupId, deletedBy, deletedByRole) {
    const canManage = await this.canManageGroups(deletedBy, deletedByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to delete groups', 403);
    }

    const pool = getMySQLPool();

    await pool.execute(
      'UPDATE user_groups SET is_active = 0 WHERE group_id = ?',
      [groupId]
    );

    logger.info('User group deleted', { groupId, deletedBy });
    return { success: true, message: 'Group deleted successfully' };
  }

  // Add user to group
  async addUserToGroup(groupId, userId, addedBy, addedByRole) {
    const canManage = await this.canManageGroups(addedBy, addedByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to manage group members', 403);
    }

    const pool = getMySQLPool();

    // Check if group exists
    const [groups] = await pool.query(
      'SELECT * FROM user_groups WHERE group_id = ? AND is_active = 1',
      [groupId]
    );

    if (groups.length === 0) {
      throw new AppError('Group not found', 404);
    }

    // Check if user exists
    const [users] = await pool.query(
      'SELECT * FROM users WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    if (users.length === 0) {
      throw new AppError('User not found', 404);
    }

    // Check if already a member
    const [existing] = await pool.query(
      'SELECT * FROM user_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (existing.length > 0) {
      throw new AppError('User is already a member of this group', 400);
    }

    // Add user to group
    await pool.execute(
      'INSERT INTO user_group_members (group_id, user_id, added_by) VALUES (?, ?, ?)',
      [groupId, userId, addedBy]
    );

    logger.info('User added to group', { groupId, userId, addedBy });
    return { success: true, message: 'User added to group successfully' };
  }

  // Remove user from group
  async removeUserFromGroup(groupId, userId, removedBy, removedByRole) {
    const canManage = await this.canManageGroups(removedBy, removedByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to manage group members', 403);
    }

    const pool = getMySQLPool();

    const result = await pool.execute(
      'DELETE FROM user_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (result[0].affectedRows === 0) {
      throw new AppError('User is not a member of this group', 404);
    }

    logger.info('User removed from group', { groupId, userId, removedBy });
    return { success: true, message: 'User removed from group successfully' };
  }

  // Get user's groups
  async getUserGroups(userId) {
    const pool = getMySQLPool();

    const [groups] = await pool.query(
      `SELECT ug.*, ugm.added_at
       FROM user_groups ug
       JOIN user_group_members ugm ON ug.group_id = ugm.group_id
       WHERE ugm.user_id = ? AND ug.is_active = 1
       ORDER BY ugm.added_at DESC`,
      [userId]
    );

    return groups;
  }

  // Get group members
  async getGroupMembers(groupId, page = 1, limit = 20) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    const [members] = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.role, u.avatar, ugm.added_at,
       added_by_user.name as added_by_name
       FROM user_group_members ugm
       JOIN users u ON ugm.user_id = u.user_id
       LEFT JOIN users added_by_user ON ugm.added_by = added_by_user.user_id
       WHERE ugm.group_id = ?
       ORDER BY ugm.added_at DESC
       LIMIT ? OFFSET ?`,
      [groupId, limit, offset]
    );

    return { members, page, limit };
  }

  // Bulk add users to group
  async bulkAddUsersToGroup(groupId, userIds, addedBy, addedByRole) {
    const canManage = await this.canManageGroups(addedBy, addedByRole);
    if (!canManage) {
      throw new AppError('You do not have permission to manage group members', 403);
    }

    const pool = getMySQLPool();
    const added = [];
    const failed = [];

    for (const userId of userIds) {
      try {
        await this.addUserToGroup(groupId, userId, addedBy, addedByRole);
        added.push(userId);
      } catch (error) {
        failed.push({ userId, error: error.message });
      }
    }

    logger.info('Bulk users added to group', { groupId, added: added.length, failed: failed.length });
    return { added, failed };
  }
}

module.exports = new UserGroupService();
