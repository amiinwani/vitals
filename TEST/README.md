# TrueFood Image Proxy Test

This is a simple proxy server setup to bypass CORS restrictions when loading images from TrueFood's CDN.

## The Problem
The TrueFood images at `https://www.truefood.tech/grocery_image/` were blocked by CORS policies when trying to load them directly in the browser.

## The Solution
A Node.js/Express proxy server that:
1. Fetches images from TrueFood's CDN on the backend (no CORS restrictions)
2. Serves them through our local server with proper CORS headers
3. Acts as a middleman between your frontend and TrueFood's CDN

## Quick Start

1. **Install dependencies:**
   ```bash
   cd /Users/arhamwani/Desktop/blood/TEST
   npm install
   ```

2. **Start the proxy server:**
   ```bash
   npm start
   ```

3. **Open the test page:**
   - Go to `http://localhost:3001` in your browser
   - The page will automatically check if the proxy server is running
   - Images should now load via the proxy

## How It Works

- **Original CDN URL:** `https://www.truefood.tech/grocery_image/Target/tg_53140726`
- **Proxy URL:** `http://localhost:3001/proxy-image/Target/tg_53140726`

The proxy server:
- Receives requests at `/proxy-image/*`
- Fetches the actual image from TrueFood's CDN
- Returns it with proper headers to avoid CORS issues

## Files Created

- `package.json` - Node.js dependencies
- `server.js` - Express proxy server
- `image-test.html` - Test page with image grid
- `README.md` - This file

## What You'll See

✅ **Green status:** Image loaded successfully via proxy
❌ **Red status:** Image failed to load or proxy server not running

If images still don't load, check the server console for error messages.

