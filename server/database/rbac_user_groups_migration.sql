-- Migration for User Groups and Granular Permission System

-- 1. User Groups Table
CREATE TABLE IF NOT EXISTS user_groups (
  group_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id),
  UNIQUE KEY user_groups_name_unique (name),
  KEY user_groups_created_by_index (created_by),
  KEY user_groups_is_active_index (is_active),
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Permissions Table (All available permissions in system)
CREATE TABLE IF NOT EXISTS permissions (
  permission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT 'e.g., event:create, user:read',
  display_name VARCHAR(150) NOT NULL COMMENT 'Human readable name',
  description TEXT NULL,
  module VARCHAR(50) NOT NULL COMMENT 'event, user, booking, etc.',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (permission_id),
  UNIQUE KEY permissions_name_unique (name),
  KEY permissions_module_index (module),
  KEY permissions_is_active_index (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. User Group Members Table
CREATE TABLE IF NOT EXISTS user_group_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  added_by BIGINT UNSIGNED NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY group_members_unique (group_id, user_id),
  KEY group_members_user_id_index (user_id),
  KEY group_members_group_id_index (group_id),
  FOREIGN KEY (group_id) REFERENCES user_groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Group Permissions Table (Permissions assigned to groups)
CREATE TABLE IF NOT EXISTS user_group_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NOT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY group_permissions_unique (group_id, permission_id),
  KEY group_permissions_group_id_index (group_id),
  KEY group_permissions_permission_id_index (permission_id),
  FOREIGN KEY (group_id) REFERENCES user_groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. User Permissions Table (Direct permissions to users, overrides group)
CREATE TABLE IF NOT EXISTS user_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NOT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_permissions_unique (user_id, permission_id),
  KEY user_permissions_user_id_index (user_id),
  KEY user_permissions_permission_id_index (permission_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Permission Management Delegation Table
CREATE TABLE IF NOT EXISTS permission_delegations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  delegated_to BIGINT UNSIGNED NOT NULL COMMENT 'Admin user who can manage permissions',
  can_assign_permissions TINYINT(1) NOT NULL DEFAULT 1,
  can_create_groups TINYINT(1) NOT NULL DEFAULT 1,
  can_manage_users TINYINT(1) NOT NULL DEFAULT 1,
  delegated_by BIGINT UNSIGNED NOT NULL COMMENT 'Super admin who delegated',
  delegated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY delegations_user_unique (delegated_to),
  KEY delegations_delegated_by_index (delegated_by),
  KEY delegations_is_active_index (is_active),
  FOREIGN KEY (delegated_to) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (delegated_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Permission Change Audit Table
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action ENUM('grant', 'revoke', 'delegate', 'revoke_delegation') NOT NULL,
  target_type ENUM('user', 'group', 'admin') NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NULL,
  permission_name VARCHAR(100) NULL,
  performed_by BIGINT UNSIGNED NOT NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY audit_target_index (target_type, target_id),
  KEY audit_performed_by_index (performed_by),
  KEY audit_created_at_index (created_at),
  FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default permissions
INSERT INTO permissions (name, display_name, description, module) VALUES
-- User Management
('user:create', 'Create User', 'Create new users', 'user'),
('user:read', 'Read User', 'View user details', 'user'),
('user:update', 'Update User', 'Update user information', 'user'),
('user:delete', 'Delete User', 'Delete users', 'user'),
('user:list', 'List Users', 'View all users', 'user'),

-- Event Management
('event:create', 'Create Event', 'Create new events', 'event'),
('event:read', 'Read Event', 'View event details', 'event'),
('event:update', 'Update Event', 'Update event information', 'event'),
('event:delete', 'Delete Event', 'Delete events', 'event'),
('event:publish', 'Publish Event', 'Publish events', 'event'),
('event:list', 'List Events', 'View all events', 'event'),

-- Event Approval
('approval:view', 'View Approvals', 'View pending approvals', 'approval'),
('approval:approve', 'Approve Event', 'Approve event requests', 'approval'),
('approval:reject', 'Reject Event', 'Reject event requests', 'approval'),

-- Ticket Management
('ticket:create', 'Create Ticket', 'Create tickets', 'ticket'),
('ticket:read', 'Read Ticket', 'View ticket details', 'ticket'),
('ticket:update', 'Update Ticket', 'Update ticket information', 'ticket'),
('ticket:delete', 'Delete Ticket', 'Delete tickets', 'ticket'),
('ticket:scan', 'Scan Ticket', 'Scan tickets for check-in', 'ticket'),
('ticket:list', 'List Tickets', 'View all tickets', 'ticket'),

-- Booking Management
('booking:create', 'Create Booking', 'Create bookings', 'booking'),
('booking:read', 'Read Booking', 'View booking details', 'booking'),
('booking:update', 'Update Booking', 'Update booking information', 'booking'),
('booking:cancel', 'Cancel Booking', 'Cancel bookings', 'booking'),
('booking:list', 'List Bookings', 'View all bookings', 'booking'),
('booking:offline', 'Offline Booking', 'Create offline bookings', 'booking'),

-- Payment Management
('payment:create', 'Create Payment', 'Process payments', 'payment'),
('payment:read', 'Read Payment', 'View payment details', 'payment'),
('payment:refund', 'Refund Payment', 'Process refunds', 'payment'),
('payment:list', 'List Payments', 'View all payments', 'payment'),

-- Organization Management
('org:create', 'Create Organization', 'Create organizations', 'organization'),
('org:read', 'Read Organization', 'View organization details', 'organization'),
('org:update', 'Update Organization', 'Update organization info', 'organization'),
('org:delete', 'Delete Organization', 'Delete organizations', 'organization'),
('org:manage_members', 'Manage Members', 'Manage organization members', 'organization'),

-- Analytics
('analytics:view', 'View Analytics', 'View analytics dashboard', 'analytics'),
('analytics:export', 'Export Analytics', 'Export analytics data', 'analytics'),

-- Admin Permissions
('admin:access', 'Admin Access', 'Access admin panel', 'admin'),
('admin:users', 'Manage Users', 'Manage all users', 'admin'),
('admin:events', 'Manage Events', 'Manage all events', 'admin'),
('admin:payments', 'Manage Payments', 'Manage all payments', 'admin'),
('admin:analytics', 'Admin Analytics', 'View admin analytics', 'admin'),
('admin:settings', 'Admin Settings', 'Manage system settings', 'admin'),

-- Permission Management (Super Admin & Delegated Admin)
('permission:assign', 'Assign Permissions', 'Assign permissions to users/groups', 'permission'),
('permission:revoke', 'Revoke Permissions', 'Revoke permissions from users/groups', 'permission'),
('permission:view', 'View Permissions', 'View all permissions', 'permission'),
('group:create', 'Create Group', 'Create user groups', 'group'),
('group:update', 'Update Group', 'Update user groups', 'group'),
('group:delete', 'Delete Group', 'Delete user groups', 'group'),
('group:manage_members', 'Manage Group Members', 'Add/remove users from groups', 'group'),
('delegation:grant', 'Grant Delegation', 'Delegate permission management to admins', 'delegation'),
('delegation:revoke', 'Revoke Delegation', 'Revoke delegation from admins', 'delegation');

-- Create indexes for performance
CREATE INDEX idx_permissions_module_active ON permissions(module, is_active);
CREATE INDEX idx_user_group_members_user ON user_group_members(user_id);
CREATE INDEX idx_user_permissions_lookup ON user_permissions(user_id, permission_id);
CREATE INDEX idx_group_permissions_lookup ON user_group_permissions(group_id, permission_id);
