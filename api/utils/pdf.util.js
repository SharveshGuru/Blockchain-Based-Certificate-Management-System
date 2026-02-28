const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');

// ─── LANDSCAPE A4 ─────────────────────────────────────────────────────────────
// W = 841.89pt  H = 595.28pt

const BRAND_DARK   = '#0A2463';
const BRAND_MID    = '#1E6091';
const BRAND_GOLD   = '#C9A84C';
const TEXT_DARK    = '#1A1A2E';
const TEXT_MID     = '#4A4A6A';
const TEXT_LIGHT   = '#8888AA';
const WHITE        = '#FFFFFF';
const BG           = '#F7F8FC';

/**
 * Generates a landscape A4 certificate PDF.
 *
 * @param {Object} data   - { certId, certType, certHash, issuerOrg, recipientId,
 *                            recipientInfo, metadata }
 *                          recipientInfo = { name, idProof, dateOfBirth, gender }
 *                          recipientInfo.name  → shown on the certificate as the person's name
 *                          recipientId         → the raw ID proof number (used for QR / blockchain)
 * @param {Array}  assets - user.assets array from MongoDB
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateCertificatePDF = async (data, assets) => {
    return new Promise(async (resolve, reject) => {
        try {
            // ── Resolve display name ───────────────────────────────────────
            // recipientInfo.name is what the org entered (the person's real name).
            // Fall back to recipientId (ID proof number) only if name is missing.
            const recipientDisplayName =
                (data.recipientInfo && data.recipientInfo.name && data.recipientInfo.name.trim())
                    ? data.recipientInfo.name.trim()
                    : data.recipientId;

            const doc = new PDFDocument({
                layout: 'landscape',
                size: 'A4',
                margin: 0,
                autoFirstPage: false,
                info: {
                    Title: `${formatCertType(data.certType)} — ${data.certId}`,
                    Author: data.issuerOrg,
                    Subject: `Blockchain-verified ${data.certType} certificate`,
                    Keywords: `blockchain, certificate, ${data.certType.toLowerCase()}`
                }
            });

            doc.addPage();
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const W = doc.page.width;   // ~841
            const H = doc.page.height;  // ~595

            // ═══════════════════════════════════════════════════════════════
            // LAYER 1: BACKGROUND
            // ═══════════════════════════════════════════════════════════════
            doc.rect(0, 0, W, H).fill(BG);

            // ═══════════════════════════════════════════════════════════════
            // LAYER 2: LEFT SIDEBAR (navy column)
            // ═══════════════════════════════════════════════════════════════
            const sidebarW = 220;
            doc.rect(0, 0, sidebarW, H).fill(BRAND_DARK);

            // Gold accent strip on right edge of sidebar
            doc.rect(sidebarW - 4, 0, 4, H).fill(BRAND_GOLD);

            // ─ LOGO inside sidebar ─────────────────────────────────────────
            const logo = assets.find(a => a.assetName === data.selectedLogo)
                      || assets.find(a => a.assetType === 'LOGO');

            const logoAreaTop    = 32;
            const logoAreaBottom = 160;
            const logoMaxW       = 120;
            const logoMaxH       = logoAreaBottom - logoAreaTop - 10;

            if (logo && fs.existsSync(logo.filePath)) {
                const logoX = (sidebarW - 4 - logoMaxW) / 2;
                doc.image(logo.filePath, logoX, logoAreaTop, {
                    fit: [logoMaxW, logoMaxH],
                    align: 'center',
                    valign: 'center'
                });
            } else {
                doc.circle(sidebarW / 2 - 4, (logoAreaTop + logoAreaBottom) / 2, 38)
                    .lineWidth(1.5)
                    .stroke(BRAND_GOLD);
                doc.fillColor(BRAND_GOLD)
                    .font('Helvetica-Bold')
                    .fontSize(8)
                    .text('LOGO', 0, (logoAreaTop + logoAreaBottom) / 2 - 5, {
                        width: sidebarW - 4,
                        align: 'center'
                    });
            }

            // Gold divider under logo area
            doc.moveTo(20, logoAreaBottom + 6)
                .lineTo(sidebarW - 20, logoAreaBottom + 6)
                .lineWidth(0.75)
                .stroke(BRAND_GOLD);

            // ─ ISSUER ORG NAME ─────────────────────────────────────────────
            doc.fillColor(WHITE)
                .font('Helvetica-Bold')
                .fontSize(10)
                .text(data.issuerOrg.toUpperCase(), 14, logoAreaBottom + 20, {
                    width: sidebarW - 28,
                    align: 'center',
                    characterSpacing: 1
                });

            // ─ SIDEBAR DETAIL BLOCKS ───────────────────────────────────────
            let sideY = logoAreaBottom + 56;

            const sideLabel = (label, value) => {
                doc.fillColor(BRAND_GOLD)
                    .font('Helvetica-Bold')
                    .fontSize(7)
                    .text(label, 18, sideY, { width: sidebarW - 28, characterSpacing: 1 });
                sideY += 12;
                doc.fillColor(WHITE)
                    .font('Helvetica')
                    .fontSize(9)
                    .text(value, 18, sideY, { width: sidebarW - 28, lineGap: 1 });
                sideY += doc.heightOfString(value, { width: sidebarW - 28, fontSize: 9 }) + 14;
            };

            sideLabel('CERTIFICATE ID', data.certId);
            sideLabel('CERTIFICATE TYPE', formatCertType(data.certType));
            sideLabel('ISSUED BY', data.issuerOrg);

            // Sidebar shows the recipient's REAL NAME, with ID proof below it
            sideLabel('RECIPIENT', recipientDisplayName);

            // Show ID proof number as a smaller sub-label under recipient name
            if (recipientDisplayName !== data.recipientId) {
                // Only show ID separately if the name is different from the ID
                doc.fillColor(TEXT_LIGHT)
                    .font('Helvetica')
                    .fontSize(7)
                    .text(`ID: ${data.recipientId}`, 18, sideY - 10, {
                        width: sidebarW - 28
                    });
                sideY += 8;
            }

            // ─ BLOCKCHAIN BADGE ────────────────────────────────────────────
            const badgeY = H - 72;
            doc.roundedRect(14, badgeY, sidebarW - 28, 50, 4).fill(BRAND_MID);

            doc.fillColor(BRAND_GOLD)
                .font('Helvetica-Bold')
                .fontSize(7)
                .text('⬡  BLOCKCHAIN VERIFIED', 14, badgeY + 8, {
                    width: sidebarW - 28,
                    align: 'center',
                    characterSpacing: 0.8
                });
            doc.fillColor(WHITE)
                .font('Helvetica')
                .fontSize(6)
                .text(truncateMiddle(data.certHash, 32), 14, badgeY + 24, {
                    width: sidebarW - 28,
                    align: 'center'
                });
            doc.fillColor(TEXT_LIGHT)
                .fontSize(6)
                .text('SHA-256 Hash', 14, badgeY + 37, {
                    width: sidebarW - 28,
                    align: 'center'
                });

            // ═══════════════════════════════════════════════════════════════
            // LAYER 3: MAIN CONTENT AREA
            // ═══════════════════════════════════════════════════════════════
            const mainX = sidebarW + 28;
            const mainW = W - sidebarW - 50;
            let   curY  = 36;

            // Top gold border strip
            doc.rect(sidebarW, 0, W - sidebarW, 6).fill(BRAND_GOLD);

            // ─ CERTIFICATE TITLE ───────────────────────────────────────────
            doc.fillColor(BRAND_DARK)
                .font('Helvetica-Bold')
                .fontSize(26)
                .text(formatCertType(data.certType).toUpperCase(), mainX, curY, {
                    width: mainW,
                    align: 'left'
                });
            curY += 36;

            // ─ SUBTITLE ────────────────────────────────────────────────────
            doc.fillColor(BRAND_MID)
                .font('Helvetica')
                .fontSize(9)
                .text('OFFICIAL BLOCKCHAIN-VERIFIED RECORD', mainX, curY, {
                    width: mainW,
                    align: 'left',
                    characterSpacing: 2
                });
            curY += 18;

            // ─ GOLD DIVIDER ────────────────────────────────────────────────
            doc.moveTo(mainX, curY)
                .lineTo(mainX + mainW, curY)
                .lineWidth(1.5)
                .stroke(BRAND_GOLD);
            curY += 14;

            // ─ PRESENTED TO BLOCK ──────────────────────────────────────────
            doc.fillColor(TEXT_MID)
                .font('Helvetica-Oblique')
                .fontSize(11)
                .text('This certificate is proudly presented to', mainX, curY);
            curY += 18;

            // ✅ Recipient's REAL NAME (entered by org) shown here
            doc.fillColor(BRAND_DARK)
                .font('Helvetica-Bold')
                .fontSize(22)
                .text(recipientDisplayName, mainX, curY, { width: mainW });
            curY += 32;

            // ─ THIN SEPARATOR ──────────────────────────────────────────────
            doc.moveTo(mainX, curY)
                .lineTo(mainX + mainW, curY)
                .lineWidth(0.5)
                .stroke('#CCCCDD');
            curY += 12;

            // ─ METADATA GRID (two columns) ─────────────────────────────────
            // Filter out internal recipient fields from the grid —
            // they are already shown prominently above and in the sidebar.
            const INTERNAL_KEYS = new Set([
                'recipientName', 'recipientIdProof', 'recipientDob', 'recipientGender'
            ]);

            const entries = Object.entries(data.metadata).filter(
                ([key]) => !INTERNAL_KEYS.has(key)
            );

            const COL_W      = (mainW - 20) / 2;
            const COL2_X     = mainX + COL_W + 20;
            const ROW_H      = 38;
            const gridStartY = curY;

            entries.forEach(([key, value], i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x   = col === 0 ? mainX : COL2_X;
                const y   = gridStartY + row * ROW_H;

                doc.fillColor(TEXT_LIGHT)
                    .font('Helvetica-Bold')
                    .fontSize(7)
                    .text(formatLabel(key), x, y, { width: COL_W, characterSpacing: 1 });

                doc.fillColor(TEXT_DARK)
                    .font('Helvetica')
                    .fontSize(10.5)
                    .text(String(value), x, y + 11, { width: COL_W, lineGap: 1 });

                const lineY = y + ROW_H - 5;
                doc.moveTo(x, lineY)
                    .lineTo(x + COL_W - 10, lineY)
                    .lineWidth(0.3)
                    .stroke('#DDDDEE');
            });

            const totalGridRows = Math.ceil(Math.max(entries.length, 1) / 2);
            curY = gridStartY + totalGridRows * ROW_H + 8;

            // ─ SECOND SEPARATOR ────────────────────────────────────────────
            doc.moveTo(mainX, curY)
                .lineTo(mainX + mainW, curY)
                .lineWidth(0.5)
                .stroke('#CCCCDD');
            curY += 14;

            // ═══════════════════════════════════════════════════════════════
            // LAYER 4: FOOTER (QR + Signature)
            // ═══════════════════════════════════════════════════════════════
            const footerH = 110;
            const footerY = H - footerH - 10;

            doc.moveTo(mainX, footerY)
                .lineTo(mainX + mainW, footerY)
                .lineWidth(1)
                .stroke(BRAND_GOLD);

            // ─ QR CODE ─────────────────────────────────────────────────────
            const qrPayload = JSON.stringify({
                certId   : data.certId,
                hash     : data.certHash,
                issuer   : data.issuerOrg,
                recipient: data.recipientId   // QR always stores the ID proof number
            });

            const qrBuffer = await QRCode.toBuffer(qrPayload, {
                margin: 1,
                width: 200,
                color: { dark: BRAND_DARK, light: BG }
            });

            const qrSize = 80;
            const qrX    = mainX;
            const qrY    = footerY + 12;

            doc.image(qrBuffer, qrX, qrY, { width: qrSize });

            doc.fillColor(TEXT_LIGHT)
                .font('Helvetica')
                .fontSize(6.5)
                .text('Scan to verify authenticity', qrX, qrY + qrSize + 3, {
                    width: qrSize,
                    align: 'center'
                });

            // ─ FOOTER MIDDLE TEXT ──────────────────────────────────────────
            const midTextX = mainX + qrSize + 20;
            const midTextW = mainW - qrSize - 20 - 140;

            doc.fillColor(TEXT_MID)
                .font('Helvetica-Oblique')
                .fontSize(8.5)
                .text(
                    'This certificate has been issued and recorded on a tamper-proof blockchain ledger. ' +
                    'Scan the QR code or use the certificate ID to verify authenticity at any time.',
                    midTextX, footerY + 16,
                    { width: midTextW, lineGap: 3, align: 'justify' }
                );

            // ─ SIGNATURE ───────────────────────────────────────────────────
            const sigBoxW = 130;
            const sigBoxX = mainX + mainW - sigBoxW;
            const sigBoxY = footerY + 8;

            const sig = assets.find(a => a.assetName === data.selectedSignature)
                     || assets.find(a => a.assetType === 'SIGNATURE');

            if (sig && fs.existsSync(sig.filePath)) {
                doc.image(sig.filePath, sigBoxX, sigBoxY, {
                    fit: [sigBoxW, 52],
                    align: 'center'
                });
            }

            const sigLineY = sigBoxY + 58;
            doc.moveTo(sigBoxX, sigLineY)
                .lineTo(sigBoxX + sigBoxW, sigLineY)
                .lineWidth(0.75)
                .stroke(TEXT_MID);

            doc.fillColor(TEXT_MID)
                .font('Helvetica')
                .fontSize(8)
                .text('Authorised Signatory', sigBoxX, sigLineY + 5, {
                    width: sigBoxW,
                    align: 'center'
                });

            doc.fillColor(BRAND_DARK)
                .font('Helvetica-Bold')
                .fontSize(8.5)
                .text(data.issuerOrg, sigBoxX, sigLineY + 17, {
                    width: sigBoxW,
                    align: 'center'
                });

            // Bottom border strip
            doc.rect(sidebarW, H - 6, W - sidebarW, 6).fill(BRAND_DARK);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatCertType(certType) {
    const map = {
        ACADEMIC   : 'Certificate of Academic Achievement',
        LEGAL      : 'Legal Certificate',
        GOVERNMENT : 'Government Certificate',
        CORPORATE  : 'Certificate of Achievement'
    };
    return map[certType] || certType;
}

function formatLabel(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
        .trim()
        .toUpperCase();
}

function truncateMiddle(str, maxLen) {
    if (!str || str.length <= maxLen) return str;
    const half = Math.floor((maxLen - 3) / 2);
    return str.slice(0, half) + '...' + str.slice(-half);
}

module.exports = { generateCertificatePDF };

// const PDFDocument = require('pdfkit');
// const QRCode = require('qrcode');
// const fs = require('fs');

// // ─── LANDSCAPE A4 ─────────────────────────────────────────────────────────────
// // W = 841.89pt  H = 595.28pt

// const BRAND_DARK   = '#0A2463';   // deep navy
// const BRAND_MID    = '#1E6091';   // mid blue (accents)
// const BRAND_GOLD   = '#C9A84C';   // gold accents / dividers
// const TEXT_DARK    = '#1A1A2E';   // near-black for body text
// const TEXT_MID     = '#4A4A6A';   // grey for labels
// const TEXT_LIGHT   = '#8888AA';   // faint for footnotes
// const WHITE        = '#FFFFFF';
// const BG           = '#F7F8FC';   // off-white page background

// /**
//  * Generates a landscape A4 certificate PDF.
//  *
//  * @param {Object} data   - { certId, certType, certHash, issuerOrg, recipientId, metadata,
//  *                            selectedLogo?, selectedSignature? }
//  * @param {Array}  assets - user.assets array from MongoDB
//  * @returns {Promise<Buffer>} PDF buffer
//  */
// const generateCertificatePDF = async (data, assets) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             const doc = new PDFDocument({
//                 layout: 'landscape',
//                 size: 'A4',
//                 margin: 0,
//                 autoFirstPage: false,
//                 info: {
//                     Title: `${formatCertType(data.certType)} — ${data.certId}`,
//                     Author: data.issuerOrg,
//                     Subject: `Blockchain-verified ${data.certType} certificate`,
//                     Keywords: `blockchain, certificate, ${data.certType.toLowerCase()}`
//                 }
//             });

