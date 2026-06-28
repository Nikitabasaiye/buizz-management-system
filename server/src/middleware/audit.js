const auditService = require('../services/audit.service');
const logger = require('../utils/logger');

/**
 * Middleware to automatically log all requests
 */
const auditMiddleware = (options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Capture original send function
    const originalSend = res.send;
    let responseBody;
    let responseStatus;

    // Override send to capture response
    res.send = function(data) {
      responseBody = data;
      responseStatus = res.statusCode;
      res.send = originalSend;
      return originalSend.call(this, data);
    };

    // Log after response is sent
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        
        // Skip if excluded
        if (options.exclude && options.exclude.some(path => req.path.includes(path))) {
          return;
        }

        // Skip health checks and static files
        if (req.path.includes('/health') || 
            req.path.includes('/static') ||
            req.path.includes('/storage')) {
          return;
        }

        // Determine action type from method
        const actionTypeMap = {
          'POST': 'create',
          'GET': 'read',
          'PUT': 'update',
          'PATCH': 'update',
          'DELETE': 'delete'
        };

        const actionType = actionTypeMap[req.method] || 'other';

        // Extract resource info from path
        const pathParts = req.path.split('/').filter(Boolean);
        const resourceType = pathParts[2]; // /api/v1/[resourceType]
        const resourceId = pathParts[3]; // /api/v1/resourceType/[id]

        // Prepare audit data
        const auditData = {
          userId: req.user?.id || null,
          userName: req.user?.name || null,
          userEmail: req.user?.email || null,
          userRole: req.user?.role || null,
          action: `${req.method} ${req.path}`,
          actionType,
          resourceType: resourceType || null,
          resourceId: resourceId && !isNaN(resourceId) ? parseInt(resourceId) : null,
          description: `${req.method} request to ${req.path}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          requestMethod: req.method,
          requestUrl: req.originalUrl,
          requestBody: shouldLogBody(req) ? sanitizeBody(req.body) : null,
          responseStatus: responseStatus,
          metadata: {
            duration,
            query: req.query,
            params: req.params
          },
          severity: determineSeverity(req.method, responseStatus)
        };

        // Log asynchronously without blocking
        setImmediate(() => {
          auditService.logAction(auditData).catch(err => {
            logger.error('Audit logging failed', { error: err.message });
          });
        });

      } catch (error) {
        logger.error('Audit middleware error', { error: error.message });
      }
    });

    next();
  };
};

/**
 * Check if request body should be logged
 */
function shouldLogBody(req) {
  // Don't log sensitive routes
  const sensitiveRoutes = ['/login', '/register', '/password', '/auth'];
  if (sensitiveRoutes.some(route => req.path.includes(route))) {
    return false;
  }

  // Don't log file uploads
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return false;
  }

  return req.method !== 'GET';
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}

/**
 * Determine severity based on method and status
 */
function determineSeverity(method, status) {
  if (status >= 500) return 'critical';
  if (status >= 400) return 'high';
  if (method === 'DELETE') return 'medium';
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') return 'medium';
  return 'low';
}

/**
 * Specific middleware for tracking event approvals
 */
const trackEventApproval = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    res.send = originalSend;
    
    // Log event approval after successful response
    if (res.statusCode >= 200 && res.statusCode < 300) {
      setImmediate(async () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.data && parsedData.data.event) {
            await auditService.logEventApproval({
              eventId: parsedData.data.event.id || req.params.id,
              organizerId: parsedData.data.event.organizer_id || parsedData.data.event.organizerId,
              organizerName: parsedData.data.event.organizer_name || 'Unknown',
              organizerEmail: parsedData.data.event.organizer_email || 'Unknown',
              reviewerId: req.user.id,
              reviewerName: req.user.name,
              reviewerEmail: req.user.email,
              reviewerRole: req.user.role,
              action: req.body.action || 'approved',
              previousStatus: req.body.previousStatus || null,
              newStatus: req.body.status || parsedData.data.event.status,
              comments: req.body.comments || null,
              rejectionReason: req.body.rejectionReason || null,
              metadata: {
                approvalId: req.params.id,
                path: req.path
              }
            });
          }
        } catch (error) {
          logger.error('Event approval tracking failed', { error: error.message });
        }
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Track file uploads/downloads
 */
const trackFileAccess = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      res.send = originalSend;
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            await auditService.logFileAccess({
              userId: req.user?.id,
              fileType: req.body?.documentType || req.params?.fileType || 'unknown',
              fileName: req.file?.filename || req.params?.filename || 'unknown',
              filePath: req.file?.path || null,
              fileSize: req.file?.size || null,
              action: action,
              resourceType: req.body?.resourceType || null,
              resourceId: req.body?.resourceId || req.params?.id || null,
              ipAddress: req.ip,
              status: 'success'
            });
          } catch (error) {
            logger.error('File access tracking failed', { error: error.message });
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Track user sessions
 */
const trackSession = (action) => {
  return async (req, res, next) => {
    try {
      if (action === 'login') {
        // Track after successful login
        const originalSend = res.send;
        
        res.send = function(data) {
          res.send = originalSend;
          
          if (res.statusCode === 200) {
            setImmediate(async () => {
              try {
                const parsedData = JSON.parse(data);
                if (parsedData.data && parsedData.data.token) {
                  await auditService.logSession({
                    userId: parsedData.data.user?.id || parsedData.data.user?.user_id,
                    sessionToken: parsedData.data.token,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    action: 'login',
                    metadata: {
                      loginMethod: req.body.email ? 'email' : 'other'
                    }
                  });
                }
              } catch (error) {
                logger.error('Session tracking failed', { error: error.message });
              }
            });
          }
          
          return originalSend.call(this, data);
        };
      } else if (action === 'logout') {
        // Track logout immediately
        if (req.user) {
          await auditService.logSession({
            userId: req.user.id,
            sessionToken: req.headers.authorization?.split(' ')[1],
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            action: 'logout'
          });
        }
      }
      
      next();
    } catch (error) {
      logger.error('Session tracking middleware error', { error: error.message });
      next();
    }
  };
};

module.exports = {
  auditMiddleware,
  trackEventApproval,
  trackFileAccess,
  trackSession
};
