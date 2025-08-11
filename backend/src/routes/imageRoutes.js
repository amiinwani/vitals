const express = require('express');
const axios = require('axios');
const router = express.Router();

// Cache for storing image headers to avoid repeated requests
const imageCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Image Proxy Route
 * Proxies images from TrueFood CDN to bypass CORS restrictions
 * URL Structure: /{store}/{productId}
 * Example: /Target/tg_53140726 -> https://www.truefood.tech/grocery_image/Target/tg_53140726
 */
router.get('/:store/:productId', async (req, res) => {
    try {
        const { store, productId } = req.params;
        
        // Validate store parameter (basic validation)
        const validStores = ['Target', 'WholeFoods', 'Walmart'];
        // Intentionally not logging unknown stores to reduce terminal noise

        // Construct the TrueFood image URL
        const trueFoodImageUrl = `https://www.truefood.tech/grocery_image/${store}/${productId}`;
        

        // Check cache first
        const cacheKey = `${store}/${productId}`;
        const cached = imageCache.get(cacheKey);

        // Fetch the image from TrueFood CDN
        const response = await axios({
            method: 'GET',
            url: trueFoodImageUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 15000, // 15 seconds timeout
            maxRedirects: 5
        });

        // Cache the successful response info
        imageCache.set(cacheKey, {
            timestamp: Date.now(),
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length']
        });

        // Set appropriate response headers
        const upstreamType = response.headers['content-type'] || '';
        const isImage = upstreamType.startsWith('image/');
        const contentType = isImage ? upstreamType : 'image/jpeg';
        const contentLength = response.headers['content-length'];

        res.set({
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
            'X-Proxy-Source': 'truefood-backend',
            'X-Image-Store': store,
            'X-Image-Product': productId
        });

        if (contentLength) {
            res.set('Content-Length', contentLength);
        }

        // Pipe the image response to client
        response.data.pipe(res);

        // Handle stream errors
        response.data.on('error', (streamError) => {
            console.error(`❌ Stream error for ${cacheKey}:`, streamError.message);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Image stream error',
                    message: 'Failed to stream image data'
                });
            }
        });

        // Success - no logging to reduce terminal noise

    } catch (error) {
        console.error(`❌ Error fetching image ${req.params.store}/${req.params.productId}:`, error.message);
        
        // Handle different types of errors
        let statusCode = 500;
        let errorMessage = 'Internal server error';

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            statusCode = 503;
            errorMessage = 'TrueFood CDN temporarily unavailable';
        } else if (error.response) {
            statusCode = error.response.status || 404;
            errorMessage = error.response.status === 404 ? 'Image not found' : 'Failed to fetch image';
        } else if (error.code === 'ECONNABORTED') {
            statusCode = 408;
            errorMessage = 'Request timeout';
        }

        res.status(statusCode).json({
            error: errorMessage,
            message: error.message,
            store: req.params.store,
            productId: req.params.productId,
            originalUrl: `https://www.truefood.tech/grocery_image/${req.params.store}/${req.params.productId}`,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Compatibility route: /proxy-image/*
 * Mirrors the TEST server so the frontend can use the same pattern
 */
router.get('/proxy-image/*', async (req, res) => {
    try {
        const imagePath = req.params[0];
        const trueFoodImageUrl = `https://www.truefood.tech/grocery_image/${imagePath}`;

        // Fetching compat image - no logging

        const response = await axios({
            method: 'GET',
            url: trueFoodImageUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 15000,
            maxRedirects: 5
        });

        res.set({
            'Content-Type': (response.headers['content-type'] && response.headers['content-type'].startsWith('image/')) ? response.headers['content-type'] : 'image/jpeg',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'X-Proxy-Source': 'truefood-backend-compat'
        });

        response.data.pipe(res);

        response.data.on('error', (streamError) => {
            console.error(`❌ [compat] Stream error for ${imagePath}:`, streamError.message);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Image stream error',
                    message: 'Failed to stream image data'
                });
            }
        });
    } catch (error) {
        console.error(`❌ [compat] Error fetching image ${req.params[0]}:`, error.message);
        let statusCode = 500;
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') statusCode = 503;
        else if (error.response) statusCode = error.response.status || 404;
        else if (error.code === 'ECONNABORTED') statusCode = 408;

        res.status(statusCode).json({
            error: 'Failed to fetch image',
            message: error.message,
            originalUrl: `https://www.truefood.tech/grocery_image/${req.params[0]}`,
            timestamp: new Date().toISOString()
        });
    }
});

// Root route - provide API documentation
router.get('/', (req, res) => {
    res.json({
        service: 'TrueFood Image Proxy Backend',
        version: '1.0.0',
        description: 'Proxy server for TrueFood images to bypass CORS restrictions',
        usage: {
            imageProxy: 'GET /{store}/{productId}',
            examples: [
                '/Target/tg_53140726',
                '/WholeFoods/wf_against-the-grain-three-cheese-gourmet-pizza-24-oz-b018o4u620',
                '/Walmart/wm_19400275'
            ]
        },
        endpoints: {
            health: '/health',
            status: '/health/status',
            imageProxy: '/{store}/{productId}'
        },
        supportedStores: ['Target', 'WholeFoods', 'Walmart'],
        cacheInfo: {
            enabled: true,
            ttl: '1 hour',
            currentSize: imageCache.size
        }
    });
});

// Clear cache endpoint (useful for development)
router.delete('/cache', (req, res) => {
    const cacheSize = imageCache.size;
    imageCache.clear();
    res.json({
        message: 'Cache cleared successfully',
        previousSize: cacheSize,
        currentSize: imageCache.size
    });
});

module.exports = router;
