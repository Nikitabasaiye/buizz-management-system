const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../../constants');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  transactionId: String,
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  paymentMethod: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  ticketIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }],
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

paymentSchema.index({ userId: 1 });
paymentSchema.index({ eventId: 1 });
paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
