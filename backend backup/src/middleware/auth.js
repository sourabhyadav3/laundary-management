const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-123456');

    const user = await User.findById(decoded.id).populate('role');
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed. User not found.' });
    }

    if (user.status === 'Inactive' || user.status === 'Suspended' || user.isLocked) {
      return res.status(403).json({ message: 'Access denied. Your account is locked. Please contact the Super Admin.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Access denied. No role profile found.' });
    }

    // Super Admin has all privileges implicitly
    if (req.user.role.name === 'Super Admin') {
      return next();
    }

    const permissionsToCheck = Array.isArray(permission) ? permission : [permission];
    const hasPermission = permissionsToCheck.some(p => req.user.role.permissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ message: `Access denied. Requires '${permissionsToCheck.join("' or '")}' permission.` });
    }

    next();
  };
};

module.exports = {
  authenticate,
  requirePermission
};
