const logger = require('../utils/logger');

class PrivacyService {
  /**
   * Mask user contact details based on requester role
   */
  maskUserContactDetails(userData, requesterRole) {
    if (!userData) return userData;
    
    // Super admin can see everything
    if (requesterRole === 'super_admin') {
      return userData;
    }
    
    // Admins can see most details but with some masking
    if (requesterRole === 'admin') {
      return {
        ...userData,
        email: this.maskEmail(userData.email),
        phone: this.maskPhone(userData.phone)
      };
    }
    
    // Organizers and others get heavily masked data
    return {
      ...userData,
      email: this.maskEmail(userData.email, true),
      phone: this.maskPhone(userData.phone, true),
      name: this.maskName(userData.name),
      // Remove sensitive fields completely
      address: undefined,
      date_of_birth: undefined,
      last_login: undefined,
      created_at: undefined,
      updated_at: undefined
    };
  }
  
  /**
   * Mask booking customer details for organizers
   */
  maskBookingCustomerDetails(bookingData, requesterRole) {
    if (!bookingData) return bookingData;
    
    // Super admin sees everything
    if (requesterRole === 'super_admin') {
      return bookingData;
    }
    
    // Admin sees masked contact info
    if (requesterRole === 'admin') {
      return {
        ...bookingData,
        customer_email: this.maskEmail(bookingData.customer_email),
        customer_phone: this.maskPhone(bookingData.customer_phone),
        user_email: this.maskEmail(bookingData.user_email),
        user_phone: this.maskPhone(bookingData.user_phone)
      };
    }
    
    // Organizers get minimal customer info
    return {
      ...bookingData,
      customer_name: this.maskName(bookingData.customer_name || bookingData.user_name),
      customer_email: this.maskEmail(bookingData.customer_email || bookingData.user_email, true),
      customer_phone: this.maskPhone(bookingData.customer_phone || bookingData.user_phone, true),
      user_name: this.maskName(bookingData.user_name),
      user_email: this.maskEmail(bookingData.user_email, true),
      user_phone: this.maskPhone(bookingData.user_phone, true),
      // Remove other sensitive fields
      user_id: undefined,
      ip_address: undefined
    };
  }
  
  /**
   * Mask array of users/bookings
   */
  maskUserArray(users, requesterRole) {
    if (!Array.isArray(users)) return users;
    
    return users.map(user => this.maskUserContactDetails(user, requesterRole));
  }
  
  /**
   * Mask array of bookings
   */
  maskBookingArray(bookings, requesterRole) {
    if (!Array.isArray(bookings)) return bookings;
    
    return bookings.map(booking => this.maskBookingCustomerDetails(booking, requesterRole));
  }
  
  /**
   * Mask email address
   */
  maskEmail(email, heavy = false) {
    if (!email) return email;
    
    try {
      const [localPart, domain] = email.split('@');
      
      if (heavy) {
        // Heavy masking for organizers
        const visibleChars = Math.min(2, Math.floor(localPart.length / 3));
        const maskedLocal = localPart.substring(0, visibleChars) + '***';
        const maskedDomain = domain.split('.').map(part => 
          part.length <= 2 ? part : part.substring(0, 1) + '***'
        ).join('.');
        return `${maskedLocal}@${maskedDomain}`;
      } else {
        // Light masking for admins
        const visibleChars = Math.max(2, Math.floor(localPart.length / 2));
        const maskedLocal = localPart.substring(0, visibleChars) + 
                           '*'.repeat(localPart.length - visibleChars);
        return `${maskedLocal}@${domain}`;
      }
    } catch (error) {
      logger.warn('Failed to mask email', { email, error: error.message });
      return heavy ? '***@***.***' : email;
    }
  }
  
  /**
   * Mask phone number
   */
  maskPhone(phone, heavy = false) {
    if (!phone) return phone;
    
    try {
      const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
      
      if (cleaned.length < 4) return phone;
      
      if (heavy) {
        // Heavy masking for organizers - show only first 2 and last 2 digits
        const visibleStart = 2;
        const visibleEnd = 2;
        return cleaned.substring(0, visibleStart) + 
               '*'.repeat(Math.max(0, cleaned.length - visibleStart - visibleEnd)) +
               cleaned.substring(cleaned.length - visibleEnd);
      } else {
        // Light masking for admins - show first 3 and last 3 digits
        const visibleStart = 3;
        const visibleEnd = 3;
        return cleaned.substring(0, visibleStart) + 
               '*'.repeat(Math.max(0, cleaned.length - visibleStart - visibleEnd)) +
               cleaned.substring(cleaned.length - visibleEnd);
      }
    } catch (error) {
      logger.warn('Failed to mask phone', { phone, error: error.message });
      return heavy ? '***' : phone;
    }
  }
  
  /**
   * Mask name
   */
  maskName(name) {
    if (!name) return name;
    
    try {
      const parts = name.trim().split(' ');
      
      return parts.map((part, index) => {
        if (part.length <= 2) return part;
        
        // Show first name fully, mask others
        if (index === 0) {
          return part.substring(0, Math.ceil(part.length / 2)) + 
                 '*'.repeat(Math.floor(part.length / 2));
        } else {
          return part.substring(0, 1) + '*'.repeat(part.length - 1);
        }
      }).join(' ');
    } catch (error) {
      logger.warn('Failed to mask name', { name, error: error.message });
      return 'User***';
    }
  }
  
  /**
   * Check if user can view full contact details
   */
  canViewFullContactDetails(requesterRole) {
    return requesterRole === 'super_admin';
  }
  
  /**
   * Get privacy notice for API responses
   */
  getPrivacyNotice(requesterRole) {
    if (requesterRole === 'super_admin') {
      return null; // No notice needed
    }
    
    if (requesterRole === 'admin') {
      return {
        notice: 'Contact details are partially masked for privacy protection',
        level: 'partial_masking'
      };
    }
    
    return {
      notice: 'Customer contact details are masked for privacy protection',
      level: 'full_masking',
      message: 'Only super administrators can view complete customer contact information'
    };
  }
  
  /**
   * Log privacy access for audit
   */
  logPrivacyAccess(requesterInfo, accessedData, accessLevel) {
    logger.info('Privacy data access', {
      requesterId: requesterInfo.id,
      requesterRole: requesterInfo.role,
      requesterEmail: requesterInfo.email,
      accessLevel,
      dataType: accessedData.type,
      recordCount: accessedData.count,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new PrivacyService();