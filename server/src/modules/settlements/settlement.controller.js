const settlementService = require('./settlement.service');
const uploadService = require('../../services/upload.service');
const auditService = require('../../services/audit.service');

const getMyBankAccount = async (req, res, next) => {
  try {
    const data = await settlementService.getBankAccount(req.user.id, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getOrganizerBankAccount = async (req, res, next) => {
  try {
    const data = await settlementService.getBankAccount(req.params.organizerId, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const saveMyBankAccount = async (req, res, next) => {
  try {
    // Process uploaded documents
    let documents = {};
    if (req.files) {
      if (req.files.passbook) {
        const passbookFile = await uploadService.processUpload(
          req.files.passbook[0], 
          req.user.id,
          'passbook'
        );
        documents.passbook = passbookFile;
      }
      if (req.files.cheque) {
        const chequeFile = await uploadService.processUpload(
          req.files.cheque[0], 
          req.user.id,
          'cheque'
        );
        documents.cheque = chequeFile;
      }
    }

    const data = await settlementService.saveBankAccount(
      req.user.id, 
      { ...req.body, documents }, 
      req.user
    );

    // Log audit
    await auditService.logAction({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'bank_account_created',
      actionType: 'create',
      resourceType: 'bank_account',
      description: 'Bank account created with documents',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { 
        hasPassbook: !!documents.passbook,
        hasCheque: !!documents.cheque,
        bankName: req.body.bankName 
      },
      severity: 'medium'
    });

    res.status(200).json({ success: true, message: 'Bank account saved with documents', data });
  } catch (error) {
    next(error);
  }
};

const saveOrganizerBankAccount = async (req, res, next) => {
  try {
    // Process uploaded documents
    let documents = {};
    if (req.files) {
      if (req.files.passbook) {
        const passbookFile = await uploadService.processUpload(
          req.files.passbook[0], 
          req.params.organizerId,
          'passbook'
        );
        documents.passbook = passbookFile;
      }
      if (req.files.cheque) {
        const chequeFile = await uploadService.processUpload(
          req.files.cheque[0], 
          req.params.organizerId,
          'cheque'
        );
        documents.cheque = chequeFile;
      }
    }

    const data = await settlementService.saveBankAccount(
      req.params.organizerId, 
      { ...req.body, documents }, 
      req.user
    );

    // Log audit
    await auditService.logAction({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'organizer_bank_account_updated',
      actionType: 'update',
      resourceType: 'bank_account',
      resourceId: req.params.organizerId,
      description: `Admin updated bank account for organizer ${req.params.organizerId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { 
        targetOrganizerId: req.params.organizerId,
        hasPassbook: !!documents.passbook,
        hasCheque: !!documents.cheque,
        bankName: req.body.bankName 
      },
      severity: 'medium'
    });

    res.status(200).json({ success: true, message: 'Bank account saved with documents', data });
  } catch (error) {
    next(error);
  }
};

const getEligibleGroups = async (req, res, next) => {
  try {
    const data = await settlementService.getEligibleGroups(req.query, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getMySummary = async (req, res, next) => {
  try {
    const data = await settlementService.getOrganizerSummary(req.user.id, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getOrganizerSummary = async (req, res, next) => {
  try {
    const data = await settlementService.getOrganizerSummary(req.params.organizerId, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const generateSettlement = async (req, res, next) => {
  try {
    const data = await settlementService.generateSettlement(req.body, req.user);
    res.status(201).json({ success: true, message: 'Settlement generated', data });
  } catch (error) {
    next(error);
  }
};

const generateAllEligibleSettlements = async (req, res, next) => {
  try {
    const data = await settlementService.generateAllEligibleSettlements(req.user);
    res.status(201).json({ success: true, message: 'Eligible settlements generated', data });
  } catch (error) {
    next(error);
  }
};

const listSettlements = async (req, res, next) => {
  try {
    const data = await settlementService.listSettlements(req.query, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getSettlementById = async (req, res, next) => {
  try {
    const data = await settlementService.getSettlementById(req.params.id, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const updateSettlementStatus = async (req, res, next) => {
  try {
    const data = await settlementService.updateSettlementStatus(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, message: 'Settlement updated', data });
  } catch (error) {
    next(error);
  }
};

const verifyBankAccount = async (req, res, next) => {
  try {
    const data = await settlementService.verifyBankAccount(
      req.params.organizerId,
      req.body,
      req.user
    );

    // Log audit
    await auditService.logAction({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: `bank_account_${req.body.status}`,
      actionType: req.body.status === 'verified' ? 'approve' : 'reject',
      resourceType: 'bank_account',
      resourceId: req.params.organizerId,
      description: `Bank account ${req.body.status} for organizer ${req.params.organizerId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { 
        targetOrganizerId: req.params.organizerId,
        rejectionReason: req.body.rejectionReason 
      },
      severity: 'high'
    });

    res.status(200).json({ 
      success: true, 
      message: `Bank account ${req.body.status} successfully`, 
      data 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyBankAccount,
  getOrganizerBankAccount,
  saveMyBankAccount,
  saveOrganizerBankAccount,
  verifyBankAccount,
  getEligibleGroups,
  getMySummary,
  getOrganizerSummary,
  generateSettlement,
  generateAllEligibleSettlements,
  listSettlements,
  getSettlementById,
  updateSettlementStatus,
};
