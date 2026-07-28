const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');
const rateLimiter = require('./middleware/rateLimiter');
const { 
  sanitizeRequest, 
  detectAttacks, 
  preventParameterPollution,
  setSecurityHeaders,
  preventNoSQLInjection,
  requireHTTPS
} = require('./middleware/security');
const logger = require('./utils/logger');
const { getMySQLStatus } = require('./database/mysql');

// Import Admin Routes
const adminAuthRoutes = require('./modules/auth/admin-auth.routes');
const userManagementRoutes = require('./modules/users/user-management.routes');
const rbacRoutes = require('./modules/rbac/rbac.routes');
const approvalRoutes = require('./modules/approvals/approval.routes');
const eventManagementRoutes = require('./modules/events/event-management.routes');
const organizationRoutes = require('./modules/organizations/organization.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const bookingManagementRoutes = require('./modules/bookings/booking-management.routes');
const paymentManagementRoutes = require('./modules/payments/payment-management.routes');
const webhookRoutes = require('./modules/webhooks/webhook.routes');
const reviewAdminRoutes = require('./modules/reviews/review-admin.routes');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(setSecurityHeaders);
if (process.env.NODE_ENV === 'production') {
  app.use(requireHTTPS);
}

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [
  ...parseOrigins(process.env.CORS_ORIGINS),
  process.env.ADMIN_FRONTEND_URL,
  process.env.FRONTEND_URL,
  'https://lightsteelblue-rhinoceros-276495.hostingersite.com',
  'https://*.hostingersite.com',
  // Development URLs
  ...(process.env.NODE_ENV !== 'production'
    ? [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ]
    : []),
  // Production URLs
  'https://admin.buizz.com',
  'https://www.buizz.com',
  'https://buizz.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    const isWildcardMatch = allowedOrigins.some((allowedOrigin) => {
      if (!allowedOrigin.includes('*')) return false;
      const pattern = allowedOrigin
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^.]+');
      return new RegExp(`^${pattern}$`).test(origin || '');
    });

    if (!origin || allowedOrigins.includes(origin) || isWildcardMatch) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-buizz-role', 'X-Buizz-Role', 'X-Requested-With']
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Security
app.use(sanitizeRequest);
app.use(detectAttacks);
app.use(preventParameterPollution);
app.use(preventNoSQLInjection);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate Limiting
app.use('/api/', rateLimiter);

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Buizz Admin API is running',
    health: '/health',
    apiBase: '/api/v1',
    app: 'admin',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  const database = getMySQLStatus();

  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    app: 'admin',
    uptime: process.uptime(),
    database
  });
});

// Admin API Routes
const API_VERSION = process.env.API_VERSION || 'v1';

// Authentication (admin & super_admin)
app.use(`/api/${API_VERSION}/auth`, adminAuthRoutes);

// User Management
app.use(`/api/${API_VERSION}/users`, userManagementRoutes);

// RBAC - Permissions & Groups
app.use(`/api/${API_VERSION}/rbac`, rbacRoutes);

// Event Approvals
app.use(`/api/${API_VERSION}/approvals`, approvalRoutes);

// Event Management (admin direct access)
app.use(`/api/${API_VERSION}/events`, eventManagementRoutes);

// Organizations
app.use(`/api/${API_VERSION}/organizations`, organizationRoutes);

// Analytics & Reports
app.use(`/api/${API_VERSION}/analytics`, analyticsRoutes);

// Booking Management
app.use(`/api/${API_VERSION}/bookings`, bookingManagementRoutes);

// Payment Management
app.use(`/api/${API_VERSION}/payments`, paymentManagementRoutes);

// Reviews & Ratings Management
app.use(`/api/${API_VERSION}/reviews`, reviewAdminRoutes);

// Webhooks (Meta WhatsApp)
app.use(`/api/webhooks`, webhookRoutes);

// Serve static files for PDFs
app.use('/storage/pdfs', express.static(path.join(__dirname, '..', 'storage', 'pdfs')));

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
