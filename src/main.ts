import './style.css';
import { uiManager } from './ui/UIManager';
import { bindSilentReauth } from './utils/permission';

bindSilentReauth();

(window as any).uiManager = uiManager;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="top-app-bar">
    <button class="icon-btn" id="btn-library">
      <span class="material-symbols-rounded">arrow_back</span>
    </button>
    <h1 id="top-title" class="title-large text-ellipsis">Library</h1>
    <button class="icon-btn" id="btn-settings">
      <span class="material-symbols-rounded">settings</span>
    </button>
  </div>
  
  <div class="main-content" id="view-layer">
    <!-- View content injected here -->
  </div>

  <!-- Mini Player (Floating at bottom) -->
  <div class="mini-player" id="mini-player">
    <div class="mini-player-art" id="mini-art">
       <span class="material-symbols-rounded" style="color: var(--md-sys-color-on-surface-variant);">music_note</span>
    </div>
    <div class="mini-player-info">
      <div class="mini-player-title text-ellipsis" id="mini-title">No Song Playing</div>
      <div class="mini-player-artist text-ellipsis" id="mini-artist">Select a track to play</div>
    </div>
    <button class="fab-play" id="mini-play-pause">
      <span class="material-symbols-rounded">play_arrow</span>
    </button>
  </div>

  <!-- Full Screen Player Overlay -->
  <div class="full-player" id="full-player">
    <div class="full-player-nav">
      <button class="icon-btn" id="btn-close-full">
        <span class="material-symbols-rounded">expand_more</span>
      </button>
      <div class="label-medium">Now Playing</div>
      <button class="icon-btn" id="btn-open-queue">
        <span class="material-symbols-rounded">queue_music</span>
      </button>
    </div>

    <div class="full-player-content">
      <div class="full-player-art" id="full-art">
         <span class="material-symbols-rounded" style="font-size: 64px; color: var(--md-sys-color-on-surface-variant);">music_note</span>
      </div>
      
      <div class="full-player-info">
         <div class="full-player-title text-ellipsis" id="full-title">Not Playing</div>
         <div class="full-player-artist text-ellipsis" id="full-artist">-</div>
      </div>

      <div class="full-progress-container">
         <div class="full-progress-bar-wrapper" id="full-progress-wrapper">
             <div class="full-progress-bar" id="full-progress-bar">
                 <div class="full-progress-fill" id="full-progress-fill"></div>
             </div>
         </div>
         <div class="full-time-row label-medium">
             <span id="full-time-current">0:00</span>
             <span id="full-time-total">0:00</span>
         </div>
      </div>

      <div class="full-controls-main">
         <button class="icon-btn" id="btn-shuffle">
            <span class="material-symbols-rounded">shuffle</span>
         </button>
         <button class="icon-btn" id="full-btn-prev">
            <span class="material-symbols-rounded" style="font-size: 32px;">skip_previous</span>
         </button>
         <button class="fab-play fab-play-huge" id="full-btn-play-pause">
            <span class="material-symbols-rounded">play_arrow</span>
         </button>
         <button class="icon-btn" id="full-btn-next">
            <span class="material-symbols-rounded" style="font-size: 32px;">skip_next</span>
         </button>
         <button class="icon-btn" id="btn-repeat">
            <span class="material-symbols-rounded">repeat</span>
         </button>
      </div>
    </div>
  </div>

  <!-- Settings Overlay -->
  <div class="settings-overlay" id="settings-overlay">
    <div class="settings-nav">
      <button class="icon-btn" id="btn-close-settings">
        <span class="material-symbols-rounded">arrow_back</span>
      </button>
      <h1 class="title-large" style="margin-left: 16px;">Settings</h1>
    </div>
    <div class="settings-content">
      <div class="settings-group">
        <h2>Data & Storage</h2>
        <div class="settings-item" id="btn-clear-db">
          <div class="settings-item-text">
            <span>Clear Library Data</span>
            <small>Removes all tracks and metadata from local storage</small>
          </div>
          <span class="material-symbols-rounded">delete</span>
        </div>
      </div>
      <div class="settings-group">
        <h2>About</h2>
        <div class="settings-item">
          <div class="settings-item-text">
            <span>Prism PWA</span>
            <small>Version 1.0.0 • Material 3 Expressive Edition</small>
          </div>
          <span class="material-symbols-rounded">info</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Queue Overlay -->
  <div class="queue-overlay" id="queue-overlay">
    <div class="queue-nav">
      <h1 class="title-large" style="margin-left: 16px;">Up Next</h1>
      <button class="icon-btn" id="btn-close-queue">
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
    <div class="queue-content" id="queue-list">
      <!-- Queue items injected here -->
      <div style="text-align:center; margin-top:40px; color:var(--md-sys-color-on-surface-variant);">No upcoming tracks</div>
    </div>
  </div>
`;

// Initialize UI Managers and listeners
uiManager.init();
