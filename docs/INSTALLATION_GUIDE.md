# Installation & Setup Guide

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **NPM**: v9.0.0 or higher
- **PostgreSQL**: v13+ (Optional: standard PostgreSQL server instance, or use automated built-in fallback mode)

---

## 1. Backend Server Setup

```bash
# Navigate to server directory
cd server

# Install Node dependencies
npm install

# Configure environment variables (optional, copy example)
# Default values work out of the box
```

### Environment Variables (`server/.env`)

```ini
PORT=5000
JWT_SECRET=super-secret-enterprise-key-2026

# PostgreSQL Configuration
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=fileserver
```

### Start Server

```bash
# Start backend server
npm start

# Or start in watch/development mode
npm run dev
```

The server binds to `0.0.0.0:5000` listening across all local network (LAN) interfaces.

---

## 2. Desktop Client Setup (Electron + React)

```bash
# Open a new terminal and navigate to client directory
cd client

# Install Node dependencies
npm install

# Start React + Electron in development mode
npm run electron:dev
```

---

## 3. Connecting Desktop Client Over LAN

1. Open the Desktop Client application.
2. Click **"Change IP"** or open **Server Connection Settings**.
3. Input your server host LAN IP address (e.g. `http://192.168.1.100:5000` or `http://localhost:5000`).
4. Click **Save & Reconnect**.
5. Log in with default admin credentials:
   - **Email**: `admin@fileserver.com`
   - **Password**: `Admin@123`
