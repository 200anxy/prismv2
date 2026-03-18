// @ts-ignore
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
// @ts-ignore
import { Vibrant } from 'node-vibrant/browser';

export interface ExtractedMetadata {
  title: string;
  artist: string;
  album: string;
  hasArtwork: boolean;
  artworkBlob?: Blob;
  dominantColor?: string;
}

export function extractMetadata(file: File): Promise<ExtractedMetadata> {
  return new Promise((resolve, _reject) => {
    jsmediatags.read(file, {
      onSuccess: async (tag: any) => {
        const title = tag.tags.title || file.name.replace(/\.[^/.]+$/, "");
        const artist = tag.tags.artist || 'Unknown Artist';
        const album = tag.tags.album || 'Unknown Album';
        
        let hasArtwork = false;
        let artworkBlob: Blob | undefined;
        let dominantColor: string | undefined;

        if (tag.tags.picture) {
          const { data, format } = tag.tags.picture;
          const u8arr = new Uint8Array(data);
          artworkBlob = new Blob([u8arr], { type: format });
          hasArtwork = true;
          
          try {
            dominantColor = await extractDominantColor(artworkBlob);
          } catch (err) {
            console.warn('Failed to extract dominant color', err);
            dominantColor = '#004a77'; // Fallback Material Primary Container
          }
        }

        resolve({
          title,
          artist,
          album,
          hasArtwork,
          artworkBlob,
          dominantColor: dominantColor || '#004a77'
        });
      },
      onError: (error: any) => {
        console.warn('jsmediatags error:', error);
        // Resolve anyway, just with fallback info
        resolve({
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          hasArtwork: false,
          dominantColor: '#004a77'
        });
      }
    });
  });
}

async function extractDominantColor(blob: Blob): Promise<string> {
    const objectUrl = URL.createObjectURL(blob);
    try {
        const image = new Image();
        image.src = objectUrl;
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });
        const v = new Vibrant(image);
        const palette = await v.getPalette();
        return palette.Vibrant?.hex || palette.Muted?.hex || '#004a77';
    } finally {
        // M3 Memory Management Rule explicitly required
        URL.revokeObjectURL(objectUrl);
    }
}
