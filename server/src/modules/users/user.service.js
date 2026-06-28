const userRepository = require('./user.repository');
const privacyService = require('../../services/privacy.service');
const auditService = require('../../services/audit.service');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

class UserService {
  /**
   * Get user with privacy protection
   */
  async getUserById(userId, requesterRole = null, requesterId = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Apply privacy masking if requester role is provided
    if (requesterRole && String(userId) !== String(requesterId)) {
      const maskedUser = privacyService.maskUserContactDetails(user, requesterRole);
      
      // Log privacy access
      if (requesterId) {
        privacyService.logPrivacyAccess(
          { id: requesterId, role: requesterRole },
          { type: 'user_profile', count: 1 },
          requesterRole
        );
      }
      
      return {
        ...maskedUser,
        privacy: privacyService.getPrivacyNotice(requesterRole)
      };
    }
    
    return user;
  }

  async getUserByEmail(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async updateUser(userId, updateData) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await userRepository.findByEmail(updateData.email);
      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }
    }

    const updatedUser = await userRepository.updateById(userId, updateData);
    logger.info('User updated', { userId, fields: Object.keys(updateData) });
    return updatedUser;
  }

  async deleteUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    await userRepository.deleteById(userId);
    logger.info('User deleted', { userId });
    return { message: 'User deleted successfully' };
  }

  /**
   * Get all users with privacy protection
   */
  async getAllUsers(options, requesterRole = 'admin', requesterId = null) {
    const result = await userRepository.findAll(options);
    
    // Apply privacy masking for non-super admin users
    if (requesterRole !== 'super_admin') {
      const maskedUsers = privacyService.maskUserArray(result.users, requesterRole);
      
      // Log privacy access
      if (requesterId) {
        privacyService.logPrivacyAccess(
          { id: requesterId, role: requesterRole },
          { type: 'users_list', count: result.users.length },
          requesterRole
        );
      }
      
      return {
        ...result,
        users: maskedUsers,
        privacy: privacyService.getPrivacyNotice(requesterRole)
      };
    }
    
    return result;
  }

  async updateUserRole(userId, role) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await userRepository.updateById(userId, { role });
    logger.info('User role updated', { userId, role });
    return updatedUser;
  }

  async verifyUserEmail(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    await userRepository.verifyUser(userId);
    logger.info('User email verified', { userId });
    return { message: 'Email verified successfully' };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByEmailWithPassword(
      (await userRepository.findById(userId)).email
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    await userRepository.updatePassword(userId, newPassword);
    logger.info('User password changed', { userId });
    return { message: 'Password changed successfully' };
  }
}

module.exports = new UserService();
