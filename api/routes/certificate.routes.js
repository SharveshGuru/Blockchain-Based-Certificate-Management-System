const express = require('express');
const crypto  = require('crypto');
const fs      = require('fs');
const router  = express.Router();

const User                               = require('../models/user.model');
const { verifyToken }                    = require('../middleware/auth.middleware');
const { upload }                         = require('../middleware/upload.middleware');
const { getContract }                    = require('../services/fabricAdmin.service');
const { uploadToIPFS, downloadFromIPFS } = require('../services/ipfs.service');
const { generateCertificatePDF }         = require('../utils/pdf.util');
const { extractQRFromPDF }               = require('../utils/qr.util');

// ─── ISSUE ────────────────────────────────────────────────────────────────────
// POST /api/issue
//
// The org must provide:
//   - certId, certType                          — certificate identity
//   - recipientId                               — recipient's govt ID proof number (mandatory)
//   - recipientName                             — recipient's full name as entered by org (mandatory)
//   - recipientDob, recipientGender             — optional recipient details entered by org
//   - metadata                                  — certificate-specific fields
//
// issuerOrg is always read from the authenticated user's DB record — never from body.
// recipientId is stored on the blockchain as the lookup key for the locker.
// recipientName and other details are stored in metadata so they appear on the PDF.