//             doc.addPage();
//             const buffers = [];
//             doc.on('data', buffers.push.bind(buffers));
//             doc.on('end', () => resolve(Buffer.concat(buffers)));

//             const W = doc.page.width;   // ~841
//             const H = doc.page.height;  // ~595

//             // ═══════════════════════════════════════════════════════════════
//             // LAYER 1: BACKGROUND
//             // ═══════════════════════════════════════════════════════════════
//             doc.rect(0, 0, W, H).fill(BG);

//             // ═══════════════════════════════════════════════════════════════
//             // LAYER 2: LEFT SIDEBAR (navy column)
//             // ═══════════════════════════════════════════════════════════════
//             const sidebarW = 220;
//             doc.rect(0, 0, sidebarW, H).fill(BRAND_DARK);

//             // Gold accent strip on right edge of sidebar
//             doc.rect(sidebarW - 4, 0, 4, H).fill(BRAND_GOLD);

//             // ─ LOGO inside sidebar ─────────────────────────────────────────
//             // Sits in the top portion of the sidebar, centered horizontally
//             const logo = assets.find(a => a.assetName === data.selectedLogo)
//                       || assets.find(a => a.assetType === 'LOGO');

//             const logoAreaTop    = 32;
//             const logoAreaBottom = 160;
//             const logoMaxW       = 120;
//             const logoMaxH       = logoAreaBottom - logoAreaTop - 10;

