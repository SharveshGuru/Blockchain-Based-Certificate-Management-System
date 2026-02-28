const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    fabricId: { type: String, required: true },
    role: { type: String, enum: ['issuer', 'recipient', 'admin'], required: true },

    // ── Issuer-specific ───────────────────────────────────────────────────────
    // The display name stamped on every certificate this org issues.
    // Falls back to username if not set.
    organizationName: { type: String, default: '' },

    // ── Recipient-specific ────────────────────────────────────────────────────
    // Government-issued ID number. This is the key that links certificates
    // to a recipient — orgs enter this when issuing, recipients register with it.
    // Must be unique across all recipients.
    idProofNumber: {
        type: String,
        default: '',
        // Sparse so that null/empty values don't conflict with each other
        // (issuers don't have this field)
        sparse: true
    },

    // Recipient profile metadata
    fullName:    { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },   // stored as string: 'YYYY-MM-DD'
    gender:      { type: String, default: '' },
    phone:       { type: String, default: '' },
    address:     { type: String, default: '' },

    // ── Assets (issuer only) ──────────────────────────────────────────────────
    assets: [{
        assetName: String,
        filePath:  String,
        assetType: { type: String, enum: ['LOGO', 'SIGNATURE', 'PHOTO'] }
    }]
});

module.exports = mongoose.model('User', userSchema);