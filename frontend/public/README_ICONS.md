# PWA Icons Required

This directory needs the following icon files for full PWA functionality:

- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

Once these icons are created, update `manifest.json` to include them:

```json
"icons": [
  {
    "src": "/icon-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any maskable"
  },
  {
    "src": "/icon-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any maskable"
  }
]
```

See `doc/PWA_ICONS_SETUP.md` for detailed instructions.

