import './style.css';
import { uiManager } from './ui/UIManager';
import { prismPlayer } from './audio/Player';
import { bindSilentReauth } from './utils/permission';
import { registerSW } from 'virtual:pwa-register';

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;

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
    <div class="mini-player-info" style="flex: 1; min-width: 0; margin-right: 8px;">
      <div class="mini-player-title text-ellipsis" id="mini-title">No Song Playing</div>
      <div class="mini-player-artist text-ellipsis" id="mini-artist">Select a track to play</div>
    </div>
    <div class="mini-player-controls" style="display: flex; align-items: center; gap: 4px;">
       <button class="icon-btn" id="mini-btn-prev" style="width: 40px; height: 40px; margin: 0;">
         <span class="material-symbols-rounded" style="font-size: 24px;">skip_previous</span>
       </button>
       <button class="fab-play" id="mini-play-pause" style="width: 44px; height: 44px;">
         <span class="material-symbols-rounded">play_arrow</span>
       </button>
       <button class="icon-btn" id="mini-btn-next" style="width: 40px; height: 40px; margin: 0;">
         <span class="material-symbols-rounded" style="font-size: 24px;">skip_next</span>
       </button>
    </div>
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
         <input type="range" class="m3-slider" id="progress-slider" min="0" max="100" value="0" step="0.1">
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
        <div class="settings-card">
          <div class="settings-item" id="btn-clear-db">
            <div class="settings-item-text">
              <span>Clear Library Data</span>
              <small>Removes all tracks and metadata</small>
            </div>
            <span class="material-symbols-rounded">delete</span>
          </div>
        </div>
      </div>
      <div class="settings-group">
        <h2>Playback</h2>
        <div class="settings-card">
          <div class="settings-item">
            <div class="settings-item-text">
              <span>Crossfade</span>
              <small>Smoothly blend between tracks</small>
            </div>
            <label class="m3-switch">
              <input type="checkbox" id="toggle-crossfade" ${localStorage.getItem('prism-crossfade') === 'true' ? 'checked' : ''}>
              <span class="m3-switch-slider"></span>
            </label>
          </div>
          <div class="settings-item">
            <div class="settings-item-text">
              <span>Animated Vinyl Art</span>
              <small>Spin album art while playing</small>
            </div>
            <label class="m3-switch">
              <input type="checkbox" id="toggle-vinyl" ${localStorage.getItem('prism-vinyl') !== 'false' ? 'checked' : ''}>
              <span class="m3-switch-slider"></span>
            </label>
          </div>
          <div class="settings-item">
            <div class="settings-item-text">
              <span>Show Play Counts</span>
              <small>Display the number of times a track has been played</small>
            </div>
            <label class="m3-switch">
              <input type="checkbox" id="toggle-playcounts" ${localStorage.getItem('prism-playcounts') !== 'false' ? 'checked' : ''}>
              <span class="m3-switch-slider"></span>
            </label>
          </div>
        </div>
      </div>
      <div class="settings-group">
        <h2>Updates</h2>
        <div class="settings-card">
          <div class="settings-item" id="btn-check-update">
            <div class="settings-item-text">
              <span>Check for Updates</span>
              <small id="update-status-text">Tap to check for a new version</small>
            </div>
            <span class="material-symbols-rounded">system_update</span>
          </div>
        </div>
      </div>
      <div class="settings-group">
        <h2>About Prism</h2>
        <div class="settings-card">
          <div class="settings-item pointer-events-none">
            <div class="settings-item-text">
              <span>Version</span>
              <small>${__APP_VERSION__} (${__BUILD_DATE__})</small>
            </div>
            <span class="material-symbols-rounded">info</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="queue-overlay" id="queue-overlay">
    <div class="queue-handle-bar"><div class="queue-handle-pill"></div></div>
    <div class="queue-nav">
      <h1 class="title-large" style="margin-left: 16px;">Up Next</h1>
      <button class="icon-btn" id="btn-close-queue">
        <span class="material-symbols-rounded">expand_more</span>
      </button>
    </div>
    <div class="queue-content" id="queue-list">
      <!-- Queue items injected here -->
      <div style="text-align:center; margin-top:40px; color:var(--md-sys-color-on-surface-variant);">No upcoming tracks</div>
    </div>
  </div>

  <div class="update-toast" id="update-toast">
    <span class="material-symbols-rounded" style="color: var(--accent-color);">system_update</span>
    <span style="flex:1; font-size: 0.875rem;">A new version is available</span>
    <button class="update-toast-btn" id="btn-apply-update">Update</button>
  </div>

  <dialog id="changelog-dialog" class="m3-dialog">
    <div class="m3-dialog-content">
      <h2 class="m3-dialog-title">What's New in Prism 💎</h2>
      <div class="m3-dialog-body mt-2">
        <ul style="padding-left: 20px; line-height: 1.6;">
          <li><strong>Android Back Navigation:</strong> Overlays now integrate with your system back gesture history.</li>
          <li><strong>Sort Options:</strong> Sort your playlists by Title, Artist, or Duration.</li>
          <li><strong>Animated Vinyl Art:</strong> Album art now spins while playing! (Toggle in Settings).</li>
          <li><strong>Swipe Gestures:</strong> Swipe left/right on the full player to skip tracks, swipe down to close.</li>
          <li><strong>Play Counts:</strong> See how many times you've played a track automatically tracked.</li>
          <li><strong>Gapless Crossfade:</strong> Smoothly blend between songs (Toggle & Customize in Settings).</li>
        </ul>
      </div>
      <div class="m3-dialog-actions mt-4">
        <button class="m3-btn m3-btn-filled" id="btn-close-changelog" style="background: var(--accent-color); color: var(--on-accent-color); border: none; padding: 10px 24px; border-radius: 20px; font-weight: 600; cursor: pointer;">Awesome!</button>
      </div>
    </div>
  </dialog>
