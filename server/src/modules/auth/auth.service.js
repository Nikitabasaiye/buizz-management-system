const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const userRepository = require('../users/user.repository');
const sessionRepository = require('../../repositories/session.repository');
const { AppError } = require('../../middleware/errorHandler');
const {
  generateAccessToken, generateRefreshToken, generateSecureToken,
  generateOtp,
  blacklistToken, storeRedisToken, getRedisToken, deleteRedisToken,
  sendEmailOtp, verifyEmailOtp,
} = require('../../utils/auth.helper');
const { USER_ROLES } = require('../../constants');
const logger = require('../../utils/logger');
const { sendEmail } = require('../../utils/email');
const UserAgentParser = require('../../utils/userAgentParser');
const { sendPhoneOtpWithEmailFallback } = require('../../services/delivery.service');
const verificationCodeService = require('../../services/verification-code.service');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizeRequestedRole = (role) => {
  if (!role || role === USER_ROLES.LEGACY_CUSTOMER) return USER_ROLES.CUSTOMER;
  return role;
};

const normalizeSocialRole = (role) => {
  const normalized = normalizeRequestedRole(role);
  if (normalized === USER_ROLES.SUPER_ADMIN || role === 'super-admin') return USER_ROLES.SUPER_ADMIN;
  if (normalized === USER_ROLES.ADMIN) return USER_ROLES.ADMIN;
  if (normalized === USER_ROLES.ORGANIZER) return USER_ROLES.ORGANIZER;
  if (normalized === USER_ROLES.INFLUENCER) return USER_ROLES.INFLUENCER;
  return USER_ROLES.CUSTOMER;
};

const verifyGoogleProfile = async (idToken) => {
  if (!process.env.GOOGLE_CLIENT_ID) throw new AppError('Google login is not configured', 500);
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  }).catch(() => { throw new AppError('Invalid Google token', 401); });

  const { sub, email, name, picture, email_verified } = ticket.getPayload();
  if (!email) throw new AppError('Google account email is required', 400);

  return {
    provider: 'google',
    providerId: sub,
    email,
    name: name || email.split('@')[0],
    avatar: picture,
    emailVerified: Boolean(email_verified),
  };
};

const verifyFacebookProfile = async (accessToken) => {
  if (!process.env.FACEBOOK_APP_ID && !process.env.META_APP_ID && !process.env.FB_APP_ID) {
    throw new AppError('Facebook login is not configured', 500);
  }
  if (!accessToken) throw new AppError('Facebook access token is required', 400);

  const appSecret =
    process.env.FACEBOOK_APP_SECRET ||
    process.env.META_APP_SECRET ||
    process.env.FB_APP_SECRET;
  const params = {
    fields: 'id,name,email,picture.type(large)',
    access_token: accessToken,
  };

  if (appSecret) {
    params.appsecret_proof = crypto
      .createHmac('sha256', appSecret)
      .update(accessToken)
      .digest('hex');
  }

  const graphVersion =
    process.env.FACEBOOK_API_VERSION ||
    process.env.META_API_VERSION ||
    'v25.0';
  const { data } = await axios.get(`https://graph.facebook.com/${graphVersion}/me`, { params })
    .catch(() => { throw new AppError('Invalid Facebook token', 401); });

  if (!data?.email) {
    throw new AppError('Facebook account email permission is required', 400);
  }

  return {
    provider: 'facebook',
    providerId: data.id,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    avatar: data.picture?.data?.url,
    emailVerified: true,
  };
};

const findUserBySocialProvider = async (provider, providerId) => {
  if (provider === 'google') return userRepository.findByGoogleId(providerId);
  if (provider === 'facebook') return userRepository.findByFacebookId(providerId);
  return null;
};

const linkSocialProvider = async (userId, provider, providerId) => {
  if (provider === 'google') return userRepository.updateGoogleId(userId, providerId);
  if (provider === 'facebook') return userRepository.updateFacebookId(userId, providerId);
  return null;
};

