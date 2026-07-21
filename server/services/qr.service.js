const jwt = require('jsonwebtoken');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET, PORT } = require('../config/constants');
const qrRepository = require('../repositories/qr.repository');

function getServerNetworkIp() {
  if (process.env.SERVER_IP || process.env.HOST_IP) {
    return process.env.SERVER_IP || process.env.HOST_IP;
  }

  const interfaces = os.networkInterfaces();
  const candidateIps = [];

  const virtualKeywords = [
    'virtualbox', 'vbox', 'vmware', 'veth', 'wsl', 'hyper-v',
    'docker', 'host-only', 'loopback', 'bluetooth', 'npcap', 'tap', 'tun'
  ];

  for (const name of Object.keys(interfaces)) {
    const nameLower = name.toLowerCase();
    const isVirtualName = virtualKeywords.some(keyword => nameLower.includes(keyword));

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const isVirtualMac = iface.mac && iface.mac.toLowerCase().startsWith('0a:00:27');
        const isVboxRange = iface.address.startsWith('192.168.56.');
        const isVirtual = isVirtualName || isVirtualMac || isVboxRange;
        const isWiFiOrEthernet = /wi-fi|wifi|ethernet|wlan|lan/i.test(nameLower) && !isVirtual;

        candidateIps.push({
          address: iface.address,
          name,
          isVirtual,
          isWiFiOrEthernet
        });
      }
    }
  }

  // Priority 1: Wi-Fi or Ethernet adapter that is not virtual
  const primary = candidateIps.find(item => item.isWiFiOrEthernet);
  if (primary) return primary.address;

  // Priority 2: Any non-virtual IPv4 address
  const nonVirtual = candidateIps.find(item => !item.isVirtual);
  if (nonVirtual) return nonVirtual.address;

  // Priority 3: Any valid IPv4 address
  if (candidateIps.length > 0) return candidateIps[0].address;

  return 'localhost';
}

class QrService {
  async generateSession(user, io) {
    // 1. Revoke any existing active QR sessions for this user
    await qrRepository.revokeUserSessions(user.id);
    if (io) {
      io.emit('qr:revoked', { userId: user.id, reason: 'New QR generated' });
    }

    // 2. Define session parameters (10 Minutes TTL)
    const sessionId = uuidv4();
    const ttlSeconds = 600; // 10 minutes
    const expiresAtDate = new Date(Date.now() + ttlSeconds * 1000);

    // 3. Create signed JWT Token
    const sessionToken = jwt.sign(
      {
        id: user.id,
        sessionId,
        type: 'QR_SESSION',
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    // 4. Save to Database
    const sessionRecord = await qrRepository.createSession({
      id: sessionId,
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAtDate
    });

    // 5. Construct Mobile Access URL
    const hostIp = getServerNetworkIp();
    const port = PORT || 5000;
    const sessionUrl = `http://${hostIp}:${port}/mobile/session/${sessionToken}`;

    return {
      sessionId: sessionRecord.id,
      sessionToken,
      sessionUrl,
      expiresAt: expiresAtDate.toISOString(),
      ttlSeconds
    };
  }

  async revokeSession(userId, io) {
    await qrRepository.revokeUserSessions(userId);
    if (io) {
      io.emit('qr:revoked', { userId, reason: 'User revoked QR session' });
    }
    return true;
  }

  async getActiveSession(userId) {
    return await qrRepository.findActiveSessionByUser(userId);
  }
}

module.exports = new QrService();
