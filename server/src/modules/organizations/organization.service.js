const organizationRepository = require('./organization.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

class OrganizationService {
  async createOrganization(organizationData, ownerId) {
    const slug = this.generateSlug(organizationData.name);
    
    const existingOrg = await organizationRepository.findBySlug(slug);
    if (existingOrg) {
      throw new AppError('Organization with this name already exists', 400);
    }

    const organization = await organizationRepository.create({
      ...organizationData,
      slug,
      owner_id: ownerId
    });

    await organizationRepository.addMember(organization.id, ownerId, 'owner');

    logger.info('Organization created', { organizationId: organization.id, ownerId });
    return organization;
  }

  async getOrganizationById(organizationId) {
    const organization = await organizationRepository.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }
    return organization;
  }

  async updateOrganization(organizationId, updateData, userId) {
    const organization = await organizationRepository.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    const isOwner = await organizationRepository.isOwnerOrAdmin(organizationId, userId);
    if (!isOwner) {
      throw new AppError('You do not have permission to update this organization', 403);
    }

    const updatedOrg = await organizationRepository.updateById(organizationId, updateData);
    logger.info('Organization updated', { organizationId, userId });
    return updatedOrg;
  }

  async deleteOrganization(organizationId, userId) {
    const organization = await organizationRepository.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    if (organization.owner_id !== userId) {
      throw new AppError('Only the owner can delete this organization', 403);
    }

    await organizationRepository.deleteById(organizationId);
    logger.info('Organization deleted', { organizationId, userId });
    return { message: 'Organization deleted successfully' };
  }

  async getAllOrganizations(options) {
    const result = await organizationRepository.findAll(options);
    return result;
  }

  async addMember(organizationId, userId, memberId, role = 'member') {
    const organization = await organizationRepository.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    const isOwnerOrAdmin = await organizationRepository.isOwnerOrAdmin(organizationId, userId);
    if (!isOwnerOrAdmin) {
      throw new AppError('You do not have permission to add members', 403);
    }

    const member = await organizationRepository.addMember(organizationId, memberId, role);
    logger.info('Member added to organization', { organizationId, memberId, role });
    return member;
  }

  async removeMember(organizationId, userId, memberId) {
    const organization = await organizationRepository.findById(organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    const isOwnerOrAdmin = await organizationRepository.isOwnerOrAdmin(organizationId, userId);
    if (!isOwnerOrAdmin) {
      throw new AppError('You do not have permission to remove members', 403);
    }

    if (organization.owner_id === memberId) {
      throw new AppError('Cannot remove the owner from the organization', 400);
    }

    await organizationRepository.removeMember(organizationId, memberId);
    logger.info('Member removed from organization', { organizationId, memberId });
    return { message: 'Member removed successfully' };
  }

  async getMembers(organizationId) {
    const members = await organizationRepository.getMembers(organizationId);
    return members;
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now().toString(36);
  }
}

module.exports = new OrganizationService();