//             if (logo && fs.existsSync(logo.filePath)) {
//                 // Center logo horizontally in sidebar
//                 const logoX = (sidebarW - 4 - logoMaxW) / 2;
//                 doc.image(logo.filePath, logoX, logoAreaTop, {
//                     fit: [logoMaxW, logoMaxH],
//                     align: 'center',
//                     valign: 'center'
//                 });
//             } else {
//                 // Placeholder circle when no logo
//                 doc.circle(sidebarW / 2 - 4, (logoAreaTop + logoAreaBottom) / 2, 38)
//                     .lineWidth(1.5)
//                     .stroke(BRAND_GOLD);
//                 doc.fillColor(BRAND_GOLD)
//                     .font('Helvetica-Bold')
//                     .fontSize(8)
//                     .text('LOGO', 0, (logoAreaTop + logoAreaBottom) / 2 - 5, {
//                         width: sidebarW - 4,
//                         align: 'center'
//                     });
//             }

//             // Gold divider under logo area
//             doc.moveTo(20, logoAreaBottom + 6)
//                 .lineTo(sidebarW - 20, logoAreaBottom + 6)
//                 .lineWidth(0.75)
//                 .stroke(BRAND_GOLD);

//             // ─ ISSUER ORG NAME (in sidebar) ────────────────────────────────
//             doc.fillColor(WHITE)
//                 .font('Helvetica-Bold')
//                 .fontSize(10)
//                 .text(data.issuerOrg.toUpperCase(), 14, logoAreaBottom + 20, {
//                     width: sidebarW - 28,
//                     align: 'center',
//                     characterSpacing: 1
//                 });

