const USER_ROLES = {
  ADMIN: 'admin',
  ORGANIZER: 'organizer',
  USER: 'user',
  INFLUENCER: 'influencer'
};

const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const TICKET_STATUS = {
  ACTIVE: 'active',
  USED: 'used',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

const NOTIFICATION_TYPES = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  PUSH: 'push'
};

const QUEUE_NAMES = {
  EMAIL: 'emailQueue',
  WHATSAPP: 'whatsappQueue',
  TICKET: 'ticketQueue',
  ANALYTICS: 'analyticsQueue',
  NOTIFICATION: 'notificationQueue'
};

module.exports = {
  USER_ROLES,
  EVENT_STATUS,
  TICKET_STATUS,
  PAYMENT_STATUS,
  NOTIFICATION_TYPES,
  QUEUE_NAMES
};
