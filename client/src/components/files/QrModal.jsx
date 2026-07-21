import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';
import { QrCode, RefreshCw, X, ShieldAlert, Wifi, WifiOff, Clock, Smartphone } from 'lucide-react';

const QrModal = ({ isOpen, onClose, socket }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isMobileConnected, setIsMobileConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleGenerateQr();
    } else {
      setQrData(null);
      setIsMobileConnected(false);
    }
  }, [isOpen]);

  // Countdown timer logic
  useEffect(() => {
    if (!qrData || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrData, timeLeft]);

  // Socket.IO event listeners for mobile connection & revocation
  useEffect(() => {
    if (!socket) return;

    const handleMobileConnect = (data) => {
      setIsMobileConnected(true);
    };

    const handleQrRevoked = () => {
      setIsMobileConnected(false);
    };

    socket.on('qr:connected', handleMobileConnect);
    socket.on('qr:revoked', handleQrRevoked);

    return () => {
      socket.off('qr:connected', handleMobileConnect);
      socket.off('qr:revoked', handleQrRevoked);
    };
  }, [socket]);

  const handleGenerateQr = async () => {
    setLoading(true);
    setError('');
    setIsMobileConnected(false);
    try {
      const res = await api.post('/qr/generate');
      if (res.data.success) {
        setQrData(res.data);
        setTimeLeft(res.data.ttlSeconds || 600);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate secure QR Code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeQr = async () => {
    if (!window.confirm('Are you sure you want to revoke active QR session access? Mobile clients will be immediately disconnected.')) return;
    setLoading(true);
    try {
      await api.post('/qr/revoke');
      setQrData(null);
      setIsMobileConnected(false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke QR session.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{
        width: '460px',
        padding: '2rem',
        borderRadius: '12px',
        position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '0.8rem',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '50%',
            color: 'var(--primary)',
            marginBottom: '0.75rem'
          }}>
            <QrCode size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Secure Mobile Access</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Scan with your smartphone camera to open your files on mobile.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--danger)',
            borderRadius: '6px',
            color: 'var(--danger)',
            fontSize: '0.8rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* QR Code Canvas Display */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.85rem' }}>Generating Signed QR Token...</p>
          </div>
        ) : qrData && timeLeft > 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: '#ffffff',
              padding: '1.25rem',
              borderRadius: '12px',
              display: 'inline-block',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <QRCodeSVG
                value={qrData.sessionUrl}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Live Status Indicators */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.25rem',
              padding: '0.6rem 0.8rem',
              background: 'var(--bg-darker)',
              borderRadius: '8px',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} style={{ color: 'var(--warning)' }} />
                <span>Expires in: <strong>{formatTime(timeLeft)}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {isMobileConnected ? (
                  <>
                    <Wifi size={16} style={{ color: 'var(--success)' }} />
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>Mobile Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={16} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Waiting for scan...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--danger)' }}>
            <ShieldAlert size={36} style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontWeight: 600 }}>QR Session Expired</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              For your security, QR codes expire after 10 minutes.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleGenerateQr}
            disabled={loading}
          >
            <RefreshCw size={14} style={{ marginRight: '0.4rem' }} />
            Generate New QR
          </button>

          <button
            className="btn btn-secondary"
            style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)' }}
            onClick={handleRevokeQr}
            disabled={loading}
          >
            <ShieldAlert size={14} style={{ marginRight: '0.4rem' }} />
            Revoke Access
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrModal;
