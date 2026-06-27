const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Pickup = require('../models/Pickup');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const Driver = require('../models/Driver');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Helper to apply branch filter based on user role
const applyBranchFilter = (req, baseFilter = {}) => {
  if (req.user.role !== 'Super Admin' && req.user.branch) {
    return { ...baseFilter, branchId: new mongoose.Types.ObjectId(req.user.branch) };
  }
  return baseFilter;
};

// Helper for date range filter
const applyDateFilter = (start, end, dateField = 'date', baseFilter = {}) => {
  const filter = { ...baseFilter };
  if (start || end) {
    filter[dateField] = {};
    if (start) filter[dateField].$gte = start;
    if (end) filter[dateField].$lte = end;
  }
  return filter;
};

// Helper to categorize service revenue based on frontend logic keywords
const categorizeService = (serviceType, amount) => {
  const name = (serviceType || '').toLowerCase();
  const premium = ['premium', 'silk', 'wool', 'wedding', 'leather', 'stain'];
  const dry = ['dry clean'];
  const iron = ['iron', 'pressing', 'press'];

  if (premium.some(k => name.includes(k))) return { cat: 'Premium', val: amount };
  if (dry.some(k => name.includes(k))) return { cat: 'Dry Clean', val: amount };
  if (iron.some(k => name.includes(k))) return { cat: 'Ironing', val: amount };
  return { cat: 'Washing', val: amount };
};

