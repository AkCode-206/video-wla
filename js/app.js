/**
 * MyakTube – Offline media app.
 * Handles UI, upload, playlists, search, and playback.
 */
(function () {
  'use strict';

  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const mediaGrid = document.getElementById('media-grid');
  const emptyState = document.getElementById('empty-state');
  const viewTitle = document.getElementById('view-title');
  const allMediaCount = document.getElementById('all-media-count');
  const playlistList = document.getElementById('playlist-list');
  const createPlaylistBtn = document.getElementById('create-playlist-btn');
  const createPlaylistModal = document.getElementById('create-playlist-modal');
  const playlistNameInput = document.getElementById('playlist-name-input');
  const modalCancel = document.getElementById('modal-cancel');
  const modalCreate = document.getElementById('modal-create');
  const addToPlaylistModal = document.getElementById('add-to-playlist-modal');
  const playlistPickList = document.getElementById('playlist-pick-list');
  const noPlaylistsHint = document.getElementById('no-playlists-hint');
  const addModalClose = document.getElementById('add-modal-close');
  const nowPlaying = document.getElementById('now-playing');
  const nowPlayingName = document.getElementById('now-playing-name');
  const nowPlayingType = document.getElementById('now-playing-type');
  const audioPlayer = document.getElementById('audio-player');
  const videoPlayer = document.getElementById('video-player');
  const videoOverlay = document.getElementById('video-overlay');
  const videoOverlayPlayer = document.getElementById('video-overlay-player');
  const closeVideoBtn = document.getElementById('close-video-btn');
  const backNowplayingBtn = document.getElementById('back-nowplaying-btn');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressSlider = document.getElementById('progress-slider');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');
  const loopBtn = document.getElementById('loop-btn');
  const loopVideoOverlayBtn = document.getElementById('loop-video-overlay-btn');

  let allMedia = [];
  let allPlaylists = [];
  let currentPlaylistId = 'all';
  let filteredMedia = [];
  let playbackQueue = [];
  let playbackIndex = -1;
  let addToPlaylistMediaId = null;
  let loopCurrentTrack = false;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function getActivePlayer() {
    const isVideo = document.getElementById('now-playing-type').textContent === 'video';
    return isVideo ? videoOverlayPlayer : audioPlayer;
  }

  function showNowPlaying(show) {
    nowPlaying.hidden = !show;
  }

  function setNowPlayingLabel(name, type) {
    nowPlayingName.textContent = name || '—';
    nowPlayingType.textContent = type || '';
  }

  function updateProgressUI() {
    const player = getActivePlayer();
    if (!player || !player.src) return;
    const current = player.currentTime;
    const duration = player.duration;
    if (Number.isFinite(duration)) {
      progressSlider.value = (current / duration) * 100;
      timeTotal.textContent = formatTime(duration);
    } else {
      progressSlider.value = 0;
      timeTotal.textContent = '0:00';
    }
    timeCurrent.textContent = formatTime(current);
  }

  function bindPlayerEvents(player, isOverlayVideo) {
    player.addEventListener('timeupdate', updateProgressUI);
    player.addEventListener('loadedmetadata', updateProgressUI);
    player.addEventListener('ended', () => {
      playNext();
    });
    if (isOverlayVideo) {
      player.addEventListener('pause', () => {
        playPauseBtn.textContent = '▶';
      });
      player.addEventListener('play', () => {
        playPauseBtn.textContent = '⏸';
      });
    }
  }

  bindPlayerEvents(audioPlayer, false);
  bindPlayerEvents(videoOverlayPlayer, true);

  progressSlider.addEventListener('input', () => {
    const player = getActivePlayer();
    if (!player || !player.duration) return;
    const pct = Number(progressSlider.value) / 100;
    player.currentTime = pct * player.duration;
    updateProgressUI();
  });

  playPauseBtn.addEventListener('click', () => {
    const player = getActivePlayer();
    if (!player || !player.src) return;
    if (player.paused) {
      player.play();
      playPauseBtn.textContent = '⏸';
    } else {
      player.pause();
      playPauseBtn.textContent = '▶';
    }
  });

  prevBtn.addEventListener('click', () => playPrev());
  nextBtn.addEventListener('click', () => playNext());

  function playPrev() {
    if (playbackQueue.length === 0) return;
    const nextIndex = playbackIndex <= 0 ? playbackQueue.length - 1 : playbackIndex - 1;
    playAtIndex(nextIndex);
  }

  function playNext() {
    if (playbackQueue.length === 0) return;
    const nextIndex = playbackIndex < 0 || playbackIndex >= playbackQueue.length - 1 ? 0 : playbackIndex + 1;
    playAtIndex(nextIndex);
  }

  function applyLoopState() {
    audioPlayer.loop = loopCurrentTrack;
    videoOverlayPlayer.loop = loopCurrentTrack;
    loopBtn?.classList.toggle('active', loopCurrentTrack);
    loopVideoOverlayBtn?.classList.toggle('active', loopCurrentTrack);
  }

  async function playAtIndex(index) {
    if (index < 0 || index >= playbackQueue.length) return;
    playbackIndex = index;
    const meta = playbackQueue[index];
    const item = await getMediaById(meta.id);
    if (!item || !item.blob) return;
    const url = URL.createObjectURL(item.blob);
    const isVideo = item.type === 'video';

    setNowPlayingLabel(meta.name, item.type);
    showNowPlaying(true);

    if (isVideo) {
      audioPlayer.pause();
      audioPlayer.removeAttribute('src');
      videoPlayer.removeAttribute('src');
      videoOverlay.classList.add('active');
      videoOverlayPlayer.src = url;
      videoOverlayPlayer.loop = loopCurrentTrack;
      videoOverlayPlayer.play();
      playPauseBtn.textContent = '⏸';
    } else {
      videoOverlayPlayer.pause();
      videoOverlayPlayer.removeAttribute('src');
      videoOverlay.classList.remove('active');
      audioPlayer.src = url;
      audioPlayer.loop = loopCurrentTrack;
      audioPlayer.play();
      playPauseBtn.textContent = '⏸';
    }
    applyLoopState();
    updateProgressUI();
  }

  function playMedia(meta) {
    const list = filteredMedia.map((m) => ({ id: m.id, name: m.name, type: m.type }));
    playbackQueue = list;
    playbackIndex = list.findIndex((m) => m.id === meta.id);
    if (playbackIndex < 0) playbackIndex = 0;
    playAtIndex(playbackIndex);
  }

  function goBackFromPlayback() {
    audioPlayer.pause();
    audioPlayer.removeAttribute('src');
    videoOverlayPlayer.pause();
    videoOverlayPlayer.removeAttribute('src');
    videoOverlay.classList.remove('active');
    playPauseBtn.textContent = '▶';
    showNowPlaying(false);
  }

  closeVideoBtn.addEventListener('click', goBackFromPlayback);

  backNowplayingBtn.addEventListener('click', goBackFromPlayback);

  function toggleLoop() {
    loopCurrentTrack = !loopCurrentTrack;
    applyLoopState();
  }

  loopBtn?.addEventListener('click', toggleLoop);
  loopVideoOverlayBtn?.addEventListener('click', toggleLoop);

  function applySearchFilter(list) {
    const q = (searchInput.value || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => m.name.toLowerCase().includes(q));
  }

  function getCurrentMediaList() {
    if (currentPlaylistId === 'all') {
      return applySearchFilter(allMedia);
    }
    const playlist = allPlaylists.find((p) => p.id === currentPlaylistId);
    if (!playlist) return applySearchFilter(allMedia);
    const list = allMedia.filter((m) => playlist.mediaIds.includes(m.id));
    return applySearchFilter(list);
  }

  function renderMediaGrid() {
    filteredMedia = getCurrentMediaList();
    emptyState.hidden = filteredMedia.length > 0;

    const fragment = document.createDocumentFragment();
    filteredMedia.forEach((meta) => {
      const card = document.createElement('div');
      card.className = 'media-card';
      card.dataset.mediaId = meta.id;

      const thumb = document.createElement('div');
      thumb.className = 'media-card-thumb';
      if (meta.type === 'video') {
        const video = document.createElement('video');
        video.src = '';
        video.muted = true;
        video.preload = 'metadata';
        video.dataset.mediaId = meta.id;
        thumb.appendChild(video);
      } else {
        const icon = document.createElement('span');
        icon.className = 'thumb-icon';
        icon.textContent = '♫';
        thumb.appendChild(icon);
      }

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'media-card-play';
      playBtn.setAttribute('aria-label', 'Play');
      playBtn.innerHTML = '<span class="play-icon">▶</span>';
      playBtn.addEventListener('click', () => playMedia(meta));
      thumb.appendChild(playBtn);

      const body = document.createElement('div');
      body.className = 'media-card-body';
      const name = document.createElement('p');
      name.className = 'media-card-name';
      name.textContent = meta.name;
      body.appendChild(name);

      const actions = document.createElement('div');
      actions.className = 'media-card-actions';
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.setAttribute('aria-label', 'Add to playlist');
      addBtn.textContent = '+';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openAddToPlaylistModal(meta.id);
      });
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'delete-btn';
      delBtn.setAttribute('aria-label', 'Delete');
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMediaById(meta.id);
      });
      actions.append(addBtn, delBtn);
      body.appendChild(actions);

      card.append(thumb, body);
      fragment.appendChild(card);
    });

    mediaGrid.innerHTML = '';
    mediaGrid.appendChild(emptyState);
    mediaGrid.appendChild(fragment);

    loadThumbnails();
  }

  function loadThumbnails() {
    document.querySelectorAll('.media-card-thumb video').forEach((video) => {
      const id = video.dataset.mediaId;
      if (!id) return;
      getMediaById(id).then((item) => {
        if (item && item.blob && item.id === video.dataset.mediaId) {
          video.src = URL.createObjectURL(item.blob);
        }
      });
    });
  }

  function renderPlaylists() {
    allMediaCount.textContent = allMedia.length;

    const fragment = document.createDocumentFragment();
    allPlaylists.forEach((p) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'playlist-item';
      if (p.id === currentPlaylistId) btn.classList.add('active');
      btn.dataset.playlistId = p.id;
      btn.setAttribute('aria-current', p.id === currentPlaylistId ? 'page' : 'false');
      btn.innerHTML = `<span class="playlist-name">${escapeHtml(p.name)}</span><span class="playlist-count">${p.mediaIds.length}</span>`;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'delete-playlist';
      delBtn.setAttribute('aria-label', 'Delete playlist');
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePlaylistById(p.id);
      });
      btn.appendChild(delBtn);
      li.appendChild(btn);
      fragment.appendChild(li);
    });
    playlistList.innerHTML = '';
    playlistList.appendChild(fragment);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function selectPlaylist(playlistId) {
    currentPlaylistId = playlistId;
    document.querySelectorAll('.playlist-item').forEach((el) => {
      el.classList.remove('active');
      el.removeAttribute('aria-current');
      if (el.dataset.playlistId === String(playlistId)) {
        el.classList.add('active');
        el.setAttribute('aria-current', 'page');
      }
    });
    if (playlistId === 'all') {
      viewTitle.textContent = 'All Media';
    } else {
      const p = allPlaylists.find((pl) => pl.id === playlistId);
      viewTitle.textContent = p ? p.name : 'All Media';
    }
    renderMediaGrid();
  }

  // Delegated click so "All Media" (static) and playlists (dynamic) both work
  document.querySelector('.playlist-nav').addEventListener('click', (e) => {
    const item = e.target.closest('.playlist-item');
    if (!item || e.target.closest('.delete-playlist')) return;
    const id = item.dataset.playlistId;
    if (id) selectPlaylist(id);
  });

  function refreshData() {
    return Promise.all([getAllMedia(), getAllPlaylists()]).then(([media, playlists]) => {
      allMedia = media;
      allPlaylists = playlists;
      renderPlaylists();
      if (currentPlaylistId !== 'all' && !playlists.find((p) => p.id === currentPlaylistId)) {
        currentPlaylistId = 'all';
        document.querySelector('.playlist-item[data-playlist-id="all"]')?.classList.add('active');
      }
      viewTitle.textContent = currentPlaylistId === 'all' ? 'All Media' : (allPlaylists.find((p) => p.id === currentPlaylistId)?.name || 'All Media');
      renderMediaGrid();
    });
  }

  searchInput.addEventListener('input', () => {
    searchClear.classList.toggle('hidden', !searchInput.value.trim());
    renderMediaGrid();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    searchInput.focus();
    renderMediaGrid();
  });

  uploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    fileInput.value = '';
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('audio/') || f.type.startsWith('video/'));
    handleFiles(files);
  });

  async function handleFiles(files) {
    if (files.length === 0) return;
    for (const file of files) {
      try {
        await addMedia(file);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    await refreshData();
  }

  async function deleteMediaById(id) {
    if (!confirm('Delete this media? It will be removed from all playlists.')) return;
    await removeMediaFromAllPlaylists(id);
    await deleteMedia(id);
    await refreshData();
  }

  async function deletePlaylistById(id) {
    const p = allPlaylists.find((pl) => pl.id === id);
    if (!p || !confirm(`Delete playlist "${p.name}"? Media files will not be deleted.`)) return;
    await deletePlaylist(id);
    await refreshData();
  }

  createPlaylistBtn.addEventListener('click', () => {
    playlistNameInput.value = '';
    createPlaylistModal.classList.remove('hidden');
    playlistNameInput.focus();
  });

  modalCancel.addEventListener('click', () => createPlaylistModal.classList.add('hidden'));
  modalCreate.addEventListener('click', async () => {
    const name = playlistNameInput.value.trim() || 'Untitled Playlist';
    try {
      await createPlaylist(name);
      createPlaylistModal.classList.add('hidden');
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  });
  createPlaylistModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') createPlaylistModal.classList.add('hidden');
  });

  function openAddToPlaylistModal(mediaId) {
    addToPlaylistMediaId = mediaId;
    const list = allPlaylists.filter((p) => !p.mediaIds.includes(mediaId));
    noPlaylistsHint.classList.toggle('hidden', allPlaylists.length > 0);
    playlistPickList.innerHTML = '';
    if (list.length === 0 && allPlaylists.length > 0) {
      const p = document.createElement('p');
      p.className = 'modal-hint';
      p.textContent = 'Already in all playlists.';
      playlistPickList.appendChild(p);
    } else {
      list.forEach((p) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = p.name;
        btn.addEventListener('click', async () => {
          await addMediaToPlaylist(p.id, mediaId);
          await refreshData();
          addToPlaylistModal.classList.add('hidden');
        });
        li.appendChild(btn);
        playlistPickList.appendChild(li);
      });
    }
    addToPlaylistModal.classList.remove('hidden');
  }

  addModalClose.addEventListener('click', () => addToPlaylistModal.classList.add('hidden'));
  addToPlaylistModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') addToPlaylistModal.classList.add('hidden');
  });

  function injectSidebarToggle() {
    if (document.querySelector('.sidebar-toggle')) return;
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sidebar-toggle';
    btn.setAttribute('aria-label', 'Open menu');
    btn.textContent = '☰';
    function closeSidebar() {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('visible');
    }
    btn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('visible', sidebar.classList.contains('open'));
    });
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
    document.body.insertBefore(btn, document.body.firstChild);
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !btn.contains(e.target)) {
        closeSidebar();
      }
    });
  }

  injectSidebarToggle();
  refreshData();

  /* PWA install prompt */
  const installBanner = document.getElementById('install-banner');
  const installAppBtn = document.getElementById('install-app-btn');
  const installDismissBtn = document.getElementById('install-dismiss-btn');
  const INSTALL_DISMISSED_KEY = 'myaktube-install-dismissed';

  let deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (!isStandalone && !localStorage.getItem(INSTALL_DISMISSED_KEY) && installBanner) {
      installBanner.classList.remove('hidden');
    }
  });

  if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (installBanner) installBanner.classList.add('hidden');
    });
  }

  if (installDismissBtn) {
    installDismissBtn.addEventListener('click', () => {
      if (installBanner) installBanner.classList.add('hidden');
      try { localStorage.setItem(INSTALL_DISMISSED_KEY, '1'); } catch (_) {}
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (installBanner) installBanner.classList.add('hidden');
    try { localStorage.removeItem(INSTALL_DISMISSED_KEY); } catch (_) {}
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