const socialLogin = async ({
  provider,
  idToken,
  accessToken,
  role = USER_ROLES.CUSTOMER,
  ipAddress = null,
  userAgent = null,
}) => {
  const requestedRole = normalizeSocialRole(role);
  const profile = provider === 'facebook'
    ? await verifyFacebookProfile(accessToken)
    : await verifyGoogleProfile(idToken);

  let user = await findUserBySocialProvider(profile.provider, profile.providerId);

  if (!user) {
    user = await userRepository.findByEmail(profile.email);
    if (user) {
      await linkSocialProvider(user.id, profile.provider, profile.providerId);
      if (user.role !== requestedRole) {
        throw new AppError(`This ${profile.provider} account is registered as ${user.role}. Please use the correct login panel.`, 403);
      }
    } else {
      const rolesThatCanSelfCreate = [USER_ROLES.CUSTOMER, USER_ROLES.ORGANIZER, USER_ROLES.INFLUENCER];
      if (!rolesThatCanSelfCreate.includes(requestedRole)) {
        throw new AppError(`No ${requestedRole.replace('_', ' ')} account found for this ${profile.provider} account`, 403);
      }

      user = await userRepository.create({
        name: profile.name,
        email: profile.email,
        password: `${crypto.randomBytes(24).toString('hex')}Aa1!`,
        googleId: profile.provider === 'google' ? profile.providerId : null,
        facebookId: profile.provider === 'facebook' ? profile.providerId : null,
        avatar: profile.avatar,
        isVerified: profile.emailVerified,
        role: requestedRole,
      });
    }
  }

  if (!user.isActive) throw new AppError('Account is deactivated', 403);
  if (user.role !== requestedRole) {
    throw new AppError(`This ${profile.provider} account is registered as ${user.role}. Please use the correct login panel.`, 403);
  }

  const session = await createLoginSessionForUser(user, ipAddress, userAgent, profile.provider);
  logger.info('Social login successful', { userId: user.id, provider: profile.provider, role: user.role });
  return session;
};

const googleLogin = async (idToken, ipAddress = null, userAgent = null, role = USER_ROLES.CUSTOMER) => {
  return socialLogin({ provider: 'google', idToken, role, ipAddress, userAgent });
};

const facebookLogin = async (accessToken, ipAddress = null, userAgent = null, role = USER_ROLES.CUSTOMER) => {
  return socialLogin({ provider: 'facebook', accessToken, role, ipAddress, userAgent });
};

const register = async (userData) => {
  const requestedRole = normalizeRequestedRole(userData.role);
  const publicRoles = [USER_ROLES.CUSTOMER, USER_ROLES.ORGANIZER, USER_ROLES.INFLUENCER];
  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN];

  if (![...publicRoles, ...adminRoles].includes(requestedRole)) {
    throw new AppError('Invalid role', 400);
  }

  if (adminRoles.includes(requestedRole)) {
    if (!process.env.ADMIN_REGISTRATION_SECRET) {
      throw new AppError('Admin registration is disabled', 403);
    }

    if (userData.adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
      throw new AppError('Invalid admin registration secret', 403);
    }
  }

  const existing = await userRepository.findByEmail(userData.email);
  if (existing) throw new AppError('Email already registered', 400);

  if (userData.phone) {
    const existingPhone = await userRepository.findByPhone(userData.phone);
    if (existingPhone) throw new AppError('Phone number already registered', 400);
  }

  if ([USER_ROLES.CUSTOMER, USER_ROLES.ORGANIZER].includes(requestedRole) && !userData.phone) {
    throw new AppError('Phone number is required', 400);
  }
  const requiredVerifications = [];
  if (requestedRole === USER_ROLES.ORGANIZER) {
    requiredVerifications.push({
      channel: 'email',
      destination: userData.email,
      verificationToken: userData.emailVerificationToken,
    });
  }
  if ([USER_ROLES.CUSTOMER, USER_ROLES.ORGANIZER].includes(requestedRole)) {
    requiredVerifications.push({
      channel: 'phone',
      destination: userData.phone,
      verificationToken: userData.phoneVerificationToken,
    });
  }
  if (requiredVerifications.length) {
    await verificationCodeService.consumeMany(requiredVerifications);
  }

  const {
    adminSecret,
    emailVerificationToken,
    phoneVerificationToken,
    ...safeUserData
  } = userData;
  const user = await userRepository.create({
    ...safeUserData,
    role: requestedRole,
    isEmailVerified: requestedRole === USER_ROLES.ORGANIZER,
    isPhoneVerified: [USER_ROLES.CUSTOMER, USER_ROLES.ORGANIZER].includes(requestedRole),
  });

  logger.info('User registered after OTP verification', {
    userId: user.id,
    email: user.email,
    emailVerified: requestedRole === USER_ROLES.ORGANIZER,
    phoneVerified: [USER_ROLES.CUSTOMER, USER_ROLES.ORGANIZER].includes(requestedRole),
  });

  const token = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);

  const result = {
    user: {
      id: user.id,
      displayId: user.displayId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    },
    token,
    refreshToken,
  };

  return result;
};

