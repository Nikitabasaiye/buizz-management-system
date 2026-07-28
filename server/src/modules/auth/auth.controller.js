const authService = require('./auth.service');
const { AppError } = require('../../middleware/errorHandler');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await authService.login(email, password, ipAddress, userAgent);
    
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const userId = req.user?.id || null;
    await authService.logout(token, userId);
    
    res.clearCookie('token');
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await authService.refreshToken(refreshToken, ipAddress, userAgent);
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const token = req.params.token || req.query.token;
    await authService.verifyEmail(token);
    
    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    
    const response = {
      status: 'success',
      message: 'Password reset link sent to email'
    };

    if (result?.resetToken) {
      response.data = {
        resetToken: result.resetToken
      };
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token || req.query.token;
    const { password } = req.body;
    await authService.resetPassword(token, password);
    
    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.sendOtp(email);
    
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOtp(email, otp);
    
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const sendPasswordResetOtp = async (req, res, next) => {
  try {
    const result = await authService.sendPasswordResetOtp(req.body.email);
    res.status(200).json({ status: 'success', message: result.message });
  } catch (error) {
    next(error);
  }
};

const verifyPasswordResetOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyPasswordResetOtp(req.body.email, req.body.otp);
    res.status(200).json({ status: 'success', message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};

const completePasswordReset = async (req, res, next) => {
  try {
    const result = await authService.completePasswordReset(
      req.body.email,
      req.body.verificationToken,
      req.body.password,
    );
    res.status(200).json({ status: 'success', message: result.message });
  } catch (error) {
    next(error);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) return next(new AppError('Google ID token is required', 400));
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await authService.googleLogin(idToken, ipAddress, userAgent, role);

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

const facebookLogin = async (req, res, next) => {
  try {
    const { accessToken, role } = req.body;
    if (!accessToken) return next(new AppError('Facebook access token is required', 400));
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await authService.facebookLogin(accessToken, ipAddress, userAgent, role);

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

const socialLogin = async (req, res, next) => {
  try {
    const { provider, idToken, accessToken, role } = req.body;
    if (!provider) return next(new AppError('Social provider is required', 400));
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await authService.socialLogin({ provider, idToken, accessToken, role, ipAddress, userAgent });

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

// Phone OTP — delivered via email (no SMS configured)
const sendPhoneOtp = async (req, res, next) => {
  try {
    const { phone, email, purpose, loginRole, deliveryChannel } = req.body;
    const result = await authService.sendPhoneOtp(phone, email, purpose, loginRole, deliveryChannel);
    res.status(200).json({ status: 'success', message: result.message, ...(result.devOtp && { devOtp: result.devOtp }) });
  } catch (error) {
    next(error);
  }
};

const verifyPhoneOtp = async (req, res, next) => {
  try {
    const { phone, otp, purpose, loginRole } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const result = await authService.verifyPhoneOtp(phone, otp, ipAddress, userAgent, purpose, loginRole);

    if (result.token) {
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.status(200).json({ status: 'success', message: result.message, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register, login, googleLogin, facebookLogin, socialLogin, logout, refreshToken, verifyEmail,
  forgotPassword, resetPassword, sendOtp, verifyOtp, sendPhoneOtp, verifyPhoneOtp,
  sendPasswordResetOtp, verifyPasswordResetOtp, completePasswordReset,
};
