const path = require('path');
const fs = require('fs');
const qrService = require('../services/qr.service');
const minioService = require('../services/minio.service');
const fileRepository = require('../repositories/file.repository');
const folderRepository = require('../repositories/folder.repository');
const auditRepository = require('../repositories/audit.repository');
const shareRepository = require('../repositories/share.repository');
const { verifyPathInStorage } = require('../middlewares/pathSanitizer');
const { AUDIT_ACTIONS } = require('../config/constants');

class QrController {
  // POST /api/qr/generate (Desktop authenticated)
  async generateSession(req, res, next) {
    try {
      const sessionData = await qrService.generateSession(req.user, req.io);
      return res.status(200).json({
        success: true,
        message: 'Secure QR Session generated successfully.',
        ...sessionData
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/qr/revoke (Desktop authenticated)
  async revokeSession(req, res, next) {
    try {
      await qrService.revokeSession(req.user.id, req.io);
      return res.status(200).json({
        success: true,
        message: 'Active QR Session revoked successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /mobile/session/:token (Mobile QR authenticated entry route)
  async openSession(req, res, next) {
    try {
      const user = req.user;
      const qrSession = req.qrSession;

      // Notify Socket room/broadcast that mobile client has connected
      if (req.io) {
        req.io.emit('qr:connected', {
          userId: user.id,
          userName: user.name,
          sessionId: qrSession.id
        });
      }

      // If accessed via a browser directly (HTML navigation), redirect to frontend app route
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        const host = req.hostname || (req.headers.host ? req.headers.host.split(':')[0] : 'localhost');
        return res.redirect(`http://${host}:5173/mobile/session/${req.params.token}`);
      }

      // Otherwise return JSON payload
      return this.getMobileSessionData(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  // GET /mobile/session/:token/data (Mobile QR authenticated data endpoint)
  async getMobileSessionData(req, res, next) {
    try {
      const user = req.user;
      const qrSession = req.qrSession;

      if (req.io) {
        req.io.emit('qr:connected', {
          userId: user.id,
          userName: user.name,
          sessionId: qrSession.id
        });
      }

      // Mobile QR Session: Always isolate files and folders to the authenticated user
      const files = (await fileRepository.findByOwner(user.id)) || [];
      const folders = (await folderRepository.findByOwner(user.id)) || [];
      
      const totalUsedBytes = files.reduce((acc, f) => acc + parseInt(f.file_size || 0, 10), 0);

      console.log(`[Mobile QR Audit] User ID: ${user.id} (${user.name})`);
      console.log(`[Mobile QR Audit] Total files in repository: ${files.length}`);
      console.log(`[Mobile QR Audit] Files returned in API response: ${files.length}`);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name || 'User',
          email: user.email || '',
          role: user.role || 'user'
        },
        session: {
          id: qrSession.id,
          expiresAt: qrSession.expires_at
        },
        metrics: {
          fileCount: files.length,
          folderCount: folders.length,
          usedBytes: totalUsedBytes
        },
        files,
        folders
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /mobile/session/:token/download/:fileId (Mobile QR authenticated file download)
  async downloadMobileFile(req, res, next) {
    try {
      const fileId = req.params.fileId;
      const file = await fileRepository.findById(fileId);

      if (!file) {
        return res.status(404).json({ success: false, error: 'File not found.' });
      }

      const isOwner = file.owner_id === req.user.id;
      let sharePermission = null;

      if (!isOwner) {
        sharePermission = await shareRepository.getFileSharePermission(fileId, req.user.id);
        if (!sharePermission) {
          return res.status(403).json({ success: false, error: 'Access denied to this file.' });
        }
      }

      // 1. MinIO Object Key (stored_filename)
      const objectKey = file.stored_filename;

      if (!objectKey) {
        return res.status(404).json({ success: false, error: 'Invalid MinIO object key.' });
      }

      // 2. Stream object directly from MinIO S3 Object Storage bucket
      try {
        const minioStream = await minioService.getObjectStream(objectKey);

        await auditRepository.log({
          user_id: req.user.id,
          user_name: req.user.name,
          action: AUDIT_ACTIONS.DOWNLOAD,
          filename: file.original_filename,
          details: `Downloaded object '${objectKey}' via QR Mobile session`
        });

        // 3. Set response headers
        if (file.file_size) {
          res.setHeader('Content-Length', file.file_size);
        }
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_filename)}"; filename*=${encodeURIComponent(file.original_filename)}`);

        // 4. Stream directly to Express response
        return minioStream.pipe(res);
      } catch (minioErr) {
        console.error(`[MinIO Mobile Download Error] Key '${objectKey}' failed:`, minioErr.message);

        if (req.headers.accept && req.headers.accept.includes('text/html')) {
          return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Object Missing</title></head>
            <body style="background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:1rem;">
              <div style="background:#1e293b;padding:2rem;border-radius:16px;text-align:center;max-width:380px;border:1px solid #334155;">
                <h3 style="color:#ef4444;margin-top:0;">MinIO Object Missing</h3>
                <p style="color:#94a3b8;font-size:0.85rem;">The object <strong>${file.original_filename}</strong> is not present in MinIO object storage bucket.</p>
              </div>
            </body>
            </html>
          `);
        }

        return res.status(404).json({
          success: false,
          error: `Object '${file.original_filename}' is missing from MinIO object storage.`
        });
      }
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new QrController();
