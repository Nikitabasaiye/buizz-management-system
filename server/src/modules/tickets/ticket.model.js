const mongoose = require('mongoose');
const { TICKET_STATUS } = require('../../constants');

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  ticketType: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  qrCode: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TICKET_STATUS),
    default: TICKET_STATUS.ACTIVE
  },
  scannedAt: Date,
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

ticketSchema.index({ ticketNumber: 1 }, { unique: true });
ticketSchema.index({ eventId: 1 });
ticketSchema.index({ userId: 1 });
ticketSchema.index({ paymentId: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
