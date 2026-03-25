import { type TrackData } from '../storage/db';

export class PrismPlayer {
  private activeAudio: HTMLAudioElement;
  private standbyAudio: HTMLAudioElement;
  private currentTrack: TrackData | null = null;
  private nextTrack: TrackData | null = null;
  
  private activeUrl: string | null = null;
  private standbyUrl: string | null = null;

  private isPlaying: boolean = false;
  private skipTimeout: number | null = null;

  // Crossfade
  private crossfadeEnabled: boolean = false;
  private crossfadeDuration: number = 3; // seconds
  private isCrossfading: boolean = false;
  private crossfadeTimer: number | null = null;

  public onTimeUpdate: (currentTime: number, duration: number) => void = () => {};
  public onTrackChange: (track: TrackData) => void = () => {};
  public onPlayStateChange: (isPlaying: boolean) => void = () => {};
  
  public onRequestSkipNext: () => void = () => {};
  public onRequestSkipPrev: () => void = () => {};

  constructor() {
    this.activeAudio = new Audio();
    this.standbyAudio = new Audio();

    // Load crossfade preference
    this.crossfadeEnabled = localStorage.getItem('prism-crossfade') === 'true';

    this.attachEventListeners(this.activeAudio);
    this.bindVisibilityRecovery();
  }

