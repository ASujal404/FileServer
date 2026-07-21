import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';
import { Smartphone, Download, RefreshCw, AlertCircle } from 'lucide-react';

const QrCard = () => {
  const [sessionUrl, setSessionUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const qrContainerRef = useRef(null);

  useEffect(() => {
    fetchQrToken();
  }, []);

  const fetchQrToken = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/qr/generate');
      if (res.data && res.data.success && res.data.sessionUrl) {
        setSessionUrl(res.data.sessionUrl);
      } else {
        setError('QR unavailable');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'QR generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrContainerRef.current) return;
    const svgElement = qrContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const padding = 20;
        const qrSize = img.width || 140;
        canvas.width = qrSize + padding * 2;
        canvas.height = qrSize + padding * 2;

        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code image centered
        ctx.drawImage(img, padding, padding);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'mobile_access_qr.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (err) {
      console.error('Failed to download QR code image:', err);
    }
  };

  return (
    <div
      className="qr-card"
      style={{
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        width: '210px',
        boxSizing: 'border-box'
      }}
    >
      {/* Title Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: 'var(--text-main, #f8fafc)',
          marginBottom: '0.75rem'
        }}
      >
        <Smartphone size={18} style={{ color: 'var(--primary, #3b82f6)' }} />
        <span>Mobile Access</span>
      </div>

      {/* QR Code Frame */}
      <div
        ref={qrContainerRef}
        style={{
          background: '#ffffff',
          padding: '0.5rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '140px',
          height: '140px',
          boxSizing: 'border-box',
          marginBottom: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        {loading ? (
          <div style={{ color: '#64748b' }}>
            <RefreshCw size={24} className="spin" />
          </div>
        ) : error ? (
          <div style={{ color: 'var(--danger, #ef4444)', fontSize: '0.75rem', textAlign: 'center' }}>
            <AlertCircle size={18} style={{ margin: '0 auto 0.2rem auto' }} />
            {error}
          </div>
        ) : sessionUrl ? (
          <QRCodeSVG
            value={sessionUrl}
            size={126}
            level="M"
            includeMargin={false}
          />
        ) : null}
      </div>

      {/* Download QR Button */}
      <button
        className="btn btn-primary"
        onClick={handleDownloadQr}
        disabled={!sessionUrl || loading}
        style={{
          width: '100%',
          padding: '0.45rem 0.75rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          borderRadius: '6px',
          justifyContent: 'center',
          gap: '0.35rem',
          opacity: loading || !sessionUrl ? 0.6 : 1,
          cursor: loading || !sessionUrl ? 'not-allowed' : 'pointer'
        }}
      >
        <Download size={14} />
        Download QR
      </button>
    </div>
  );
};

export default QrCard;
