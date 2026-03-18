import { libraryManager } from '../storage/Library';
import { prismPlayer } from '../audio/Player';
import { type TrackData } from '../storage/db';
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
  private isShuffle: boolean = false;
  private isRepeat: boolean = false;
  private isScrubbing: boolean = false;
  private sortableInstance: Sortable | null = null;

  constructor() {}

  public init() {
    this.viewLayer = document.getElementById('view-layer')!;
    this.topTitle = document.getElementById('top-title')!;
    
    // Screens
    this.miniPlayer = document.getElementById('mini-player')!;
    this.fullPlayer= document.getElementById('full-player')!;
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
  }

  private bindEvents() {
    // Nav
    document.getElementById('btn-library')?.addEventListener('click', () => {
        this.renderLibrary();
    });

    // Settings Toggle
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        this.settingsOverlay.classList.add('open');
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
        this.settingsOverlay.classList.remove('open');
    });
    document.getElementById('btn-clear-db')?.addEventListener('click', async () => {
        if(confirm("Are you sure you want to clear all Prism library data?")) {
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
    });
    
    document.getElementById('btn-close-full')?.addEventListener('click', () => {
        this.fullPlayer.classList.remove('open');
    });

    // Audio Hooks
    prismPlayer.onPlayStateChange = (playing) => {
      const icon = playing ? 'pause' : 'play_arrow';
      this.miniPlayPause.innerHTML = `<span class="material-symbols-rounded">${icon}</span>`;
      this.fullPlayPause.innerHTML = `<span class="material-symbols-rounded">${icon}</span>`;
      
      const playlistPlayBtn = document.getElementById('btn-playlist-play');
      if (playlistPlayBtn) playlistPlayBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 32px">${icon}</span>`;
    };

    prismPlayer.onRequestSkipNext = () => this.playNext();
    prismPlayer.onRequestSkipPrev = () => this.playPrev();

    // Queue Overlay
    document.getElementById('btn-open-queue')?.addEventListener('click', () => {
        this.renderQueue();
        this.queueOverlay.classList.add('open');
    });
    document.getElementById('btn-close-queue')?.addEventListener('click', () => {
        this.queueOverlay.classList.remove('open');
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
        if (navigator.vibrate) navigator.vibrate(15);
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
        if (navigator.vibrate) navigator.vibrate(5);
    });

    this.progressSlider.addEventListener('change', () => {
        this.isScrubbing = false;
        const pct = parseFloat(this.progressSlider.value) / 100;
        prismPlayer.seek(pct);
    });

    // Shuffle & Repeat
    this.btnShuffle.addEventListener('click', () => {
        this.isShuffle = !this.isShuffle;
        this.btnShuffle.classList.toggle('active', this.isShuffle);
    });
    this.btnRepeat.addEventListener('click', () => {
        this.isRepeat = !this.isRepeat;
        this.btnRepeat.classList.toggle('active', this.isRepeat);
        this.btnRepeat.innerHTML = `<span class="material-symbols-rounded">${this.isRepeat ? 'repeat_one' : 'repeat'}</span>`;
    });
  }

  private formatTime(secs: number): string {
    const min = Math.floor(secs / 60);
    const sec = Math.floor(secs % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  private updatePlayerUI(track: TrackData) {
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
    const nextTrack = tracks[index + 1];

    await prismPlayer.playTrack(track, nextTrack);
  }

  private playNext() {
      // 1. Drain user queue first (Spotify-style "Next in Queue")
      if (this.userQueue.length > 0) {
          const nextTrack = this.userQueue.shift()!;
          // Find its index in playlist if it exists, otherwise just play it directly
          const foundIdx = this.currentPlaylistTracks.findIndex(t => t.id === nextTrack.id);
          if (foundIdx >= 0) {
              this.playTrack(foundIdx, this.currentPlaylistTracks);
          } else {
              // Track isn't in playlist (edge case), play it standalone
              prismPlayer.playTrack(nextTrack);
              this.updatePlayerUI(nextTrack);
          }
          return;
      }

      // 2. Then continue from playlist
      if (this.currentPlaylistTracks.length === 0) return;
      let nextIdx = this.currentTrackIndex + 1;

      if (this.isShuffle) {
          nextIdx = Math.floor(Math.random() * this.currentPlaylistTracks.length);
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
            <div class="m3-card-art">
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

    const cards = this.viewLayer.querySelectorAll('.m3-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id')!;
            const name = card.getAttribute('data-name')!;
            this.topTitle.innerText = name;
            document.getElementById('btn-library')!.style.opacity = '1'; 
            this.renderPlaylist(id);
        });
    });
  }

  public async renderPlaylist(playlistId: string) {
      const tracks = await libraryManager.getTracksForPlaylist(playlistId);
      
      let html = `
        <div class="playlist-header">
           <button class="fab-play fab-play-huge" id="btn-playlist-play" style="width: 56px; height: 56px; border-radius: 16px;">
              <span class="material-symbols-rounded" style="font-size: 32px">play_arrow</span>
           </button>
           <button class="extended-fab" id="btn-playlist-shuffle" style="padding: 12px 20px;">
              <span class="material-symbols-rounded">shuffle</span> Shuffle
           </button>
        </div>
        <div style="display: flex; flex-direction: column;">
      `;

      tracks.forEach((track, idx) => {
          html += `
             <div class="m3-list-item" data-idx="${idx}" data-trackid="${track.id}">
                 <div class="m3-list-art lazy-art" data-trackid="${track.id}">
                    <span class="material-symbols-rounded fallback-icon" style="color: var(--md-sys-color-on-surface-variant);">music_note</span>
                 </div>
                 <div class="m3-list-text">
                     <div class="m3-list-title text-ellipsis">${track.title}</div>
                     <div class="m3-list-subtitle text-ellipsis">${track.artist}</div>
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

      // Header Actions
      const btnPlaylistShuffle = document.getElementById('btn-playlist-shuffle');
      if (btnPlaylistShuffle) {
          btnPlaylistShuffle.classList.toggle('active', this.isShuffle);
      }

      document.getElementById('btn-playlist-play')?.addEventListener('click', () => {
          if (tracks.length > 0) {
              // Always toggle if this playlist is already active
              if (this.currentPlaylistId === playlistId && this.currentTrackIndex >= 0) {
                  prismPlayer.togglePlay();
              } else {
                  this.isShuffle = false;
                  this.btnShuffle.classList.remove('active');
                  if (btnPlaylistShuffle) btnPlaylistShuffle.classList.remove('active');
                  this.currentPlaylistId = playlistId;
                  this.playTrack(0, tracks);
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
                  const randIdx = Math.floor(Math.random() * tracks.length);
                  this.playTrack(randIdx, tracks);
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
              this.playTrack(idx, tracks);
          });
      });

      // Queue — use capture phase so this fires FIRST, before the row handler
      this.viewLayer.querySelectorAll('.btn-add-queue').forEach(btn => {
          btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopImmediatePropagation();
              const idx = parseInt(btn.getAttribute('data-idx')!, 10);
              this.userQueue.push(tracks[idx]);
              if (navigator.vibrate) navigator.vibrate(10);
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
                  const dbReq = indexedDB.open('prism-audio-db');
                  dbReq.onsuccess = (ev) => {
                      const db = (ev.target as IDBOpenDBRequest).result;
                      const tx = db.transaction(['tracks', 'playlists'], 'readwrite');
                      tx.objectStore('tracks').delete(trackId);
                      
                      // Remove from playlists
                      const pTx = tx.objectStore('playlists');
                      const pReq = pTx.get(playlistId);
                      pReq.onsuccess = () => {
                          if (pReq.result) {
                              const newTrackIds = pReq.result.trackIds.filter((id: string) => id !== trackId);
                              pReq.result.trackIds = newTrackIds;
                              pTx.put(pReq.result);
                          }
                      };
                      
                      tx.oncomplete = () => {
                          this.renderPlaylist(playlistId); // Refresh UI
                      };
                  };
              }
          });
      });

      this.attachLazyArtwork(tracks);
      this.attachLongPressDelete();
  }

  private attachLongPressDelete() {
      const items = this.viewLayer.querySelectorAll('.m3-list-item');
      items.forEach(item => {
          let timer: number | null = null;
          item.addEventListener('pointerdown', () => {
              timer = window.setTimeout(() => {
                  if (navigator.vibrate) navigator.vibrate(20);
                  item.classList.toggle('show-delete');
              }, 500);
          });
          item.addEventListener('pointerup', () => { if (timer) clearTimeout(timer); });
          item.addEventListener('pointercancel', () => { if (timer) clearTimeout(timer); });
          item.addEventListener('pointermove', () => { if (timer) clearTimeout(timer); });
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

  // --- Queue ---
  private renderQueue() {
      if (this.sortableInstance) {
          this.sortableInstance.destroy();
          this.sortableInstance = null;
      }

      const hasUserQueue = this.userQueue.length > 0;
      const hasPlaylistTracks = this.currentPlaylistTracks.length > 0;

      if (!hasUserQueue && !hasPlaylistTracks) {
          this.queueList.innerHTML = `<div style="text-align:center; margin-top:40px; color:var(--md-sys-color-on-surface-variant);">No upcoming tracks</div>`;
          return;
      }

      let html = '';

      // --- Section 1: Now Playing ---
      if (this.currentTrackIndex >= 0 && this.currentTrackIndex < this.currentPlaylistTracks.length) {
          const current = this.currentPlaylistTracks[this.currentTrackIndex];
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
                       <span class="material-symbols-rounded" style="color:var(--md-sys-color-on-surface-variant); cursor: grab;">drag_handle</span>
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
              upcoming.forEach(track => {
                  html += `
                    <div class="queue-item">
                        <div style="flex:1; overflow:hidden; display:flex; flex-direction:column;" class="text-ellipsis">
                            <span style="font-size:0.9375rem; font-weight:400; color:var(--md-sys-color-on-background);">${track.title}</span>
                            <span style="font-size:0.75rem; font-weight:300; color:var(--md-sys-color-on-surface-variant);">${track.artist}</span>
                        </div>
                    </div>
                  `;
              });
          }
      }

      this.queueList.innerHTML = html;

      // Bind drag on user queue only
      const el = document.getElementById('sortable-user-queue');
      if (el) {
          this.sortableInstance = Sortable.create(el, {
              animation: 150,
              handle: '.queue-item',
              onEnd: (evt) => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
                      const item = this.userQueue.splice(evt.oldIndex, 1)[0];
                      this.userQueue.splice(evt.newIndex, 0, item);
                      this.renderQueue();
                  }
              }
          });
      }
  }

}

export const uiManager = new UIManager();