//             // ─ SIDEBAR DETAIL BLOCKS (certId, type, date) ─────────────────
//             let sideY = logoAreaBottom + 56;

//             const sideLabel = (label, value) => {
//                 doc.fillColor(BRAND_GOLD)
//                     .font('Helvetica-Bold')
//                     .fontSize(7)
//                     .text(label, 18, sideY, { width: sidebarW - 28, characterSpacing: 1 });
//                 sideY += 12;
//                 doc.fillColor(WHITE)
//                     .font('Helvetica')
//                     .fontSize(9)
//                     .text(value, 18, sideY, { width: sidebarW - 28, lineGap: 1 });
//                 sideY += doc.heightOfString(value, { width: sidebarW - 28, fontSize: 9 }) + 14;
//             };

//             sideLabel('CERTIFICATE ID', data.certId);
//             sideLabel('CERTIFICATE TYPE', formatCertType(data.certType));
//             sideLabel('ISSUED BY', data.issuerOrg);
//             sideLabel('RECIPIENT', data.recipientId);

//             // ─ BLOCKCHAIN BADGE (bottom of sidebar) ───────────────────────
//             const badgeY = H - 72;
//             doc.roundedRect(14, badgeY, sidebarW - 28, 50, 4)
//                 .fill(BRAND_MID);

