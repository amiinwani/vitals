# TrueFood Backend - Image Proxy Server

A robust Express.js backend server that provides image proxy functionality to bypass CORS restrictions when loading images from TrueFood's CDN. This server runs on **port 5002** and provides the exact same URL structure as the TrueFood dataset.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   cd /Users/arhamwani/Desktop/blood/backend
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   # OR for development with auto-restart:
   npm run dev
   ```

3. **Server will be running at:**
   ```
   http://localhost:5002
   ```

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.js              # Main Express server
│   └── routes/
│       ├── imageRoutes.js     # Image proxy routes
│       └── healthRoutes.js    # Health check routes
├── data/
│   └── truefood_products_full.csv  # Product dataset
├── package.json               # Dependencies & scripts
└── README.md                 # This file
```

## 🖼️ Image Proxy Usage

### URL Structure
Replace the TrueFood base URL with your localhost URL:

**Original TrueFood URL:**
```
https://www.truefood.tech/grocery_image/{store}/{productId}
```

**Proxy URL:**
```
http://localhost:5002/{store}/{productId}
```

### Examples

| Store | Product ID | Original URL | Proxy URL |
|-------|------------|--------------|-----------|
| Target | tg_53140726 | `https://www.truefood.tech/grocery_image/Target/tg_53140726` | `http://localhost:5002/Target/tg_53140726` |
| WholeFoods | wf_against-the-grain-three-cheese-gourmet-pizza-24-oz-b018o4u620 | `https://www.truefood.tech/grocery_image/WholeFoods/wf_against-the-grain-three-cheese-gourmet-pizza-24-oz-b018o4u620` | `http://localhost:5002/WholeFoods/wf_against-the-grain-three-cheese-gourmet-pizza-24-oz-b018o4u620` |
| Walmart | wm_19400275 | `https://www.truefood.tech/grocery_image/Walmart/wm_19400275` | `http://localhost:5002/Walmart/wm_19400275` |

## 📊 API Endpoints

### Image Proxy
- **GET** `/{store}/{productId}` - Proxy image from TrueFood CDN
- **GET** `/` - API documentation and service info
- **DELETE** `/cache` - Clear image cache (development)

### Health Checks
- **GET** `/health` - Basic health check
- **GET** `/health/status` - Detailed status with dependency checks
- **GET** `/health/test-image` - Test image proxy functionality

## ⚡ Features

### ✅ CORS Support
- Configured for frontend development (ports 3000, 3001, 5173)
- Proper headers for cross-origin requests
- Preflight request handling

### 🔒 Security
- Helmet.js for security headers
- Request timeout protection (15 seconds)
- Input validation and sanitization

### 📦 Caching
- In-memory cache for image metadata
- 1-hour TTL for optimal performance
- Cache management endpoints

### 📝 Logging
- Morgan HTTP request logging
- Detailed error logging
- Success/failure tracking

### 🛡️ Error Handling
- Graceful error responses
- Proper HTTP status codes
- Detailed error information in development

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:
```env
PORT=5002
NODE_ENV=development
```

### CORS Origins
The server is configured to accept requests from:
- `http://localhost:3000` (Next.js default)
- `http://localhost:3001` 
- `http://localhost:5173` (Vite default)

## 🚦 Usage in Frontend

### Before (Direct TrueFood URL - Blocked by CORS)
```javascript
// ❌ This will fail due to CORS
const imageUrl = "https://www.truefood.tech/grocery_image/Target/tg_53140726";
```

### After (Using Proxy)
```javascript
// ✅ This works via proxy
const imageUrl = "http://localhost:5002/Target/tg_53140726";
```

### React/Next.js Example
```jsx
function ProductImage({ store, productId }) {
  const imageUrl = `http://localhost:5002/${store}/${productId}`;
  
  return (
    <img 
      src={imageUrl}
      alt="Product"
      onError={(e) => {
        console.error('Failed to load image:', imageUrl);
        e.target.src = '/placeholder-image.png'; // Fallback
      }}
    />
  );
}
```

## 🧪 Testing

### Test Image Loading
Open these URLs in your browser to test:
```
http://localhost:5002/Target/tg_53140726
http://localhost:5002/WholeFoods/wf_against-the-grain-three-cheese-gourmet-pizza-24-oz-b018o4u620
http://localhost:5002/Walmart/wm_19400275
```

### Health Checks
```bash
# Basic health check
curl http://localhost:5002/health

# Detailed status
curl http://localhost:5002/health/status

# Test image proxy functionality
curl http://localhost:5002/health/test-image
```

## 🛠️ Development

### Install Dependencies
```bash
npm install
```

### Start Development Server (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## 📈 Performance

- **Response Time:** Typically under 500ms for cached images
- **Cache:** 1-hour TTL for image metadata
- **Timeout:** 15-second timeout for external requests
- **Concurrency:** Handles multiple concurrent requests efficiently

## ❗ Troubleshooting

### Images Not Loading
1. Check if the backend server is running on port 5002
2. Verify the URL format matches: `/{store}/{productId}`
3. Check browser console for error messages
4. Test health endpoint: `http://localhost:5002/health`

### CORS Errors
1. Ensure frontend is running on an allowed origin
2. Check CORS configuration in `src/server.js`
3. Add your frontend URL to the CORS origins if needed

### Performance Issues
1. Check network connectivity to TrueFood CDN
2. Monitor server logs for timeout errors
3. Clear cache: `curl -X DELETE http://localhost:5002/cache`

## 🔄 Integration with Frontend

This backend is designed to work seamlessly with your frontend. Simply replace the TrueFood base URL in your frontend code:

```javascript
// Replace this
const baseUrl = "https://www.truefood.tech/grocery_image";

// With this
const baseUrl = "http://localhost:5002";
```

The rest of your URL structure remains exactly the same as in the `truefood_products_full.csv` dataset!
