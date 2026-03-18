import { libraryManager } from '../storage/Library';
import { prismPlayer } from '../audio/Player';
import { type TrackData } from '../storage/db';

export class UIManager {
  private viewLayer!: HTMLElement;
  private ambientOverlay!: HTMLElement;
  
  // Controls
  private btnPlayPause!: HTMLButtonElement;
  private btnPrev!: HTMLButtonElement;
  private btnNext!: HTMLButtonElement;
  
  private progressWrapper!: HTMLElement;
  private progressFill!: HTMLElement;
  private timeCurrent!: HTMLElement;
  private timeTotal!: HTMLElement;

  private playerTitle!: HTMLElement;
  private playerArtist!: HTMLElement;
  private playerArt!: HTMLElement;

  private currentPlaylistTracks: TrackData[] = [];
  private currentTrackIndex: number = -1;

  constructor() {
     // Wait for init() 
  }

  public init() {
    this.viewLayer = document.getElementById('view-layer')!;
    this.ambientOverlay = document.getElementById('ambient-overlay')!;
    
    this.btnPlayPause = document.getElementById('btn-play-pause') as HTMLButtonElement;
    this.btnPrev = document.getElementById('btn-prev') as HTMLButtonElement;
    this.btnNext = document.getElementById('btn-next') as HTMLButtonElement;
    
    this.progressWrapper = document.getElementById('progress-wrapper')!;
    this.progressFill = document.getElementById('progress-fill')!;
    this.timeCurrent = document.getElementById('time-current')!;
    this.timeTotal = document.getElementById('time-total')!;

    this.playerTitle = document.getElementById('player-title')!;
    this.playerArtist = document.getElementById('player-artist')!;
    this.playerArt = document.getElementById('player-art')!;

    this.bindEvents();
    this.renderLibrary();
  }

  private bindEvents() {
    document.getElementById('btn-library')?.addEventListener('click', () => {
        document.getElementById('top-title')!.innerText = 'Library';
        this.renderLibrary();
    });

    libraryManager.onLibraryUpdated = () => this.renderLibrary();
    
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
        prismPlayer.requestSkipNext(async () => {
             this.playPrev();
        });
    });

    this.progressWrapper.addEventListener('click', (e) => {
      const rect = this.progressWrapper.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      prismPlayer.seek(pct);
    });
  }

  private formatTime(secs: number): string {
    const min = Math.floor(secs / 60);
    const sec = Math.floor(secs % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  private updatePlayerUI(track: TrackData) {
     this.playerTitle.innerText = track.title;
     this.playerArtist.innerText = track.artist;

     if (track.hasArtwork && track.artworkBlob) {
         const url = URL.createObjectURL(track.artworkBlob);
         this.playerArt.innerHTML = `<img src="${url}" alt="Album Art" />`;
     } else {
         this.playerArt.innerHTML = `<span class="material-symbols-rounded" style="color: var(--text-secondary); font-size: 28px;">music_note</span>`;
     }

     if (track.dominantColor) {
         document.documentElement.style.setProperty('--accent-glow', track.dominantColor);
         document.documentElement.style.setProperty('--accent-color', track.dominantColor);
         this.ambientOverlay.style.background = `radial-gradient(circle at 50% -20%, ${track.dominantColor} 0%, transparent 80%)`;
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
      if (nextIdx >= this.currentPlaylistTracks.length) nextIdx = 0;
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
        <div style="text-align: center; color: var(--text-secondary); margin-top: 20vh; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <span class="material-symbols-rounded" style="font-size: 64px; margin-bottom: 24px; opacity: 0.5;">library_music</span>
          <h2 style="color: var(--text-primary); margin-bottom: 8px; font-weight: 600;">Your Library is Empty</h2>
          <p style="margin-bottom: 24px;">Add a local folder to start listening.</p>
          <button id="btn-add-folder" style="padding: 14px 32px; border-radius: 30px; background: var(--text-primary); color: var(--bg-color); border:none; font-weight:700; font-size: 1rem; cursor: pointer; transition: transform 0.2s;">
            Browse Files
          </button>
        </div>
      `;
      document.getElementById('btn-add-folder')?.addEventListener('click', () => libraryManager.showDirectoryPicker());
      return;
    }

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="font-size: 1.5rem; font-weight: 700;">Playlists</h2>
        <button id="btn-add-folder-small" class="icon-btn" style="background: var(--surface-variant);">
          <span class="material-symbols-rounded">add</span>
        </button>
      </div>
      <div class="grid-container">
    `;

    playlists.forEach(p => {
        html += `
          <div class="playlist-card" data-id="${p.id}">
            <div class="playlist-card-art">
                <span class="material-symbols-rounded">folder_open</span>
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
            // Set nav title natively or use state
            document.getElementById('top-title')!.innerText = 'Playlist';
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
                    <span class="material-symbols-rounded fallback-icon" style="color: var(--text-secondary);">music_note</span>
                 </div>
                 <div style="flex:1; overflow:hidden; display: flex; flex-direction: column; justify-content: center;">
                     <div class="text-ellipsis" style="font-size: 1rem; font-weight: 500; color: var(--text-primary); margin-bottom: 2px;">${track.title}</div>
                     <div class="text-ellipsis" style="font-size: 0.85rem; color: var(--text-secondary);">${track.artist}</div>
                 </div>
                 <button class="icon-btn" style="opacity: 0.5;">
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
