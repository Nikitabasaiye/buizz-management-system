const { USER_ROLES } = require('../constants');

// Define all permissions in the system
const PERMISSIONS = {
  // User permissions
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_LIST: 'user:list',
  
  // Event permissions
  EVENT_CREATE: 'event:create',
  EVENT_READ: 'event:read',
  EVENT_UPDATE: 'event:update',
  EVENT_DELETE: 'event:delete',
  EVENT_PUBLISH: 'event:publish',
  EVENT_LIST: 'event:list',
  
  // Ticket permissions
  TICKET_CREATE: 'ticket:create',
  TICKET_READ: 'ticket:read',
  TICKET_UPDATE: 'ticket:update',
  TICKET_DELETE: 'ticket:delete',
  TICKET_SCAN: 'ticket:scan',
  TICKET_LIST: 'ticket:list',
  
  // Payment permissions
  PAYMENT_CREATE: 'payment:create',
  PAYMENT_READ: 'payment:read',
  PAYMENT_REFUND: 'payment:refund',
  PAYMENT_LIST: 'payment:list',
  
  // Organization permissions
  ORG_CREATE: 'org:create',
  ORG_READ: 'org:read',
  ORG_UPDATE: 'org:update',
  ORG_DELETE: 'org:delete',
  ORG_MANAGE_MEMBERS: 'org:manage_members',
  
  // Admin permissions
  ADMIN_ACCESS: 'admin:access',
  ADMIN_USERS: 'admin:users',
  ADMIN_EVENTS: 'admin:events',
  ADMIN_PAYMENTS: 'admin:payments',
  ADMIN_ANALYTICS: 'admin:analytics',
  ADMIN_SETTINGS: 'admin:settings',

  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // Influencer permissions
  INFLUENCER_PROMOTE: 'influencer:promote',
  INFLUENCER_ANALYTICS: 'influencer:analytics',
  
  // Digital Product permissions
  PRODUCT_CREATE: 'product:create',
  PRODUCT_READ: 'product:read',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
};

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: [
    ...Object.values(PERMISSIONS)
  ],

  [USER_ROLES.ADMIN]: [
    // Admin has all permissions
    ...Object.values(PERMISSIONS)
  ],
  
  [USER_ROLES.ORGANIZER]: [
    // User management (limited)
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    
    // Event management (full)
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.EVENT_PUBLISH,
    PERMISSIONS.EVENT_LIST,
    
    // Ticket management
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_READ,
    PERMISSIONS.TICKET_UPDATE,
    PERMISSIONS.TICKET_SCAN,
    PERMISSIONS.TICKET_LIST,
    
    // Payment management
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.PAYMENT_LIST,
    
    // Organization management
    PERMISSIONS.ORG_CREATE,
    PERMISSIONS.ORG_READ,
    PERMISSIONS.ORG_UPDATE,
    PERMISSIONS.ORG_MANAGE_MEMBERS,
    
    // Analytics
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
    
    // Digital Products
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRODUCT_DELETE,
  ],
  
  [USER_ROLES.USER]: [
    // User management (self only)
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    
    // Event (read only)
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_LIST,
    
    // Ticket (own tickets)
    PERMISSIONS.TICKET_READ,
    PERMISSIONS.TICKET_LIST,
    
    // Payment (own payments)
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_LIST,
    
    // Digital Products (read only)
    PERMISSIONS.PRODUCT_READ,
  ],
  
  [USER_ROLES.INFLUENCER]: [
    // User management (self only)
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    
    // Event (read only)
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_LIST,
    
    // Ticket (own tickets)
    PERMISSIONS.TICKET_READ,
    PERMISSIONS.TICKET_LIST,
    
    // Payment (own payments)
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_LIST,
    
    // Influencer specific
    PERMISSIONS.INFLUENCER_PROMOTE,
    PERMISSIONS.INFLUENCER_ANALYTICS,
    
    // Digital Products
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRODUCT_DELETE,
  ],
};

// Check if a role has a specific permission
const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

// Check if a role has any of the specified permissions
const hasAnyPermission = (role, permissions) => {
  return permissions.some(permission => hasPermission(role, permission));
};

// Check if a role has all of the specified permissions
const hasAllPermissions = (role, permissions) => {
  return permissions.every(permission => hasPermission(role, permission));
};

// Get all permissions for a role
const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
};