`;

// Initialize UI Managers and listeners
uiManager.init();

// Settings - Toggles
document.getElementById('toggle-crossfade')?.addEventListener('change', (e) => {
  const enabled = (e.target as HTMLInputElement).checked;
  prismPlayer.setCrossfade(enabled);
});

document.getElementById('toggle-vinyl')?.addEventListener('change', (e) => {
  const enabled = (e.target as HTMLInputElement).checked;
  localStorage.setItem('prism-vinyl', enabled ? 'true' : 'false');
  // Re-trigger current state
  uiManager.updateVinylState(prismPlayer.getIsPlaying());
});

document.getElementById('toggle-playcounts')?.addEventListener('change', (e) => {
  const enabled = (e.target as HTMLInputElement).checked;
  localStorage.setItem('prism-playcounts', enabled ? 'true' : 'false');
  // Re-render playlist if it's the current view
  uiManager.refreshCurrentPlaylist();
});

// --- Changelog ---
const lastSeenVersion = localStorage.getItem('prism-last-changelog-version');
if (lastSeenVersion !== __APP_VERSION__) {
  const changelogDialog = document.getElementById('changelog-dialog') as HTMLDialogElement;
  if (changelogDialog) {
    changelogDialog.showModal();
    
    document.getElementById('btn-close-changelog')?.addEventListener('click', () => {
      changelogDialog.close();
      localStorage.setItem('prism-last-changelog-version', __APP_VERSION__);
    }, { once: true });
  }
}

// --- PWA Service Worker Update ---
let swUpdateCallback: ((reloadPage?: boolean) => void) | undefined;

const updateSW = registerSW({
  onNeedRefresh() {
    // Show the update toast
    const toast = document.getElementById('update-toast');
    if (toast) toast.classList.add('visible');
    // Update settings text
    const statusText = document.getElementById('update-status-text');
    if (statusText) statusText.textContent = 'Update available! Tap to apply.';
  },
  onOfflineReady() {
    console.log('[Prism] App is ready for offline use.');
  }
});

swUpdateCallback = updateSW;

// Apply update button (toast)
document.getElementById('btn-apply-update')?.addEventListener('click', () => {
  if (swUpdateCallback) swUpdateCallback(true);
});

// Check for updates button (settings)
document.getElementById('btn-check-update')?.addEventListener('click', async () => {
  const statusText = document.getElementById('update-status-text');
  if (statusText) statusText.textContent = 'Checking...';
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.update();
      // If no new SW was found, onNeedRefresh won't fire
      setTimeout(() => {
        if (statusText && !document.getElementById('update-toast')?.classList.contains('visible')) {
          statusText.textContent = 'You are on the latest version';
        }
      }, 2000);
    } else {
      if (statusText) statusText.textContent = 'No service worker registered';
    }
  } catch {
    if (statusText) statusText.textContent = 'Failed to check for updates';
  }
});
