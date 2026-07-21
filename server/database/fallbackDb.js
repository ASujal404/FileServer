const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, 'fallback_data.json');

let store = {
  users: [],
  folders: [],
  files: [],
  shared_folders: [],
  shared_files: [],
  audit_logs: [],
  qr_sessions: []
};

// Load initial store if exists
function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const loaded = JSON.parse(raw);
      store = {
        users: loaded.users || [],
        folders: loaded.folders || [],
        files: loaded.files || [],
        shared_folders: loaded.shared_folders || [],
        shared_files: loaded.shared_files || [],
        audit_logs: loaded.audit_logs || [],
        qr_sessions: loaded.qr_sessions || []
      };
    } else {
      seedInitialStore();
    }
  } catch (err) {
    seedInitialStore();
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[FallbackDB] Error saving store:', err.message);
  }
}

function seedInitialStore() {
  const adminId = uuidv4();
  const passwordHash = bcrypt.hashSync('Admin@123', 10);
  
  store.users = [
    {
      id: adminId,
      name: 'System Admin',
      email: 'admin@fileserver.com',
      password_hash: passwordHash,
      role: 'admin',
      created_at: new Date().toISOString()
    }
  ];
  store.folders = [];
  store.files = [];
  store.shared_folders = [];
  store.shared_files = [];
  store.audit_logs = [
    {
      id: uuidv4(),
      user_id: adminId,
      user_name: 'System Admin',
      action: 'SYSTEM_INIT',
      filename: null,
      details: 'Storage system initialized with Metadata Sharing support',
      timestamp: new Date().toISOString()
    }
  ];
  saveStore();
}

loadStore();

module.exports = {
  getStore: () => store,
  saveStore
};