const login = async (email, password, ipAddress = null, userAgent = null) => {
  const user = await userRepository.findByEmailWithPassword(email);

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) throw new AppError('Account is deactivated', 403);

  await userRepository.updateLastLogin(user.id);

  const token = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);

  // Store session in database
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const deviceInfo = UserAgentParser.parse(userAgent);
    const locationData = await UserAgentParser.getLocation(ipAddress);

    await sessionRepository.create({
      user_id: user.id,
      session_token: token,
      refresh_token: refreshToken,
      role: user.role,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceInfo.device_type,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      expires_at: expiresAt,
      session_data: { loginMethod: 'email' },
      location_data: locationData,
    });

    await sessionRepository.logActivity({
      session_id: null,
      user_id: user.id,
      action: 'login',
      ip_address: ipAddress,
      user_agent: userAgent,
      action_details: { method: 'email', email: user.email },
    });
  } catch (error) {
    logger.error('Failed to create session after login', { error: error.message, userId: user.id });
    // Continue with login even if session creation fails
  }

  return {
    user: {
      id: user.id,
      displayId: user.displayId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    },
    token,
    refreshToken,
  };
};

const logout = async (token, userId = null) => {
  // Blacklist token in Redis
  await blacklistToken(token);

  // Revoke session in database if userId provided
  if (userId && token) {
    try {
      const session = await sessionRepository.findByToken(token);
      if (session && String(session.user_id) === String(userId)) {
        await sessionRepository.revoke(session.session_id, userId, 'User logout');
        await sessionRepository.logActivity({
          session_id: session.session_id,
          user_id: userId,
          action: 'logout',
          action_details: { method: 'manual' },
        });
      }
    } catch (error) {
      logger.error('Failed to revoke session during logout', { error: error.message, userId });
    }
  }
};

const refreshToken = async (refreshTokenValue, ipAddress = null, userAgent = null) => {
  try {
    const decoded = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
    if (!decoded.id) throw new AppError('Invalid token', 401);
    
    const user = await userRepository.findById(decoded.id);
    if (!user) throw new AppError('User not found', 404);
    if (!user.isActive) throw new AppError('Account is deactivated', 403);

    // Find session by refresh token
    const session = await sessionRepository.findByRefreshToken(refreshTokenValue);
    if (!session || !session.is_active) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Check if session belongs to the user
    if (String(session.user_id) !== String(user.id)) {
      throw new AppError('Token does not belong to user', 401);
    }

    // Generate new tokens
    const newToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);

    // Update session with new tokens
    await sessionRepository.updateTokens(session.session_id, newToken, newRefreshToken);
    await sessionRepository.updateLastActivity(session.session_id);

    await sessionRepository.logActivity({
      session_id: session.session_id,
      user_id: user.id,
      action: 'refresh',
      ip_address: ipAddress,
      user_agent: userAgent,
      action_details: { previousToken: refreshTokenValue?.substring(0, 20) + '...' },
    });

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    logger.error('Refresh token failed', { error: error.message });
    throw new AppError('Invalid refresh token', 401);
  }
};

const verifyEmail = async (token) => {
  if (!token) throw new AppError('Verification token is required', 400);
  const userId = await getRedisToken('user_verify', token);
  if (!userId) throw new AppError('Invalid or expired verification token', 400);
  await userRepository.verifyUser(userId);
  await deleteRedisToken('user_verify', token);
};

