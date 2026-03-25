/**
 * Prism - Spotify CSV Downloader
 * 
 * Usage: 
 * 1. Ensure you have `yt-dlp` and `ffmpeg` installed and in your system PATH.
 * 2. Run: `node scripts/download_csv.js <path-to-csv> <output-folder>`
 * 
 * Example: `node scripts/download_csv.js my-playlist.csv ./DownloadedMusic`
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node download_csv.js <path-to-csv> <output-folder>');
    process.exit(1);
}

const csvPath = args[0];
const outputDir = args[1];

if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Simple CSV parser (handles basic quoted strings but assumes standard Spotify format)
function parseCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const headers = lines[0].split(',').map(h => h.trim());
    
    const results = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        // Simple regex to split by comma, ignoring commas inside quotes
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj = {};
        
        headers.forEach((header, index) => {
            let val = values[index] || '';
            // Remove surrounding quotes if present
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
            }
            obj[header] = val;
        });
        results.push(obj);
    }
    return results;
}

const csvContent = fs.readFileSync(csvPath, 'utf8');
const tracks = parseCSV(csvContent);

console.log(`\nFound ${tracks.length} tracks in CSV. Starting download...\n`);

let successCount = 0;
let failCount = 0;

for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    
    // The exact column names depend on the Spotify CSV export tool, we look for 'Track Name' and 'Artist Name(s)'
    const title = track['Track Name'] || track['Track'] || track['title'];
    const artist = track['Artist Name(s)'] || track['Artist'] || track['artist'];
    
    if (!title) {
        console.warn(`[Skipping] Row ${i+2} missing Track Name.`);
        failCount++;
        continue;
    }

    const searchQuery = `${title} ${artist || ''} audio`.trim();
    const cleanFileName = `${artist ? artist + ' - ' : ''}${title}`.replace(/[\\/:*?"<>|]/g, '');
    const outputPath = path.join(outputDir, `${cleanFileName}.%(ext)s`);
    
    console.log(`[${i + 1}/${tracks.length}] Downloading: ${title} by ${artist || 'Unknown'}`);
    
    try {
        // Use yt-dlp to search youtube music/youtube and download the best audio as mp3
        const cmd = `yt-dlp "ytsearch1:${searchQuery}" --extract-audio --audio-format mp3 --audio-quality 0 --embed-metadata --add-metadata --no-playlist -o "${outputPath}"`;
        execSync(cmd, { stdio: 'inherit' });
        successCount++;
        console.log(`✅ Success!\n`);
    } catch (err) {
        console.error(`❌ Failed to download: ${title}\n`);
        failCount++;
    }
}

console.log('=========================================');
console.log(`Download Complete! `);
console.log(`Successfully downloaded: ${successCount}`);
console.log(`Failed: ${failCount}`);
console.log('=========================================');
