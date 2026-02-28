const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access Denied' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Session Expired' });
        req.fabricId = decoded.fabricId;
        req.username = decoded.username;
        req.role = decoded.role;
        next();
    });
};

module.exports = { verifyToken };