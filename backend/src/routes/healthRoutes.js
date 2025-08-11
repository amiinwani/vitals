const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * Basic health check endpoint
 */
router.get('/', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'TrueFood Backend',
        version: '1.0.0'
    });
});

/**
 * Detailed status endpoint with external service checks
 */
router.get('/status', async (req, res) => {
    const startTime = Date.now();
    
    // Check TrueFood CDN availability
    let trueFoodStatus = 'unknown';
    let trueFoodResponseTime = null;
    
    try {
        const testStart = Date.now();
        const testResponse = await axios.get('https://www.truefood.tech/', {
            timeout: 5000,
            headers: {
                'User-Agent': 'TrueFood-Backend-Health-Check'
            }
        });
        trueFoodResponseTime = Date.now() - testStart;
        trueFoodStatus = testResponse.status === 200 ? 'healthy' : 'degraded';
    } catch (error) {
        trueFoodStatus = 'unhealthy';
        trueFoodResponseTime = Date.now() - startTime;
    }

    const totalResponseTime = Date.now() - startTime;

    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${totalResponseTime}ms`,
        service: {
            name: 'TrueFood Backend',
            version: '1.0.0',
            port: process.env.PORT || 5002,
            environment: process.env.NODE_ENV || 'development'
        },
        dependencies: {
            trueFoodCDN: {
                status: trueFoodStatus,
                responseTime: trueFoodResponseTime ? `${trueFoodResponseTime}ms` : 'timeout',
                url: 'https://www.truefood.tech/'
            }
        },
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memoryUsage: process.memoryUsage()
        }
    });
});

/**
 * Test image proxy endpoint
 */
router.get('/test-image', async (req, res) => {
    const testImages = [
        { store: 'Target', productId: 'tg_53140726' },
        { store: 'WholeFoods', productId: 'wf_against-the-grain-three-cheese-gourmet-pizza-24-oz-b018o4u620' },
        { store: 'Walmart', productId: 'wm_19400275' }
    ];

    const results = await Promise.allSettled(
        testImages.map(async ({ store, productId }) => {
            try {
                const testUrl = `https://www.truefood.tech/grocery_image/${store}/${productId}`;
                const response = await axios.head(testUrl, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'TrueFood-Backend-Test'
                    }
                });
                return {
                    store,
                    productId,
                    status: 'healthy',
                    httpStatus: response.status,
                    contentType: response.headers['content-type'],
                    proxyUrl: `http://localhost:${process.env.PORT || 5002}/${store}/${productId}`
                };
            } catch (error) {
                return {
                    store,
                    productId,
                    status: 'unhealthy',
                    error: error.message,
                    proxyUrl: `http://localhost:${process.env.PORT || 5002}/${store}/${productId}`
                };
            }
        })
    );

    const testResults = results.map(result => result.status === 'fulfilled' ? result.value : result.reason);
    const healthyCount = testResults.filter(r => r.status === 'healthy').length;

    res.json({
        testSummary: {
            total: testImages.length,
            healthy: healthyCount,
            unhealthy: testImages.length - healthyCount,
            overallStatus: healthyCount === testImages.length ? 'all_healthy' : 
                         healthyCount > 0 ? 'partially_healthy' : 'all_unhealthy'
        },
        testResults,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
