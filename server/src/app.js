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
const logger = require('./utils/logger');

// Import Routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const organizationRoutes = require('./modules/organizations/organization.routes');
const eventRoutes = require('./modules/events/event.routes');
const ticketRoutes = require('./modules/tickets/ticket.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const influencerRoutes = require('./modules/influencer/influencer.routes');
const digitalProductRoutes = require('./modules/digital-products/digitalProduct.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const whatsappRoutes = require('./modules/whatsapp/whatsapp.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const qrRoutes = require('./modules/qr/qr.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const launchRoutes = require('./modules/launch/launch.routes');

const app = express();

// Security Middleware
app.use(helmet());
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean);
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression Middleware
app.use(compression());

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate Limiting
app.use('/api/', rateLimiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/organizations`, organizationRoutes);
app.use(`/api/${API_VERSION}/events`, eventRoutes);
app.use(`/api/${API_VERSION}/tickets`, ticketRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentRoutes);
app.use(`/api/${API_VERSION}/influencer`, influencerRoutes);
app.use(`/api/${API_VERSION}/digital-products`, digitalProductRoutes);
app.use(`/api/${API_VERSION}/analytics`, analyticsRoutes);
app.use(`/api/${API_VERSION}/whatsapp`, whatsappRoutes);
app.use(`/api/${API_VERSION}/launch`, launchRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/qr`, qrRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);

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
