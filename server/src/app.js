const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');
const rateLimiter = require('./middleware/rateLimiter');
const { auditMiddleware } = require('./middleware/audit');
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

// Import Routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const organizationRoutes = require('./modules/organizations/organization.routes');
const organizerRoutes = require('./modules/organizer/organizer.routes');
const eventRoutes = require('./modules/events/event.routes');
const eventApprovalRoutes = require('./modules/events/event-approval.routes');
const ticketRoutes = require('./modules/tickets/ticket.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const influencerRoutes = require('./modules/influencer/influencer.routes');
const digitalProductRoutes = require('./modules/digital-products/digitalProduct.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const whatsappRoutes = require('./modules/whatsapp/whatsapp.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const qrRoutes = require('./modules/qr/qr.routes');
const supportRoutes = require('./modules/support/support.routes');
const supportMessageRoutes = require('./modules/support/support-message.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const adminController = require('./modules/admin/admin.controller');
const rbacRoutes = require('./modules/admin/rbac.routes');
const auditRoutes = require('./modules/admin/audit.routes');
const organizerAnalyticsRoutes = require('./modules/admin/organizer-analytics.routes');
const launchRoutes = require('./modules/launch/launch.routes');
const bookingRoutes = require('./modules/bookings/booking.routes');
const settlementRoutes = require('./modules/settlements/settlement.routes');
const kycRoutes = require('./modules/kyc/kyc.routes');
const webhookRoutes = require('./modules/webhooks/webhook.routes');
const seatmapRoutes = require('./modules/seatmaps/seatmaps.routes');
const checkinRoutes = require('./modules/checkin/checkin.routes');
const checkinStaffRoutes = require('./modules/checkin/checkin-staff.routes');
const checkinStaffManagementRoutes = require('./modules/checkin-staff/checkin-staff.routes');
const ticketScanRoutes = require('./modules/ticket-scan/ticket-scan.routes');
const eventGalleryRoutes = require('./modules/event-gallery/event-gallery.routes');
const searchRoutes = require('./modules/search/search.routes');
const reviewRoutes = require('./modules/reviews/review.routes');
const reviewAdminRoutes = require('./modules/reviews/review-admin.routes');
const metaRoutes = require('./modules/meta/meta.routes');

const app = express();

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

const allowedOrigins = [
  'https://buizz.com',
  'https://www.buizz.com',
  'https://admin.buizz.com',
  'https://lightsteelblue-rhinoceros-276495.hostingersite.com',
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true
};

// CORS MUST be first middleware to handle preflight requests
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security Middleware (skip for OPTIONS requests)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  return helmet({
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
    },
    crossOriginEmbedderPolicy: false, // Allow CORS
    crossOriginOpenerPolicy: false, // Allow CORS
    crossOriginResourcePolicy: false, // Allow CORS
  })(req, res, next);
});

app.use(setSecurityHeaders);
if (process.env.NODE_ENV === 'production') {
  app.use(requireHTTPS);
}

// Body Parser Middleware
// Razorpay webhook needs raw body for HMAC signature verification — must be before express.json()
app.use('/api/v1/webhooks/razorpay', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/razorpay',    express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression Middleware
app.use(compression());

// Security Middleware
// app.use(sanitizeRequest);
// app.use(detectAttacks);
// app.use(preventParameterPollution);
// app.use(preventNoSQLInjection);

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate Limiting
app.use('/api/', rateLimiter);

// Audit Logging Middleware (after rate limiting, before routes)
app.use('/api/', auditMiddleware({
  exclude: ['/health', '/api/v1/health', '/webhooks'] 
}));

// Serve generated PDFs (ticket + invoice downloads)
app.use('/storage/pdfs', express.static(path.join(__dirname, '..', 'storage', 'pdfs')));
app.use('/storage/qrcodes', express.static(path.join(__dirname, '..', 'storage', 'qrcodes')));
app.use('/storage/kyc-documents', express.static(path.join(__dirname, '..', 'storage', 'kyc-documents')));
app.get('/storage/kyc-documents/:filename', (req, res) => {
  const apiVersion = process.env.API_VERSION || 'v1';
  return res.redirect(302, `/api/${apiVersion}/kyc/documents/${encodeURIComponent(req.params.filename)}`);
});
app.use('/storage', (req, res) => {
  return res.status(404).json({ success: false, message: 'Storage file not found' });
});


app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Buizz API is running',
    health: '/health',
    apiBase: `/api/${process.env.API_VERSION || 'v1'}`
  });
});

