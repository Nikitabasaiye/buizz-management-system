const organizationService = require('./organization.service');

class OrganizationController {
  async createOrganization(req, res, next) {
    try {
      const organization = await organizationService.createOrganization(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: 'Organization created successfully',
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationById(req, res, next) {
    try {
      const organization = await organizationService.getOrganizationById(req.params.id);
      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  async updateOrganization(req, res, next) {
    try {
      const organization = await organizationService.updateOrganization(
        req.params.id,
        req.body,
        req.user.id
      );
      res.status(200).json({
        success: true,
        message: 'Organization updated successfully',
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteOrganization(req, res, next) {
    try {
      const result = await organizationService.deleteOrganization(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllOrganizations(req, res, next) {
    try {
      const result = await organizationService.getAllOrganizations(req.query);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async addMember(req, res, next) {
    try {
      const { userId, role } = req.body;
      const member = await organizationService.addMember(
        req.params.id,
        req.user.id,
        userId,
        role
      );
      res.status(201).json({
        success: true,
        message: 'Member added successfully',
        data: member
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const result = await organizationService.removeMember(
        req.params.id,
        req.user.id,
        req.params.memberId
      );
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req, res, next) {
    try {
      const members = await organizationService.getMembers(req.params.id);
      res.status(200).json({
        success: true,
        data: members
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrganizationController();
