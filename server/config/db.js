const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'fileserver',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

let pool = null;
let isConnected = false;

function getPool() {
  if (!pool) {
    pool = new Pool(poolConfig);
    
    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const currentPool = getPool();
  try {
    const start = Date.now();
    const res = await currentPool.query(text, params);
    const duration = Date.now() - start;
    // Verbose query logging disabled for performance
    return res;
  } catch (err) {
    console.error('[DB Query Error]', { text, error: err.message });
    throw err;
  }
}

module.exports = {
  query,
  getPool,
  getIsConnected: () => isConnected,
  setIsConnected: (val) => { isConnected = val; }
};
