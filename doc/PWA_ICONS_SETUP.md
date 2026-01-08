# 🎨 PWA Icons Setup Guide

## Issue

The PWA manifest references icon files that don't exist yet:
- `/public/icon-192.png` (192x192 pixels)
- `/public/icon-512.png` (512x512 pixels)

## Solution Options

### Option 1: Create Icon Files (Recommended)

You need to create two PNG icon files:

1. **icon-192.png** (192x192 pixels)
2. **icon-512.png** (512x512 pixels)

**Requirements:**
- Format: PNG
- Size: Square (192x192 and 512x512)
- Design: Should represent the CASTER app
- Background: Transparent or solid color matching theme (#14b8a6)

**Tools to create icons:**
- Design tools (Figma, Photoshop, GIMP)
- Online icon generators
- Convert from existing logo if available

**Place icons in:** `frontend/public/`

### Option 2: Use Existing Logo (Quick Fix)

If you have an existing logo (like `hitachi-logo.svg`), you can:
1. Convert SVG to PNG at required sizes
2. Use online converter: https://cloudconvert.com/svg-to-png
3. Save as `icon-192.png` and `icon-512.png`

### Option 3: Temporary Placeholder Icons

Create simple placeholder icons using this approach:

```bash
# Using ImageMagick (if installed)
convert -size 192x192 xc:#14b8a6 -pointsize 80 -fill white -gravity center -annotate +0+0 "CASTER" frontend/public/icon-192.png
convert -size 512x512 xc:#14b8a6 -pointsize 200 -fill white -gravity center -annotate +0+0 "CASTER" frontend/public/icon-512.png
```

Or use an online tool to create simple colored squares with text.

### Option 4: Update Manifest (Temporary)

Until icons are created, you can temporarily update `manifest.json` to remove icon references:

```json
{
  "icons": []
}
```

However, this will reduce PWA functionality and installability.

## Recommended Approach

1. **Create proper icons** using CASTER logo/branding
2. **Place in** `frontend/public/`
3. **Rebuild** the application
4. **Test** PWA installation

## Testing

After adding icons:
1. Build: `npm run build`
2. Start: `npm run start`
3. Open DevTools > Application > Manifest
4. Verify icons are loaded correctly
5. Test install prompt

---

**Last Updated**: 13 Desember 2025

