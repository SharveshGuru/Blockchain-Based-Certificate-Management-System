import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ── Intersection observer hook ────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}


export default function Homepage() {
  const heroRef = useRef(null);
  const [featRef, featInView]   = useInView(0.1);
  const [howRef, howInView]     = useInView(0.1);
  const [scrollY, setScrollY]   = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Parallax for hero
  const heroParallax = scrollY * 0.35;

  return (
    <div className="hp-root">
      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="hp-nav" style={{ background: scrollY > 60 ? 'rgba(10,14,26,0.97)' : 'transparent' }}>
        <div className="hp-nav-inner">
          <div className="hp-nav-brand">
            <span className="hp-nav-logo">CertChain</span>
            <span className="hp-nav-badge">BLOCKCHAIN</span>
          </div>
          <div className="hp-nav-links">
            <a href="#features" className="hp-nav-link">Features</a>
            <a href="#how-it-works" className="hp-nav-link">How It Works</a>
            <Link to="/verify" className="hp-nav-link">Verify</Link>
          </div>
          <div className="hp-nav-actions">
            <Link to="/login" className="hp-btn-ghost">Sign In</Link>
            <Link to="/register" className="hp-btn-gold">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="hp-hero" ref={heroRef}>
        {/* Background layers */}
        <div className="hp-hero-bg" style={{ transform: `translateY(${heroParallax}px)` }}>
          <div className="hp-hero-grid" />
          <div className="hp-hero-glow hp-glow-1" />
          <div className="hp-hero-glow hp-glow-2" />
          <div className="hp-hero-glow hp-glow-3" />
        </div>

        {/* Floating cert cards */}
        <div className="hp-hero-float hp-float-1" aria-hidden>
          <div className="hp-mini-cert">
            <div className="hp-mini-cert-bar" />
            <div className="hp-mini-cert-lines">
              <div className="hp-mini-line hp-line-gold" />
              <div className="hp-mini-line" />
              <div className="hp-mini-line hp-line-short" />
            </div>
            <div className="hp-mini-cert-badge">✓ VERIFIED</div>
          </div>
        </div>
        <div className="hp-hero-float hp-float-2" aria-hidden>
          <div className="hp-mini-cert hp-mini-cert-alt">
            <div className="hp-mini-cert-bar" />
            <div className="hp-mini-cert-lines">
              <div className="hp-mini-line hp-line-gold" />
              <div className="hp-mini-line" />
              <div className="hp-mini-line hp-line-mid" />
              <div className="hp-mini-line hp-line-short" />
            </div>
            <div className="hp-mini-cert-badge hp-badge-blue">⛓ BLOCKCHAIN</div>
          </div>
        </div>
        <div className="hp-hero-float hp-float-3" aria-hidden>
          <div className="hp-chain-node">
            <div className="hp-chain-dot" />
            <div className="hp-chain-line" />
            <div className="hp-chain-dot" />
            <div className="hp-chain-line" />
            <div className="hp-chain-dot hp-dot-gold" />
          </div>
        </div>

        <div className="hp-hero-content">
          <div className="hp-hero-eyebrow">
            <span className="hp-eyebrow-dot" />
            Powered by Hyperledger Fabric
            <span className="hp-eyebrow-dot" />
          </div>

          <h1 className="hp-hero-title">
            Certificates That
            <br />
            <span className="hp-hero-title-accent">
              Cannot Be Forged
            </span>
          </h1>

          <p className="hp-hero-sub">
            Issue, manage, and verify tamper-proof certificates on a
            permissioned blockchain. Every credential is cryptographically
            secured with SHA-256 and stored permanently on IPFS.
          </p>

          <div className="hp-hero-actions">
            <Link to="/register" className="hp-cta-primary">
              <span>Start Issuing</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link to="/verify" className="hp-cta-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              <span>Verify a Certificate</span>
            </Link>
          </div>

          <div className="hp-hero-trust">
            {['Hyperledger Fabric', 'IPFS Storage', 'SHA-256 Integrity', 'Merkle Tree Proofs', 'QR Verification'].map(t => (
              <div className="hp-trust-pill" key={t}>
                <span className="hp-trust-dot" />
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="hp-hero-scroll-hint">
          <div className="hp-scroll-mouse">
            <div className="hp-scroll-wheel" />
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="hp-features" id="features" ref={featRef}>
        <div className="hp-section-header">
          <div className="hp-section-label">CAPABILITIES</div>
          <h2 className="hp-section-title">Built for trust at every step</h2>
          <p className="hp-section-sub">
            A complete certificate lifecycle platform — from issuance to verification.
          </p>
        </div>

        <div className="hp-features-grid">
          {[
            {
              icon: '⛓',
              title: 'Immutable Blockchain Ledger',
              desc: 'Every certificate is anchored to a Hyperledger Fabric blockchain. Once recorded, no entity — not even the issuer — can alter or delete it.',
              accent: 'gold',
              delay: 0,
            },
            {
              icon: '🔐',
              title: 'SHA-256 Hash Integrity',
              desc: 'Every certificate is hashed with SHA-256 before storage. Any tampering — even a single character — invalidates the hash and is caught instantly on verification.',
              accent: 'blue',
              delay: 100,
            },
            {
              icon: '🌳',
              title: 'Merkle Tree Verification',
              desc: 'Certificates are structured into a Merkle tree. Each leaf is a certificate hash; the Merkle root acts as a cryptographic fingerprint of the entire batch — enabling efficient, tamper-evident proof of any individual certificate.',
              accent: 'green',
              delay: 200,
            },
            {
              icon: '📦',
              title: 'Distributed IPFS Storage',
              desc: 'PDF certificates are stored on IPFS — a decentralized, content-addressed network. No central server to take down, no single point of failure.',
              accent: 'gold',
              delay: 300,
            },
            {
              icon: '🔍',
              title: 'QR-Code Instant Verify',
              desc: 'Every PDF contains an embedded QR code. Anyone can upload the PDF to our public verifier to confirm authenticity against the blockchain in seconds.',
              accent: 'blue',
              delay: 400,
            },
            {
              icon: '🗄',
              title: 'Recipient Digital Locker',
              desc: 'Recipients get a personal locker linked to their government ID. Certificates issued before registration appear automatically upon sign-up.',
              accent: 'green',
              delay: 500,
            },
          ].map((f, i) => (
            <div
              className={`hp-feat-card hp-feat-${f.accent} ${featInView ? 'hp-anim-in' : ''}`}
              style={{ animationDelay: `${f.delay}ms` }}
              key={i}
            >
              <div className={`hp-feat-icon-wrap hp-icon-${f.accent}`}>
                <span className="hp-feat-icon">{f.icon}</span>
              </div>
              <h3 className="hp-feat-title">{f.title}</h3>
              <p className="hp-feat-desc">{f.desc}</p>
              <div className={`hp-feat-accent-line hp-accentline-${f.accent}`} />
            </div>
          ))}
        </div>
      </section>

      {/* ── MERKLE TREE EXPLAINER ─────────────────────────────────── */}
      <section className="hp-merkle">
        <div className="hp-merkle-bg"><div className="hp-merkle-glow" /></div>
        <div className="hp-merkle-inner">
          <div className="hp-merkle-text">
            <div className="hp-section-label" style={{ textAlign: 'left', marginBottom: 14 }}>CRYPTOGRAPHIC INTEGRITY</div>
            <h2 className="hp-section-title" style={{ textAlign: 'left', marginBottom: 16 }}>
              Two layers of<br />
              <span style={{ background: 'linear-gradient(135deg, #c9a84c, #e2c97e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                tamper-proof verification
              </span>
            </h2>
            <p className="hp-section-sub" style={{ textAlign: 'left', marginBottom: 28 }}>
              Every certificate is protected by two independent cryptographic mechanisms — verify using either or both.
            </p>

            <div className="hp-integrity-blocks">
              <div className="hp-integrity-block hp-ib-gold">
                <div className="hp-ib-header">
                  <span className="hp-ib-icon">🔐</span>
                  <span className="hp-ib-label">SHA-256 Hash</span>
                </div>
                <p className="hp-ib-desc">
                  A unique 64-character fingerprint computed from the certificate's full content. 
                  If even a single byte changes — the name, date, grade — the hash becomes completely different.
                  Verifiers check this hash directly against the blockchain record.
                </p>
                <div className="hp-ib-code">
                  <span className="hp-ib-code-label">EXAMPLE HASH</span>
                  <code>a3f1d9…e84c02</code>
                </div>
              </div>

              <div className="hp-integrity-block hp-ib-green">
                <div className="hp-ib-header">
                  <span className="hp-ib-icon">🌳</span>
                  <span className="hp-ib-label">Merkle Root</span>
                </div>
                <p className="hp-ib-desc">
                  Certificate hashes are combined in pairs and hashed again, recursively, forming a binary tree.
                  The single root hash at the top represents the integrity of every certificate in the batch.
                  A forged certificate cannot produce a valid Merkle proof.
                </p>
                <div className="hp-ib-code">
                  <span className="hp-ib-code-label">EXAMPLE ROOT</span>
                  <code>7b2e8a…91f40d</code>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Merkle Tree */}
          <div className="hp-merkle-visual">
            <div className="hp-tree-label">Merkle Tree Structure</div>
            {/* Root */}
            <div className="hp-tree-row">
              <div className="hp-tree-node hp-node-root">
                <div className="hp-node-tag">ROOT</div>
                <div className="hp-node-hash">H(AB+CD)</div>
              </div>
            </div>
            <div className="hp-tree-branches hp-branches-top">
              <div className="hp-branch-line hp-bl-left" />
              <div className="hp-branch-line hp-bl-right" />
            </div>
            {/* Level 2 */}
            <div className="hp-tree-row hp-tree-row-2">
              <div className="hp-tree-node hp-node-mid">
                <div className="hp-node-tag">H(AB)</div>
                <div className="hp-node-hash">a3f1…9e2c</div>
              </div>
              <div className="hp-tree-node hp-node-mid">
                <div className="hp-node-tag">H(CD)</div>
                <div className="hp-node-hash">7b2e…04af</div>
              </div>
            </div>
            <div className="hp-tree-branches hp-branches-mid">
              <div className="hp-branch-line hp-bl-ll" />
              <div className="hp-branch-line hp-bl-lr" />
              <div className="hp-branch-spacer" />
              <div className="hp-branch-line hp-bl-rl" />
              <div className="hp-branch-line hp-bl-rr" />
            </div>
            {/* Leaves */}
            <div className="hp-tree-row hp-tree-row-3">
              {[
                { tag: 'Cert A', hash: 'SHA-256', color: 'leaf-a' },
                { tag: 'Cert B', hash: 'SHA-256', color: 'leaf-b' },
                { tag: 'Cert C', hash: 'SHA-256', color: 'leaf-c' },
                { tag: 'Cert D', hash: 'SHA-256', color: 'leaf-d' },
              ].map(n => (
                <div key={n.tag} className={`hp-tree-node hp-node-leaf hp-${n.color}`}>
                  <div className="hp-node-tag">{n.tag}</div>
                  <div className="hp-node-hash">{n.hash}</div>
                </div>
              ))}
            </div>
            <div className="hp-tree-row hp-tree-row-docs">
              {['📄', '📄', '📄', '📄'].map((icon, i) => (
                <div key={i} className="hp-tree-doc">
                  <span>{icon}</span>
                  <div className="hp-tree-doc-line" />
                </div>
              ))}
            </div>
            <div className="hp-tree-note">
              Each leaf = one certificate's SHA-256 hash
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="hp-how" id="how-it-works" ref={howRef}>
        <div className="hp-how-bg">
          <div className="hp-how-glow" />
        </div>
        <div className="hp-section-header">
          <div className="hp-section-label">PROCESS</div>
          <h2 className="hp-section-title">From issuance to verification</h2>
          <p className="hp-section-sub">
            A transparent, cryptographically-secured lifecycle for every credential.
          </p>
        </div>

        <div className="hp-how-steps">
          {[
            {
              n: '01',
              title: 'Organization Issues',
              desc: 'An authorized organization logs in, fills certificate details, and submits. The platform generates a PDF with embedded QR code.',
              icon: '🏛',
              role: 'issuer',
            },
            {
              n: '02',
              title: 'Blockchain Records',
              desc: 'A SHA-256 hash of the certificate is computed and submitted to the Hyperledger Fabric blockchain as an immutable transaction.',
              icon: '⛓',
              role: 'system',
            },
            {
              n: '03',
              title: 'IPFS Stores PDF',
              desc: 'The generated PDF is uploaded to IPFS, returning a content-addressed CID that is permanently linked to the blockchain record.',
              icon: '📦',
              role: 'system',
            },
            {
              n: '04',
              title: 'Recipient Receives',
              desc: 'The recipient logs in with the same government ID the org used. All their certificates appear automatically in their digital locker.',
              icon: '🎓',
              role: 'recipient',
            },
            {
              n: '05',
              title: 'Anyone Verifies',
              desc: 'A third party uploads the PDF to our public verifier. The QR is scanned, hash is checked against the blockchain, result is instant.',
              icon: '✓',
              role: 'public',
            },
          ].map((step, i) => (
            <div
              className={`hp-step ${howInView ? 'hp-anim-in' : ''}`}
              style={{ animationDelay: `${i * 120}ms` }}
              key={i}
            >
              <div className="hp-step-number">{step.n}</div>
              <div className="hp-step-connector" />
              <div className="hp-step-card">
                <div className="hp-step-icon">{step.icon}</div>
                <div className={`hp-step-role hp-role-${step.role}`}>{step.role.toUpperCase()}</div>
                <h3 className="hp-step-title">{step.title}</h3>
                <p className="hp-step-desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROLES SECTION ────────────────────────────────────────────── */}
      <section className="hp-roles">
        <div className="hp-section-header">
          <div className="hp-section-label">WHO IS IT FOR</div>
          <h2 className="hp-section-title">Three roles, one platform</h2>
        </div>

        <div className="hp-roles-grid">
          {[
            {
              role: 'Organizations',
              icon: '🏛',
              color: 'gold',
              perks: [
                'Issue unlimited certificates',
                'Custom logo & signature on every PDF',
                'Revoke invalid or erroneous certificates',
                'Track all issued credentials in one place',
              ],
              cta: 'Register as Issuer',
              link: '/register',
            },
            {
              role: 'Recipients',
              icon: '🎓',
              color: 'blue',
              perks: [
                'Auto-linked to your government ID',
                'Access certs issued even before signup',
                'Download verified PDFs anytime',
                'View certificate details on the portal',
              ],
              cta: 'Create Recipient Account',
              link: '/register',
              featured: true,
            },
            {
              role: 'Verifiers',
              icon: '🔍',
              color: 'green',
              perks: [
                'No login required',
                'Upload any certificate PDF',
                'Instant QR scan + blockchain check',
                'Tamper detection in seconds',
              ],
              cta: 'Verify a Certificate',
              link: '/verify',
            },
          ].map((r, i) => (
            <div className={`hp-role-card hp-role-${r.color} ${r.featured ? 'hp-role-featured' : ''}`} key={i}>
              {r.featured && <div className="hp-role-featured-badge">MOST POPULAR</div>}
              <div className="hp-role-icon">{r.icon}</div>
              <h3 className="hp-role-name">{r.role}</h3>
              <ul className="hp-role-perks">
                {r.perks.map(p => (
                  <li key={p} className="hp-role-perk">
                    <span className={`hp-perk-check hp-check-${r.color}`}>✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link to={r.link} className={`hp-role-cta hp-cta-${r.color}`}>
                {r.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────── */}
      <section className="hp-cta-banner">
        <div className="hp-cta-banner-glow" />
        <div className="hp-cta-banner-content">
          <h2 className="hp-cta-banner-title">
            Your credentials deserve<br />
            <span className="hp-cta-banner-accent">permanent protection</span>
          </h2>
          <p className="hp-cta-banner-sub">
            Join the organizations and recipients already using CertChain to issue
            and manage tamper-proof credentials on the blockchain.
          </p>
          <div className="hp-cta-banner-actions">
            <Link to="/register" className="hp-cta-primary hp-cta-xl">
              <span>Get Started Free</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link to="/verify" className="hp-cta-outline hp-cta-xl">
              Try the Verifier
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-brand">
            <span className="hp-nav-logo">CertChain</span>
            <p className="hp-footer-tagline">
              Tamper-proof certificate management<br />
              powered by Hyperledger Fabric & IPFS.
            </p>
          </div>
          <div className="hp-footer-links">
            <div className="hp-footer-col">
              <div className="hp-footer-col-title">Platform</div>
              <Link to="/register" className="hp-footer-link">Register</Link>
              <Link to="/login" className="hp-footer-link">Sign In</Link>
              <Link to="/verify" className="hp-footer-link">Verify Certificate</Link>
            </div>
            <div className="hp-footer-col">
              <div className="hp-footer-col-title">Technology</div>
              <span className="hp-footer-link">Hyperledger Fabric</span>
              <span className="hp-footer-link">IPFS Storage</span>
              <span className="hp-footer-link">SHA-256 Integrity</span>
            </div>
          </div>
        </div>
        <div className="hp-footer-bottom">
          <span>© {new Date().getFullYear()} CertChain. All rights reserved.</span>
          <span className="hp-footer-chain">⛓ Secured by Blockchain</span>
        </div>
      </footer>

      <style>{`
        /* ── ROOT ──────────────────────────────────────────────────── */
        .hp-root {
          min-height: 100vh;
          background: #080c18;
          color: #f4f1eb;
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }

        /* ── NAV ───────────────────────────────────────────────────── */
        .hp-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          backdrop-filter: blur(12px);
          border-bottom: 1px solid transparent;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .hp-nav:hover { border-bottom-color: rgba(201,168,76,0.15); }
        .hp-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 18px 40px;
          display: flex;
          align-items: center;
          gap: 40px;
        }
        .hp-nav-brand { display: flex; align-items: center; gap: 10px; margin-right: auto; }
        .hp-nav-logo {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          color: #c9a84c;
          letter-spacing: 0.5px;
        }
        .hp-nav-badge {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #c9a84c;
          border: 1px solid rgba(201,168,76,0.4);
          border-radius: 4px;
          padding: 2px 6px;
          opacity: 0.7;
        }
        .hp-nav-links { display: flex; gap: 32px; }
        .hp-nav-link {
          font-size: 13.5px;
          color: rgba(244,241,235,0.65);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        .hp-nav-link:hover { color: #c9a84c; }
        .hp-nav-actions { display: flex; gap: 10px; }
        .hp-btn-ghost {
          padding: 8px 18px;
          background: none;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          color: rgba(244,241,235,0.7);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .hp-btn-ghost:hover {
          border-color: rgba(201,168,76,0.4);
          color: #c9a84c;
        }
        .hp-btn-gold {
          padding: 8px 18px;
          background: #c9a84c;
          border: none;
          border-radius: 8px;
          color: #080c18;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.2s;
        }
        .hp-btn-gold:hover {
          background: #e2c97e;
          transform: translateY(-1px);
        }

        /* ── HERO ──────────────────────────────────────────────────── */
        .hp-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 120px 40px 80px;
        }
        .hp-hero-bg {
          position: absolute;
          inset: -20%;
          pointer-events: none;
        }
        .hp-hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 80%);
        }
        .hp-hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .hp-glow-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 60%);
          top: 10%; left: 50%; transform: translateX(-50%);
        }
        .hp-glow-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(92,159,224,0.08) 0%, transparent 60%);
          top: 30%; left: 10%;
        }
        .hp-glow-3 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(45,212,160,0.06) 0%, transparent 60%);
          top: 20%; right: 8%;
        }

        /* Floating cert mockups */
        .hp-hero-float {
          position: absolute;
          pointer-events: none;
        }
        .hp-float-1 { top: 18%; left: 6%; animation: hp-float 6s ease-in-out infinite; }
        .hp-float-2 { top: 22%; right: 5%; animation: hp-float 7s ease-in-out infinite 1s; }
        .hp-float-3 { bottom: 22%; right: 12%; animation: hp-float 5s ease-in-out infinite 0.5s; }
        @keyframes hp-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        .hp-mini-cert {
          width: 160px;
          background: rgba(17,24,39,0.9);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 10px;
          padding: 14px;
          backdrop-filter: blur(8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .hp-mini-cert-alt { border-color: rgba(92,159,224,0.25); }
        .hp-mini-cert-bar {
          height: 3px;
          background: linear-gradient(90deg, #c9a84c, transparent);
          border-radius: 2px;
          margin-bottom: 12px;
        }
        .hp-mini-cert-lines { display: flex; flex-direction: column; gap: 7px; }
        .hp-mini-line {
          height: 6px;
          background: rgba(244,241,235,0.12);
          border-radius: 3px;
        }
        .hp-line-gold { background: rgba(201,168,76,0.35); width: 70%; }
        .hp-line-short { width: 45%; }
        .hp-line-mid { width: 60%; }
        .hp-mini-cert-badge {
          margin-top: 12px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #2dd4a0;
          border: 1px solid rgba(45,212,160,0.3);
          border-radius: 4px;
          padding: 3px 7px;
          display: inline-block;
        }
        .hp-badge-blue { color: #5c9fe0; border-color: rgba(92,159,224,0.3); }
        .hp-chain-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          opacity: 0.6;
        }
        .hp-chain-dot {
          width: 12px; height: 12px;
          background: rgba(201,168,76,0.4);
          border: 2px solid rgba(201,168,76,0.6);
          border-radius: 50%;
        }
        .hp-dot-gold { background: #c9a84c; }
        .hp-chain-line {
          width: 2px;
          height: 28px;
          background: linear-gradient(rgba(201,168,76,0.5), rgba(201,168,76,0.1));
        }

        /* Hero content */
        .hp-hero-content {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 780px;
        }
        .hp-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: rgba(201,168,76,0.8);
          margin-bottom: 28px;
          padding: 7px 16px;
          background: rgba(201,168,76,0.06);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 20px;
        }
        .hp-eyebrow-dot {
          width: 5px; height: 5px;
          background: #c9a84c;
          border-radius: 50%;
          opacity: 0.7;
        }
        .hp-hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(42px, 7vw, 80px);
          font-weight: 700;
          line-height: 1.08;
          color: #f4f1eb;
          margin-bottom: 24px;
          letter-spacing: -0.5px;
        }
        .hp-hero-title-accent {
          background: linear-gradient(135deg, #c9a84c 0%, #e2c97e 40%, #c9a84c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: block;
          animation: hp-shimmer 4s linear infinite;
          background-size: 200% 100%;
        }
        @keyframes hp-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .hp-hero-sub {
          font-size: 17px;
          color: rgba(244,241,235,0.58);
          line-height: 1.7;
          max-width: 560px;
          margin: 0 auto 40px;
        }
        .hp-hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }
        .hp-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: #c9a84c;
          color: #080c18;
          font-weight: 700;
          font-size: 14.5px;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s;
          letter-spacing: 0.2px;
        }
        .hp-cta-primary:hover {
          background: #e2c97e;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(201,168,76,0.3);
        }
        .hp-cta-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: rgba(244,241,235,0.05);
          border: 1px solid rgba(244,241,235,0.15);
          color: rgba(244,241,235,0.8);
          font-weight: 600;
          font-size: 14.5px;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .hp-cta-secondary:hover {
          border-color: rgba(201,168,76,0.35);
          color: #c9a84c;
          background: rgba(201,168,76,0.06);
        }
        .hp-hero-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .hp-trust-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: rgba(244,241,235,0.04);
          border: 1px solid rgba(244,241,235,0.08);
          border-radius: 20px;
          font-size: 11px;
          color: rgba(244,241,235,0.45);
          font-weight: 500;
        }
        .hp-trust-dot {
          width: 4px; height: 4px;
          background: #c9a84c;
          border-radius: 50%;
          opacity: 0.7;
        }
        .hp-hero-scroll-hint {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          animation: hp-bounce 2.5s ease-in-out infinite;
        }
        @keyframes hp-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); opacity: 0.5; }
          50% { transform: translateX(-50%) translateY(6px); opacity: 1; }
        }
        .hp-scroll-mouse {
          width: 22px; height: 34px;
          border: 2px solid rgba(201,168,76,0.4);
          border-radius: 11px;
          display: flex;
          justify-content: center;
          padding-top: 6px;
        }
        .hp-scroll-wheel {
          width: 3px; height: 6px;
          background: #c9a84c;
          border-radius: 2px;
          animation: hp-wheel 2s ease-in-out infinite;
        }
        @keyframes hp-wheel {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(8px); opacity: 0; }
        }

        /* ── SHARED SECTION STYLES ─────────────────────────────────── */
        .hp-section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 64px;
        }
        .hp-section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(201,168,76,0.7);
          margin-bottom: 14px;
        }
        .hp-section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 42px);
          color: #f4f1eb;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 14px;
        }
        .hp-section-sub {
          font-size: 15px;
          color: rgba(244,241,235,0.5);
          line-height: 1.6;
        }

        /* ── FEATURES ──────────────────────────────────────────────── */
        .hp-features {
          padding: 100px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .hp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .hp-feat-card {
          background: rgba(17,24,39,0.7);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 28px 24px;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
          opacity: 0;
          transform: translateY(24px);
        }
        .hp-feat-card.hp-anim-in {
          animation: hp-rise 0.5s ease forwards;
        }
        @keyframes hp-rise {
          to { opacity: 1; transform: translateY(0); }
        }
        .hp-feat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.35);
        }
        .hp-feat-gold:hover { border-color: rgba(201,168,76,0.3); }
        .hp-feat-blue:hover  { border-color: rgba(92,159,224,0.3); }
        .hp-feat-green:hover { border-color: rgba(45,212,160,0.3); }
        .hp-feat-icon-wrap {
          width: 46px; height: 46px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          margin-bottom: 18px;
        }
        .hp-icon-gold  { background: rgba(201,168,76,0.12); }
        .hp-icon-blue  { background: rgba(92,159,224,0.12); }
        .hp-icon-green { background: rgba(45,212,160,0.12); }
        .hp-feat-title {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          color: #f4f1eb;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .hp-feat-desc {
          font-size: 13.5px;
          color: rgba(244,241,235,0.5);
          line-height: 1.65;
        }
        .hp-feat-accent-line {
          position: absolute;
          bottom: 0; left: 0;
          height: 2px;
          width: 0;
          border-radius: 2px;
          transition: width 0.4s ease;
        }
        .hp-feat-card:hover .hp-feat-accent-line { width: 100%; }
        .hp-accentline-gold  { background: linear-gradient(90deg, #c9a84c, transparent); }
        .hp-accentline-blue  { background: linear-gradient(90deg, #5c9fe0, transparent); }
        .hp-accentline-green { background: linear-gradient(90deg, #2dd4a0, transparent); }

        /* ── MERKLE SECTION ────────────────────────────────────────── */
        .hp-merkle {
          padding: 100px 40px;
          position: relative;
          overflow: hidden;
          border-top: 1px solid rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          background: rgba(10,14,26,0.7);
        }
        .hp-merkle-bg {
          position: absolute; inset: 0; pointer-events: none;
        }
        .hp-merkle-glow {
          position: absolute;
          width: 600px; height: 500px;
          background: radial-gradient(ellipse, rgba(45,212,160,0.05) 0%, transparent 65%);
          top: 50%; right: 5%;
          transform: translateY(-50%);
        }
        .hp-merkle-inner {
          max-width: 1160px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 70px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .hp-integrity-blocks {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .hp-integrity-block {
          background: rgba(17,24,39,0.8);
          border-radius: 12px;
          padding: 20px 22px;
          border: 1px solid rgba(255,255,255,0.06);
          transition: border-color 0.2s;
        }
        .hp-ib-gold:hover { border-color: rgba(201,168,76,0.3); }
        .hp-ib-green:hover { border-color: rgba(45,212,160,0.3); }
        .hp-ib-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .hp-ib-icon { font-size: 18px; }
        .hp-ib-label {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 600;
          color: #f4f1eb;
        }
        .hp-ib-desc {
          font-size: 13px;
          color: rgba(244,241,235,0.5);
          line-height: 1.65;
          margin-bottom: 14px;
        }
        .hp-ib-code {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0,0,0,0.3);
          border-radius: 6px;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .hp-ib-code-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: rgba(244,241,235,0.3);
          white-space: nowrap;
        }
        .hp-ib-code code {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #c9a84c;
        }
        .hp-ib-green .hp-ib-code code { color: #2dd4a0; }

        /* Merkle Tree Visual */
        .hp-merkle-visual {
          background: rgba(17,24,39,0.6);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .hp-tree-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(244,241,235,0.3);
          margin-bottom: 20px;
          align-self: flex-start;
        }
        .hp-tree-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          width: 100%;
        }
        .hp-tree-row-2 { gap: 24px; }
        .hp-tree-row-3 { gap: 8px; }
        .hp-tree-row-docs { gap: 8px; margin-top: 4px; }
        .hp-tree-node {
          border-radius: 8px;
          padding: 8px 12px;
          text-align: center;
          border: 1px solid;
          min-width: 72px;
        }
        .hp-node-root {
          background: rgba(201,168,76,0.12);
          border-color: rgba(201,168,76,0.4);
          min-width: 130px;
        }
        .hp-node-mid {
          background: rgba(92,159,224,0.1);
          border-color: rgba(92,159,224,0.3);
          min-width: 100px;
        }
        .hp-node-leaf {
          background: rgba(45,212,160,0.08);
          border-color: rgba(45,212,160,0.25);
          min-width: 60px;
          flex: 1;
        }
        .hp-node-tag {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: rgba(244,241,235,0.4);
          margin-bottom: 3px;
        }
        .hp-node-root .hp-node-tag { color: rgba(201,168,76,0.7); }
        .hp-node-hash {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #c9a84c;
        }
        .hp-node-mid .hp-node-hash { color: #5c9fe0; }
        .hp-node-leaf .hp-node-hash { color: #2dd4a0; font-size: 8px; }
        .hp-tree-branches {
          display: flex;
          justify-content: center;
          width: 100%;
          height: 16px;
          position: relative;
          margin: 2px 0;
        }
        .hp-branch-line {
          position: absolute;
          background: rgba(255,255,255,0.12);
        }
        .hp-branches-top .hp-bl-left {
          width: 25%; height: 1px;
          top: 50%; right: 50%;
          transform-origin: right center;
          transform: rotate(-20deg);
        }
        .hp-branches-top .hp-bl-right {
          width: 25%; height: 1px;
          top: 50%; left: 50%;
          transform-origin: left center;
          transform: rotate(20deg);
        }
        .hp-branches-mid {
          display: flex;
          gap: 0;
          justify-content: space-around;
          padding: 0 8px;
        }
        .hp-branches-mid .hp-branch-line {
          position: static;
          width: 1px;
          height: 16px;
          background: rgba(255,255,255,0.1);
        }
        .hp-branch-spacer { flex: 1; }
        .hp-tree-doc {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-size: 16px;
        }
        .hp-tree-doc-line {
          width: 1px;
          height: 8px;
          background: rgba(45,212,160,0.25);
        }
        .hp-tree-note {
          font-size: 10px;
          color: rgba(244,241,235,0.25);
          margin-top: 14px;
          letter-spacing: 0.5px;
          text-align: center;
        }

        /* ── HOW IT WORKS ──────────────────────────────────────────── */
        .hp-how {
          padding: 100px 40px;
          background: rgba(8,12,24,0.6);
          position: relative;
          overflow: hidden;
        }
        .hp-how-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .hp-how-glow {
          position: absolute;
          width: 800px; height: 400px;
          background: radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 60%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }
        .hp-how-steps {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          position: relative;
        }
        .hp-step {
          opacity: 0;
          transform: translateY(20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .hp-step.hp-anim-in {
          animation: hp-rise 0.45s ease forwards;
        }
        .hp-step-number {
          font-family: 'Playfair Display', serif;
          font-size: 11px;
          font-weight: 700;
          color: rgba(201,168,76,0.6);
          letter-spacing: 2px;
          margin-bottom: 10px;
        }
        .hp-step-connector {
          width: 1px;
          height: 28px;
          background: linear-gradient(rgba(201,168,76,0.4), rgba(201,168,76,0.1));
          margin-bottom: 10px;
        }
        .hp-step-card {
          background: rgba(17,24,39,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 20px 16px;
          flex: 1;
          width: 100%;
          transition: border-color 0.2s, transform 0.2s;
        }
        .hp-step-card:hover {
          border-color: rgba(201,168,76,0.25);
          transform: translateY(-3px);
        }
        .hp-step-icon { font-size: 24px; margin-bottom: 8px; }
        .hp-step-role {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
          padding: 2px 7px;
          border-radius: 4px;
          display: inline-block;
        }
        .hp-role-issuer   { color: #c9a84c; background: rgba(201,168,76,0.1); }
        .hp-role-system   { color: #5c9fe0; background: rgba(92,159,224,0.1); }
        .hp-role-recipient { color: #2dd4a0; background: rgba(45,212,160,0.1); }
        .hp-role-public   { color: rgba(244,241,235,0.6); background: rgba(244,241,235,0.06); }
        .hp-step-title {
          font-family: 'Playfair Display', serif;
          font-size: 14px;
          color: #f4f1eb;
          margin-bottom: 7px;
          font-weight: 600;
        }
        .hp-step-desc {
          font-size: 11.5px;
          color: rgba(244,241,235,0.45);
          line-height: 1.6;
        }

        /* ── ROLES ─────────────────────────────────────────────────── */
        .hp-roles {
          padding: 100px 40px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .hp-roles-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }
        .hp-role-card {
          background: rgba(17,24,39,0.8);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 32px 26px;
          position: relative;
          transition: transform 0.25s, border-color 0.25s;
        }
        .hp-role-card:hover { transform: translateY(-6px); }
        .hp-role-featured {
          border-color: rgba(92,159,224,0.3);
          box-shadow: 0 0 40px rgba(92,159,224,0.07);
          transform: scale(1.02);
        }
        .hp-role-featured:hover { transform: scale(1.02) translateY(-6px); }
        .hp-role-featured-badge {
          position: absolute;
          top: -12px; left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          padding: 4px 12px;
          background: #5c9fe0;
          color: #080c18;
          border-radius: 20px;
          white-space: nowrap;
        }
        .hp-role-icon { font-size: 32px; margin-bottom: 16px; }
        .hp-role-name {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          color: #f4f1eb;
          margin-bottom: 20px;
          font-weight: 700;
        }
        .hp-role-perks { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .hp-role-perk {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: rgba(244,241,235,0.6);
          line-height: 1.5;
        }
        .hp-perk-check {
          font-size: 11px;
          font-weight: 700;
          margin-top: 1px;
          flex-shrink: 0;
        }
        .hp-check-gold  { color: #c9a84c; }
        .hp-check-blue  { color: #5c9fe0; }
        .hp-check-green { color: #2dd4a0; }
        .hp-role-cta {
          display: block;
          text-align: center;
          padding: 12px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }
        .hp-cta-gold  { background: rgba(201,168,76,0.1); color: #c9a84c; border: 1px solid rgba(201,168,76,0.3); }
        .hp-cta-gold:hover  { background: rgba(201,168,76,0.18); }
        .hp-cta-blue  { background: rgba(92,159,224,0.1); color: #5c9fe0; border: 1px solid rgba(92,159,224,0.3); }
        .hp-cta-blue:hover  { background: rgba(92,159,224,0.18); }
        .hp-cta-green { background: rgba(45,212,160,0.1); color: #2dd4a0; border: 1px solid rgba(45,212,160,0.3); }
        .hp-cta-green:hover { background: rgba(45,212,160,0.18); }

        /* ── CTA BANNER ────────────────────────────────────────────── */
        .hp-cta-banner {
          padding: 100px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
          background: rgba(17,24,39,0.5);
          border-top: 1px solid rgba(201,168,76,0.08);
          border-bottom: 1px solid rgba(201,168,76,0.08);
        }
        .hp-cta-banner-glow {
          position: absolute;
          width: 700px; height: 400px;
          background: radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 65%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .hp-cta-banner-content { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; }
        .hp-cta-banner-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4vw, 46px);
          color: #f4f1eb;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 20px;
        }
        .hp-cta-banner-accent {
          background: linear-gradient(135deg, #c9a84c, #e2c97e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hp-cta-banner-sub {
          font-size: 15px;
          color: rgba(244,241,235,0.5);
          line-height: 1.65;
          margin-bottom: 36px;
        }
        .hp-cta-banner-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .hp-cta-xl { padding: 15px 32px; font-size: 15px; }
        .hp-cta-outline {
          display: inline-flex;
          align-items: center;
          padding: 15px 32px;
          border: 1px solid rgba(244,241,235,0.2);
          border-radius: 10px;
          color: rgba(244,241,235,0.7);
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }
        .hp-cta-outline:hover {
          border-color: rgba(201,168,76,0.4);
          color: #c9a84c;
        }

        /* ── FOOTER ────────────────────────────────────────────────── */
        .hp-footer {
          padding: 60px 40px 30px;
          background: #060a14;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .hp-footer-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          gap: 80px;
          margin-bottom: 48px;
        }
        .hp-footer-brand { flex: 1; }
        .hp-footer-tagline {
          font-size: 13px;
          color: rgba(244,241,235,0.35);
          line-height: 1.7;
          margin-top: 14px;
        }
        .hp-footer-links { display: flex; gap: 60px; }
        .hp-footer-col { display: flex; flex-direction: column; gap: 10px; }
        .hp-footer-col-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: rgba(201,168,76,0.7);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .hp-footer-link {
          font-size: 13px;
          color: rgba(244,241,235,0.4);
          text-decoration: none;
          transition: color 0.2s;
          cursor: default;
        }
        a.hp-footer-link { cursor: pointer; }
        a.hp-footer-link:hover { color: rgba(244,241,235,0.75); }
        .hp-footer-bottom {
          max-width: 1100px;
          margin: 0 auto;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: rgba(244,241,235,0.25);
        }
        .hp-footer-chain { color: rgba(201,168,76,0.4); }

        /* ── RESPONSIVE ────────────────────────────────────────────── */
        @media (max-width: 1024px) {
          .hp-features-grid { grid-template-columns: repeat(2, 1fr); }
          .hp-how-steps { grid-template-columns: repeat(3, 1fr); }
          .hp-step:nth-child(4), .hp-step:nth-child(5) { grid-column: span 1; }
          .hp-merkle-inner { grid-template-columns: 1fr; gap: 48px; }
          .hp-merkle-visual { max-width: 480px; margin: 0 auto; width: 100%; }
        }
        @media (max-width: 768px) {
          .hp-nav-links { display: none; }
          .hp-features-grid { grid-template-columns: 1fr; }
          .hp-how-steps { grid-template-columns: 1fr 1fr; }
          .hp-roles-grid { grid-template-columns: 1fr; }
          .hp-stats-inner { flex-direction: column; gap: 24px; }
          .hp-stats-divider { width: 60px; height: 1px; }
          .hp-hero-float { display: none; }
          .hp-footer-inner { flex-direction: column; gap: 40px; }
        }
        @media (max-width: 520px) {
          .hp-how-steps { grid-template-columns: 1fr; }
          .hp-nav-actions .hp-btn-ghost { display: none; }
          .hp-hero { padding: 100px 20px 60px; }
          .hp-features, .hp-roles, .hp-how { padding: 64px 20px; }
        }
      `}</style>
    </div>
  );
}