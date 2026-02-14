/**
 * IndexedDB module for offline media storage.
 * Stores media blobs and playlist metadata locally.
 */
const DB_NAME = 'MyakTubeDB';
const DB_VERSION = 1;
const STORE_MEDIA = 'media';
const STORE_PLAYLISTS = 'playlists';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_MEDIA)) {
        const mediaStore = database.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
        mediaStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORE_PLAYLISTS)) {
        const playlistStore = database.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
        playlistStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Add a media file (store blob + metadata).
 */
async function addMedia(file) {
  const database = await openDB();
  const id = generateId();
  const isVideo = file.type.startsWith('video/');
  const item = {
    id,
    name: file.name.replace(/\.[^/.]+$/, '') || file.name,
    blob: file,
    type: isVideo ? 'video' : 'audio',
    mimeType: file.type,
    createdAt: Date.now()
  };
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_MEDIA, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve({ ...item, blob: undefined });
    tx.objectStore(STORE_MEDIA).put(item);
  });
}

/**
 * Get all media (metadata only; blobs loaded on demand).
 */
async function getAllMedia() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_MEDIA, 'readonly');
    const store = tx.objectStore(STORE_MEDIA);
    const request = store.getAll();
    request.onsuccess = () => {
      const rows = request.result.map(({ id, name, type, mimeType, createdAt }) => ({
        id,
        name,
        type,
        mimeType,
        createdAt
      }));
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single media item with blob for playback.
 */
async function getMediaById(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_MEDIA, 'readonly');
    const request = tx.objectStore(STORE_MEDIA).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete media by id.
 */
async function deleteMedia(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_MEDIA, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE_MEDIA).delete(id);
  });
}

/**
 * Create a new playlist.
 */
async function createPlaylist(name) {
  const database = await openDB();
  const id = generateId();
  const playlist = {
    id,
    name: name.trim() || 'Untitled Playlist',
    mediaIds: [],
    createdAt: Date.now()
  };
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PLAYLISTS, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve(playlist);
    tx.objectStore(STORE_PLAYLISTS).put(playlist);
  });
}

/**
 * Get all playlists.
 */
async function getAllPlaylists() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PLAYLISTS, 'readonly');
    const request = tx.objectStore(STORE_PLAYLISTS).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get playlist by id.
 */
async function getPlaylistById(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PLAYLISTS, 'readonly');
    const request = tx.objectStore(STORE_PLAYLISTS).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update playlist (e.g. add/remove media).
 */
async function updatePlaylist(id, updates) {
  const playlist = await getPlaylistById(id);
  if (!playlist) throw new Error('Playlist not found');
  const database = await openDB();
  const updated = { ...playlist, ...updates };
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PLAYLISTS, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve(updated);
    tx.objectStore(STORE_PLAYLISTS).put(updated);
  });
}

/**
 * Add media id to playlist.
 */
async function addMediaToPlaylist(playlistId, mediaId) {
  const playlist = await getPlaylistById(playlistId);
  if (!playlist) return;
  if (playlist.mediaIds.includes(mediaId)) return playlist;
  return updatePlaylist(playlistId, {
    mediaIds: [...playlist.mediaIds, mediaId]
  });
}

/**
 * Remove media id from playlist.
 */
async function removeMediaFromPlaylist(playlistId, mediaId) {
  const playlist = await getPlaylistById(playlistId);
  if (!playlist) return;
  const mediaIds = playlist.mediaIds.filter((m) => m !== mediaId);
  return updatePlaylist(playlistId, { mediaIds });
}

/**
 * Delete playlist (does not delete media).
 */
async function deletePlaylist(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PLAYLISTS, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE_PLAYLISTS).delete(id);
  });
}

/**
 * Remove a media id from all playlists (call when media is deleted).
 */
async function removeMediaFromAllPlaylists(mediaId) {
  const playlists = await getAllPlaylists();
  for (const p of playlists) {
    if (p.mediaIds.includes(mediaId)) {
      await updatePlaylist(p.id, {
        mediaIds: p.mediaIds.filter((m) => m !== mediaId)
      });
    }
  }
}
