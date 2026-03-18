import './style.css';
import { uiManager } from './ui/UIManager';
import { bindSilentReauth } from './utils/permission';

bindSilentReauth();

(window as any).uiManager = uiManager;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="top-nav">
    <button class="icon-btn" id="btn-library">
      <span class="material-symbols-rounded">home</span>
    </button>
    <h1 id="top-title">Prism</h1>
    <button class="icon-btn" id="btn-settings">
      <span class="material-symbols-rounded">settings</span>
    </button>
  </div>
  
  <div class="main-content" id="view-layer">
    <!-- View content injected here -->
  </div>

  <div class="player-bar">
    <div class="player-now-playing">
      <div class="player-art-container" id="player-art">
         <span class="material-symbols-rounded" style="color: var(--text-secondary);">music_note</span>
      </div>
      <div class="player-track-info">
        <div class="player-title text-ellipsis" id="player-title">Not Playing</div>
        <div class="player-artist text-ellipsis" id="player-artist">-</div>
      </div>
    </div>
    
    <div class="player-center">
      <div class="player-controls-row">
        <button class="icon-btn" id="btn-prev">
          <span class="material-symbols-rounded">skip_previous</span>
        </button>
        <button class="play-pause-btn" id="btn-play-pause">
          <span class="material-symbols-rounded">play_arrow</span>
        </button>
        <button class="icon-btn" id="btn-next">
          <span class="material-symbols-rounded">skip_next</span>
        </button>
      </div>
      
      <div class="progress-container">
        <span id="time-current">0:00</span>
        <div class="progress-bar-wrapper" id="progress-wrapper">
          <div class="progress-bar" id="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
        </div>
        <span id="time-total">0:00</span>
      </div>
    </div>

    <div class="player-right">
       <button class="icon-btn" id="btn-queue">
          <span class="material-symbols-rounded">queue_music</span>
       </button>
    </div>
  </div>
`;

// Initialize UI Managers and listeners
uiManager.init();
