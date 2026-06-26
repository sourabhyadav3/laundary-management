const express = require('express');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

const formatPayment = (payment) => {
  return {
    id: payment._id.toString(),
    paymentId: payment.paymentId,
    orderId: payment.order ? payment.order.toString() : '',
    orderNumber: payment.orderNumber,
    customerName: payment.customerName,
    date: payment.date,
    amount: payment.amount,
    method: payment.method,
    status: payment.status
  };
};

// @route   GET /api/payments
// @desc    Get all payments ledger
router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};
    if (req.user.branch) {
      const orders = await Order.find({ branchId: req.user.branch }).select('_id');
      const orderIds = orders.map(o => o._id);
      query = { order: { $in: orderIds } };
    }
    const payments = await Payment.find(query).sort({ createdAt: -1 });
    res.json(payments.map(formatPayment));
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   POST /api/payments
// @desc    Register a new payment checkout register
router.post('/', authenticate, requirePermission('manage_payments'), async (req, res) => {
  try {
    const { orderId, orderNumber, customerName, amount, method, status } = req.body;

    if (!orderId || !orderNumber || !customerName || amount === undefined) {
      return res.status(400).json({ message: 'Missing payment details.' });
    }

    const latestPayment = await Payment.findOne().sort({ createdAt: -1 });
    let nextNum = 1;
    if (latestPayment && latestPayment.paymentId) {
      const match = latestPayment.paymentId.match(/PAY-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const paymentId = `PAY-${String(nextNum).padStart(4, '0')}`;

    const payment = new Payment({
      paymentId,
      order: orderId,
      orderNumber,
      customerName,
      date: new Date().toISOString().split('T')[0],
      amount,
      method: method || 'Pending',
      status: status || 'Pending'
    });

    await payment.save();
    res.status(201).json(formatPayment(payment));
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   PUT /api/payments/:id
// @desc    Update checkout payment method and mark order as Paid
router.put('/:id', authenticate, requirePermission('manage_payments'), async (req, res) => {
  try {
    const { method, status } = req.body;
    if (!method) {
      return res.status(400).json({ message: 'Payment method is required.' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment ledger entry not found.' });
    }

    payment.method = method;
    payment.status = status || 'Paid';
    await payment.save();

    // Sync with order payment status
    if (payment.status === 'Paid') {
      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = 'Paid';
        await order.save();
      }
    }

    res.json(formatPayment(payment));
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