//             doc.fillColor(BRAND_GOLD)
//                 .font('Helvetica-Bold')
//                 .fontSize(7)
//                 .text('⬡  BLOCKCHAIN VERIFIED', 14, badgeY + 8, {
//                     width: sidebarW - 28,
//                     align: 'center',
//                     characterSpacing: 0.8
//                 });
//             doc.fillColor(WHITE)
//                 .font('Helvetica')
//                 .fontSize(6)
//                 .text(truncateMiddle(data.certHash, 32), 14, badgeY + 24, {
//                     width: sidebarW - 28,
//                     align: 'center'
//                 });
//             doc.fillColor(TEXT_LIGHT)
//                 .fontSize(6)
//                 .text('SHA-256 Hash', 14, badgeY + 37, {
//                     width: sidebarW - 28,
//                     align: 'center'
//                 });

//             // ═══════════════════════════════════════════════════════════════
//             // LAYER 3: MAIN CONTENT AREA (right of sidebar)
//             // ═══════════════════════════════════════════════════════════════
//             const mainX    = sidebarW + 28;   // left edge of content
//             const mainW    = W - sidebarW - 50; // content width
//             let   curY     = 36;

//             // ─ TOP DECORATIVE BORDER (top of main area) ───────────────────
//             doc.rect(sidebarW, 0, W - sidebarW, 6).fill(BRAND_GOLD);