  // --- Visibility Recovery ---
  // On some Android/iOS builds, the browser silently pauses the audio element
  // when the page goes hidden (screen off) without firing a user-visible pause.
  // When the screen comes back on we detect this and immediately resume.
  private bindVisibilityRecovery() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isPlaying && this.activeAudio.paused) {
        this.activeAudio.play().catch(e => console.warn('[Prism] Recovery play failed:', e));
      }
    });
  }

  private attachEventListeners(audio: HTMLAudioElement) {
    // Clean up old listeners by replacing the elements' event handlers
    audio.ontimeupdate = () => {
      this.onTimeUpdate(audio.currentTime, audio.duration || 0);
      
      // Gapless preloading logic (last 5 seconds)
      if (audio.duration - audio.currentTime < 5 && this.nextTrack && !this.standbyUrl) {
         this.preloadNext(this.nextTrack);
      }

      // Crossfade trigger: start blending N seconds before end
      if (this.crossfadeEnabled && !this.isCrossfading && this.nextTrack && this.standbyUrl) {
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= this.crossfadeDuration && remaining > 0) {
          this.startCrossfade();
        }
      }
    };

    audio.onended = () => {
      if (!this.isCrossfading) {
        this.onRequestSkipNext();
      }
    };

    audio.onplay = () => this.updatePlayState(true);
    audio.onpause = () => {
      if (!this.isCrossfading) {
        this.updatePlayState(false);
      }
    };
  }

  private updatePlayState(playing: boolean) {
    this.isPlaying = playing;
    this.onPlayStateChange(playing);
    this.updateMediaSessionState();
  }

  public async playTrack(track: TrackData, nextTrackInQueue?: TrackData) {
    if (this.crossfadeTimer) {
      clearInterval(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    this.isCrossfading = false;

    // Fast-path: The track was already automatically transitioned into (crossfade completion)
    if (this.currentTrack && this.currentTrack.id === track.id && !this.activeAudio.paused && this.activeAudio.currentTime > 0) {
         this.nextTrack = nextTrackInQueue || null;
         if (this.nextTrack) Object.assign(this.nextTrack, nextTrackInQueue); // deepish
         return;
    }

    // Fast-path: Synchronous preloaded background playback!
    if (this.nextTrack && track.id === this.nextTrack.id && this.standbyUrl) {
       const oldActiveUrl = this.activeUrl;
       
       this.activeUrl = this.standbyUrl;
       this.standbyUrl = null;
       
       const oldActiveAudio = this.activeAudio;
       this.activeAudio = this.standbyAudio;
       this.standbyAudio = oldActiveAudio;
       
       oldActiveAudio.pause();
       oldActiveAudio.removeAttribute('src');
       oldActiveAudio.load();
       if (oldActiveUrl) URL.revokeObjectURL(oldActiveUrl);
       
       this.currentTrack = track;
       this.nextTrack = nextTrackInQueue || null;
       this.attachEventListeners(this.activeAudio);
       
       // Synchronous play keeps Wake Lock active in iOS/Android
       this.activeAudio.play().catch(e => console.error("Background play error:", e));
       this.onTrackChange(track);
       this.setupMediaSession(track);
       return;
    }

    // Default fully async path (user explicitly clicked a new song)
    if (this.activeUrl) URL.revokeObjectURL(this.activeUrl);
    if (this.standbyUrl) URL.revokeObjectURL(this.standbyUrl);
    this.standbyUrl = null;
    
    this.standbyAudio.pause();
    this.standbyAudio.removeAttribute('src');
    this.standbyAudio.load();

    const file = track.fileRef instanceof File ? track.fileRef : await (track.fileRef as FileSystemFileHandle).getFile();
    this.activeUrl = URL.createObjectURL(file);
    
    this.activeAudio.volume = 1;
    this.activeAudio.src = this.activeUrl;
    this.currentTrack = track;
    this.nextTrack = nextTrackInQueue || null;
    
    await this.activeAudio.play();
    this.onTrackChange(track);
    this.setupMediaSession(track);
  }

  private startCrossfade() {
    if (!this.standbyUrl || this.isCrossfading) return;
    this.isCrossfading = true;

    this.standbyAudio.volume = 0;
    this.standbyAudio.play().catch(e => console.error("Crossfade standby play blocked", e));

    const fadeStart = performance.now();
    const fadeDurationMs = this.crossfadeDuration * 1000;
    const fadeActive = this.activeAudio;
    const fadeIn = this.standbyAudio;

    const doFade = () => {
      const elapsed = performance.now() - fadeStart;
      const progress = Math.min(elapsed / fadeDurationMs, 1);

      fadeActive.volume = 1 - progress;
      fadeIn.volume = progress;

      if (progress >= 1) {
        if (this.crossfadeTimer) {
          clearInterval(this.crossfadeTimer);
          this.crossfadeTimer = null;
        }
        
        const oldActiveUrl = this.activeUrl;
        
        fadeActive.pause();
        fadeActive.removeAttribute('src');
        fadeActive.load();
        if (oldActiveUrl) URL.revokeObjectURL(oldActiveUrl);

        this.activeAudio = fadeIn;
        this.standbyAudio = fadeActive;
        this.activeUrl = this.standbyUrl;
        this.standbyUrl = null;
        this.isCrossfading = false;
        
        // Update track context BEFORE notifying UIManager, so `playTrack` skips async file read!
        this.currentTrack = this.nextTrack;

        this.attachEventListeners(this.activeAudio);
        this.onRequestSkipNext();
      }
    };

    // Use setInterval for background-safe processing across mobile browsers
    this.crossfadeTimer = window.setInterval(doFade, 50);
  }

  public preloadNext(track: TrackData) {
    this.nextTrack = track;
    if (this.standbyUrl) URL.revokeObjectURL(this.standbyUrl);

    this.prepareStandbyUrl(track).then((url) => {
        this.standbyUrl = url;
        this.standbyAudio.src = url;
        this.standbyAudio.load();
    });
  }

  private async prepareStandbyUrl(track: TrackData): Promise<string> {
      const file = track.fileRef instanceof File ? track.fileRef : await (track.fileRef as FileSystemFileHandle).getFile();
      return URL.createObjectURL(file);
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.activeAudio.pause();
    } else if (this.currentTrack) {
      this.activeAudio.play();
    }
  }

  public seek(pct: number) {
      if (this.activeAudio.duration) {
          this.activeAudio.currentTime = this.activeAudio.duration * pct;
      }
  }

  // Next track with Debounce (250ms)
  public requestSkipNext(handleSkip: () => Promise<void>) {
    if (this.skipTimeout) {
      clearTimeout(this.skipTimeout);
    }
    this.skipTimeout = window.setTimeout(() => {
        handleSkip();
    }, 250);
  }

  // --- Crossfade Config ---
  public setCrossfade(enabled: boolean) {
    this.crossfadeEnabled = enabled;
    localStorage.setItem('prism-crossfade', enabled ? 'true' : 'false');
  }

  public getCrossfade(): boolean {
    return this.crossfadeEnabled;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): TrackData | null {
    return this.currentTrack;
  }

  // --- Media Session API ---
  private setupMediaSession(track: TrackData) {
      if ('mediaSession' in navigator) {
          let artworkUrl = '';
          if (track.artworkBlob) {
              artworkUrl = URL.createObjectURL(track.artworkBlob);
          }

          navigator.mediaSession.metadata = new MediaMetadata({
              title: track.title,
              artist: track.artist,
              album: track.album,
              artwork: artworkUrl ? [{ src: artworkUrl, sizes: '512x512', type: track.artworkBlob?.type }] : []
          });

          navigator.mediaSession.setActionHandler('play', () => this.activeAudio.play());
          navigator.mediaSession.setActionHandler('pause', () => this.activeAudio.pause());
          navigator.mediaSession.setActionHandler('nexttrack', () => {
             if (navigator.vibrate) navigator.vibrate(15);
             this.onRequestSkipNext();
          });
          navigator.mediaSession.setActionHandler('previoustrack', () => {
             if (navigator.vibrate) navigator.vibrate(15);
             this.onRequestSkipPrev();
          });
      }
  }

  private updateMediaSessionState() {
      if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
          // Reporting position state keeps the OS audio session alive and
          // allows the lock screen scrubber to stay accurate.
          if (this.activeAudio.duration && !isNaN(this.activeAudio.duration)) {
              try {
                  navigator.mediaSession.setPositionState({
                      duration: this.activeAudio.duration,
                      playbackRate: this.activeAudio.playbackRate,
                      position: this.activeAudio.currentTime,
                  });
              } catch (_) {
                  // setPositionState may throw if values are out of range
              }
          }
      }
  }
}

export const prismPlayer = new PrismPlayer();
