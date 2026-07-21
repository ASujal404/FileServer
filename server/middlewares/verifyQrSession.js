const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const userRepository = require('../repositories/user.repository');
const qrRepository = require('../repositories/qr.repository');

async function verifyQrSession(req, res, next) {
  let token = null;

  // Extract token from URL route params first, then query params, then Authorization header
  if (req.params && req.params.token) {
    token = req.params.token;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
    token = req.headers['authorization'].split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. QR Session token missing.'
    });
  }

  try {
    // 1. Verify JWT Signature and Expiry
    const decoded = jwt.verify(token, JWT_SECRET);

    // 2. Verify token type is QR_SESSION
    if (decoded.type !== 'QR_SESSION') {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Invalid token type for QR authentication.'
      });
    }

    // 3. Verify Session Exists & is not Revoked & not Expired in database/store
    const validSession = await qrRepository.findValidSession(token);
    if (!validSession) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. QR Session has expired or been revoked.'
      });
    }

    if (new Date(validSession.expires_at) <= new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. QR Session has expired.'
      });
    }

    // 4. Load User from repository
    const user = await userRepository.findById(decoded.id);
    if (!user || user.is_disabled) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. User account is disabled or deleted.'
      });
    }

    // 5. Update last accessed timestamp in database/store
    await qrRepository.updateLastAccessed(validSession.id);

    // 6. Attach User & QR Session to Request
    req.user = user;
    req.qrSession = validSession;

    // 7. Continue Request
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access denied. QR Session token has expired.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Access denied. Invalid or corrupted QR Session token.'
    });
  }
}

module.exports = { verifyQrSession };
