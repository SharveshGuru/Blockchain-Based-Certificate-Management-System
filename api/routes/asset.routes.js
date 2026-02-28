const express = require('express');
const router = express.Router();
const fs = require('fs');
const User = require('../models/user.model');
const { verifyToken } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// ─── UPLOAD LOGO ──────────────────────────────────────────────────────────────
// One logo per issuer. Replaces old one.

router.post('/upload-logo', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const user = await User.findOne({ username: req.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role !== 'issuer') {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Only issuers can upload a logo' });
        }

        const existingLogo = user.assets.find(a => a.assetType === 'LOGO');
        if (existingLogo && fs.existsSync(existingLogo.filePath)) {
            fs.unlinkSync(existingLogo.filePath);
        }

        await User.findOneAndUpdate(
            { username: req.username },
            { $pull: { assets: { assetType: 'LOGO' } } }
        );
        await User.findOneAndUpdate(
            { username: req.username },
            {
                $push: {
                    assets: {
                        assetName: req.body.assetName || 'logo',
                        assetType: 'LOGO',
                        filePath: req.file.path
                    }
                }
            }
        );

        res.status(200).json({ message: 'Logo uploaded successfully', filePath: req.file.path });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

// ─── UPLOAD SIGNATURE ─────────────────────────────────────────────────────────
// One signature per issuer. Replaces old one. Auto-used in every certificate.

router.post('/upload-signature', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const user = await User.findOne({ username: req.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role !== 'issuer') {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Only issuers can upload a signature' });
        }

        // Delete old signature file from disk
        const existingSig = user.assets.find(a => a.assetType === 'SIGNATURE');
        if (existingSig && fs.existsSync(existingSig.filePath)) {
            fs.unlinkSync(existingSig.filePath);
        }

        // Remove old signature from DB
        await User.findOneAndUpdate(
            { username: req.username },
            { $pull: { assets: { assetType: 'SIGNATURE' } } }
        );

        // Push new signature
        await User.findOneAndUpdate(
            { username: req.username },
            {
                $push: {
                    assets: {
                        assetName: req.body.assetName || 'signature',
                        assetType: 'SIGNATURE',
                        filePath: req.file.path
                    }
                }
            }
        );

        res.status(200).json({ message: 'Signature uploaded successfully', filePath: req.file.path });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

// ─── UPLOAD OTHER ASSETS (PHOTO only now) ────────────────────────────────────
// LOGO and SIGNATURE are blocked here — use their dedicated routes.

router.post('/upload-asset', verifyToken, upload.single('file'), async (req, res) => {
    const { assetName, assetType } = req.body;

    if (!assetName || !assetType) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: '"assetName" and "assetType" are required' });
    }

    if (assetType === 'LOGO') {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Use POST /api/upload-logo to upload logos' });
    }

    if (assetType === 'SIGNATURE') {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Use POST /api/upload-signature to upload signatures' });
    }

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        await User.findOneAndUpdate(
            { username: req.username },
            { $push: { assets: { assetName, assetType, filePath: req.file.path } } }
        );
        res.status(200).json({ message: 'Asset uploaded successfully', filePath: req.file.path });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/organization-name — update display name
router.put('/organization-name', verifyToken, async (req, res) => {
    const { organizationName } = req.body;
    if (!organizationName || !organizationName.trim()) {
        return res.status(400).json({ error: 'organizationName is required' });
    }
    try {
        const user = await User.findOne({ username: req.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role !== 'issuer') return res.status(403).json({ error: 'Only issuers can set an organization name' });

        await User.findOneAndUpdate(
            { username: req.username },
            { organizationName: organizationName.trim() }
        );
        res.status(200).json({ message: 'Organization name updated', organizationName: organizationName.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/profile — get current user's profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.username }).select('-passwordHash');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
