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

  public onTimeUpdate: (currentTime: number, duration: number) => void = () => {};
  public onTrackChange: (track: TrackData) => void = () => {};
  public onPlayStateChange: (isPlaying: boolean) => void = () => {};

  constructor() {
    this.activeAudio = new Audio();
    this.standbyAudio = new Audio();

    // Event hooks
    this.activeAudio.addEventListener('timeupdate', () => {
      this.onTimeUpdate(this.activeAudio.currentTime, this.activeAudio.duration || 0);
      
      // Gapless preloading logic (last 5 seconds)
      if (this.activeAudio.duration - this.activeAudio.currentTime < 5 && this.nextTrack && !this.standbyUrl) {
         this.preloadNext(this.nextTrack);
      }
    });

    this.activeAudio.addEventListener('ended', () => {
      this.playNextPrepared();
    });

    this.activeAudio.addEventListener('play', () => this.updatePlayState(true));
    this.activeAudio.addEventListener('pause', () => this.updatePlayState(false));
  }

  private updatePlayState(playing: boolean) {
    this.isPlaying = playing;
    this.onPlayStateChange(playing);
    this.updateMediaSessionState();
  }

  public async playTrack(track: TrackData, nextTrackInQueue?: TrackData) {
    // Memory management: Revoke previous URL
    if (this.activeUrl) URL.revokeObjectURL(this.activeUrl);
    
    // Extract file
    const file = track.fileRef instanceof File ? track.fileRef : await (track.fileRef as FileSystemFileHandle).getFile();
    this.activeUrl = URL.createObjectURL(file);
    
    this.activeAudio.src = this.activeUrl;
    this.currentTrack = track;
    this.nextTrack = nextTrackInQueue || null;
    
    await this.activeAudio.play();
    this.onTrackChange(track);
    this.setupMediaSession(track);
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

  private async playNextPrepared() {
    if (!this.standbyUrl || !this.nextTrack) {
        this.isPlaying = false;
        this.onPlayStateChange(false);
        return; // Nothing to play next
    }

    // Swap buffers
    const temp = this.activeAudio;
    this.activeAudio = this.standbyAudio;
    this.standbyAudio = temp;

    this.currentTrack = this.nextTrack;
    this.nextTrack = null;
    
    if (this.activeUrl) URL.revokeObjectURL(this.activeUrl);
    this.activeUrl = this.standbyUrl;
    this.standbyUrl = null;

    // Attach listeners to new active audio
    this.attachActiveListeners();
    
    await this.activeAudio.play();
    this.onTrackChange(this.currentTrack);
    this.setupMediaSession(this.currentTrack);
  }

  private attachActiveListeners() {
      // Clear old listeners on standby (formerly active)
      this.standbyAudio.onended = null;
      this.standbyAudio.ontimeupdate = null;
      this.standbyAudio.onplay = null;
      this.standbyAudio.onpause = null;

      // Ensure new active has listeners
      this.activeAudio.onended = () => this.playNextPrepared();
      this.activeAudio.ontimeupdate = () => {
          this.onTimeUpdate(this.activeAudio.currentTime, this.activeAudio.duration || 0);
          if (this.activeAudio.duration - this.activeAudio.currentTime < 5 && this.nextTrack && !this.standbyUrl) {
              this.preloadNext(this.nextTrack);
          }
      };
      this.activeAudio.onplay = () => this.updatePlayState(true);
      this.activeAudio.onpause = () => this.updatePlayState(false);
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
      }
  }

  private updateMediaSessionState() {
      if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
      }
  }
}

export const prismPlayer = new PrismPlayer();