router.post('/issue', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role !== 'issuer') {
            return res.status(403).json({ error: 'Only issuers can issue certificates' });
        }

        const {
            certId,
            certType,
            recipientId,       // govt ID proof number — mandatory
            recipientName,     // full name entered by org — mandatory
            recipientDob,      // optional
            recipientGender,   // optional
            metadata = {}
        } = req.body;

        if (!certId)        return res.status(400).json({ error: 'certId is required' });
        if (!certType)      return res.status(400).json({ error: 'certType is required' });
        if (!recipientId)   return res.status(400).json({ error: 'recipientId (ID proof number) is required' });
        if (!recipientName) return res.status(400).json({ error: 'recipientName is required' });

        // Always use org's registered display name — never from request body
        const issuerOrg = user.organizationName || user.username;

        // Build recipientInfo object — these go into the PDF
        // The org's entered values take priority always.
        const recipientInfo = {
            name:        recipientName.trim(),
            idProof:     recipientId.trim(),
            dateOfBirth: recipientDob    || '',
            gender:      recipientGender || '',
        };

        // Merge recipientInfo into metadata so it's recorded on the blockchain
        // and shows up in the certificate details
        const fullMetadata = {
            recipientName:   recipientInfo.name,
            recipientIdProof: recipientInfo.idProof,
            ...(recipientInfo.dateOfBirth && { recipientDob:    recipientInfo.dateOfBirth }),
            ...(recipientInfo.gender      && { recipientGender: recipientInfo.gender }),
            ...metadata   // certificate-specific fields (degree, grade, etc.) come after
        };

        const certHash = crypto.createHash('sha256')
            .update(certId + JSON.stringify(fullMetadata))
            .digest('hex');

        // Generate PDF — recipientInfo is passed separately so pdf.util.js
        // can place name prominently on the certificate
        const pdfBuffer = await generateCertificatePDF(
            {
                certId,
                certHash,
                certType,
                issuerOrg,
                recipientId: recipientId.trim(),
                recipientInfo,
                metadata: fullMetadata
            },
            user.assets
        );

        const ipfsCid = await uploadToIPFS(pdfBuffer);

        const { contract, gateway } = await getContract(req.fabricId);
        const result = await contract.submitTransaction(
            'IssueCertificate',
            certId,
            certHash,
            ipfsCid,
            issuerOrg,
            recipientId.trim(),   // stored as recipientId on blockchain — used for locker queries
            certType,
            JSON.stringify(fullMetadata)
        );
        await gateway.disconnect();

        res.status(200).json({
            status: 'SUCCESS',
            ipfsCid,
            certHash,
            txId: JSON.parse(result.toString()).txId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── REVOKE ───────────────────────────────────────────────────────────────────
// POST /api/revoke

router.post('/revoke', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role !== 'issuer' && user.role !== 'admin') {
            return res.status(403).json({ error: 'Only issuers or admins can revoke certificates' });
        }

        const { certId, revokeReason } = req.body;
        if (!certId) return res.status(400).json({ error: '"certId" is required' });

        const { contract, gateway } = await getContract(req.fabricId);
        const result = await contract.submitTransaction('RevokeCertificate', certId, revokeReason || '');
        await gateway.disconnect();

        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── RECIPIENT LOCKER ─────────────────────────────────────────────────────────
// GET /api/locker
// Queries blockchain using the recipient's idProofNumber from their DB record.
// Certificates issued before the recipient registered will appear automatically
// as long as the org used the correct idProofNumber.

router.get('/locker', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role !== 'recipient') {
            return res.status(403).json({ error: 'Only recipients can access the locker' });
        }
        if (!user.idProofNumber) {
            return res.status(400).json({ error: 'No ID proof number found on your account' });
        }

        const { contract, gateway } = await getContract(req.fabricId);
        const result = await contract.evaluateTransaction(
            'GetCertificatesByRecipient',
            user.idProofNumber
        );
        await gateway.disconnect();

        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── RECIPIENT LOOKUP (for org form pre-fill) ─────────────────────────────────
// GET /api/recipient/lookup?idProof=XXXX
// Issuers use this to check if an ID proof number belongs to a registered
// recipient, and to pre-fill the form with their details.
// NOT finding them is not an error — they may not have registered yet.

router.get('/recipient/lookup', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.username });
        if (!user || (user.role !== 'issuer' && user.role !== 'admin')) {
            return res.status(403).json({ error: 'Only issuers can look up recipients' });
        }

        const { idProof } = req.query;
        if (!idProof) return res.status(400).json({ error: 'idProof query param is required' });

        const recipient = await User.findOne({
            idProofNumber: idProof.trim(),
            role: 'recipient'
        }).select('fullName dateOfBirth gender phone address');

        if (!recipient) {
            // 404 here is not a blocking error — org can still issue the cert
            return res.status(404).json({
                error: 'No registered recipient found with this ID proof number'
            });
        }

        res.status(200).json({
            fullName:    recipient.fullName,
            dateOfBirth: recipient.dateOfBirth,
            gender:      recipient.gender,
            phone:       recipient.phone,
            address:     recipient.address
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── SINGLE CERT ──────────────────────────────────────────────────────────────
// GET /api/certificate/:certId

router.get('/certificate/:certId', verifyToken, async (req, res) => {
    try {
        const { contract, gateway } = await getContract(req.fabricId);
        const result = await contract.evaluateTransaction('GetCertificate', req.params.certId);
        await gateway.disconnect();
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// GET /api/certificate/:certId/history

router.get('/certificate/:certId/history', verifyToken, async (req, res) => {
    try {
        const { contract, gateway } = await getContract(req.fabricId);
        const result = await contract.evaluateTransaction('GetCertificateHistory', req.params.certId);
        await gateway.disconnect();
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── VERIFICATION (PUBLIC) — by hash query param ──────────────────────────────
// GET /api/verify/:certId?hash=<certHash>

router.get('/verify/:certId', async (req, res) => {
    try {
        const { hash } = req.query;
        if (!hash) return res.status(400).json({ error: 'Query param "hash" is required' });

        const { contract, gateway } = await getContract('admin');
        const result = await contract.evaluateTransaction('VerifyCertificate', req.params.certId, hash);
        await gateway.disconnect();
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/verify-merkle/:certId?merkleRoot=<root>

router.get('/verify-merkle/:certId', async (req, res) => {
    try {
        const { merkleRoot } = req.query;
        if (!merkleRoot) return res.status(400).json({ error: 'Query param "merkleRoot" is required' });

        const { contract, gateway } = await getContract('admin');
        const result = await contract.evaluateTransaction('VerifyByMerkleRoot', req.params.certId, merkleRoot);
        await gateway.disconnect();
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── VERIFY BY PDF UPLOAD (PUBLIC) ───────────────────────────────────────────
// POST /api/verify-pdf
// No login required.

router.post('/verify-pdf', upload.single('pdf'), async (req, res) => {
    let tempFilePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF uploaded. Send file in field named "pdf".' });
        }

        tempFilePath = req.file.path;

        if (req.file.mimetype !== 'application/pdf' && !req.file.originalname.toLowerCase().endsWith('.pdf')) {
            cleanupFile(tempFilePath);
            return res.status(415).json({ error: 'Uploaded file must be a PDF' });
        }

        const pdfBuffer = fs.readFileSync(tempFilePath);

        let qrData;
        try {
            qrData = await extractQRFromPDF(pdfBuffer);
        } catch (e) {
            cleanupFile(tempFilePath);
            return res.status(422).json({ error: 'QR code extraction failed', detail: e.message });
        }

        const { certId, hash, issuer, recipient } = qrData;

        const { contract, gateway } = await getContract('admin');
        const result = await contract.evaluateTransaction('VerifyCertificate', certId, hash);
        await gateway.disconnect();

        cleanupFile(tempFilePath);

        res.status(200).json({
            ...JSON.parse(result.toString()),
            scannedCertificate: { certId, hash, issuer, recipient }
        });
    } catch (error) {
        cleanupFile(tempFilePath);
        res.status(500).json({ error: error.message });
    }
});

// ─── ISSUER QUERIES ───────────────────────────────────────────────────────────
// GET /api/certificates/issuer?org=<issuerOrg>

router.get('/certificates/issuer', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role !== 'issuer' && user.role !== 'admin') {
            return res.status(403).json({ error: 'Only issuers or admins can access this route' });
        }

        const issuerOrg = req.query.org || user.organizationName || user.username;

        const { contract, gateway } = await getContract(req.fabricId);
        const result = await contract.evaluateTransaction('GetCertificatesByIssuer', issuerOrg);
        await gateway.disconnect();
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/certificates/type/:certType

router.get('/certificates/type/:certType', verifyToken, async (req, res) => {
    try {
        const validTypes = ['ACADEMIC', 'LEGAL', 'GOVERNMENT', 'CORPORATE'];
        const certType   = req.params.certType.toUpperCase();
        if (!validTypes.includes(certType)) {
            return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
        }

        const { contract, gateway } = await getContract(req.fabricId);
        const result = await contract.evaluateTransaction('GetCertificatesByType', certType);
        await gateway.disconnect();
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── DOWNLOAD ─────────────────────────────────────────────────────────────────
// GET /api/download/:cid

router.get('/download/:cid', async (req, res) => {
    try {
        const buffer = await downloadFromIPFS(req.params.cid);
        res.contentType('application/pdf');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function cleanupFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) { /* ignore */ }
}

module.exports = router;