//             // ─ CERTIFICATE TITLE ───────────────────────────────────────────
//             doc.fillColor(BRAND_DARK)
//                 .font('Helvetica-Bold')
//                 .fontSize(26)
//                 .text(formatCertType(data.certType).toUpperCase(), mainX, curY, {
//                     width: mainW,
//                     align: 'left'
//                 });
//             curY += 36;

//             // ─ SUBTITLE ────────────────────────────────────────────────────
//             doc.fillColor(BRAND_MID)
//                 .font('Helvetica')
//                 .fontSize(9)
//                 .text('OFFICIAL BLOCKCHAIN-VERIFIED RECORD', mainX, curY, {
//                     width: mainW,
//                     align: 'left',
//                     characterSpacing: 2
//                 });
//             curY += 18;

//             // ─ GOLD DIVIDER ────────────────────────────────────────────────
//             doc.moveTo(mainX, curY)
//                 .lineTo(mainX + mainW, curY)
//                 .lineWidth(1.5)
//                 .stroke(BRAND_GOLD);
//             curY += 14;

//             // ─ PRESENTED TO / RECIPIENT BLOCK ─────────────────────────────
//             doc.fillColor(TEXT_MID)
//                 .font('Helvetica-Oblique')
//                 .fontSize(11)
//                 .text('This certificate is proudly presented to', mainX, curY);
//             curY += 18;

//             doc.fillColor(BRAND_DARK)
//                 .font('Helvetica-Bold')
//                 .fontSize(22)
//                 .text(data.recipientId, mainX, curY, { width: mainW });
//             curY += 32;

//             // ─ THIN SEPARATOR ──────────────────────────────────────────────
//             doc.moveTo(mainX, curY)
//                 .lineTo(mainX + mainW, curY)
//                 .lineWidth(0.5)
//                 .stroke('#CCCCDD');
//             curY += 12;

//             // ─ METADATA GRID (two columns) ─────────────────────────────────
//             const entries   = Object.entries(data.metadata);
//             const COL_W     = (mainW - 20) / 2;
//             const COL2_X    = mainX + COL_W + 20;
//             const ROW_H     = 38;
//             const gridStartY = curY;

//             entries.forEach(([key, value], i) => {
//                 const col  = i % 2;
//                 const row  = Math.floor(i / 2);
//                 const x    = col === 0 ? mainX : COL2_X;
//                 const y    = gridStartY + row * ROW_H;

//                 // Label
//                 doc.fillColor(TEXT_LIGHT)
//                     .font('Helvetica-Bold')
//                     .fontSize(7)
//                     .text(formatLabel(key), x, y, {
//                         width: COL_W,
//                         characterSpacing: 1
//                     });

//                 // Value
//                 doc.fillColor(TEXT_DARK)
//                     .font('Helvetica')
//                     .fontSize(10.5)
//                     .text(String(value), x, y + 11, {
//                         width: COL_W,
//                         lineGap: 1
//                     });

//                 // Light underline per field
//                 const lineY = y + ROW_H - 5;
//                 doc.moveTo(x, lineY)
//                     .lineTo(x + COL_W - 10, lineY)
//                     .lineWidth(0.3)
//                     .stroke('#DDDDEE');
//             });

//             const totalGridRows = Math.ceil(entries.length / 2);
//             curY = gridStartY + totalGridRows * ROW_H + 8;

//             // ─ SECOND SEPARATOR ────────────────────────────────────────────
//             doc.moveTo(mainX, curY)
//                 .lineTo(mainX + mainW, curY)
//                 .lineWidth(0.5)
//                 .stroke('#CCCCDD');
//             curY += 14;

//             // ═══════════════════════════════════════════════════════════════
//             // LAYER 4: FOOTER SECTION (QR + Signature)
//             // ═══════════════════════════════════════════════════════════════
//             // Footer is pinned to the bottom of the main area
//             const footerH   = 110;
//             const footerY   = H - footerH - 10;

