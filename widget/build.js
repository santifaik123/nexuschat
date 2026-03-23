import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Ensure dist directory
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// Read widget JS
const js = fs.readFileSync(path.join(srcDir, 'nexuschat.js'), 'utf-8');

// Write combined output
fs.writeFileSync(path.join(distDir, 'nexuschat.min.js'), js);

console.log('✅ Widget built → dist/nexuschat.min.js');
console.log(`   Size: ${(Buffer.byteLength(js) / 1024).toFixed(1)} KB`);
