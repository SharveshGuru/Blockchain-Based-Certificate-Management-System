import { useState, useEffect, useRef, useCallback } from 'react';
import { downloadCertificate } from '../api';

/**
 * PDFViewerModal
 * Props:
 *   cert       — the certificate object { certId, ipfsCid, certType, issuerOrg, ... }
 *   onClose    — function to close the modal
 */
export default function PDFViewerModal({ cert, onClose }) {
  const [pdfUrl, setPdfUrl]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [zoom, setZoom]         = useState(100);
  const [downloading, setDL]    = useState(false);
  const containerRef            = useRef(null);
  const iframeRef               = useRef(null);

  // ── Load PDF ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cert?.ipfsCid) { setError('No PDF available for this certificate.'); setLoading(false); return; }

    let objectUrl = null;
    setLoading(true);
    setError('');

    downloadCertificate(cert.ipfsCid)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
        setLoading(false);
      })
      .catch(e => {
        setError('Failed to load PDF: ' + e.message);
        setLoading(false);
      });

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [cert?.ipfsCid]);

  // ── Lock body scroll while modal open ─────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Keyboard: Escape closes, +/- zooms ────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setZoom(z => Math.min(z + 10, 200)); }
      if (e.key === '-'                    && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setZoom(z => Math.max(z - 10, 40));  }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Click outside overlay closes ──────────────────────────────────────────
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!pdfUrl) return;
    setDL(true);
    try {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `${cert.certId}.pdf`;
      a.click();
    } finally {
      setDL(false);
    }
  };

  const zoomIn  = () => setZoom(z => Math.min(z + 10, 200));
  const zoomOut = () => setZoom(z => Math.max(z - 10, 40));
  const zoomReset = () => setZoom(100);

  const certTitle = cert?.certType
    ? { ACADEMIC: 'Academic Certificate', LEGAL: 'Legal Certificate', GOVERNMENT: 'Government Certificate', CORPORATE: 'Certificate of Achievement' }[cert.certType] || cert.certType
    : 'Certificate';

  return (
    <div className="pvm-overlay" onClick={handleOverlayClick}>
      <div className="pvm-modal">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="pvm-header">
          <div className="pvm-header-left">
            <div className="pvm-header-icon">📄</div>
            <div>
              <div className="pvm-title">{certTitle}</div>
              <div className="pvm-subtitle">
                {cert.issuerOrg && <span>{cert.issuerOrg}</span>}
                {cert.certId    && <><span className="pvm-sep">·</span><span className="pvm-mono">{cert.certId}</span></>}
                <span className="pvm-sep">·</span>
                <span className={`pvm-status-dot pvm-status-${cert.status === 'ACTIVE' ? 'active' : 'revoked'}`} />
                <span className={`pvm-status-text pvm-status-${cert.status === 'ACTIVE' ? 'active' : 'revoked'}`}>{cert.status}</span>
              </div>
            </div>
          </div>

          <div className="pvm-header-right">
            {/* Zoom controls */}
            <div className="pvm-zoom-group">
              <button className="pvm-icon-btn" onClick={zoomOut} title="Zoom out (Ctrl -)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button className="pvm-zoom-display" onClick={zoomReset} title="Reset zoom">
                {zoom}%
              </button>
              <button className="pvm-icon-btn" onClick={zoomIn} title="Zoom in (Ctrl +)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>

            {/* Download */}
            {pdfUrl && (
              <button className="pvm-download-btn" onClick={handleDownload} disabled={downloading} title="Download PDF">
                {downloading
                  ? <span className="spinner" />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                }
                <span>Download</span>
              </button>
            )}

            {/* Close */}
            <button className="pvm-close-btn" onClick={onClose} title="Close (Esc)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────────────────── */}
        <div className="pvm-body" ref={containerRef}>
          {loading && (
            <div className="pvm-loading">
              <div className="pvm-spinner-large" />
              <p>Loading certificate PDF...</p>
            </div>
          )}

          {error && !loading && (
            <div className="pvm-error">
              <div className="pvm-error-icon">⚠</div>
              <p>{error}</p>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
          )}

          {pdfUrl && !loading && (
            <div className="pvm-pdf-scroll-area">
              <div
                className="pvm-pdf-inner"
                style={{ width: `${zoom}%`, minWidth: zoom < 100 ? '100%' : undefined }}
              >
                <iframe
                  ref={iframeRef}
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  className="pvm-iframe"
                  title={`Certificate — ${cert.certId}`}
                  onLoad={() => setLoading(false)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        {pdfUrl && !loading && (
          <div className="pvm-footer">
            <div className="pvm-footer-info">
              <span className="pvm-footer-pill">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                Blockchain verified
              </span>
              {cert.certHash && (
                <span className="pvm-footer-hash">
                  SHA-256: <span className="pvm-mono">{cert.certHash.slice(0, 24)}…</span>
                </span>
              )}
              {cert.ipfsCid && (
                <span className="pvm-footer-hash">
                  IPFS: <span className="pvm-mono">{cert.ipfsCid.slice(0, 20)}…</span>
                </span>
              )}
            </div>
            <div className="pvm-footer-hint">
              Scroll to navigate · Ctrl +/− to zoom · Esc to close
            </div>
          </div>
        )}
      </div>

      <style>{`
        .pvm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
          backdrop-filter: blur(6px);
          padding: 20px;
          animation: pvm-fade-in 0.15s ease;
        }
        @keyframes pvm-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .pvm-modal {
          background: var(--navy-2, #111827);
          border: 1px solid var(--gold-border, rgba(201,168,76,0.3));
          border-radius: 14px;
          width: 100%;
          max-width: 1000px;
          height: 88vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1);
          animation: pvm-slide-up 0.2s ease;
        }
        @keyframes pvm-slide-up {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        /* Header */
        .pvm-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-shrink: 0;
          background: var(--navy-3, #1a2235);
        }
        .pvm-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .pvm-header-icon {
          font-size: 22px;
          flex-shrink: 0;
        }
        .pvm-title {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          color: var(--white, #f4f1eb);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pvm-subtitle {
          font-size: 11px;
          color: rgba(244,241,235,0.45);
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }
        .pvm-sep { opacity: 0.35; }
        .pvm-mono {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
        }
        .pvm-status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .pvm-status-active  .pvm-status-dot, .pvm-status-dot.pvm-status-active  { background: var(--green, #2dd4a0); }
        .pvm-status-revoked .pvm-status-dot, .pvm-status-dot.pvm-status-revoked { background: var(--red, #e05c5c); }
        .pvm-status-text { font-weight: 600; font-size: 10px; letter-spacing: 0.5px; }
        .pvm-status-text.pvm-status-active  { color: var(--green, #2dd4a0); }
        .pvm-status-text.pvm-status-revoked { color: var(--red, #e05c5c); }

        /* Header right controls */
        .pvm-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .pvm-zoom-group {
          display: flex;
          align-items: center;
          gap: 2px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        .pvm-icon-btn {
          padding: 7px 10px;
          background: none;
          border: none;
          color: rgba(244,241,235,0.6);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .pvm-icon-btn:hover {
          background: rgba(255,255,255,0.07);
          color: var(--gold, #c9a84c);
        }
        .pvm-zoom-display {
          padding: 7px 12px;
          background: none;
          border: none;
          color: var(--white, #f4f1eb);
          font-size: 12px;
          font-weight: 600;
          font-family: 'DM Mono', monospace;
          cursor: pointer;
          min-width: 46px;
          text-align: center;
          transition: color 0.15s;
        }
        .pvm-zoom-display:hover { color: var(--gold, #c9a84c); }
        .pvm-download-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 8px;
          color: var(--gold, #c9a84c);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pvm-download-btn:hover:not(:disabled) {
          background: rgba(201,168,76,0.2);
          border-color: rgba(201,168,76,0.5);
        }
        .pvm-download-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pvm-close-btn {
          padding: 8px;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(244,241,235,0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .pvm-close-btn:hover {
          border-color: rgba(224,92,92,0.4);
          color: var(--red, #e05c5c);
          background: rgba(224,92,92,0.08);
        }

        /* Body */
        .pvm-body {
          flex: 1;
          overflow: hidden;
          display: flex;
          align-items: stretch;
          background: #0d1420;
          position: relative;
        }
        .pvm-loading, .pvm-error {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: rgba(244,241,235,0.5);
          font-size: 14px;
        }
        .pvm-error-icon { font-size: 32px; }
        .pvm-spinner-large {
          width: 36px; height: 36px;
          border: 3px solid rgba(255,255,255,0.08);
          border-top-color: var(--gold, #c9a84c);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Scrollable PDF area */
        .pvm-pdf-scroll-area {
          flex: 1;
          overflow: auto;
          display: flex;
          justify-content: center;
          padding: 20px;
          /* Custom scrollbar */
          scrollbar-width: thin;
          scrollbar-color: rgba(201,168,76,0.3) transparent;
        }
        .pvm-pdf-scroll-area::-webkit-scrollbar { width: 6px; height: 6px; }
        .pvm-pdf-scroll-area::-webkit-scrollbar-track { background: transparent; }
        .pvm-pdf-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(201,168,76,0.3);
          border-radius: 3px;
        }
        .pvm-pdf-scroll-area::-webkit-scrollbar-thumb:hover {
          background: rgba(201,168,76,0.5);
        }
        .pvm-pdf-inner {
          transition: width 0.2s ease;
          max-width: 1200px;
          flex-shrink: 0;
        }
        .pvm-iframe {
          width: 100%;
          /* Landscape A4 ratio: 841.89 / 595.28 ≈ 1.414 inverted = height ~ 0.707 × width */
          aspect-ratio: 1.4142 / 1;
          border: none;
          display: block;
          border-radius: 6px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.5);
          background: white;
        }

        /* Footer */
        .pvm-footer {
          padding: 10px 20px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-shrink: 0;
          background: var(--navy-3, #1a2235);
        }
        .pvm-footer-info {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .pvm-footer-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: var(--green, #2dd4a0);
          background: rgba(45,212,160,0.08);
          border: 1px solid rgba(45,212,160,0.2);
          border-radius: 20px;
          padding: 3px 9px;
        }
        .pvm-footer-hash {
          font-size: 10px;
          color: rgba(244,241,235,0.3);
        }
        .pvm-footer-hint {
          font-size: 10px;
          color: rgba(244,241,235,0.2);
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .pvm-overlay { padding: 0; }
          .pvm-modal { height: 100vh; border-radius: 0; }
          .pvm-footer-hint { display: none; }
          .pvm-footer-hash { display: none; }
          .pvm-download-btn span { display: none; }
        }
      `}</style>
    </div>
  );
}