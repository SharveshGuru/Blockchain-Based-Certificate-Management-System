const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const assetRoutes = require('./routes/asset.routes');
const certificateRoutes = require('./routes/certificate.routes');

const { connectMongo } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to DB
connectMongo();

// Routes
app.use('/api', authRoutes);
app.use('/api', assetRoutes);
app.use('/api', certificateRoutes);

module.exports = app;