// @route   GET /api/reports/dashboard
// @desc    Get metrics for dashboard charts and summaries
router.get('/dashboard', authenticate, requirePermission('view_reports'), async (req, res) => {
  try {
    const { start, end } = req.query;
    
    // Build filters
    const orderFilter = applyBranchFilter(req, applyDateFilter(start, end, 'date'));
    const paymentFilter = applyBranchFilter(req, applyDateFilter(start, end, 'date'));
    
    const orders = await Order.find(orderFilter);
    const payments = await Payment.find(paymentFilter);
    const customers = await Customer.find({});
    
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || o.amount || 0), 0);
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'Delivered').length;
    
    const terminalStatuses = ['Delivered', 'Return', 'Cancelled', 'Store', 'In Store'];
    const pendingOrders = orders.filter(o => !terminalStatuses.includes(o.status)).length;
    
    const activeCustomers = customers.filter(c => c.status === 'Active').length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Service Revenue Dist
    const serviceRevenue = { washing: 0, dryCleaning: 0, ironing: 0, premium: 0 };
    orders.forEach(o => {
      const res = categorizeService(o.serviceType, o.totalAmount || o.amount || 0);
      if (res.cat === 'Premium') serviceRevenue.premium += res.val;
      else if (res.cat === 'Dry Clean') serviceRevenue.dryCleaning += res.val;
      else if (res.cat === 'Ironing') serviceRevenue.ironing += res.val;
      else serviceRevenue.washing += res.val;
    });

    // Payment Distribution
    const paymentDistribution = { Cash: 0, Card: 0, Link: 0, Wamd: 0 };
    payments.forEach(p => {
      if (paymentDistribution[p.method] !== undefined) {
        paymentDistribution[p.method] += (p.amount || 0);
      }
    });
    
    res.json({
      summary: {
        totalRevenue,
        totalOrders,
        completedOrders,
        pendingOrders,
        activeCustomers,
        averageOrderValue
      },
      periodOrders: orders,
      serviceRevenue,
      paymentDistribution,
      periodPayments: payments
    });
  } catch (error) {
    console.error('Reports Dashboard Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   GET /api/reports/generate
// @desc    Generate specific tabular reports
router.get('/generate', authenticate, requirePermission('view_reports'), async (req, res) => {
  try {
    const { reportType, category, parameter, start, end } = req.query;
    const orderFilter = applyBranchFilter(req, applyDateFilter(start, end, 'date'));
    
    let data = [];
    
    if (reportType === 'branch_sales') {
       const orders = await Order.find(applyDateFilter(start, end, 'date')).populate('branchId');
       const groups = {};
       orders.forEach(o => {
         const bName = o.branchId ? o.branchId.name : 'Unknown';
         if (req.user.role !== 'Super Admin' && req.user.branch !== (o.branchId && o.branchId._id.toString())) {
            return;
         }
         if (parameter && parameter !== 'All' && bName !== parameter) return;
         if (!groups[bName]) groups[bName] = { branch: bName, count: 0, revenue: 0 };
         groups[bName].count += 1;
         groups[bName].revenue += (o.totalAmount || 0);
       });
       data = Object.values(groups).map(g => ({
         ...g,
         avgValue: g.count > 0 ? g.revenue / g.count : 0
       }));
    }
    else if (reportType === 'total_sales') {
       const orders = await Order.find(orderFilter);
       const groups = {};
       orders.forEach(o => {
         if (!groups[o.date]) {
           groups[o.date] = { date: o.date, count: 0, subtotal: 0, discount: 0, tax: 0, total: 0 };
         }
         groups[o.date].count += 1;
         groups[o.date].subtotal += (Number(o.amount) || 0);
         groups[o.date].discount += (Number(o.discountAmount) || 0);
         groups[o.date].tax += (Number(o.tax) || 0);
         groups[o.date].total += (Number(o.totalAmount) || 0);
       });
       data = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    }
    else if (reportType === 'sales_detail') {
       const orders = await Order.find(orderFilter);
       orders.forEach(o => {
         if (o.itemDetails) {
           o.itemDetails.forEach(it => {
             if (parameter && parameter !== 'All' && it.name !== parameter) return;
             data.push({
               id: `${o.id}-${it.name}`,
               orderNo: o.number,
               customerName: o.customerName,
               date: o.date,
               itemName: it.name,
               service: o.serviceType || 'Normal',
               qty: it.quantity,
               price: it.unitPrice,
               total: it.quantity * it.unitPrice
             });
           });
         }
       });
    }
    else if (reportType === 'payment_methods') {
       const payments = await Payment.find(applyBranchFilter(req, applyDateFilter(start, end, 'date')));
       const groups = {};
       payments.forEach(p => {
         if (!groups[p.method]) groups[p.method] = { method: p.method, count: 0, collected: 0 };
         groups[p.method].count += 1;
         groups[p.method].collected += (Number(p.amount) || 0);
       });
       data = Object.values(groups);
    }
    else if (reportType === 'customer_list') {
       let customers = await Customer.find({});
       if (parameter && parameter !== 'All') {
         customers = customers.filter(c => c._id.toString() === parameter);
       }
       data = customers.map(c => ({
         id: c._id,
         customerId: `CUS-${c._id.toString().substring(c._id.toString().length - 4).toUpperCase()}`,
         name: c.name,
         phone: c.phone,
         registered: c.registrationDate || c.createdAt,
         discount: c.customerLevel || '0%',
         ordersCount: c.totalOrders || 0,
         balance: c.balance || 0
       }));
    }
    else if (reportType === 'top_customers') {
       const orders = await Order.find(orderFilter);
       const map = {};
       orders.forEach(o => {
          const key = o.customerName || 'Unknown';
          if (!map[key]) map[key] = { name: key, ordersCount: 0, spent: 0, lastDate: o.date };
          map[key].ordersCount += 1;
          map[key].spent += (o.totalAmount || 0);
          if (new Date(o.date) > new Date(map[key].lastDate)) map[key].lastDate = o.date;
       });
       let arr = Object.values(map).sort((a, b) => b.spent - a.spent);
       if (parameter && parameter !== 'All') {
          const cust = await Customer.findById(parameter);
          if (cust) arr = arr.filter(c => c.name === cust.name);
       }
       data = arr.map((c, i) => ({ id: i+1, ...c }));
    }
    else if (reportType === 'customer_debts') {
       let customers = await Customer.find({ balance: { $gt: 0 } }).sort({ balance: -1 });
       if (parameter && parameter !== 'All') {
         customers = customers.filter(c => c._id.toString() === parameter);
       }
       data = customers.map(c => ({
         id: c._id,
         name: c.name,
         phone: c.phone,
         registered: c.registrationDate || c.createdAt,
         balance: c.balance
       }));
    }
    else if (reportType === 'completed_jobs' || reportType === 'pending_jobs') {
       const isCompleted = reportType === 'completed_jobs';
       let pFilter = applyDateFilter(start, end, 'pickupDate');
       let dFilter = applyDateFilter(start, end, 'deliveryDate');
       if (isCompleted) {
         pFilter.status = 'Completed';
         dFilter.status = 'Delivered';
       } else {
         pFilter.status = { $ne: 'Completed' };
         dFilter.status = { $ne: 'Delivered' };
       }
       const pickups = await Pickup.find(pFilter);
       const deliveries = await Delivery.find(dFilter);
       const items = [];
       pickups.forEach(p => items.push({ 
         id: `PKP-${p._id}`, reqId: p.pickupId || `PKP-${p._id}`, type: 'Pickup', 
         customer: p.customer, date: p.pickupDate, driver: p.assignedStaff || 'Unassigned', status: p.status 
       }));
       deliveries.forEach(d => items.push({ 
         id: `DEL-${d._id}`, reqId: d.deliveryId || `DEL-${d._id}`, type: 'Delivery', 
         customer: d.customer, date: d.deliveryDate, driver: d.assignedStaff || 'Unassigned', status: d.status 
       }));
       data = items.sort((a, b) => b.date.localeCompare(a.date));
    }
    else if (reportType === 'user_sales') {
       const orders = await Order.find(orderFilter);
       const groups = {};
       orders.forEach(o => {
         const u = o.createdBy || 'Unknown';
         if (parameter && parameter !== 'All' && u !== parameter) return;
         if (!groups[u]) groups[u] = { name: u, count: 0, sales: 0 };
         groups[u].count += 1;
         groups[u].sales += (o.totalAmount || 0);
       });
       data = Object.values(groups);
    }
    else if (reportType === 'driver_income') {
       let drivers = await Driver.find({});
       if (parameter && parameter !== 'All') {
         drivers = drivers.filter(d => d.driverName === parameter);
       }
       const activePickups = await Pickup.find({ status: { $ne: 'Completed' } });
       const activeDeliveries = await Delivery.find({ status: { $nin: ['Delivered', 'Failed'] } });
       data = drivers.map(d => {
         const rawAreas = d.areas || (d.area ? [d.area] : []);
         const driverAreas = rawAreas.flatMap(a => typeof a === 'string' ? a.split(',').map(s => s.trim()) : a)
                                     .filter(a => a && a !== '...' && a !== '…');
         const pCount = activePickups.filter(p => p.assignedStaff === d.driverName).length;
         const dCount = activeDeliveries.filter(del => del.assignedStaff === d.driverName).length;
         return {
           id: d._id,
           name: d.driverName,
           areas: driverAreas.join(', ') || '—',
           status: d.status || 'Available',
           activePickups: pCount,
           activeDeliveries: dCount
         };
       });
    }
    else if (reportType === 'service_revenue') {
       const orders = await Order.find(orderFilter);
       const groups = {};
       orders.forEach(o => {
         const s = o.serviceType || 'Normal';
         if (!groups[s]) groups[s] = { service: s, count: 0, revenue: 0 };
         groups[s].count += 1;
         groups[s].revenue += (o.totalAmount || 0);
       });
       data = Object.values(groups);
    }
    else if (reportType === 'garment_stats') {
       const orders = await Order.find(orderFilter);
       const groups = {};
       orders.forEach(o => {
         if (o.itemDetails) {
           o.itemDetails.forEach(it => {
             if (parameter && parameter !== 'All' && it.name !== parameter) return;
             if (!groups[it.name]) groups[it.name] = { name: it.name, qty: 0, revenue: 0 };
             groups[it.name].qty += it.quantity;
             groups[it.name].revenue += it.quantity * it.unitPrice;
           });
         }
       });
       data = Object.values(groups).sort((a, b) => b.qty - a.qty);
    }
    
    res.json({ data });
  } catch (error) {
    console.error('Reports Generate Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
