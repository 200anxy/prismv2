import { addPlaylist, addTrack, getPlaylists, getTracksByPlaylist, type TrackData, type PlaylistData } from './db';
import { extractMetadata } from './Metadata';

export class LibraryManager {
  public onLibraryUpdated: () => void = () => {};

  constructor() {}

  async loadLibrary() {
    this.onLibraryUpdated();
  }

  async getAllPlaylists(): Promise<PlaylistData[]> {
    return await getPlaylists();
  }

  async getTracksForPlaylist(playlistId: string): Promise<TrackData[]> {
    return await getTracksByPlaylist(playlistId);
  }

  // Handle folder upload via standard <input webkitdirectory> or drag-and-drop
  async processFiles(files: File[], folderName: string = 'Imported Folder') {
    const playlistId = 'playlist-' + Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5);
    
    const trackIds: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|flac|wav|m4a|ogg)$/i)) {
        continue;
      }

      const meta = await extractMetadata(file);
      const trackId = 'track-' + Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5);
      
      const trackData: TrackData = {
        id: trackId,
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        playlistId: playlistId,
        fileRef: file,
        hasArtwork: meta.hasArtwork,
        artworkBlob: meta.artworkBlob,
        dominantColor: meta.dominantColor
      };

      await addTrack(trackData);
      trackIds.push(trackId);
    }

    if (trackIds.length > 0) {
      await addPlaylist({
        id: playlistId,
        name: folderName,
        trackIds
      });
      this.onLibraryUpdated();
    }
  }

  // File System Access API for Desktop (Persists handles), Fallback for mobile
  async showDirectoryPicker() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Explicitly fallback to HTML5 input on Mobile because Android Chrome exposes the API globally but throws on invocation.
    if (typeof (window as any).showDirectoryPicker === 'function' && !isMobile) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        
        for await (const entry of (dirHandle as any).values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            files.push(file);
          }
        }

        await this.processFiles(files, dirHandle.name);
        return;

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error selecting directory natively:', err);
        }
        return; // Native was attempted, do not double-prompt
      }
    } 
    
    // Mobile / Safari / Firefox Fallback (Executes synchronously to avoid popup blockers)
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length > 0) {
         const pathParts = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/') : [];
         const folderName = pathParts.length > 1 ? pathParts[0] : 'Imported Folder';
         await this.processFiles(files, folderName);
      }
    };
    
    input.click();
  }
}

export const libraryManager = new LibraryManager();
