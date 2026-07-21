const jwt = require('jsonwebtoken');
const { JWT_SECRET, ROLES } = require('../config/constants');
const userRepository = require('../repositories/user.repository');

async function authenticateToken(req, res, next) {
  let token = null;

  if (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
    token = req.headers['authorization'].split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.params && req.params.token) {
    token = req.params.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. Authentication token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await userRepository.findById(decoded.id);

    if (!user || user.is_disabled) {
      return res.status(401).json({ success: false, error: 'User session invalid or user account disabled.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: 'Invalid or expired authentication token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin
};
