import { libraryManager } from '../storage/Library';
import { prismPlayer } from '../audio/Player';
import { type TrackData } from '../storage/db';

export class UIManager {
  private viewLayer: HTMLElement;
  private ambientOverlay: HTMLElement;
  
  // Controls
  private btnPlayPause: HTMLButtonElement;
  private btnPrev: HTMLButtonElement;
  private btnNext: HTMLButtonElement;
  private progressBar: HTMLElement;
  private progressFill: HTMLElement;
  private timeCurrent: HTMLElement;
  private timeTotal: HTMLElement;

  private currentPlaylistTracks: TrackData[] = [];
  private currentTrackIndex: number = -1;

  constructor() {
    this.viewLayer = document.getElementById('view-layer')!;
    this.ambientOverlay = document.getElementById('ambient-overlay')!;
    
    this.btnPlayPause = document.getElementById('btn-play-pause') as HTMLButtonElement;
    this.btnPrev = document.getElementById('btn-prev') as HTMLButtonElement;
    this.btnNext = document.getElementById('btn-next') as HTMLButtonElement;
    
    this.progressBar = document.getElementById('progress-bar')!;
    this.progressFill = document.getElementById('progress-fill')!;
    this.timeCurrent = document.getElementById('time-current')!;
    this.timeTotal = document.getElementById('time-total')!;

    this.bindEvents();
    this.renderLibrary();
  }

  private bindEvents() {
    // Top Bar
    document.getElementById('btn-library')?.addEventListener('click', () => this.renderLibrary());

    // Library Events
    libraryManager.onLibraryUpdated = () => this.renderLibrary();
    
    // Player Events
    prismPlayer.onPlayStateChange = (playing) => {
      this.btnPlayPause.innerHTML = `<span class="material-symbols-rounded">${playing ? 'pause' : 'play_arrow'}</span>`;
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

    this.btnPlayPause.addEventListener('click', () => prismPlayer.togglePlay());
    this.btnNext.addEventListener('click', () => {
        prismPlayer.requestSkipNext(async () => {
            this.playNext();
        });
    });
    this.btnPrev.addEventListener('click', () => {
        // Debounce not as critical for prev, but keeps it uniform
        prismPlayer.requestSkipNext(async () => {
             this.playPrev();
        });
    });

    this.progressBar.addEventListener('click', (e) => {
      const rect = this.progressBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      prismPlayer.seek(pct);
    });
  }

  private formatTime(secs: number): string {
    const min = Math.floor(secs / 60);
    const sec = Math.floor(secs % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  private updatePlayerUI(track:TrackData) {
     if (track.dominantColor) {
         // Update the lush gradient via CSS variables
         document.documentElement.style.setProperty('--md-sys-color-primary-container', track.dominantColor);
         this.ambientOverlay.style.background = `radial-gradient(circle at 50% 0%, ${track.dominantColor} 0%, transparent 70%)`;
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
      if (nextIdx >= this.currentPlaylistTracks.length) nextIdx = 0; // loop
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
    const playlists = await libraryManager.getAllPlaylists();
    
    if (playlists.length === 0) {
      this.viewLayer.innerHTML = `
        <div style="text-align: center; color: var(--md-sys-color-on-surface-variant); margin-top: 40px; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
          <span class="material-symbols-rounded" style="font-size: 48px; margin-bottom: 16px;">library_music</span>
          <p>No folders loaded.</p>
          <button id="btn-add-folder" style="margin-top:20px; padding: 12px 24px; border-radius: 24px; background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); border:none; font-weight:600; font-size: 16px; cursor: pointer;">Add Music Folder</button>
        </div>
      `;
      document.getElementById('btn-add-folder')?.addEventListener('click', () => libraryManager.showDirectoryPicker());
      return;
    }

    let html = `<div style="padding-bottom: 20px;">
        <h2 style="margin:0 0 16px 0; font-weight: 500;">Folders as Playlists</h2>
        <div style="display: flex; flex-direction:column; gap:8px;">
    `;

    playlists.forEach(p => {
        html += `
          <div class="playlist-card" data-id="${p.id}" style="
            background: var(--md-sys-color-surface-variant); 
            padding: 16px; 
            border-radius: 16px; 
            display:flex; 
            align-items:center; 
            gap:16px; 
            cursor:pointer;">
            <div style="width: 48px; height: 48px; background: var(--md-sys-color-surface); border-radius: 8px; display:flex; align-items:center; justify-content:center;">
                <span class="material-symbols-rounded">folder</span>
            </div>
            <div style="flex:1;">
                <div style="font-weight: 500; font-size: 1rem;">${p.name}</div>
                <div style="font-size: 0.8rem; color: var(--md-sys-color-on-surface-variant);">${p.trackIds.length} tracks</div>
            </div>
          </div>
        `;
    });

    html += `</div>
      <button id="btn-add-folder-small" style="margin-top:24px; padding: 8px 16px; border-radius: 20px; background: transparent; color: var(--md-sys-color-primary); border: 1px solid var(--md-sys-color-primary); font-weight:600; display:flex; align-items:center; gap:8px; cursor:pointer;">
        <span class="material-symbols-rounded" style="font-size:20px;">add</span> Add Another Folder
      </button>
    </div>`;
    
    this.viewLayer.innerHTML = html;
    
    document.getElementById('btn-add-folder-small')?.addEventListener('click', () => libraryManager.showDirectoryPicker());

    const cards = this.viewLayer.querySelectorAll('.playlist-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id')!;
            this.renderPlaylist(id);
        });
    });
  }

