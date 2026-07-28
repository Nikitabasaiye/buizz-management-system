/**
 * User Agent Parser Utility
 * Extracts device, browser, and OS information from user agent strings
 */

class UserAgentParser {
  /**
   * Parse user agent string and extract device info
   * @param {string} userAgent - User agent string
   * @returns {Object} Parsed device information
   */
  static parse(userAgent) {
    if (!userAgent) {
      return {
        device_type: 'unknown',
        browser: 'unknown',
        os: 'unknown'
      };
    }

    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType = 'desktop';
    if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
      deviceType = 'tablet';
    }

    // Detect browser
    let browser = 'unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'chrome';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'safari';
    } else if (ua.includes('firefox')) {
      browser = 'firefox';
    } else if (ua.includes('edg')) {
      browser = 'edge';
    } else if (ua.includes('opr') || ua.includes('opera')) {
      browser = 'opera';
    } else if (ua.includes('msie') || ua.includes('trident')) {
      browser = 'internet_explorer';
    }

    // Detect OS
    let os = 'unknown';
    if (ua.includes('windows')) {
      if (ua.includes('windows nt 10.0')) os = 'windows_10';
      else if (ua.includes('windows nt 6.3')) os = 'windows_8_1';
      else if (ua.includes('windows nt 6.2')) os = 'windows_8';
      else if (ua.includes('windows nt 6.1')) os = 'windows_7';
      else if (ua.includes('windows nt 6.0')) os = 'windows_vista';
      else if (ua.includes('windows nt 5.1')) os = 'windows_xp';
      else os = 'windows';
    } else if (ua.includes('mac os x')) {
      os = 'macos';
    } else if (ua.includes('linux')) {
      os = 'linux';
    } else if (ua.includes('android')) {
      const androidMatch = ua.match(/android\s([0-9\.]+)/);
      os = androidMatch ? `android_${androidMatch[1]}` : 'android';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      const iosMatch = ua.match(/os\s([0-9_]+)/);
      os = iosMatch ? `ios_${iosMatch[1].replace(/_/g, '.')}` : 'ios';
    }

    return {
      device_type: deviceType,
      browser: browser,
      os: os
    };
  }

  /**
   * Get location data from IP address (basic implementation)
   * Note: For accurate location data, use a paid service like ipstack, ipinfo.io, etc.
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Location data
   */
  static async getLocation(ipAddress) {
    // Basic implementation - returns null
    // For production, integrate with a location API service
    return {
      ip: ipAddress,
      country: null,
      city: null,
      region: null,
      latitude: null,
      longitude: null
    };
  }
}

module.exports = UserAgentParser;
