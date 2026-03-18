import { libraryManager } from '../storage/Library';
import { prismPlayer } from '../audio/Player';
import { type TrackData } from '../storage/db';

export class UIManager {
  private viewLayer!: HTMLElement;
  private ambientOverlay!: HTMLElement;
  
  // Element Refs
  private topTitle!: HTMLElement;
  private miniPlayer!: HTMLElement;
  private fullPlayer!: HTMLElement;
  
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
  
  private progressWrapper!: HTMLElement;
  private progressFill!: HTMLElement;
  private timeCurrent!: HTMLElement;
  private timeTotal!: HTMLElement;

  private btnShuffle!: HTMLButtonElement;
  private btnRepeat!: HTMLButtonElement;

  // State
  private currentPlaylistTracks: TrackData[] = [];
  private currentTrackIndex: number = -1;
  private isShuffle: boolean = false;
  private isRepeat: boolean = false;

  constructor() {}

  public init() {
    this.viewLayer = document.getElementById('view-layer')!;
    this.ambientOverlay = document.getElementById('ambient-overlay')!;
    this.topTitle = document.getElementById('top-title')!;
    
    // Players
    this.miniPlayer = document.getElementById('mini-player')!;
    this.fullPlayer= document.getElementById('full-player')!;

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
    
    this.progressWrapper = document.getElementById('full-progress-wrapper')!;
    this.progressFill = document.getElementById('full-progress-fill')!;
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

    document.getElementById('btn-settings')?.addEventListener('click', () => {
         alert("Settings view placeholder (Material 3 implemented).");
    });

    libraryManager.onLibraryUpdated = () => this.renderLibrary();

    // Player Overlay Toggles
    this.miniPlayer.addEventListener('click', (e) => {
        // don't open full player if clicking play btn
        if ((e.target as HTMLElement).closest('#mini-play-pause')) return;
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
    };

    prismPlayer.onTrackChange = (track) => {
      this.updatePlayerUI(track);
    };

    prismPlayer.onTimeUpdate = (current, total) => {
      this.timeCurrent.innerText = this.formatTime(current);
      if (total && !isNaN(total) && total > 0) {
        this.timeTotal.innerText = this.formatTime(total);
        const pct = (current / total) * 100;
        this.progressFill.style.width = `${pct}%`;
      }
    };

    // Controls
    const togglePlay = () => prismPlayer.togglePlay();
    this.miniPlayPause.addEventListener('click', togglePlay);
    this.fullPlayPause.addEventListener('click', togglePlay);

    const skipNext = () => prismPlayer.requestSkipNext(async () => this.playNext());
    const skipPrev = () => prismPlayer.requestSkipNext(async () => this.playPrev());
    
    this.fullNext.addEventListener('click', skipNext);
    this.fullPrev.addEventListener('click', skipPrev);

    this.progressWrapper.addEventListener('click', (e) => {
      const rect = this.progressWrapper.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
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
        // Change icon to repeat_one for demonstration if wanted
        this.btnRepeat.innerHTML = `<span class="material-symbols-rounded">${this.isRepeat ? 'repeat_one' : 'repeat'}</span>`;
    });
  }

  private formatTime(secs: number): string {
    const min = Math.floor(secs / 60);
    const sec = Math.floor(secs % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  private updatePlayerUI(track: TrackData) {
     this.miniPlayer.style.display = 'flex'; // Show mini player when playing starts

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

     if (track.dominantColor) {
         document.documentElement.style.setProperty('--accent-color', track.dominantColor);
         this.ambientOverlay.style.background = `radial-gradient(circle at top right, ${track.dominantColor} 0%, transparent 80%)`;
     } else {
         document.documentElement.style.setProperty('--accent-color', '#a8c7fa'); // fallback
         this.ambientOverlay.style.background = `radial-gradient(circle at top right, #a8c7fa 0%, transparent 80%)`;
     }
  }

  private async playTrack(index: number, tracks: TrackData[]) {
    this.currentPlaylistTracks = tracks;
    this.currentTrackIndex = index;
    const track = tracks[index];
    const nextTrack = tracks[index + 1];

    await prismPlayer.playTrack(track, nextTrack);
  }

  private playNext() {
      if (this.currentPlaylistTracks.length === 0) return;
      let nextIdx = this.currentTrackIndex + 1;

      if (this.isShuffle) {
          nextIdx = Math.floor(Math.random() * this.currentPlaylistTracks.length);
      } else if (nextIdx >= this.currentPlaylistTracks.length) {
          if (this.isRepeat) nextIdx = 0;
          else return; // end of list
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
    this.topTitle.innerText = 'Library';
    document.getElementById('btn-library')!.style.opacity = '0'; // hide back button

    const playlists = await libraryManager.getAllPlaylists();
    
    if (playlists.length === 0) {
      this.viewLayer.innerHTML = `
        <div style="text-align: center; color: var(--md-sys-color-on-surface-variant); margin-top: 20vh; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <span class="material-symbols-rounded" style="font-size: 64px; margin-bottom: 24px;">library_music</span>
          <h2 class="headline-large" style="color: var(--text-primary); margin-bottom: 8px;">Your Library</h2>
          <p style="margin-bottom: 32px;">Add a local folder to start listening.</p>
          <button class="extended-fab" id="btn-add-folder">
            <span class="material-symbols-rounded">folder_open</span> Add Music Folder
          </button>
        </div>
      `;
      document.getElementById('btn-add-folder')?.addEventListener('click', () => libraryManager.showDirectoryPicker());
      return;
    }

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="font-size: 1.5rem; font-weight: 500;">Device Playlists</h2>
        <button id="btn-add-folder-small" class="icon-btn" style="background: var(--md-sys-color-surface-container-highest);">
          <span class="material-symbols-rounded">add</span>
        </button>
      </div>
      <div class="grid-container">
    `;

    playlists.forEach(p => {
        html += `
          <div class="playlist-card" data-id="${p.id}" data-name="${p.name}">
            <div class="playlist-card-art">
                <span class="material-symbols-rounded" style="font-size:48px; color: var(--md-sys-color-on-surface-variant);">folder</span>
            </div>
            <div class="playlist-info">
                <h3 class="text-ellipsis">${p.name}</h3>
                <p>${p.trackIds.length} tracks</p>
            </div>
          </div>
        `;
    });

    html += `</div>`;
    
    this.viewLayer.innerHTML = html;
    
    document.getElementById('btn-add-folder-small')?.addEventListener('click', () => libraryManager.showDirectoryPicker());

    const cards = this.viewLayer.querySelectorAll('.playlist-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id')!;
            const name = card.getAttribute('data-name')!;
            // Set nav title natively using the user's explicit feedback
            this.topTitle.innerText = name;
            document.getElementById('btn-library')!.style.opacity = '1'; // show back button
            this.renderPlaylist(id);
        });
    });
  }

  public async renderPlaylist(playlistId: string) {
      const tracks = await libraryManager.getTracksForPlaylist(playlistId);
      
      let html = `<div class="track-list">`;

      tracks.forEach((track, idx) => {
          html += `
             <div class="track-row" data-idx="${idx}">
                 <div class="art-container lazy-art" data-trackid="${track.id}">
                    <span class="material-symbols-rounded fallback-icon" style="color: var(--md-sys-color-on-surface-variant);">music_note</span>
                 </div>
                 <div style="flex:1; overflow:hidden; display: flex; flex-direction: column; justify-content: center;">
                     <div class="text-ellipsis" style="font-size: 1rem; font-weight: 500; color: var(--md-sys-color-on-background); margin-bottom: 2px;">${track.title}</div>
                     <div class="text-ellipsis" style="font-size: 0.875rem; color: var(--md-sys-color-on-surface-variant);">${track.artist}</div>
                 </div>
                 <button class="icon-btn">
                    <span class="material-symbols-rounded">more_vert</span>
                 </button>
             </div>
          `;
      });
      html += `</div>`;
      this.viewLayer.innerHTML = html;

      // Track clicks
      const rows = this.viewLayer.querySelectorAll('.track-row');
      rows.forEach(row => {
          row.addEventListener('click', () => {
              const idx = parseInt(row.getAttribute('data-idx')!, 10);
              this.playTrack(idx, tracks);
          });
      });

      this.attachLazyArtwork(tracks);
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
}

export const uiManager = new UIManager();
