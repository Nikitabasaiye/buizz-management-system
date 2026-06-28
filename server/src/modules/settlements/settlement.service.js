const settlementRepository = require('./settlement.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 2);
const SETTLEMENT_HOLD_DAYS = Number(process.env.SETTLEMENT_HOLD_DAYS || 4);

const roundMoney = (value) => Number((Math.round(Number(value) * 100) / 100).toFixed(2));

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toMySQLDateTime = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

const sanitizeBankAccount = (account) => {
  if (!account) return null;
  const number = account.bank_account_number || account.bankAccountNumber || '';
  return {
    id: account.id,
    organizerId: account.organizer_id || account.organizerId,
    accountHolderName: account.account_holder_name || account.accountHolderName,
    bankAccountNumber: number ? `****${String(number).slice(-4)}` : null,
    bankIfscCode: account.bank_ifsc_code || account.bankIfscCode,
    bankName: account.bank_name || account.bankName,
    upiId: account.upi_id || account.upiId,
    isVerified: Boolean(account.is_verified || account.isVerified),
    isActive: Boolean(account.is_active ?? account.isActive),
    verificationStatus: account.verification_status || account.verificationStatus || 'pending',
    verifiedAt: account.verified_at || account.verifiedAt,
    rejectionReason: account.rejection_reason || account.rejectionReason,
    hasDocuments: account.bank_documents ? Object.keys(JSON.parse(account.bank_documents || '{}')).length > 0 : false,
  };
};

const toNumber = (value) => Number(Number(value || 0).toFixed(2));

const formatSummary = (summary) => ({
  totals: {
    totalPaymentCount: Number(summary.totals.total_payment_count || 0),
    totalGrossAmount: toNumber(summary.totals.total_gross_amount),
    totalPlatformFeeAmount: toNumber(summary.totals.total_platform_fee_amount),
    totalNetAmount: toNumber(summary.totals.total_net_amount),
    pendingNetAmount: toNumber(summary.totals.pending_net_amount),
    eligibleNetAmount: toNumber(summary.totals.eligible_net_amount),
    processingNetAmount: toNumber(summary.totals.processing_net_amount),
    settledNetAmount: toNumber(summary.totals.settled_net_amount),
    cancelledNetAmount: toNumber(summary.totals.cancelled_net_amount),
  },
  settlementsByStatus: summary.settlementsByStatus.map((row) => ({
    status: row.status,
    settlementCount: Number(row.settlement_count || 0),
    netAmount: toNumber(row.net_amount),
  })),
  upcoming: summary.upcoming.map((row) => ({
    eventId: row.event_id,
    eventTitle: row.event_title,
    eventStatus: row.event_status,
    paymentCount: Number(row.payment_count || 0),
    netAmount: toNumber(row.net_amount),
    eligibleAt: row.eligible_at,
  })),
});

class SettlementService {
  async saveBankAccount(organizerId, data, requester) {
    const targetOrganizerId = requester.role === 'organizer' ? requester.id : organizerId;
    if (!targetOrganizerId) throw new AppError('Organizer ID is required', 400);

    // Prepare bank account data with documents
    const bankAccountData = {
      accountHolderName: data.accountHolderName,
      bankAccountNumber: data.bankAccountNumber,
      bankIfscCode: data.bankIfscCode,
      bankName: data.bankName,
      upiId: data.upiId,
    };

    // Add documents if provided
    if (data.documents && Object.keys(data.documents).length > 0) {
      bankAccountData.bankDocuments = data.documents;
      // Reset verification status when new documents are uploaded
      bankAccountData.verificationStatus = 'pending';
      bankAccountData.verifiedBy = null;
      bankAccountData.verifiedAt = null;
      bankAccountData.rejectionReason = null;
    }

    const account = await settlementRepository.upsertBankAccount(targetOrganizerId, bankAccountData);
    return sanitizeBankAccount(account);
  }

  async getBankAccount(organizerId, requester) {
    const targetOrganizerId = requester.role === 'organizer' ? requester.id : organizerId;
    if (!targetOrganizerId) throw new AppError('Organizer ID is required', 400);

    const account = await settlementRepository.findBankAccountByOrganizer(targetOrganizerId);
    return sanitizeBankAccount(account);
  }

  async verifyBankAccount(organizerId, data, requester) {
    if (!['admin', 'super_admin'].includes(requester.role)) {
      throw new AppError('Only admins can verify bank accounts', 403);
    }

    const verificationData = {
      verificationStatus: data.status,
      verifiedBy: requester.id,
      verifiedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      rejectionReason: data.status === 'rejected' ? data.rejectionReason : null,
      isVerified: data.status === 'verified' ? 1 : 0
    };

    // Update both organizer_bank_accounts and users table
    const account = await settlementRepository.verifyBankAccount(organizerId, verificationData);
    if (!account) {
      throw new AppError('Bank account not found', 404);
    }

    return sanitizeBankAccount(account);
  }

  async recordCompletedPayment(orderId) {
    const payment = await settlementRepository.findPaymentForSettlement(orderId);
    if (!payment) throw new AppError('Payment not found for settlement', 404);
    if (payment.status !== 'completed') return null;
    if (!payment.organizer_id) throw new AppError('Payment event organizer not found', 400);

    const grossAmount = roundMoney(payment.amount);
    const platformFeeAmount = roundMoney(grossAmount * (PLATFORM_FEE_PERCENT / 100));
    const netAmount = roundMoney(grossAmount - platformFeeAmount);
    const eventEndDate = payment.end_date ? new Date(payment.end_date) : new Date();
    const eligibleAt = addDays(eventEndDate, SETTLEMENT_HOLD_DAYS);

    const item = await settlementRepository.createSettlementItem({
      paymentId: payment.payment_id,
      bookingId: payment.booking_id,
      eventId: payment.event_id,
      organizerId: payment.organizer_id,
      grossAmount,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      platformFeeAmount,
      netAmount,
      currency: payment.currency || 'INR',
      eligibleAt: toMySQLDateTime(eligibleAt),
    });

    logger.info('Settlement item recorded', {
      orderId,
      paymentId: payment.payment_id,
      organizerId: payment.organizer_id,
      eventId: payment.event_id,
      netAmount,
      eligibleAt,
    });

    return item;
  }

  async reversePaymentSettlement(orderId) {
    if (!orderId) throw new AppError('Order ID is required', 400);

    const result = await settlementRepository.cancelSettlementItemByOrderId(orderId);
    if (result?.alreadySettled) {
      logger.warn('Settlement item reversal skipped because payout is already settled', {
        orderId,
        settlementId: result.item.settlement_id,
        paymentId: result.item.payment_id,
      });
      return result;
    }

    if (result?.cancelled) {
      logger.info('Settlement item cancelled', {
        orderId,
        settlementId: result.item.settlement_id,
        paymentId: result.item.payment_id,
      });
    }

    return result;
  }

  async getEligibleGroups(filters, requester) {
    const scopedFilters = { ...filters };
    if (requester.role === 'organizer') {
      scopedFilters.organizerId = requester.id;
    }
    return settlementRepository.getEligibleGroups(scopedFilters);
  }

  async getOrganizerSummary(organizerId, requester) {
    const targetOrganizerId = requester.role === 'organizer' ? requester.id : organizerId;
    if (!targetOrganizerId) throw new AppError('Organizer ID is required', 400);

    const summary = await settlementRepository.getOrganizerSummary(targetOrganizerId);
    return formatSummary(summary);
  }

  async generateSettlement(data, requester) {
    if (!['admin', 'super_admin'].includes(requester.role)) {
      throw new AppError('Only admins can generate settlements', 403);
    }

    const result = await settlementRepository.createSettlementFromEligibleItems({
      organizerId: data.organizerId,
      eventId: data.eventId,
      createdBy: requester.id,
    });

    if (!result) throw new AppError('No eligible settlement items found', 404);
    if (result.alreadyExists) throw new AppError('Settlement already exists for this event', 409);
    if (result.missingBankAccount) throw new AppError('Organizer bank account is missing', 400);
    if (result.verificationRequired) throw new AppError('Organizer KYC and bank verification must be approved before settlement', 400);

    return result;
  }

  async generateAllEligibleSettlements(requester) {
    if (!['admin', 'super_admin'].includes(requester.role)) {
      throw new AppError('Only admins can generate settlements', 403);
    }

    const results = await settlementRepository.createSettlementsForAllEligibleGroups({
      createdBy: requester.id,
    });

    return {
      generatedCount: results.filter((item) => (
        item.settlement &&
        !item.settlement.alreadyExists &&
        !item.settlement.missingBankAccount &&
        !item.settlement.verificationRequired
      )).length,
      skippedCount: results.filter((item) => (
        !item.settlement ||
        item.settlement.alreadyExists ||
        item.settlement.missingBankAccount ||
        item.settlement.verificationRequired
      )).length,
      results,
    };
  }

  async listSettlements(filters, requester) {
    const scopedFilters = { ...filters };
    if (requester.role === 'organizer') {
      scopedFilters.organizerId = requester.id;
    }
    return settlementRepository.listSettlements(scopedFilters);
  }

  async getSettlementById(settlementId, requester) {
    const settlement = await settlementRepository.findSettlementById(settlementId);
    if (!settlement) throw new AppError('Settlement not found', 404);

    if (requester.role === 'organizer' && String(settlement.organizer_id) !== String(requester.id)) {
      throw new AppError('Access denied', 403);
    }

    const items = await settlementRepository.listSettlementItems(settlementId);
    return { ...settlement, items };
  }

  async updateSettlementStatus(settlementId, data, requester) {
    if (!['admin', 'super_admin'].includes(requester.role)) {
      throw new AppError('Only admins can update settlement status', 403);
    }

    const allowed = ['pending', 'processing', 'paid', 'failed', 'cancelled'];
    if (!allowed.includes(data.status)) {
      throw new AppError('Invalid settlement status', 400);
    }

    const settlement = await settlementRepository.findSettlementById(settlementId);
    if (!settlement) throw new AppError('Settlement not found', 404);
    if (settlement.status === 'paid') throw new AppError('Paid settlements cannot be changed', 400);

    if (data.status === 'paid' && !data.payoutReference && !data.bankReferenceId) {
      throw new AppError('Payout reference or bank reference ID is required when marking settlement paid', 400);
    }

    return settlementRepository.updateSettlementStatus(settlementId, data);
  }
}

module.exports = new SettlementService();
