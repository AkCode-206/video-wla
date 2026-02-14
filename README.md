# MyakTube – Offline Media

A **fully offline** personal media app (no backend, no server, no cloud). Use it like a mini YouTube/Netflix for your own files, stored and played locally in the browser.

## Tech stack

- **HTML, CSS, Vanilla JavaScript** – no frameworks
- **IndexedDB** – local storage for media files and playlists
- **Service Worker** – PWA and offline caching
- **No backend** – everything runs in the browser

## How to run

1. Serve the project over HTTP (required for Service Worker and IndexedDB).
   - Example: `npx serve .` or `python -m http.server 8080` from the project folder.
2. Open the app URL in your browser (e.g. `http://localhost:3000`).
3. Upload audio/video via **Upload** or **drag & drop**.
4. Create playlists, search, and play from the **Now Playing** bar.

## Features

- **Layout**: Sidebar (playlists), top search bar, media grid, sticky now-playing bar.
- **Media**: Drag & drop or file picker; stored in IndexedDB; support for audio and video; play, delete, add to playlist per item.
- **Playlists**: Create playlists, add/remove media, view by playlist; media count; media can be in multiple playlists; deleting a playlist does not delete files; deleting media removes it from all playlists.
- **Search**: Live filter by media name in “All Media” and inside any playlist.
- **Offline**: Works without internet; Service Worker caches the app; installable as PWA.

## Phone & install (downloadable app)

- **Mobile-friendly**: Layout adapts to small screens; sidebar becomes a slide-out menu (☰); touch targets are at least 44px; safe areas for notched phones.
- **Install on phone or desktop**: When the app is served over HTTPS (or localhost), the browser may show an **Install app** banner. You can also use the browser menu: **Install MyakTube** / **Add to Home Screen**.
- **PWA icons**: For a proper install icon, open `icon-generator.html` in your browser, download the two PNGs, and save them into the `icons/` folder. The manifest already points to `icons/icon-192.png` and `icons/icon-512.png`.

## Project structure

```
myaktube/
├── index.html         # App shell and layout
├── icon-generator.html # Run once to create PWA icons
├── manifest.json     # PWA manifest
├── sw.js             # Service worker
├── icons/            # PWA icons (create via icon-generator.html)
├── css/
│   └── styles.css    # Dark theme, responsive
├── js/
│   ├── db.js         # IndexedDB (media + playlists)
│   └── app.js        # UI, upload, playback, search
└── README.md
```

## License

Use and modify as you like.