  public async renderPlaylist(playlistId: string) {
      const tracks = await libraryManager.getTracksForPlaylist(playlistId);
      
      let html = `<div style="padding-bottom: 80px;">
        <button id="btn-back" style="background:transparent; border:none; color:var(--md-sys-color-on-surface); padding:8px 0; display:flex; align-items:center; cursor:pointer; margin-bottom:16px;">
            <span class="material-symbols-rounded">arrow_back</span>
            <span style="font-size:16px; font-weight:500;">Back to Library</span>
        </button>
      `;

      tracks.forEach((track, idx) => {
          html += `
             <div class="track-row" data-idx="${idx}" style="
                 display:flex; align-items:center; gap: 16px; padding: 12px; border-radius: 8px; cursor:pointer;">
                 <div class="art-container lazy-art" data-trackid="${track.id}" style="width: 40px; height: 40px; border-radius: 4px; background: var(--md-sys-color-surface-variant); display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <span class="material-symbols-rounded fallback-icon" style="font-size: 20px; color: var(--md-sys-color-on-surface-variant);">music_note</span>
                 </div>
                 <div style="flex:1; overflow:hidden;">
                     <div style="font-size: 0.95rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${track.title}</div>
                     <div style="font-size: 0.8rem; color:var(--md-sys-color-on-surface-variant); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${track.artist}</div>
                 </div>
             </div>
          `;
      });
      html += `</div>`;
      this.viewLayer.innerHTML = html;

      document.getElementById('btn-back')?.addEventListener('click', () => this.renderLibrary());

      // Track clicks
      const rows = this.viewLayer.querySelectorAll('.track-row');
      rows.forEach(row => {
          row.addEventListener('click', () => {
              const idx = parseInt(row.getAttribute('data-idx')!, 10);
              this.playTrack(idx, tracks);
          });
      });

      // Implement Asset Fallbacks / Intersection Observer for Lazy Artwork
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
                      img.style.width = '100%';
                      img.style.height = '100%';
                      img.style.objectFit = 'cover';
                      img.onload = () => {
                          const existingIcon = target.querySelector('.fallback-icon');
                          if (existingIcon) existingIcon.remove();
                          target.appendChild(img);
                      };
                      // Revocation happens automatically on new blobs in this simplified flow, 
                      // but typically should track object URLs. We can rely on GC for short lifespans or keep mapping.
                      img.src = URL.createObjectURL(track.artworkBlob);
                  }
                  obs.unobserve(target);
              }
          });
      }, { root: this.viewLayer, rootMargin: '0px 0px 100px 0px' });

      const arts = this.viewLayer.querySelectorAll('.lazy-art');
      arts.forEach(art => observer.observe(art));
  }
}

export const uiManager = new UIManager();
