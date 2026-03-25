import { libraryManager } from '../storage/Library';
import { prismPlayer } from '../audio/Player';
import { type TrackData, deleteTrack, incrementPlayCount, getPlayCounts } from '../storage/db';
import Sortable from 'sortablejs';

export class UIManager {
    private viewLayer!: HTMLElement;

    // Element Refs
    private topTitle!: HTMLElement;
    private miniPlayer!: HTMLElement;
    private fullPlayer!: HTMLElement;
    private settingsOverlay!: HTMLElement;
    private queueOverlay!: HTMLElement;
    private queueList!: HTMLElement;

    private miniTitle!: HTMLElement;
    private miniArtist!: HTMLElement;
    private miniArt!: HTMLElement;
    private miniPlayPause!: HTMLButtonElement;

    private fullTitle!: HTMLElement;
    private fullArtist!: HTMLElement;
    private fullArt!: HTMLElement;
    private fullPlayPause!: HTMLButtonElement;
    private fullPrev!: HTMLButtonElement;
    private fullNext!: HTMLButtonElement;

    private progressSlider!: HTMLInputElement;
    private timeCurrent!: HTMLElement;
    private timeTotal!: HTMLElement;

    private btnShuffle!: HTMLButtonElement;
    private btnRepeat!: HTMLButtonElement;

    // State
    private currentPlaylistId: string | null = null;
    private currentPlaylistTracks: TrackData[] = [];
    private currentTrackIndex: number = -1;
    private userQueue: TrackData[] = [];  // Spotify-style: plays before playlist continues
    private nowPlayingTrack: TrackData | null = null;  // The ACTUAL track currently playing
    private isShuffle: boolean = false;
    private isRepeat: boolean = false;
    private isScrubbing: boolean = false;
    private sortableUserQueue: Sortable | null = null;
    private sortablePlaylistQueue: Sortable | null = null;
    private currentSortMode: string = 'default';

    constructor() { }

    public init() {
        this.viewLayer = document.getElementById('view-layer')!;
        this.topTitle = document.getElementById('top-title')!;

        // Screens
        this.miniPlayer = document.getElementById('mini-player')!;
        this.fullPlayer = document.getElementById('full-player')!;
        this.settingsOverlay = document.getElementById('settings-overlay')!;
        this.queueOverlay = document.getElementById('queue-overlay')!;
        this.queueList = document.getElementById('queue-list')!;

        // Mini
        this.miniTitle = document.getElementById('mini-title')!;
        this.miniArtist = document.getElementById('mini-artist')!;
        this.miniArt = document.getElementById('mini-art')!;
        this.miniPlayPause = document.getElementById('mini-play-pause') as HTMLButtonElement;

        // Full
        this.fullTitle = document.getElementById('full-title')!;
        this.fullArtist = document.getElementById('full-artist')!;
        this.fullArt = document.getElementById('full-art')!;
        this.fullPlayPause = document.getElementById('full-btn-play-pause') as HTMLButtonElement;
        this.fullPrev = document.getElementById('full-btn-prev') as HTMLButtonElement;
        this.fullNext = document.getElementById('full-btn-next') as HTMLButtonElement;

        this.progressSlider = document.getElementById('progress-slider') as HTMLInputElement;
        this.timeCurrent = document.getElementById('full-time-current')!;
        this.timeTotal = document.getElementById('full-time-total')!;

        this.btnShuffle = document.getElementById('btn-shuffle') as HTMLButtonElement;
        this.btnRepeat = document.getElementById('btn-repeat') as HTMLButtonElement;

        this.bindEvents();
        this.renderLibrary();

        // Set initial history state without hash
        history.replaceState({ view: 'library' }, '', window.location.pathname);
    }

