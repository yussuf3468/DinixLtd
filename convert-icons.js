import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, "public", "icon.svg");
const publicDir = path.join(__dirname, "public");

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

console.log("🎨 Converting SVG to PNG icons...\n");

Promise.all(
  sizes.map(async ({ name, size }) => {
    const outputPath = path.join(publicDir, name);
    await sharp(svgPath).resize(size, size).png().toFile(outputPath);
    console.log(`✅ Created ${name} (${size}x${size})`);
  })
)
  .then(() => {
    console.log("\n🎉 All icons generated successfully!");
    console.log("\n📱 Next step: Deploy your app!");
    console.log("   Run: npm run build");
    console.log("   Then: vercel (or netlify deploy --prod)");
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    console.log("\n💡 Make sure to run: npm install --save-dev sharp");
  });
