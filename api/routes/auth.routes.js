const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const User = require('../models/user.model');
const { registerUserOnFabric } = require('../services/fabricAdmin.service');
const { verifyToken } = require('../middleware/auth.middleware');
const { JWT_SECRET } = require('../config/constants');

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const {
        username, password, role,
        // issuer fields
        organizationName,
        // recipient fields
        idProofNumber, fullName, dateOfBirth, gender, phone, address
    } = req.body;

    // Basic validation
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'username, password and role are required' });
    }

    if (!['issuer', 'recipient'].includes(role)) {
        return res.status(400).json({ error: 'role must be issuer or recipient' });
    }

    if (role === 'recipient') {
        if (!idProofNumber || !idProofNumber.trim()) {
            return res.status(400).json({ error: 'idProofNumber is required for recipients' });
        }
        if (!fullName || !fullName.trim()) {
            return res.status(400).json({ error: 'fullName is required for recipients' });
        }
        // Check if idProofNumber is already registered
        const existing = await User.findOne({ idProofNumber: idProofNumber.trim() });
        if (existing) {
            return res.status(409).json({ error: 'This ID proof number is already registered to another account' });
        }
    }

    if (role === 'issuer' && (!organizationName || !organizationName.trim())) {
        return res.status(400).json({ error: 'organizationName is required for issuers' });
    }

    try {
        const fabricId = await registerUserOnFabric(username, role);

        const newUser = new User({
            username,
            passwordHash: bcrypt.hashSync(password, 8),
            fabricId,
            role,
            // Issuer fields
            organizationName: role === 'issuer' ? organizationName.trim() : '',
            // Recipient fields
            idProofNumber:    role === 'recipient' ? idProofNumber.trim()  : '',
            fullName:         role === 'recipient' ? (fullName || '').trim() : '',
            dateOfBirth:      role === 'recipient' ? (dateOfBirth || '') : '',
            gender:           role === 'recipient' ? (gender || '').trim() : '',
            phone:            role === 'recipient' ? (phone || '').trim() : '',
            address:          role === 'recipient' ? (address || '').trim() : '',
        });

        await newUser.save();
        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { username: user.username, fabricId: user.fabricId, role: user.role },
            JWT_SECRET,
            { expiresIn: '4h' }
        );
        res.status(200).json({ token, role: user.role });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── PROFILE — GET ─────────────────────────────────────────────────────────────
// Returns the current user's full profile (no passwordHash)
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.username }).select('-passwordHash');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── PROFILE — UPDATE (recipient metadata) ─────────────────────────────────────
// Recipients can update their personal metadata.
// idProofNumber cannot be changed after registration.
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.role === 'recipient') {
            const { fullName, dateOfBirth, gender, phone, address } = req.body;
            if (fullName    !== undefined) user.fullName    = fullName.trim();
            if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
            if (gender      !== undefined) user.gender      = gender.trim();
            if (phone       !== undefined) user.phone       = phone.trim();
            if (address     !== undefined) user.address     = address.trim();
        } else {
            return res.status(403).json({ error: 'Use /organization-name to update issuer profile' });
        }

        await user.save();
        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── ORGANIZATION NAME — UPDATE ─────────────────────────────────────────────────
router.put('/organization-name', verifyToken, async (req, res) => {
    const { organizationName } = req.body;
    if (!organizationName || !organizationName.trim()) {
        return res.status(400).json({ error: 'organizationName is required' });
    }
    try {
        const user = await User.findOne({ username: req.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role !== 'issuer') {
            return res.status(403).json({ error: 'Only issuers can set an organization name' });
        }
        await User.findOneAndUpdate(
            { username: req.username },
            { organizationName: organizationName.trim() }
        );
        res.status(200).json({ message: 'Organization name updated', organizationName: organizationName.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── ADMIN: LIST ALL USERS ──────────────────────────────────────────────────────
router.get('/admin/users', verifyToken, async (req, res) => {
    if (req.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    try {
        const users = await User.find().select('-passwordHash');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── ADMIN: DELETE A USER ───────────────────────────────────────────────────────
router.delete('/admin/users/:username', verifyToken, async (req, res) => {
    if (req.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    try {
        const deleted = await User.findOneAndDelete({ username: req.params.username });
        if (!deleted) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ message: `User ${req.params.username} deleted from platform` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