    private bindEvents() {
        // Nav
        document.getElementById('btn-library')?.addEventListener('click', () => {
            history.back();
        });

        // Settings Toggle
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.settingsOverlay.classList.add('open');
            history.pushState({ view: 'settings' }, '', '#settings');
        });
        document.getElementById('btn-close-settings')?.addEventListener('click', () => {
            history.back();
        });
        document.getElementById('btn-clear-db')?.addEventListener('click', async () => {
            if (confirm("Are you sure you want to clear all Prism library data?")) {
                // Delete entire indexeddb for hard reset
                const req = indexedDB.deleteDatabase('prism-audio-db');
                req.onsuccess = () => window.location.reload();
            }
        });

        libraryManager.onLibraryUpdated = () => {
            this.topTitle.innerText = 'Music Library';
            this.renderLibrary();
        };

        libraryManager.onImportProgress = (current, total) => {
            const pct = Math.floor((current / total) * 100);
            this.topTitle.innerText = `Importing (${pct}%)...`;
        };

        // Player Overlay Toggles
        this.miniPlayer.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.mini-player-controls')) return;
            this.fullPlayer.classList.add('open');
            history.pushState({ view: 'fullplayer' }, '', '#fullplayer');
        });

        document.getElementById('btn-close-full')?.addEventListener('click', () => {
            history.back();
        });

        // Audio Hooks
        prismPlayer.onPlayStateChange = (playing) => {
            const icon = playing ? 'pause' : 'play_arrow';
            this.miniPlayPause.innerHTML = `<span class="material-symbols-rounded">${icon}</span>`;
            this.fullPlayPause.innerHTML = `<span class="material-symbols-rounded">${icon}</span>`;

            // Vinyl disc spin
            if (localStorage.getItem('prism-vinyl') !== 'false') {
                this.fullArt.classList.toggle('spinning', playing);
            } else {
                this.fullArt.classList.remove('spinning');
            }

            const playlistPlayBtn = document.getElementById('btn-playlist-play');
            if (playlistPlayBtn) playlistPlayBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 32px">${icon}</span>`;
        };

        prismPlayer.onRequestSkipNext = () => this.playNext();
        prismPlayer.onRequestSkipPrev = () => this.playPrev();

        // Queue Overlay
        document.getElementById('btn-open-queue')?.addEventListener('click', () => {
            this.renderQueue();
            this.queueOverlay.classList.add('open');
            history.pushState({ view: 'queue' }, '', '#queue');
        });
        document.getElementById('btn-close-queue')?.addEventListener('click', () => {
            history.back();
        });



        // --- History API: Android Back Navigation ---
        window.addEventListener('popstate', (e) => {
            const state = e.state as { view?: string } | null;
            // Close overlays in priority order

            if (this.queueOverlay.classList.contains('open')) {
                this.queueOverlay.classList.remove('open');
                return;
            }
            if (this.settingsOverlay.classList.contains('open')) {
                this.settingsOverlay.classList.remove('open');
                return;
            }
            if (this.fullPlayer.classList.contains('open')) {
                this.fullPlayer.classList.remove('open');
                return;
            }
            // If we're on a playlist view, go back to library
            if (this.currentPlaylistId && state?.view === 'library') {
                this.renderLibrary();
                this.currentPlaylistId = null;
                return;
            }
        });

        prismPlayer.onTrackChange = (track) => {
            this.updatePlayerUI(track);
            if (this.queueOverlay.classList.contains('open')) {
                this.renderQueue();
            }
        };

        prismPlayer.onTimeUpdate = (current, total) => {
            this.timeCurrent.innerText = this.formatTime(current);
            if (total && !isNaN(total) && total > 0) {
                this.timeTotal.innerText = this.formatTime(total);
                if (!this.isScrubbing) {
                    const pct = (current / total) * 100;
                    this.progressSlider.value = pct.toString();
                    this.progressSlider.style.setProperty('--slider-fill', `${pct}%`);
                }
            }
        };

        // Controls
        const togglePlay = () => {
            if (navigator.vibrate) navigator.vibrate(8);
            prismPlayer.togglePlay();
        };
        this.miniPlayPause.addEventListener('click', togglePlay);
        this.fullPlayPause.addEventListener('click', togglePlay);

        const skipNext = () => prismPlayer.requestSkipNext(async () => {
            if (navigator.vibrate) navigator.vibrate(15);
            this.playNext();
        });
        const skipPrev = () => prismPlayer.requestSkipNext(async () => {
            if (navigator.vibrate) navigator.vibrate(15);
            this.playPrev();
        });

        this.fullNext.addEventListener('click', skipNext);
        this.fullPrev.addEventListener('click', skipPrev);

        document.getElementById('mini-btn-next')?.addEventListener('click', skipNext);
        document.getElementById('mini-btn-prev')?.addEventListener('click', skipPrev);

        // Native Range Slider Scrubbing Logic with Haptics
        this.progressSlider.addEventListener('input', () => {
            this.isScrubbing = true;
            const pct = parseFloat(this.progressSlider.value);
            this.progressSlider.style.setProperty('--slider-fill', `${pct}%`);
            if (navigator.vibrate) navigator.vibrate(25);
        });

        this.progressSlider.addEventListener('change', () => {
            this.isScrubbing = false;
            const pct = parseFloat(this.progressSlider.value) / 100;
            prismPlayer.seek(pct);
        });

        // Shuffle & Repeat

        // --- Full Player Swipe Gestures ---
        const fullContent = document.querySelector('.full-player-content') as HTMLElement;
        if (fullContent) {
            let startX = 0;
            let startY = 0;
            let swiping = false;

            fullContent.addEventListener('touchstart', (e) => {
                // Don't intercept slider scrubbing
                if ((e.target as HTMLElement).closest('.full-progress-container')) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                swiping = true;
            }, { passive: true });

            fullContent.addEventListener('touchmove', (e) => {
                if (!swiping) return;
                if ((e.target as HTMLElement).closest('.full-progress-container')) return;
                const dx = e.touches[0].clientX - startX;
                const dy = e.touches[0].clientY - startY;
                // Only give feedback for horizontal swipes
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
                    fullContent.style.transform = `translateX(${dx * 0.4}px)`;
                } else if (dy > 20 && Math.abs(dy) > Math.abs(dx)) {
                    fullContent.style.transform = `translateY(${dy * 0.3}px)`;
                }
            }, { passive: true });

            fullContent.addEventListener('touchend', (e) => {
                if (!swiping) return;
                swiping = false;
                fullContent.style.transform = '';
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const dx = endX - startX;
                const dy = endY - startY;

                // Horizontal swipe for skip (threshold 80px, vertical drift < 60px)
                if (Math.abs(dx) > 80 && Math.abs(dy) < 60) {
                    if (navigator.vibrate) navigator.vibrate(15);
                    if (dx < 0) this.playNext();  // Swipe left = next
                    else this.playPrev();          // Swipe right = prev
                    return;
                }

                // Vertical swipe down to dismiss (threshold 100px, horizontal drift < 60px)
                if (dy > 100 && Math.abs(dx) < 60) {
                    history.back(); // Close full player via history
                }
            });
        }
        this.btnShuffle.addEventListener('click', () => {
            if (this.currentPlaylistTracks.length > 0) {
                this.isShuffle = !this.isShuffle;
                this.btnShuffle.classList.toggle('active', this.isShuffle);
                this.updatePreload();
            }
        });
        this.btnRepeat.addEventListener('click', () => {
            if (this.currentPlaylistTracks.length > 0) {
                this.isRepeat = !this.isRepeat;
                this.btnRepeat.classList.toggle('active', this.isRepeat);
                this.updatePreload();
            }
            this.btnRepeat.innerHTML = `<span class="material-symbols-rounded">${this.isRepeat ? 'repeat_one' : 'repeat'}</span>`;
        });
    }

    private formatTime(secs: number): string {
        const min = Math.floor(secs / 60);
        const sec = Math.floor(secs % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    private updatePlayerUI(track: TrackData) {
        this.nowPlayingTrack = track;
        this.miniPlayer.classList.remove('hidden');

        this.miniTitle.innerText = track.title;
        this.miniArtist.innerText = track.artist;
        this.fullTitle.innerText = track.title;
        this.fullArtist.innerText = track.artist;

        const constructArt = (blob?: Blob) => {
            if (blob) {
                return `<img src="${URL.createObjectURL(blob)}" alt="Album Art" />`;
            }
            return `<span class="material-symbols-rounded" style="color: var(--md-sys-color-on-surface-variant); font-size: 32px;">music_note</span>`;
        };

        this.miniArt.innerHTML = constructArt(track.hasArtwork ? track.artworkBlob : undefined);
        this.fullArt.innerHTML = constructArt(track.hasArtwork ? track.artworkBlob : undefined);

        // Crisp M3 Dynamic Color Injection without vague gradients
        if (track.dominantColor) {
            document.documentElement.style.setProperty('--accent-color', track.dominantColor);
        } else {
            document.documentElement.style.setProperty('--accent-color', '#a8c7fa');
        }
        // Active Track Highlight
        document.querySelectorAll('.m3-list-item').forEach(el => el.classList.remove('active-track'));
        const activeItem = document.querySelector(`.m3-list-item[data-trackid="${track.id}"]`);
        if (activeItem) activeItem.classList.add('active-track');

        // Ambient glow
        document.body.classList.add('has-track');
    }

    private async playTrack(index: number, tracks: TrackData[]) {
        this.currentPlaylistTracks = tracks;
        this.currentTrackIndex = index;
        const track = tracks[index];
        const nextTrack = this.getUpcomingTrack();

        await prismPlayer.playTrack(track, nextTrack);
        incrementPlayCount(track.id); // fire-and-forget
    }

    private getUpcomingTrack(): TrackData | undefined {
        if (this.userQueue.length > 0) return this.userQueue[0];
        if (this.currentPlaylistTracks.length === 0) return undefined;

        let nextIdx = this.currentTrackIndex + 1;
        if (this.isShuffle) {
            // Pick a random track but avoid the current one if possible
            let randIdx = Math.floor(Math.random() * this.currentPlaylistTracks.length);
            if (randIdx === this.currentTrackIndex && this.currentPlaylistTracks.length > 1) {
                randIdx = (randIdx + 1) % this.currentPlaylistTracks.length;
            }
            return this.currentPlaylistTracks[randIdx];
        }
        
        if (nextIdx < this.currentPlaylistTracks.length) return this.currentPlaylistTracks[nextIdx];
        if (this.isRepeat) return this.currentPlaylistTracks[0];
        return undefined;
    }

    private updatePreload() {
        if (prismPlayer.getIsPlaying() || prismPlayer.getCurrentTrack()) {
            const upcoming = this.getUpcomingTrack();
            if (upcoming) prismPlayer.preloadNext(upcoming);
        }
    }

    private playNext() {
        // 1. Drain user queue first (Spotify-style "Next in Queue")
        if (this.userQueue.length > 0) {
            const track = this.userQueue.shift()!;
            const nextTrackToPreload = this.getUpcomingTrack();
            
            // Play it directly — don't search playlist (the same song could be in both)
            prismPlayer.playTrack(track, nextTrackToPreload);
            incrementPlayCount(track.id);
            // Don't change currentTrackIndex — so playlist resumes from the right spot after
            return;
        }

        // 2. Then continue from playlist
        if (this.currentPlaylistTracks.length === 0) return;
        let nextIdx = this.currentTrackIndex + 1;

        if (this.isShuffle) {
            nextIdx = Math.floor(Math.random() * this.currentPlaylistTracks.length);
            if (nextIdx === this.currentTrackIndex && this.currentPlaylistTracks.length > 1) {
                nextIdx = (nextIdx + 1) % this.currentPlaylistTracks.length;
            }
        } else if (nextIdx >= this.currentPlaylistTracks.length) {
            if (this.isRepeat) nextIdx = 0;
            else return;
        }
        this.playTrack(nextIdx, this.currentPlaylistTracks);
    }

    private playPrev() {
        if (this.currentPlaylistTracks.length === 0) return;
        let prevIdx = this.currentTrackIndex - 1;
        if (prevIdx < 0) prevIdx = this.currentPlaylistTracks.length - 1;
        this.playTrack(prevIdx, this.currentPlaylistTracks);
    }

    // --- Views ---

    public async renderLibrary() {
        this.topTitle.innerText = 'Music Library';
        document.getElementById('btn-library')!.style.opacity = '0';

        const playlists = await libraryManager.getAllPlaylists();

        if (playlists.length === 0) {
            this.viewLayer.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">library_music</span>
          <h2>Your Library is Empty</h2>
          <p>Add a local folder to start listening to your music offline.</p>
          <button class="extended-fab" id="btn-add-folder" style="margin-top: 16px;">
            <span class="material-symbols-rounded">folder_open</span> Add Music Folder
          </button>
        </div>
      `;
            document.getElementById('btn-add-folder')?.addEventListener('click', () => libraryManager.showDirectoryPicker());
            return;
        }

        let html = `
      <div class="library-section">
        <div class="library-section-title">Your Playlists</div>
        <div class="grid-container">
    `;

        playlists.forEach(p => {
            html += `
          <div class="m3-card" data-id="${p.id}" data-name="${p.name}">
            <div class="m3-card-art playlist-grid-art" data-playlist-id="${p.id}">
                <span class="material-symbols-rounded">folder</span>
            </div>
            <div class="m3-card-info">
                <h3 class="text-ellipsis">${p.name}</h3>
                <p>${p.trackIds.length} tracks</p>
            </div>
          </div>
        `;
        });

        html += `</div></div>`;

        // Floating add button
        html += `<button class="fab-fixed" id="btn-add-folder-fab"><span class="material-symbols-rounded">add</span></button>`;

        this.viewLayer.innerHTML = html;

        document.getElementById('btn-add-folder-fab')?.addEventListener('click', () => libraryManager.showDirectoryPicker());

        this.attachLazyPlaylistGrid();

        const cards = this.viewLayer.querySelectorAll('.m3-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id')!;
                const name = card.getAttribute('data-name')!;
                this.topTitle.innerText = name;
                document.getElementById('btn-library')!.style.opacity = '1';
                history.pushState({ view: 'playlist', id }, '', '#playlist');
                this.renderPlaylist(id);
            });
        });
    }

    public async renderPlaylist(playlistId: string) {
        const tracks = await libraryManager.getTracksForPlaylist(playlistId);
        const playCounts = await getPlayCounts();

        let html = `
        <div class="playlist-header">
           <button class="fab-play fab-play-huge" id="btn-playlist-play" style="width: 56px; height: 56px; border-radius: 16px;">
              <span class="material-symbols-rounded" style="font-size: 32px">play_arrow</span>
           </button>
           <button class="extended-fab" id="btn-playlist-shuffle" style="padding: 12px 20px;">
              <span class="material-symbols-rounded">shuffle</span> Shuffle
           </button>
        </div>
        <div class="sort-chip-bar">
           <button class="sort-chip ${this.currentSortMode.startsWith('title') ? 'active' : ''}" data-sort="title">
              Title <span class="material-symbols-rounded" style="font-size:16px;">${this.currentSortMode === 'title-desc' ? 'arrow_downward' : 'arrow_upward'}</span>
           </button>
           <button class="sort-chip ${this.currentSortMode.startsWith('artist') ? 'active' : ''}" data-sort="artist">
              Artist <span class="material-symbols-rounded" style="font-size:16px;">${this.currentSortMode === 'artist-desc' ? 'arrow_downward' : 'arrow_upward'}</span>
           </button>
            <button class="sort-chip ${this.currentSortMode.startsWith('duration') ? 'active' : ''}" data-sort="duration">
               Duration <span class="material-symbols-rounded" style="font-size:16px;">${this.currentSortMode === 'duration-desc' ? 'arrow_downward' : 'arrow_upward'}</span>
            </button>
            <button class="sort-chip ${this.currentSortMode.startsWith('date') ? 'active' : ''}" data-sort="date">
               Date Added <span class="material-symbols-rounded" style="font-size:16px;">${this.currentSortMode === 'date-desc' ? 'arrow_downward' : 'arrow_upward'}</span>
            </button>
         </div>
        <div style="display: flex; flex-direction: column;">
      `;

        // Sort tracks
        const sortedTracks = [...tracks];
        if (this.currentSortMode === 'title-asc') sortedTracks.sort((a, b) => a.title.localeCompare(b.title));
        else if (this.currentSortMode === 'title-desc') sortedTracks.sort((a, b) => b.title.localeCompare(a.title));
        else if (this.currentSortMode === 'artist-asc') sortedTracks.sort((a, b) => a.artist.localeCompare(b.artist));
        else if (this.currentSortMode === 'artist-desc') sortedTracks.sort((a, b) => b.artist.localeCompare(a.artist));
        else if (this.currentSortMode === 'duration-asc') sortedTracks.sort((a, b) => (a.duration || 0) - (b.duration || 0));
        else if (this.currentSortMode === 'duration-desc') sortedTracks.sort((a, b) => (b.duration || 0) - (a.duration || 0));
        else if (this.currentSortMode === 'date-asc') sortedTracks.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
        else if (this.currentSortMode === 'date-desc') sortedTracks.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));

        sortedTracks.forEach((track, idx) => {
            html += `
             <div class="m3-list-item" data-idx="${idx}" data-trackid="${track.id}">
                 <div class="m3-list-art lazy-art" data-trackid="${track.id}">
                    <span class="material-symbols-rounded fallback-icon" style="color: var(--md-sys-color-on-surface-variant);">music_note</span>
                 </div>
                 <div class="m3-list-text">
                     <div class="m3-list-title text-ellipsis">${track.title}</div>
                     <div class="m3-list-subtitle text-ellipsis">${track.artist}${localStorage.getItem('prism-playcounts') !== 'false' && playCounts.get(track.id) ? ` • ${playCounts.get(track.id)} play${playCounts.get(track.id)! > 1 ? 's' : ''}` : ''}</div>
                 </div>
                 <div class="m3-list-actions">
                     <button class="icon-btn btn-add-queue" data-idx="${idx}">
                        <span class="material-symbols-rounded">queue_music</span>
                     </button>
                     <button class="icon-btn btn-delete-track" data-trackid="${track.id}" data-idx="${idx}">
                        <span class="material-symbols-rounded">delete</span>
                     </button>
                 </div>
             </div>
          `;
        });
        html += `</div>`;
        this.viewLayer.innerHTML = html;

        // Sort chip handlers
        this.viewLayer.querySelectorAll('.sort-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const field = chip.getAttribute('data-sort')!;
                if (this.currentSortMode === `${field}-asc`) {
                    this.currentSortMode = `${field}-desc`;
                } else if (this.currentSortMode === `${field}-desc`) {
                    this.currentSortMode = 'default';
                } else {
                    this.currentSortMode = `${field}-asc`;
                }
                this.renderPlaylist(playlistId);
            });
        });

        // Header Actions
        const btnPlaylistShuffle = document.getElementById('btn-playlist-shuffle');
        if (btnPlaylistShuffle) {
            btnPlaylistShuffle.classList.toggle('active', this.isShuffle);
        }

        document.getElementById('btn-playlist-play')?.addEventListener('click', () => {
            if (tracks.length > 0) {
                if (navigator.vibrate) navigator.vibrate(8);
                // Always toggle if this playlist is already active
                if (this.currentPlaylistId === playlistId && this.currentTrackIndex >= 0) {
                    prismPlayer.togglePlay();
                } else {
                    this.isShuffle = false;
                    this.btnShuffle.classList.remove('active');
                    if (btnPlaylistShuffle) btnPlaylistShuffle.classList.remove('active');
                    this.currentPlaylistId = playlistId;
                    this.playTrack(0, sortedTracks);
                }
            }
        });

        btnPlaylistShuffle?.addEventListener('click', () => {
            if (tracks.length > 0) {
                this.isShuffle = !this.isShuffle;
                this.btnShuffle.classList.toggle('active', this.isShuffle);
                btnPlaylistShuffle.classList.toggle('active', this.isShuffle);

                if (this.isShuffle && this.currentPlaylistId !== playlistId) {
                    this.currentPlaylistId = playlistId;
                    const randIdx = Math.floor(Math.random() * sortedTracks.length);
                    this.playTrack(randIdx, sortedTracks);
                }
            }
        });

        // Track clicks — only fires if the click target is NOT inside an action button
        const rows = this.viewLayer.querySelectorAll('.m3-list-item');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (target.closest('.btn-delete-track') || target.closest('.btn-add-queue')) {
                    return;
                }
                this.currentPlaylistId = playlistId;
                const idx = parseInt(row.getAttribute('data-idx')!, 10);
                this.playTrack(idx, sortedTracks);
            });
        });

        // Queue — use capture phase so this fires FIRST, before the row handler
        this.viewLayer.querySelectorAll('.btn-add-queue').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                const idx = parseInt(btn.getAttribute('data-idx')!, 10);
                this.userQueue.push(sortedTracks[idx]);
                this.updatePreload(); // ensure new queue item is preloaded for gapless
                if (navigator.vibrate) navigator.vibrate(25);
                if (this.queueOverlay.classList.contains('open')) {
                    this.renderQueue();
                }
                btn.innerHTML = `<span class="material-symbols-rounded" style="color: var(--accent-color)">check</span>`;
                setTimeout(() => btn.innerHTML = `<span class="material-symbols-rounded">queue_music</span>`, 1000);
            }, true);
        });

        // Delete — also capture phase
        this.viewLayer.querySelectorAll('.btn-delete-track').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                const trackId = btn.getAttribute('data-trackid')!;
                if (confirm('Delete this track from your library?')) {
                    await deleteTrack(trackId, playlistId);
                    this.renderPlaylist(playlistId);
                }
            });
        });

        this.attachLazyArtwork(tracks);
        this.attachLongPressDelete();
    }

    private attachLongPressDelete() {
        const items = this.viewLayer.querySelectorAll('.m3-list-item');
        items.forEach(item => {
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent native context menu
                if (navigator.vibrate) navigator.vibrate(30);
                item.classList.toggle('show-delete');
            });
        });
    }

    private attachLazyArtwork(tracks: TrackData[]) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target as HTMLElement;
                    const trackId = target.getAttribute('data-trackid');
                    const track = tracks.find(t => t.id === trackId);

                    if (track && track.hasArtwork && track.artworkBlob) {
                        const img = document.createElement('img');
                        img.onload = () => {
                            const existingIcon = target.querySelector('.fallback-icon');
                            if (existingIcon) existingIcon.remove();
                            target.appendChild(img);
                        };
                        img.src = URL.createObjectURL(track.artworkBlob);
                    }
                    obs.unobserve(target);
                }
            });
        }, { root: this.viewLayer, rootMargin: '0px 0px 200px 0px' });

        const arts = this.viewLayer.querySelectorAll('.lazy-art');
        arts.forEach(art => observer.observe(art));
    }

    private attachLazyPlaylistGrid() {
        const grids = this.viewLayer.querySelectorAll('.playlist-grid-art');
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(async entry => {
                if (entry.isIntersecting) {
                    const target = entry.target as HTMLElement;
                    const pid = target.getAttribute('data-playlist-id');
                    if (pid) {
                        try {
                            const tracks = await libraryManager.getTracksForPlaylist(pid);
                            const artTracks = tracks.filter(t => t.hasArtwork && t.artworkBlob).slice(0, 4);
                            
                            if (artTracks.length > 0) {
                                target.innerHTML = ''; // clear folder icon
                                target.style.display = 'grid';
                                target.style.gridTemplateColumns = artTracks.length > 1 ? '1fr 1fr' : '1fr';
                                target.style.gridTemplateRows = artTracks.length > 1 ? '1fr 1fr' : '1fr';
                                target.style.gap = '2px';
                                target.style.padding = '0';
                                target.style.overflow = 'hidden';
                                target.style.backgroundColor = 'transparent';
                                
                                artTracks.forEach(t => {
                                    const img = document.createElement('img');
                                    img.src = URL.createObjectURL(t.artworkBlob!);
                                    img.style.width = '100%';
                                    img.style.height = '100%';
                                    img.style.objectFit = 'cover';
                                    target.appendChild(img);
                                });
                                
                                // Fill remaining with solid color to keep grid structure
                                if (artTracks.length > 1 && artTracks.length < 4) {
                                    for(let i = artTracks.length; i < 4; i++) {
                                        const div = document.createElement('div');
                                        div.style.backgroundColor = 'var(--md-sys-color-surface-container-high)';
                                        div.style.width = '100%';
                                        div.style.height = '100%';
                                        target.appendChild(div);
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Failed to load playlist grid', e);
                        }
                    }
                    obs.unobserve(target);
                }
            });
        }, { root: this.viewLayer, rootMargin: '0px 0px 200px 0px' });
        
        grids.forEach(g => observer.observe(g));
    }

    // --- Queue ---
    private renderQueue() {
        if (this.sortableUserQueue) {
            this.sortableUserQueue.destroy();
            this.sortableUserQueue = null;
        }
        if (this.sortablePlaylistQueue) {
            this.sortablePlaylistQueue.destroy();
            this.sortablePlaylistQueue = null;
        }

        const hasUserQueue = this.userQueue.length > 0;
        const hasPlaylistTracks = this.currentPlaylistTracks.length > 0;

        if (!hasUserQueue && !hasPlaylistTracks) {
            this.queueList.innerHTML = `<div style="text-align:center; margin-top:40px; color:var(--md-sys-color-on-surface-variant);">No upcoming tracks</div>`;
            return;
        }

        let html = '';

        // --- Section 1: Now Playing ---
        if (this.nowPlayingTrack) {
            const current = this.nowPlayingTrack;
            html += `
            <div class="library-section-title" style="margin-top:8px;">Now Playing</div>
            <div class="queue-item active">
                <div style="flex:1; overflow:hidden; display:flex; flex-direction:column;" class="text-ellipsis">
                    <span style="font-size:0.9375rem; font-weight:600; color:var(--accent-color);">${current.title}</span>
                    <span style="font-size:0.75rem; font-weight:300; color:var(--md-sys-color-on-surface-variant);">${current.artist}</span>
                </div>
                <span class="material-symbols-rounded" style="color:var(--accent-color);">volume_up</span>
            </div>
          `;
        }

        // --- Section 2: Next in Queue (User-added) ---
        if (hasUserQueue) {
            html += `<div class="library-section-title" style="margin-top:20px;">Next in Queue</div>`;
            html += `<div id="sortable-user-queue" style="display:flex; flex-direction:column;">`;
            this.userQueue.forEach((track, idx) => {
                html += `
                <div class="queue-item" data-uq-idx="${idx}" style="cursor: grab;">
                    <div style="flex:1; overflow:hidden; display:flex; flex-direction:column;" class="text-ellipsis">
                        <span style="font-size:0.9375rem; font-weight:500; color:var(--md-sys-color-on-background);">${track.title}</span>
                        <span style="font-size:0.75rem; font-weight:300; color:var(--md-sys-color-on-surface-variant);">${track.artist}</span>
                    </div>
                    <div class="queue-item-actions">
                       <button class="icon-btn btn-remove-queue" data-uq-idx="${idx}" style="width: 32px; height: 32px;">
                          <span class="material-symbols-rounded" style="color:var(--md-sys-color-on-surface-variant); font-size: 20px;">close</span>
                       </button>
                       <span class="material-symbols-rounded drag-handle" style="color:var(--md-sys-color-on-surface-variant); cursor: grab; padding-left: 4px;">drag_handle</span>
                    </div>
                </div>
              `;
            });
            html += `</div>`;
        }

        // --- Section 3: Next from <Playlist> ---
        if (hasPlaylistTracks && this.currentTrackIndex >= 0) {
            const upcoming = this.currentPlaylistTracks.slice(this.currentTrackIndex + 1);
            if (upcoming.length > 0) {
                html += `<div class="library-section-title" style="margin-top:20px;">Next from Playlist</div>`;
                html += `<div id="sortable-playlist-queue" style="display:flex; flex-direction:column;">`;
                upcoming.forEach((track, idx) => {
                    html += `
                    <div class="queue-item" data-pq-idx="${idx}">
                        <div style="flex:1; overflow:hidden; display:flex; flex-direction:column;" class="text-ellipsis">
                            <span style="font-size:0.9375rem; font-weight:400; color:var(--md-sys-color-on-background);">${track.title}</span>
                            <span style="font-size:0.75rem; font-weight:300; color:var(--md-sys-color-on-surface-variant);">${track.artist}</span>
                        </div>
                        <div class="queue-item-actions">
                           <span class="material-symbols-rounded drag-handle" style="color:var(--md-sys-color-on-surface-variant); cursor: grab;">drag_handle</span>
                        </div>
                    </div>
                  `;
                });
                html += `</div>`;
            }
        }

        this.queueList.innerHTML = html;

        // Bind drag on user queue only
        const el = document.getElementById('sortable-user-queue');
        if (el) {
            this.sortableUserQueue = Sortable.create(el, {
                animation: 150,
                handle: '.drag-handle',
                delay: 50,
                delayOnTouchOnly: true,
                onEnd: (evt) => {
                    if (navigator.vibrate) navigator.vibrate([25]);
                    if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
                        const item = this.userQueue.splice(evt.oldIndex, 1)[0];
                        this.userQueue.splice(evt.newIndex, 0, item);
                        this.updatePreload();
                        this.renderQueue();
                    }
                }
            });
        }

        // Bind drag on playlist queue
        const playlistEl = document.getElementById('sortable-playlist-queue');
        if (playlistEl) {
            this.sortablePlaylistQueue = Sortable.create(playlistEl, {
                animation: 150,
                handle: '.drag-handle',
                delay: 50,
                delayOnTouchOnly: true,
                onEnd: (evt) => {
                    if (navigator.vibrate) navigator.vibrate([25]);
                    if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
                        const realOldIdx = evt.oldIndex + this.currentTrackIndex + 1;
                        const realNewIdx = evt.newIndex + this.currentTrackIndex + 1;
                        
                        const item = this.currentPlaylistTracks.splice(realOldIdx, 1)[0];
                        this.currentPlaylistTracks.splice(realNewIdx, 0, item);
                        
                        this.updatePreload();
                        this.renderQueue();
                    }
                }
            });
        }

        // Bind remove queue item
        this.queueList.querySelectorAll('.btn-remove-queue').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (navigator.vibrate) navigator.vibrate([25]);
                const idx = parseInt(btn.getAttribute('data-uq-idx')!, 10);
                this.userQueue.splice(idx, 1);
                this.updatePreload();
                this.renderQueue();
            });
        });
    }



    // --- Settings UI API ---
    public updateVinylState(playing: boolean) {
        if (localStorage.getItem('prism-vinyl') !== 'false') {
            this.fullArt.classList.toggle('spinning', playing);
        } else {
            this.fullArt.classList.remove('spinning');
        }
    }

    public refreshCurrentPlaylist() {
        if (this.currentPlaylistId) {
            this.renderPlaylist(this.currentPlaylistId);
        }
    }

}

export const uiManager = new UIManager();
