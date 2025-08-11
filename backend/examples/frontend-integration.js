/**
 * Frontend Integration Examples for TrueFood Image Proxy
 * 
 * This file shows how to integrate the backend proxy with your frontend
 * Replace TrueFood URLs with localhost:5002 URLs
 */

// === BEFORE (Direct TrueFood URLs - Blocked by CORS) ===
// const imageUrl = "https://www.truefood.tech/grocery_image/Target/tg_53140726";

// === AFTER (Using Proxy - Works perfectly) ===

// Example 1: Simple URL construction
function getProxyImageUrl(store, productId) {
    return `http://localhost:5002/${store}/${productId}`;
}

// Example 2: Convert TrueFood URL to Proxy URL
function convertToProxyUrl(trueFoodUrl) {
    // Original: https://www.truefood.tech/grocery_image/Target/tg_53140726
    // Result: http://localhost:5002/Target/tg_53140726
    return trueFoodUrl.replace(
        'https://www.truefood.tech/grocery_image/',
        'http://localhost:5002/'
    );
}

// Example 3: React Component
/*
function ProductImage({ store, productId, alt = "Product Image" }) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    const imageUrl = `http://localhost:5002/${store}/${productId}`;
    
    return (
        <div className="product-image-container">
            {!imageLoaded && !imageError && (
                <div className="image-loading">Loading...</div>
            )}
            
            <img 
                src={imageUrl}
                alt={alt}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                    console.error('Failed to load image:', imageUrl);
                    setImageError(true);
                }}
                style={{ 
                    display: imageLoaded ? 'block' : 'none' 
                }}
            />
            
            {imageError && (
                <div className="image-error">
                    Image not available
                </div>
            )}
        </div>
    );
}
*/

// Example 4: Processing CSV data in frontend
function processProductData(csvData) {
    return csvData.map(product => ({
        ...product,
        // Convert TrueFood image URL to proxy URL
        proxyImageUrl: product.image_url ? 
            convertToProxyUrl(product.image_url) : 
            null
    }));
}

// Example 5: Image preloading with error handling
async function preloadImage(store, productId) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const proxyUrl = getProxyImageUrl(store, productId);
        
        img.onload = () => resolve(proxyUrl);
        img.onerror = () => reject(new Error(`Failed to load: ${proxyUrl}`));
        
        img.src = proxyUrl;
    });
}

// Example 6: Batch image loading with fallbacks
async function loadProductImages(products) {
    const imagePromises = products.map(async (product) => {
        try {
            const [store, productId] = product.image_url
                .replace('https://www.truefood.tech/grocery_image/', '')
                .split('/');
            
            const proxyUrl = await preloadImage(store, productId);
            return { ...product, loadedImageUrl: proxyUrl };
        } catch (error) {
            console.warn('Image failed to load:', error.message);
            return { ...product, loadedImageUrl: null };
        }
    });
    
    return Promise.allSettled(imagePromises);
}

// Example 7: Next.js Image component with proxy
/*
import Image from 'next/image';

function OptimizedProductImage({ store, productId, width = 300, height = 200 }) {
    const proxyUrl = `http://localhost:5002/${store}/${productId}`;
    
    return (
        <Image
            src={proxyUrl}
            alt="Product"
            width={width}
            height={height}
            loading="lazy"
            onError={(e) => {
                e.target.src = '/placeholder-image.png';
            }}
        />
    );
}
*/

// Example URLs for testing:
const testUrls = {
    target: "http://localhost:5002/Target/tg_53140726",
    wholeFoods: "http://localhost:5002/WholeFoods/wf_against-the-grain-three-cheese-gourmet-pizza-24-oz-b018o4u620",
    walmart: "http://localhost:5002/Walmart/wm_19400275"
};

console.log('Test these URLs in your browser:', testUrls);

// Export for use in your frontend
module.exports = {
    getProxyImageUrl,
    convertToProxyUrl,
    processProductData,
    preloadImage,
    loadProductImages,
    testUrls
};
