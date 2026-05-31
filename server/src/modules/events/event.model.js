const mongoose = require('mongoose');
const { EVENT_STATUS } = require('../../constants');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['online', 'offline', 'hybrid'],
    default: 'offline'
  },
  status: {
    type: String,
    enum: Object.values(EVENT_STATUS),
    default: EVENT_STATUS.DRAFT
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  venue: {
    name: String,
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  onlineLink: String,
  banner: String,
  images: [String],
  ticketTypes: [{
    name: String,
    price: Number,
    quantity: Number,
    sold: { type: Number, default: 0 },
    description: String
  }],
  tags: [String],
  isFeatured: {
    type: Boolean,
    default: false
  },
  totalSeats: Number,
  availableSeats: Number,
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ slug: 1 }, { unique: true });
eventSchema.index({ organizationId: 1 });
eventSchema.index({ organizerId: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });

module.exports = mongoose.model('Event', eventSchema);
