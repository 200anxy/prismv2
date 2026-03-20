import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface TrackData {
  id: string; // Unique identifier (e.g., hash or path)
  title: string;
  artist: string;
  album: string;
  duration?: number;
  playlistId: string; // the ID of the folder it came from
  fileRef: File | FileSystemFileHandle; // Handle to actual file
  hasArtwork: boolean;
  artworkBlob?: Blob; 
  dominantColor?: string; // Hex color from node-vibrant
}

export interface PlaylistData {
  id: string; // Folder name or path
  name: string;
  trackIds: string[];
}

export interface PlayStats {
  trackId: string;
  playCount: number;
  lastPlayed: number; // timestamp
}

interface PrismDB extends DBSchema {
  tracks: {
    key: string;
    value: TrackData;
    indexes: { 'by-playlist': string };
  };
  playlists: {
    key: string;
    value: PlaylistData;
  };
  playStats: {
    key: string;
    value: PlayStats;
  };
}

const DB_NAME = 'prism-audio-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PrismDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PrismDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('by-playlist', 'playlistId');
          db.createObjectStore('playlists', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('playStats')) {
            db.createObjectStore('playStats', { keyPath: 'trackId' });
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function addPlaylist(playlist: PlaylistData) {
  const db = await getDB();
  await db.put('playlists', playlist);
}

export async function getPlaylists(): Promise<PlaylistData[]> {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function clearLibrary() {
  const db = await getDB();
  const tx = db.transaction(['tracks', 'playlists'], 'readwrite');
  await tx.objectStore('tracks').clear();
  await tx.objectStore('playlists').clear();
  await tx.done;
}

export async function addTrack(track: TrackData) {
  const db = await getDB();
  await db.put('tracks', track);
}

export async function getTracksByPlaylist(playlistId: string): Promise<TrackData[]> {
  const db = await getDB();
  return db.getAllFromIndex('tracks', 'by-playlist', playlistId);
}

export async function deleteTrack(trackId: string, playlistId: string) {
  const db = await getDB();
  const tx = db.transaction(['tracks', 'playlists'], 'readwrite');
  
  tx.objectStore('tracks').delete(trackId);
  
  const playlistStore = tx.objectStore('playlists');
  const playlist = await playlistStore.get(playlistId);
  if (playlist) {
    playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
    await playlistStore.put(playlist);
  }
  
  await tx.done;
}

export async function incrementPlayCount(trackId: string) {
  const db = await getDB();
  const existing = await db.get('playStats', trackId);
  await db.put('playStats', {
    trackId,
    playCount: (existing?.playCount || 0) + 1,
    lastPlayed: Date.now(),
  });
}

export async function getPlayCounts(): Promise<Map<string, number>> {
  const db = await getDB();
  const all = await db.getAll('playStats');
  const map = new Map<string, number>();
  all.forEach(s => map.set(s.trackId, s.playCount));
  return map;
}