const forgotPassword = async (email) => {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new AppError('No account found with this email', 404);

  const resetToken = generateSecureToken();
  await storeRedisToken('user_reset', resetToken, user.id);

  try {
    const resetLink = `${process.env.FRONTEND_URL || 'https://buizz.com'}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your Buizz password',
      text: `Please reset your password by clicking: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5;">
          <div style="background: #0f0f1a; padding: 32px; text-align: center;">
            <h1 style="color: #ed1c72; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">BUIZZ</h1>
            <p style="color: #ffffff; margin: 8px 0 0; font-size: 14px;">Event Management Platform</p>
          </div>
          <div style="background: #ffffff; padding: 32px; border-radius: 8px; margin: 20px;">
            <h2 style="color: #0f0f1a; margin: 0 0 16px; font-size: 22px;">Reset Your Password</h2>
            <p style="color: #333; margin: 0 0 24px; font-size: 14px; line-height: 1.6;">
              You requested to reset your password. Click the button below to reset it:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="display: inline-block; background: #ed1c72; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; margin: 24px 0 8px; font-size: 12px;">Or copy and paste this link:</p>
            <p style="color: #ed1c72; margin: 0 0 24px; font-size: 12px; word-break: break-all;">${resetLink}</p>
            <p style="color: #666; margin: 0 0 8px; font-size: 12px;">This link will expire in 1 hour.</p>
            <p style="color: #666; margin: 0; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p style="margin: 0;">© Buizz Event Management Platform</p>
          </div>
        </div>
      `
    });
    logger.info('Password reset email sent', { userId: user.id, email: user.email });
  } catch (e) {
    logger.error('Failed to send password reset email', { error: e.message, email: user.email });
    // Continue even if email fails - token is still stored
  }

  if (process.env.NODE_ENV === 'development') return { resetToken };
  return {};
};

const sendOtp = async (email) => {
  if (!email) throw new AppError('Email is required', 400);
  
  try {
    const result = await sendEmailOtp(email);
    logger.info('OTP sent to email', { email, result });
    return { message: 'OTP sent to your email', ...result };
  } catch (error) {
    logger.error('Failed to send OTP', { email, error: error.message });
    throw new AppError(error.message, 500);
  }
};

const verifyOtp = async (email, otp) => {
  if (!email || !otp) throw new AppError('Email and OTP are required', 400);
  
  try {
    const result = await verifyEmailOtp(email, otp);
    logger.info('OTP verified successfully', { email });
    return { message: 'OTP verified successfully', ...result };
  } catch (error) {
    logger.warn('OTP verification failed', { email, error: error.message });
    throw new AppError(error.message, 400);
  }
};

const sendPasswordResetOtp = async (email) => {
  if (!email) throw new AppError('Email is required', 400);
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  // Keep the public response identical so this endpoint cannot be used to
  // enumerate registered accounts.
  if (!user) {
    logger.warn('Password reset OTP requested for an unknown email', { email: normalizedEmail });
    return { message: 'If an account exists, a password reset code has been sent.' };
  }

  const { code } = await verificationCodeService.create({
    channel: 'email',
    destination: normalizedEmail,
    purpose: 'password_reset',
  });
  const emailResult = await sendEmail({
    to: normalizedEmail,
    subject: 'Your Buizz password reset code',
    text: `Your Buizz password reset code is ${code}. It expires in 10 minutes. Do not share it with anyone.`,
    html: `<p>Your Buizz password reset code is:</p><h2 style="font-size:32px;letter-spacing:8px;margin:16px 0">${code}</h2><p>This code expires in 10 minutes. Do not share it with anyone.</p>`,
  });
  if (emailResult?.skipped) {
    throw new AppError(emailResult.error || 'Email delivery is not configured. Please contact support.', 503);
  }
  logger.info('Password reset OTP sent', { userId: user.id });
  return { message: 'If an account exists, a password reset code has been sent.' };
};

const verifyPasswordResetOtp = async (email, otp) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user) throw new AppError('Invalid or expired password reset code.', 400);

  const verification = await verificationCodeService.verify({
    channel: 'email',
    destination: normalizedEmail,
    purpose: 'password_reset',
    code: otp,
  });
  return {
    message: 'Password reset code verified.',
    verified: true,
    verificationToken: verification.verificationToken,
  };
};

const completePasswordReset = async (email, verificationToken, newPassword) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user) throw new AppError('Invalid or expired password reset verification.', 400);

  await verificationCodeService.consume({
    channel: 'email',
    destination: normalizedEmail,
    purpose: 'password_reset',
    verificationToken,
  });
  await userRepository.updatePassword(user.id, newPassword);
  logger.info('Password reset completed with OTP', { userId: user.id });
  return { message: 'Password reset successfully.' };
};

const resetPassword = async (token, newPassword) => {
  if (!token) throw new AppError('Reset token is required', 400);
  const userId = await getRedisToken('user_reset', token);
  if (!userId) throw new AppError('Invalid or expired reset token', 400);
  await userRepository.updatePassword(userId, newPassword);
  await deleteRedisToken('user_reset', token);
};

// Phone OTP — delivered via email since no SMS gateway is configured.
// OTP is stored keyed by phone number; the email is looked up from the users table.
const findUserByPhoneAnyFormat = async (phone) => {
  const normalised = String(phone || '').replace(/\s+/g, '');
  let user = await userRepository.findByPhone(normalised);
  if (user) return { user, normalised };

  const alternate = normalised.startsWith('+91') ? normalised.slice(3) : `+91${normalised}`;
  user = await userRepository.findByPhone(alternate);
  if (user) return { user, normalised: alternate };

  const digitsOnly = normalised.replace(/\D/g, '');
  if (digitsOnly && digitsOnly !== normalised) {
    user = await userRepository.findByPhone(digitsOnly);
    if (user) return { user, normalised: digitsOnly };
  }

  return { user: null, normalised };
};

const matchesPhoneLoginRole = (user, loginRole) => {
  if (!loginRole) return true;
  if (loginRole === 'organizer') return user?.role === USER_ROLES.ORGANIZER;
  return [USER_ROLES.CUSTOMER, 'customer'].includes(user?.role);
};

const sendPhoneOtp = async (
  phone,
  email,
  purpose = 'signup',
  loginRole = null,
  deliveryChannel = 'auto',
) => {
  if (!phone) throw new AppError('Phone number is required', 400);

  const { user, normalised } = await findUserByPhoneAnyFormat(phone);
  if (purpose === 'login' && (!user || !matchesPhoneLoginRole(user, loginRole))) {
    throw new AppError('No account found with this phone number', 404);
  }

  const { code: otp } = await verificationCodeService.create({
    channel: 'phone',
    destination: normalised,
    purpose,
  });

  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV] Phone OTP for ${normalised}: ${otp}`);
  }

  const delivery = await sendPhoneOtpWithEmailFallback({
    phone: user?.phone || normalised,
    email: user?.email || email,
    otp,
    name: user?.name || 'Buizz user',
    preferredChannel: deliveryChannel,
  });

  if (!delivery.whatsapp.sent && !delivery.email.sent) {
    throw new AppError('Failed to send OTP on WhatsApp or email. Please try again.', 500);
  }

  const channelLabel = delivery.channel === 'whatsapp'
    ? 'WhatsApp'
    : 'registered email address';
  const response = { message: `OTP sent to your ${channelLabel}`, delivery };
  if (process.env.NODE_ENV === 'development') response.devOtp = otp;
  return response;
};