app.get('/health', (req, res) => {
  const database = getMySQLStatus();
  const ready = database.connected && database.schemaReady;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'OK' : 'NOT_READY',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION || 'v1',
    database
  });
});

app.get('/api/v1/health', (req, res) => {
  const database = getMySQLStatus();
  const ready = database.connected && database.schemaReady;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'OK' : 'NOT_READY',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION || 'v1',
    database
  });
});

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use('/meta', metaRoutes);
app.use(`/api/${API_VERSION}/meta`, metaRoutes);
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/influencer`, influencerRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/super-admin`, adminRoutes);
app.use(`/api/${API_VERSION}/admin/rbac`, rbacRoutes);
app.use(`/api/${API_VERSION}/admin/audit`, auditRoutes);
app.use(`/api/${API_VERSION}/admin/analytics`, organizerAnalyticsRoutes);
app.use(`/api/${API_VERSION}/organizations`, organizationRoutes);
app.use(`/api/${API_VERSION}/events`, eventRoutes);
app.use(`/api/${API_VERSION}/organizer`, organizerRoutes);
app.use(`/api/${API_VERSION}/approvals`, eventApprovalRoutes);

// ── Top-level platform routes (JWT from users table) ─────────────────────────
const { authenticate, authorize } = require('./middleware/rbac');

// Debug endpoint to check current user role
app.get(`/api/${API_VERSION}/debug/me`, authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

app.use(`/api/${API_VERSION}/organizers`, authenticate, (req, res, next) => adminController.getAllOrganizers(req, res, next));
app.use(`/api/${API_VERSION}/bookings-management`, authenticate, (req, res, next) => adminController.getBookings(req, res, next));
app.use(`/api/${API_VERSION}/tickets`, ticketRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentRoutes);
app.use(`/api/${API_VERSION}/bookings`, bookingRoutes);
app.use(`/api/${API_VERSION}/settlements`, settlementRoutes);
app.use(`/api/${API_VERSION}/kyc`, kycRoutes);
app.use(`/api/${API_VERSION}/digital-products`, digitalProductRoutes);
app.use(`/api/${API_VERSION}/analytics`, analyticsRoutes);
app.use(`/api/${API_VERSION}/whatsapp`, whatsappRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/qr`, qrRoutes);
app.use(`/api/${API_VERSION}/support`, supportRoutes);
app.use(`/api/${API_VERSION}/support-messages`, supportMessageRoutes);
app.use(`/api/${API_VERSION}/launch`, launchRoutes);
app.use(`/api/${API_VERSION}/seatmaps`, seatmapRoutes);
app.use(`/api/${API_VERSION}/checkin`, checkinRoutes);
app.use(`/api/${API_VERSION}/checkin-staff`, checkinStaffRoutes);
app.use(`/api/${API_VERSION}/checkin-staff-management`, checkinStaffManagementRoutes);
app.use(`/api/${API_VERSION}/ticket-scan`, ticketScanRoutes);
app.use(`/api/${API_VERSION}/event-gallery`, eventGalleryRoutes);
app.use(`/api/${API_VERSION}/search`, searchRoutes);
app.use(`/api/${API_VERSION}/reviews`, reviewRoutes);
app.use(`/api/${API_VERSION}/reviews-admin`, reviewAdminRoutes);
app.use(`/api/webhooks`, webhookRoutes);
app.use(`/api/${API_VERSION}/webhooks`, webhookRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  const clientIndexPath = path.join(clientDistPath, 'index.html');
  const hasClientIndex = require('fs').existsSync(clientIndexPath);

  if (hasClientIndex) {
    app.use(express.static(clientDistPath));
  }

  app.get('/favicon.ico', (req, res) => res.status(204).end());
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nAllow: /\n');
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/storage/')) {
      return next();
    }

    if (!hasClientIndex) {
      return next();
    }

    return res.sendFile(clientIndexPath);
  });
}

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
