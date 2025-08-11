require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const imageRoutes = require('./routes/imageRoutes');
const healthRoutes = require('./routes/healthRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

const app = express();
const PORT = process.env.PORT || 5002;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Allow frontend to access this backend
app.use(cors({
    origin: [
        'http://localhost:3000', // Next.js default
        'http://localhost:3001', // Alternative port
        'http://localhost:5173', // Vite default
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Logging middleware
app.use(morgan('combined'));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static serving for uploaded PDFs (backend/DATABASE/UPLOADS)
app.use('/uploads', express.static(path.join(__dirname, '..', 'DATABASE', 'UPLOADS')));

// Routes
app.use('/health', healthRoutes);
// Mount PDF routes at both /api and / for backward compatibility.
// Keep these BEFORE imageRoutes to avoid wildcard conflicts.
app.use('/api', pdfRoutes);
app.use('/', pdfRoutes);
// Image proxy routes at root level (keep last)
app.use('/', imageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        availableEndpoints: {
            imageProxy: 'GET /{store}/{productId}',
            health: 'GET /health',
            status: 'GET /health/status'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 TrueFood Backend Server running on http://localhost:${PORT}`);
    console.log(`📁 Server directory: ${__dirname}`);
    console.log(`🖼️  Image proxy available at: http://localhost:${PORT}/{store}/{productId}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Status check: http://localhost:${PORT}/health/status`);
    console.log('');
    console.log('📋 Example URLs:');
    console.log(`   http://localhost:${PORT}/Target/tg_53140726`);
    console.log(`   http://localhost:${PORT}/WholeFoods/wf_against-the-grain-three-cheese-gourmet-pizza-24-oz-b018o4u620`);
    console.log(`   http://localhost:${PORT}/Walmart/wm_19400275`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
