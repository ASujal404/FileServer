const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const userRepository = require('../repositories/user.repository');
const auditRepository = require('../repositories/audit.repository');
const { JWT_SECRET, JWT_EXPIRES_IN, AUDIT_ACTIONS, ROLES } = require('../config/constants');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
      }

      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ success: false, error: 'User with this email already exists.' });
      }

      const userId = uuidv4();
      const password_hash = await bcrypt.hash(password, 10);
      const userRole = role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;

      const user = await userRepository.create({
        id: userId,
        name,
        email,
        password_hash,
        role: userRole
      });

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      await auditRepository.log({
        user_id: user.id,
        user_name: user.name,
        action: AUDIT_ACTIONS.REGISTER,
        details: `User registered with role ${user.role}`
      });

      // Emit socket notification if global io instance exists
      if (req.io) {
        req.io.emit('user:registered', { id: user.id, name: user.name, role: user.role });
      }

      return res.status(201).json({
        success: true,
        token,
        user
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      const user = await userRepository.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      const { password_hash, ...safeUser } = user;

      await auditRepository.log({
        user_id: user.id,
        user_name: user.name,
        action: AUDIT_ACTIONS.LOGIN,
        details: `User logged in successfully`
      });

      if (req.io) {
        req.io.emit('audit:logged', { action: AUDIT_ACTIONS.LOGIN, user_name: user.name });
      }

      return res.status(200).json({
        success: true,
        token,
        user: safeUser
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      if (req.user) {
        const qrRepository = require('../repositories/qr.repository');
        await qrRepository.revokeUserSessions(req.user.id);

        if (req.io) {
          req.io.emit('qr:revoked', { userId: req.user.id, reason: 'User logged out' });
        }

        await auditRepository.log({
          user_id: req.user.id,
          user_name: req.user.name,
          action: AUDIT_ACTIONS.LOGOUT,
          details: 'User logged out (All active QR sessions revoked)'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res) {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  }
}

module.exports = new AuthController();
