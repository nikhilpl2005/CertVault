// Polyfill for crypto
if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = require('crypto').webcrypto;
}

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware - Enable CORS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/certificates', require('./routes/certificates'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'CertVault API is running',
        timestamp: new Date().toISOString()
    });
});

// Start server - Listen on 0.0.0.0 to be accessible from outside container
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
    console.log(`✅ Accessible at http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
});

module.exports = app;