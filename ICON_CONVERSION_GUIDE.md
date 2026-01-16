# Quick Icon Conversion Guide

To use your icons with @capacitor/assets for Android, you need PNG files.

## Quick Steps

1. **Convert ICO to PNG** (choose one method):

   **Option A: Online Converter (Easiest)**
   - Go to https://convertio.co/ico-png/
   - Upload `public/icon-512.ico`
   - Download the PNG
   - Save it as `assets/icon.png` in your project root

   **Option B: ImageMagick (Command Line)**
   ```bash
   magick public/icon-512.ico assets/icon.png
   ```

   **Option C: Any Image Editor**
   - Open `public/icon-512.ico` in Photoshop/GIMP/Paint.NET
   - Export/Save as PNG
   - Save as `assets/icon.png`

2. **Create assets folder structure:**
   ```
   assets/
   └── icon.png (512x512 or larger)
   └── splash.png (optional, 2732x2732 recommended)
   ```

3. **Run the generator:**
   ```bash
   npm run cap:assets
   ```

4. **Sync to Android:**
   ```bash
   npm run cap:sync
   ```

## Current Status

- ✅ You have: `public/icon-192.ico` and `public/icon-512.ico`
- ⚠️  You need: `assets/icon.png` (PNG format, 512x512 or larger)

## After Conversion

Once you have `assets/icon.png`, run:
```bash
npm run cap:assets
npm run cap:sync
```

This will generate all Android icon sizes automatically!