const createLoginSessionForUser = async (user, ipAddress = null, userAgent = null, loginMethod = 'phone_otp') => {
  if (!user.isPhoneVerified) {
    await userRepository.updateById(user.id, { isPhoneVerified: true });
    user.isPhoneVerified = true;
  }
  await userRepository.updateLastLogin(user.id);

  const token = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);

  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const deviceInfo = UserAgentParser.parse(userAgent);
    const locationData = await UserAgentParser.getLocation(ipAddress);

    await sessionRepository.create({
      user_id: user.id,
      session_token: token,
      refresh_token: refreshToken,
      role: user.role,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceInfo.device_type,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      expires_at: expiresAt,
      session_data: { loginMethod },
      location_data: locationData,
    });

    await sessionRepository.logActivity({
      session_id: null,
      user_id: user.id,
      action: 'login',
      ip_address: ipAddress,
      user_agent: userAgent,
      action_details: { method: loginMethod, phone: user.phone },
    });
  } catch (error) {
    logger.error('Failed to create session after phone OTP login', { error: error.message, userId: user.id });
  }

  return {
    user: {
      id: user.id,
      displayId: user.displayId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
    },
    token,
    refreshToken,
  };
};

const verifyPhoneOtp = async (phone, otp, ipAddress = null, userAgent = null, purpose = 'signup', loginRole = null) => {
  if (!phone || !otp) throw new AppError('Phone and OTP are required', 400);
  const { user, normalised } = await findUserByPhoneAnyFormat(phone);
  if (purpose === 'login' && (!user || !matchesPhoneLoginRole(user, loginRole))) {
    throw new AppError('No account found with this phone number', 404);
  }

  const verification = await verificationCodeService.verify({
    channel: 'phone',
    destination: normalised,
    purpose,
    code: otp,
  });
  logger.info('Phone OTP verified', { phone: normalised });

  if (purpose !== 'login') {
    return {
      message: 'Phone verified successfully',
      verified: true,
      verificationToken: verification.verificationToken,
    };
  }

  await verificationCodeService.consume({
    channel: 'phone',
    destination: normalised,
    purpose: 'login',
    verificationToken: verification.verificationToken,
  });
  const session = await createLoginSessionForUser(user, ipAddress, userAgent, 'phone_otp');
  return { message: 'Phone verified and login successful', ...session };
};
module.exports = {
  register,
  login,
  googleLogin,
  facebookLogin,
  socialLogin,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  sendOtp,
  verifyOtp,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  completePasswordReset,
  sendPhoneOtp,
  verifyPhoneOtp,
};

