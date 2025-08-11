const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Serve static files (our HTML file)
app.use(express.static(__dirname));

// Proxy endpoint for TrueFood images
app.get('/proxy-image/*', async (req, res) => {
    try {
        // Extract the image path from the URL
        const imagePath = req.params[0];
        const fullImageUrl = `https://www.truefood.tech/grocery_image/${imagePath}`;
        
        console.log(`Fetching image: ${fullImageUrl}`);
        
        // Fetch the image from TrueFood CDN
        const response = await axios({
            method: 'GET',
            url: fullImageUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 10000
        });
        
        // Set appropriate headers
        res.set({
            'Content-Type': response.headers['content-type'] || 'image/jpeg',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
        });
        
        // Pipe the image response
        response.data.pipe(res);
        
    } catch (error) {
        console.error(`Error fetching image: ${error.message}`);
        
        // Send a placeholder or error response
        res.status(404).json({ 
            error: 'Image not found', 
            message: error.message,
            url: req.params[0] 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'image-test.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 TrueFood Image Proxy Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🖼️  Image proxy available at: http://localhost:${PORT}/proxy-image/[store]/[image_id]`);
    console.log(`🌐 Open http://localhost:${PORT} to test images`);
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

