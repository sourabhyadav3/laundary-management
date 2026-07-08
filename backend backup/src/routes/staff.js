const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const Pickup = require('../models/Pickup');
const Payment = require('../models/Payment');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

const formatUser = (user) => {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    username: user.username,
    role: user.role ? user.role.name : '',
    branch: user.branch ? user.branch.name : '',
    branchId: user.branch ? user.branch._id.toString() : '',
    status: user.status,
    isLocked: user.isLocked,
    joiningDate: user.joiningDate ? user.joiningDate.toISOString().split('T')[0] : '',
    ordersHandled: user.ordersHandled || 0,
    deliveriesCompleted: user.deliveriesCompleted || 0,
    paymentsCollected: user.paymentsCollected || 0,
    recentActivity: user.recentActivity || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const formatUserWithStats = (user, orders, deliveries, pickups, payments) => {
  const name = user.name;
  const username = user.username;
  const isDeliveryStaff = user.role && user.role.name === 'Delivery Staff';

  let ordersHandled = 0;
  let deliveriesCompleted = 0;
  let paymentsCollected = 0;

  if (isDeliveryStaff) {
    // Delivery Staff stats:
    // 1. Orders Handled = count of completed pickups
    ordersHandled = pickups.filter(p => p.assignedStaff === name && (p.status === 'Completed' || p.status === 'Picked Up')).length;
    
    // 2. Deliveries Completed = count of delivered deliveries
    const completedDelvs = deliveries.filter(d => d.assignedStaff === name && d.status === 'Delivered');
    deliveriesCompleted = completedDelvs.length;

    // 3. Payments Collected = sum of payments for orders where this staff delivered the order
    const completedOrderNumbers = completedDelvs.map(d => d.orderNumber).filter(Boolean);
    const userPayments = payments.filter(p => completedOrderNumbers.includes(p.orderNumber));
    paymentsCollected = userPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  } else {
    // Admin / Counter Staff stats:
    // 1. Orders Handled = count of orders created by this staff
    ordersHandled = orders.filter(o => o.createdBy === name || o.createdBy === username).length;
    
    // 2. Deliveries Completed = 0
    deliveriesCompleted = 0;

    // 3. Payments Collected = sum of payments for orders created by this staff
    const createdOrderNumbers = orders.filter(o => o.createdBy === name || o.createdBy === username).map(o => o.number).filter(Boolean);
    const userPayments = payments.filter(p => createdOrderNumbers.includes(p.orderNumber));
    paymentsCollected = userPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    username: user.username,
    role: user.role ? user.role.name : '',
    branch: user.branch ? user.branch.name : '',
    branchId: user.branch ? user.branch._id.toString() : '',
    status: user.status,
    isLocked: user.isLocked,
    joiningDate: user.joiningDate ? user.joiningDate.toISOString().split('T')[0] : '',
    ordersHandled,
    deliveriesCompleted,
    paymentsCollected,
    recentActivity: user.recentActivity || (deliveriesCompleted > 0 ? `Completed ${deliveriesCompleted} deliveries` : 'Account created'),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

// @route   GET /api/staff
// @desc    Get all staff/users
router.get('/', authenticate, requirePermission('manage_staff'), async (req, res) => {
  try {
    let query = {};
    if (req.user.branch && mongoose.Types.ObjectId.isValid(req.user.branch)) {
      query = { branch: req.user.branch };
    } else {
      // For Super Admin: filter out staff of deleted branches
      const branches = await Branch.find().select('_id');
      const branchIds = branches.map(b => b._id).filter(id => id && mongoose.Types.ObjectId.isValid(id));
      
      const superAdminRole = await Role.findOne({ name: 'Super Admin' });
      const superAdminRoleId = superAdminRole ? superAdminRole._id : null;

      query = {
        $or: [
          { branch: { $in: branchIds } },
          { branch: null }
        ]
      };

      if (superAdminRoleId) {
        query.$or.push({ role: superAdminRoleId });
      }
    }
    const users = await User.find(query)
      .populate('role')
      .populate('branch')
      .sort({ createdAt: -1 });

    const orders = await Order.find();
    const deliveries = await Delivery.find();
    const pickups = await Pickup.find();
    const payments = await Payment.find();

    const formattedUsers = users.map(u => formatUserWithStats(u, orders, deliveries, pickups, payments));
    res.json(formattedUsers);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   POST /api/staff
// @desc    Create staff/user
router.post('/', authenticate, requirePermission('manage_staff'), async (req, res) => {
  try {
    const { name, email, phone, address, username, password, roleName, branchId, status } = req.body;

    let finalUsername = username;
    if (!finalUsername && email) {
      finalUsername = email.split('@')[0];
    }

    if (!name || !email || !finalUsername || !password || !roleName) {
      return res.status(400).json({ message: 'Name, email, username, password, and role are required.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username: finalUsername }] });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email or username already exists.' });
    }

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(400).json({ message: `Role '${roleName}' not found.` });
    }

    let branch = null;
    let finalBranchId = branchId;
    if (req.user.role.name !== 'Super Admin') {
      finalBranchId = req.user.branch ? (req.user.branch._id ? req.user.branch._id.toString() : req.user.branch.toString()) : null;
    }

    if (finalBranchId) {
      if (!mongoose.Types.ObjectId.isValid(finalBranchId)) {
        return res.status(400).json({ message: 'Invalid branch selection.' });
      }
      branch = await Branch.findById(finalBranchId);
      if (!branch) {
        return res.status(400).json({ message: 'Invalid branch selection.' });
      }
    }



    const user = new User({
      name,
      email,
      phone,
      address,
      username: finalUsername,
      passwordHash: password, // will be hashed in pre-save hook
      role: role._id,
      branch: branch ? branch._id : null,
      status: status || 'Active'
    });

    await user.save();
    
    // Populate populated fields for formatting
    const populated = await User.findById(user._id).populate('role').populate('branch');
    res.status(201).json(formatUser(populated));
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   PUT /api/staff/:id
// @desc    Update staff/user info
router.put('/:id', authenticate, requirePermission('manage_staff'), async (req, res) => {
  try {
    const { name, email, phone, address, username, roleName, branchId, status, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (username) user.username = username;
    if (status) user.status = status;
    if (password) user.passwordHash = password; // triggers pre-save hook re-hash

    if (roleName) {
      const role = await Role.findOne({ name: roleName });
      if (role) {
        user.role = role._id;
      }
    }

    if (branchId !== undefined) {
      let finalBranchId = branchId;
      if (req.user.role.name !== 'Super Admin') {
        finalBranchId = req.user.branch ? (req.user.branch._id ? req.user.branch._id.toString() : req.user.branch.toString()) : null;
      }
      if (finalBranchId === '' || finalBranchId === null || !mongoose.Types.ObjectId.isValid(finalBranchId)) {
        user.branch = null;
      } else {
        const branch = await Branch.findById(finalBranchId);
        if (branch) {
          user.branch = branch._id;
        } else {
          user.branch = null;
        }
      }
    }



    await user.save();
    const populated = await User.findById(user._id).populate('role').populate('branch');
    res.json(formatUser(populated));
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   PUT /api/staff/:id/lock
// @desc    Lock/Unlock staff account
router.put('/:id/lock', authenticate, requirePermission('manage_staff'), async (req, res) => {
  try {
    const { isLocked } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    user.isLocked = !!isLocked;
    if (isLocked) {
      user.status = 'Suspended';
    } else {
      user.status = 'Active';
    }

    await user.save();
    const populated = await User.findById(user._id).populate('role').populate('branch');
    res.json(formatUser(populated));
  } catch (error) {
    console.error('Lock staff error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// @route   DELETE /api/staff/:id
// @desc    Delete staff/user account
router.delete('/:id', authenticate, requirePermission('manage_staff'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    await User.deleteOne({ _id: user._id });
    res.json({ message: 'Staff account deleted successfully.' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
