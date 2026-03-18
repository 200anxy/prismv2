export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export class LyricsParser {
  private lyrics: LyricLine[] = [];

  constructor() {}

  public async parseLrc(file: File): Promise<LyricLine[]> {
    const text = await file.text();
    const lines = text.split('\n');
    this.lyrics = [];
    
    // LRC format: [mm:ss.xx] lyric text
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    for (const line of lines) {
      const match = timeReg.exec(line);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const ms = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
        
        const timeInSeconds = (mins * 60) + secs + (ms / 1000);
        const text = line.replace(timeReg, '').trim();
        
        this.lyrics.push({ time: timeInSeconds, text });
      }
    }
    
    return this.lyrics;
  }

  public getActiveLineIndex(currentTime: number): number {
    // Binary search or simple linear scan to find the current lyric
    let bestIndex = -1;
    for (let i = 0; i < this.lyrics.length; i++) {
        if (currentTime >= this.lyrics[i].time) {
            bestIndex = i;
        } else {
            break;
        }
    }
    return bestIndex;
  }
}

export const lyricsParser = new LyricsParser();
