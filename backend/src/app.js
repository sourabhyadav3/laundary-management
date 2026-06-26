const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const serviceRoutes = require('./routes/services');
const staffRoutes = require('./routes/staff');
const driverRoutes = require('./routes/drivers');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const pickupRoutes = require('./routes/pickups');
const deliveryRoutes = require('./routes/deliveries');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const settingRoutes = require('./routes/settings');
const catalogRoutes = require('./routes/catalog');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow all origins for integration, can be tightened later
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SpinClean Backend is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/catalog', catalogRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;
