const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  method: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Pending'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending', 'Partial'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
