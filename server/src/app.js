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

// Import Routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const organizationRoutes = require('./modules/organizations/organization.routes');
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
const adminRoutes = require('./modules/admin/admin.routes');
const rbacRoutes = require('./modules/admin/rbac.routes');
const auditRoutes = require('./modules/admin/audit.routes');
const organizerAnalyticsRoutes = require('./modules/admin/organizer-analytics.routes');
const launchRoutes = require('./modules/launch/launch.routes');
const bookingRoutes = require('./modules/bookings/booking.routes');
const settlementRoutes = require('./modules/settlements/settlement.routes');
const kycRoutes = require('./modules/kyc/kyc.routes');
const webhookRoutes = require('./modules/webhooks/webhook.routes');

const app = express();

// Trust proxy (for rate limiting and IP detection)
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

const allowedOrigins = [
  process.env.FRONTEND_URL,
  // Development URLs (comment out for production)
  // 'http://localhost:5173',
  // 'http://localhost:3000',
  // 'http://127.0.0.1:3000',
  // Production URLs
  'https://buizz.com',
  'https://admin.buizz.com'
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression Middleware
app.use(compression());

// Security Middleware
app.use(sanitizeRequest);
app.use(detectAttacks);
app.use(preventParameterPollution);
app.use(preventNoSQLInjection);

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
  exclude: ['/health', '/api/v1/health'] 
}));

// Serve generated PDFs (ticket + invoice downloads)
app.use('/storage/pdfs', express.static(path.join(__dirname, '..', 'storage', 'pdfs')));
app.use('/storage/qrcodes', express.static(path.join(__dirname, '..', 'storage', 'qrcodes')));
app.use('/storage/kyc-documents', express.static(path.join(__dirname, '..', 'storage', 'kyc-documents')));


app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Buizz API is running',
    health: '/health',
    apiBase: `/api/${process.env.API_VERSION || 'v1'}`
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION || 'v1'
  });
});

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/influencer`, influencerRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/admin/rbac`, rbacRoutes);
app.use(`/api/${API_VERSION}/admin/audit`, auditRoutes);
app.use(`/api/${API_VERSION}/admin/analytics`, organizerAnalyticsRoutes);
app.use(`/api/${API_VERSION}/organizations`, organizationRoutes);
app.use(`/api/${API_VERSION}/events`, eventRoutes);
app.use(`/api/${API_VERSION}/approvals`, eventApprovalRoutes);
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
app.use(`/api/${API_VERSION}/launch`, launchRoutes);
app.use(`/api/webhooks`, webhookRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
