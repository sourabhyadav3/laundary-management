const express = require('express');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Branch = require('../models/Branch');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const { authenticate, requirePermission } = require('../middleware/auth');
const notify = require('../utils/notify');

const router = express.Router();

const formatOrder = (order) => {
  return {
    id: order._id.toString(),
    number: order.number,
    customerId: order.customer ? order.customer.toString() : '',
    customerName: order.customerName,
    serviceType: order.serviceType,
    status: order.status,
    paymentStatus: order.paymentStatus,
    amount: order.amount,
    tax: order.tax,
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount || 0.0,
    date: order.date,
    pickupDate: order.pickupDate || '',
    deliveryDate: order.deliveryDate || '',
    deliveryType: order.deliveryType,
    notes: order.notes || '',
    createdBy: order.createdBy,
    branchId: order.branchId ? order.branchId.toString() : '',
    itemDetails: order.itemDetails.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      modifiers: item.modifiers || ''
    })),
    timeline: order.timeline.map(t => ({
      status: t.status,
      date: t.date,
      time: t.time,
      updatedBy: t.updatedBy,
      comment: t.comment || ''
    }))
  };
};

// Helper helper to format current date/time for timeline
const getTimelineDateTime = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }); // MM/DD/YYYY
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); // HH:MM AM/PM
  return { dateStr, timeStr };
};

// @route   GET /api/orders
// @desc    Get orders with optional filters (branchId, status)
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, status } = req.query;
    const filter = {};
    
    if (req.user.branch) {
      filter.branchId = req.user.branch;
    } else if (branchId) {
      filter.branchId = branchId;
    }
    
    if (status) filter.status = status;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders.map(formatOrder));
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   POST /api/orders
// @desc    Create new order (Make Invoice)
router.post('/', authenticate, requirePermission('create_orders'), async (req, res) => {
  try {
    const {
      customerId, customerName, serviceType, amount, tax, totalAmount, discountAmount,
      date, deliveryDate, deliveryType, notes, itemDetails, paymentStatus, paymentMethod
    } = req.body;

    if (!customerId || !customerName || !serviceType || amount === undefined || tax === undefined || totalAmount === undefined || !itemDetails) {
      return res.status(400).json({ message: 'Missing required order details.' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(400).json({ message: 'Customer not found.' });
    }

    // Auto-generate invoice number if not provided in request body
    let orderNumber = req.body.number;
    if (!orderNumber) {
      const latestOrder = await Order.findOne().sort({ createdAt: -1 });
      let nextNum = 101;
      if (latestOrder && latestOrder.number) {
        const match = latestOrder.number.match(/ORD-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      orderNumber = `ORD-${String(nextNum).padStart(5, '0')}`;
    }

    // Get current branch with fallback options
    let finalBranchId = req.user.branch || req.body.branchId;
    if (!finalBranchId) {
      const fallbackBranch = await Branch.findOne();
      if (fallbackBranch) {
        finalBranchId = fallbackBranch._id;
      } else {
        return res.status(400).json({ message: 'No branch is configured in the system. Please create a branch first.' });
      }
    }

    const { dateStr, timeStr } = getTimelineDateTime();

    const order = new Order({
      number: orderNumber,
      customer: customer._id,
      customerName,
      serviceType,
      status: 'Waiting',
      paymentStatus: paymentStatus || 'Pending',
      amount,
      tax,
      totalAmount,
      discountAmount: discountAmount || 0.0,
      date: date || new Date().toISOString().split('T')[0],
      deliveryDate,
      deliveryType: deliveryType || 'Branch Pickup',
      notes,
      createdBy: req.user.name,
      branchId: finalBranchId,
      itemDetails: itemDetails || [],
      timeline: [{
        status: 'Waiting',
        date: dateStr,
        time: timeStr,
        updatedBy: req.user.name,
        comment: 'Invoice created'
      }]
    });

    await order.save();

    await notify(
      'New Order Created',
      `Order ${order.number} was created for ${customerName}.`,
      'order'
    );

    // Increment customer loyalty metrics
    customer.totalSpent += parseFloat(totalAmount);
    customer.loyaltyPoints += Math.floor(totalAmount); // 1 point per 1 unit spent

    // Handle payment ledger and outstanding customer balance
    if (order.paymentStatus === 'Pending') {
      customer.balance = (customer.balance || 0) + parseFloat(totalAmount);
    } else if (order.paymentStatus === 'Paid') {
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
        order: order._id,
        orderNumber: order.number,
        customerName: customerName,
        date: new Date().toISOString().split('T')[0],
        amount: parseFloat(totalAmount),
        method: paymentMethod || 'Cash',
        status: 'Paid'
      });
      await payment.save();
    }

    await customer.save();

    // Auto-schedule delivery if deliveryType is Home Delivery
    let deliveryStatus = 'None';
    if (deliveryType === 'Home Delivery') {
      const latestDelivery = await Delivery.findOne().sort({ createdAt: -1 });
      let nextDelNum = 1;
      if (latestDelivery && latestDelivery.deliveryId) {
        const delMatch = latestDelivery.deliveryId.match(/DEL-(\d+)/);
        if (delMatch) {
          nextDelNum = parseInt(delMatch[1], 10) + 1;
        }
      }
      const deliveryId = `DEL-${String(nextDelNum).padStart(3, '0')}`;

      const delivery = new Delivery({
        deliveryId,
        customer: customerName,
        deliveryDate: deliveryDate || '',
        orderCount: 1,
        status: 'Scheduled',
        address: `${customer.areaName}, St. ${customer.street || ''}, House ${customer.houseNo || ''}`,
        contactNumber: customer.phone,
        orderNumber: order.number,
        areaName: customer.areaName,
        createdFromInvoice: true,
        branchId: order.branchId
      });
      await delivery.save();
      await notify(
        'New Delivery Scheduled',
        `Delivery ${deliveryId} scheduled for ${customerName}.`,
        'delivery'
      );
      deliveryStatus = 'Scheduled';
    }

    res.status(201).json({
      id: order._id.toString(),
      number: order.number,
      status: order.status,
      deliveryStatus
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status and append to timeline
router.put('/:id/status', authenticate, requirePermission('manage_orders'), async (req, res) => {
  try {
    const { status, holdComment } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const { dateStr, timeStr } = getTimelineDateTime();

    order.status = status;
    order.timeline.push({
      status,
      date: dateStr,
      time: timeStr,
      updatedBy: req.user.name,
      comment: holdComment || ''
    });

    // If order gets delivered, update payment status if unpaid, or handle delivery completion links
    if (status === 'Delivered') {
      order.paymentStatus = 'Paid';
    }

    await order.save();

    await notify(
      'Order Status Updated',
      `Order ${order.number} status changed to ${status}.`,
      'order'
    );

    res.json(formatOrder(order));
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   PUT /api/orders/:id/payment-status
// @desc    Update order payment status
router.put('/:id/payment-status', authenticate, requirePermission('manage_orders'), async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!paymentStatus) {
      return res.status(400).json({ message: 'paymentStatus is required.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    order.paymentStatus = paymentStatus;
    await order.save();
    res.json(formatOrder(order));
  } catch (error) {
    console.error('Update order payment status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Delete an order by ID
router.delete('/:id', authenticate, requirePermission('manage_orders'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted successfully.' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
