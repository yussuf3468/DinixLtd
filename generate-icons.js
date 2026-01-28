#!/usr/bin/env node

// Simple icon generator for Ezary CMS PWA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("📱 Creating app icons for Ezary...\n");

// Create SVG icon
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#grad)"/>
  <text x="256" y="370" font-family="Arial, sans-serif" font-size="240" font-weight="bold" fill="white" text-anchor="middle">E</text>
  <circle cx="380" cy="180" r="35" fill="white" opacity="0.9"/>
  <circle cx="320" cy="150" r="25" fill="white" opacity="0.7"/>
  <circle cx="420" cy="150" r="20" fill="white" opacity="0.6"/>
</svg>
`;

const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Save SVG
fs.writeFileSync(path.join(publicDir, "icon.svg"), svgIcon.trim());
console.log("✅ Created icon.svg");

console.log("\n📝 Next steps to generate PNG icons:");
console.log("   1. Install sharp: npm install --save-dev sharp");
console.log("   2. Or use online converter: https://svgtopng.com");
console.log("   3. Convert icon.svg to:");
console.log("      - icon-192.png (192x192)");
console.log("      - icon-512.png (512x512)");
console.log("      - apple-touch-icon.png (180x180)");
console.log("\n💡 Or I can create a converter script if you install sharp!\n");