//             // Footer top border
//             doc.moveTo(mainX, footerY)
//                 .lineTo(mainX + mainW, footerY)
//                 .lineWidth(1)
//                 .stroke(BRAND_GOLD);

//             // ─ QR CODE (bottom-left of main area) ─────────────────────────
//             const qrPayload = JSON.stringify({
//                 certId   : data.certId,
//                 hash     : data.certHash,
//                 issuer   : data.issuerOrg,
//                 recipient: data.recipientId
//             });

//             const qrBuffer = await QRCode.toBuffer(qrPayload, {
//                 margin : 1,
//                 width  : 200,
//                 color  : { dark: BRAND_DARK, light: BG }
//             });

//             const qrSize = 80;
//             const qrX    = mainX;
//             const qrY    = footerY + 12;

//             doc.image(qrBuffer, qrX, qrY, { width: qrSize });

//             doc.fillColor(TEXT_LIGHT)
//                 .font('Helvetica')
//                 .fontSize(6.5)
//                 .text('Scan to verify authenticity', qrX, qrY + qrSize + 3, {
//                     width: qrSize,
//                     align: 'center'
//                 });

//             // ─ FOOTER MIDDLE TEXT ──────────────────────────────────────────
//             const midTextX = mainX + qrSize + 20;
//             const midTextW = mainW - qrSize - 20 - 140; // leave room for signature

//             doc.fillColor(TEXT_MID)
//                 .font('Helvetica-Oblique')
//                 .fontSize(8.5)
//                 .text(
//                     'This certificate has been issued and recorded on a tamper-proof blockchain ledger. ' +
//                     'Scan the QR code or use the certificate ID to verify authenticity at any time.',
//                     midTextX, footerY + 16,
//                     { width: midTextW, lineGap: 3, align: 'justify' }
//                 );

//             // ─ SIGNATURE (bottom-right of main area) ──────────────────────
//             const sigBoxW  = 130;
//             const sigBoxX  = mainX + mainW - sigBoxW;
//             const sigBoxY  = footerY + 8;

//             const sig = assets.find(a => a.assetName === data.selectedSignature)
//                      || assets.find(a => a.assetType === 'SIGNATURE');

//             if (sig && fs.existsSync(sig.filePath)) {
//                 doc.image(sig.filePath, sigBoxX, sigBoxY, {
//                     fit: [sigBoxW, 52],
//                     align: 'center'
//                 });
//             }

//             // Signature underline
//             const sigLineY = sigBoxY + 58;
//             doc.moveTo(sigBoxX, sigLineY)
//                 .lineTo(sigBoxX + sigBoxW, sigLineY)
//                 .lineWidth(0.75)
//                 .stroke(TEXT_MID);

//             doc.fillColor(TEXT_MID)
//                 .font('Helvetica')
//                 .fontSize(8)
//                 .text('Authorised Signatory', sigBoxX, sigLineY + 5, {
//                     width: sigBoxW,
//                     align: 'center'
//                 });

//             doc.fillColor(BRAND_DARK)
//                 .font('Helvetica-Bold')
//                 .fontSize(8.5)
//                 .text(data.issuerOrg, sigBoxX, sigLineY + 17, {
//                     width: sigBoxW,
//                     align: 'center'
//                 });

//             // ─ BOTTOM BORDER STRIP ─────────────────────────────────────────
//             doc.rect(sidebarW, H - 6, W - sidebarW, 6).fill(BRAND_DARK);

//             doc.end();
//         } catch (err) {
//             reject(err);
//         }
//     });
// };

// // ─── HELPERS ──────────────────────────────────────────────────────────────────

// function formatCertType(certType) {
//     const map = {
//         ACADEMIC   : 'Certificate of Academic Achievement',
//         LEGAL      : 'Legal Certificate',
//         GOVERNMENT : 'Government Certificate',
//         CORPORATE  : 'Certificate of Achievement'
//     };
//     return map[certType] || certType;
// }

// function formatLabel(key) {
//     return key
//         .replace(/([A-Z])/g, ' $1')
//         .replace(/^./, s => s.toUpperCase())
//         .trim()
//         .toUpperCase();
// }

// /** Truncates a long string with ellipsis in the middle */
// function truncateMiddle(str, maxLen) {
//     if (!str || str.length <= maxLen) return str;
//     const half = Math.floor((maxLen - 3) / 2);
//     return str.slice(0, half) + '...' + str.slice(-half);
// }

// module.exports = { generateCertificatePDF };