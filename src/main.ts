import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="top-app-bar">
    <button class="icon-btn" id="btn-library">
      <span class="material-symbols-rounded">folder</span>
    </button>
    <h1>Prism</h1>
    <button class="icon-btn" id="btn-settings">
      <span class="material-symbols-rounded">settings</span>
    </button>
  </div>
  
  <div class="main-content" id="view-layer">
    <!-- Library / Virtual Playlists / Settings injected here -->
    <div style="text-align: center; color: var(--md-sys-color-on-surface-variant); margin-top: 40px;">
      <span class="material-symbols-rounded" style="font-size: 48px; margin-bottom: 16px;">library_music</span>
      <p>No folders loaded.</p>
      <button id="btn-add-folder" style="margin-top:20px; padding: 12px 24px; border-radius: 24px; background: var(--md-sys-color-surface-variant); color: var(--md-sys-color-on-surface); border:none; font-weight:600;">Add Music Folder</button>
    </div>
  </div>

  <div class="player-bar">
    <div class="progress-container">
      <span id="time-current">0:00</span>
      <div class="progress-bar" id="progress-bar">
        <div class="progress-fill" id="progress-fill" style="width: 30%;"></div>
      </div>
      <span id="time-total">0:00</span>
    </div>
    
    <div class="player-controls">
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
  </div>
`;

// Simple example of clicking a button
document.getElementById('btn-add-folder')?.addEventListener('click', async () => {
    try {
        // Will implement full webkitdirectory / showDirectoryPicker later
        console.log('Open folder picker');
    } catch (e) {
        console.error(e);
    }
});
