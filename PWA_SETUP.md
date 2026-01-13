# PWA Setup Instructions

This app now supports Progressive Web App (PWA) installation! Users can add it to their home screen on iOS and Android devices.

## What's Included

- ✅ Web App Manifest (`public/manifest.json`)
- ✅ PWA meta tags in layout
- ✅ Install prompt component with platform detection
- ✅ SVG app icon
- ✅ Standalone app mode support

## How It Works

### For Users

**Android/Chrome:**
1. Visit the app in Chrome
2. A prompt will appear automatically after ~3 seconds
3. Click "Install Now" to add the app to your home screen
4. Alternatively, use Chrome's menu → "Install app" or "Add to Home screen"

**iOS/Safari:**
1. Visit the app in Safari
2. A prompt will appear with instructions
3. Tap the Share button (square with arrow)
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add" to confirm

The prompt can be dismissed and won't show again for that browser session.

## Creating PNG Icons (Optional)

While SVG icons work for most modern browsers, you may want to create PNG versions for better compatibility:

### Option 1: Using an online converter
1. Go to https://svgtopng.com/ or similar service
2. Upload `public/icon.svg`
3. Generate 192x192 and 512x512 PNG versions
4. Save as `public/icon-192.png` and `public/icon-512.png`

### Option 2: Using ImageMagick
```bash
convert -background none -resize 192x192 public/icon.svg public/icon-192.png
convert -background none -resize 512x512 public/icon.svg public/icon-512.png
```

### Option 3: Using Node.js with sharp
```bash
npm install sharp
node -e "
const sharp = require('sharp');
sharp('public/icon.svg').resize(192, 192).png().toFile('public/icon-192.png');
sharp('public/icon.svg').resize(512, 512).png().toFile('public/icon-512.png');
"
```

Then update `public/manifest.json` to include both SVG and PNG icons.

## Customization

### Update App Icon
Edit `public/icon.svg` to match your brand. The current icon is a simple dumbbell design.

### Update App Colors
- Theme color: Update `themeColor` in `app/layout.tsx` and `theme_color` in `public/manifest.json`
- Background color: Update `background_color` in `public/manifest.json`

### Update App Name
Edit `name` and `short_name` in `public/manifest.json`

## Testing

1. **Chrome DevTools:** 
   - Open DevTools → Application → Manifest
   - Verify all fields are correct
   - Check "Add to home screen" works

2. **Lighthouse:**
   - Run a Lighthouse audit
   - Check PWA score and address any issues

3. **Real Device Testing:**
   - Test on actual iOS and Android devices
   - Verify the install prompt appears
   - Check the app works in standalone mode

## Deployment Note

Make sure your hosting provider serves the manifest file with the correct MIME type:
- `manifest.json` should be served as `application/manifest+json`
- Most static hosts (Vercel, Netlify, etc.) handle this automatically

