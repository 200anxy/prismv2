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
    <h1 id="top-title" class="text-ellipsis">Library</h1>
    <button class="icon-btn" id="btn-settings">
      <span class="material-symbols-rounded">more_vert</span>
    </button>
  </div>
  
  <div class="main-content" id="view-layer">
    <!-- View content injected here -->
  </div>

  <!-- Mini Player (Floating at bottom) -->
  <div class="mini-player" id="mini-player" style="display: none;">
    <div class="mini-player-art" id="mini-art">
       <span class="material-symbols-rounded" style="color: var(--md-sys-color-on-surface-variant);">music_note</span>
    </div>
    <div class="mini-player-info">
      <div class="mini-player-title text-ellipsis" id="mini-title">Not Playing</div>
      <div class="mini-player-artist text-ellipsis" id="mini-artist">-</div>
    </div>
    <div class="mini-player-controls">
      <button class="icon-btn" id="mini-view-full">
         <span class="material-symbols-rounded">open_in_full</span>
      </button>
      <button class="fab-play" id="mini-play-pause">
        <span class="material-symbols-rounded">play_arrow</span>
      </button>
    </div>
  </div>

  <!-- Full Screen Player Overlay -->
  <div class="full-player" id="full-player">
    <div class="full-player-nav">
      <button class="icon-btn" id="btn-close-full">
        <span class="material-symbols-rounded">expand_more</span>
      </button>
      <div style="font-weight: 500; font-size: 0.875rem;">Now Playing</div>
      <button class="icon-btn">
        <span class="material-symbols-rounded">more_vert</span>
      </button>
    </div>

    <div class="full-player-content">
      <div class="full-player-art" id="full-art">
         <span class="material-symbols-rounded" style="font-size: 64px; color: var(--md-sys-color-on-surface-variant);">music_note</span>
      </div>
      
      <div class="full-player-info">
         <div class="full-player-title text-ellipsis headline-large" id="full-title">Not Playing</div>
         <div class="full-player-artist text-ellipsis" id="full-artist">-</div>
      </div>

      <div class="full-progress-container">
         <div class="full-progress-bar-wrapper" id="full-progress-wrapper">
             <div class="full-progress-bar" id="full-progress-bar">
                 <div class="full-progress-fill" id="full-progress-fill"></div>
             </div>
         </div>
         <div class="full-time-row">
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
`;

// Initialize UI Managers and listeners
uiManager.init();
