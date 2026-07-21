const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    const pool = db.getPool();
    // Test connection
    const client = await pool.connect();
    client.release();
    
    console.log('[DB] PostgreSQL connected successfully. Running schema migrations...');

    // Run core schema script
    try {
      await db.query(sql);
    } catch (schemaErr) {
      console.warn('[DB Migration Notice] Base schema creation notice:', schemaErr.message);
    }

    // Safely apply column updates for existing databases
    try {
      await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;');
    } catch (err) {
      // Column might already exist
    }

    try {
      await db.query('ALTER TABLE qr_sessions ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE;');
    } catch (err) {
      // Column might already exist
    }
    
    // Check if default admin user exists
    const adminCheck = await db.query('SELECT * FROM users WHERE email = $1', ['admin@fileserver.com']);
    if (adminCheck.rows.length === 0) {
      const adminId = uuidv4();
      const passwordHash = await bcrypt.hash('Admin@123', 10);
      await db.query(
        `INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
        [adminId, 'System Admin', 'admin@fileserver.com', passwordHash, 'admin']
      );
      console.log('[DB] Default Admin user created: admin@fileserver.com / Admin@123');
    }
    
    db.setIsConnected(true);
    console.log('[DB] Schema and tables initialized in PostgreSQL.');
  } catch (err) {
    console.warn('[DB WARNING] Could not connect to PostgreSQL database:', err.message);
    console.warn('[DB WARNING] Operating in resilient file-backed fallback storage mode.');
    db.setIsConnected(false);
  }
}

module.exports = { initializeDatabase };
