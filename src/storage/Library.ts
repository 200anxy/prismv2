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
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        const files: File[] = [];
        
        // @ts-ignore
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            files.push(file);
          }
        }

        await this.processFiles(files, dirHandle.name);

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error selecting directory:', err);
        }
      }
    } else {
      // Mobile / Safari / Firefox Fallback
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.multiple = true;
      
      input.onchange = async () => {
        const files = Array.from(input.files || []);
        if (files.length > 0) {
           const pathParts = files[0].webkitRelativePath.split('/');
           const folderName = pathParts.length > 1 ? pathParts[0] : 'Imported Folder';
           await this.processFiles(files, folderName);
        }
      };
      
      input.click();
    }
  }
}

export const libraryManager = new LibraryManager();
