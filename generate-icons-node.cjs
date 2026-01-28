const fs = require('fs');
const { createCanvas } = require('canvas');

// Icon sizes needed
const icons = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' }
];

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background (Emerald to Teal)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#10b981');
  gradient.addColorStop(1, '#14b8a6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add subtle shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = size * 0.02;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = size * 0.01;

  // Draw large "E" in white
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = size * 0.03;
  ctx.fillText('E', size / 2, size * 0.45);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Draw "CMS" text below
  ctx.font = `${size * 0.12}px Arial`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('CMS', size / 2, size * 0.75);

  return canvas;
}

console.log('🎨 Generating Ezary CMS PWA Icons...\n');

icons.forEach(({ size, name }) => {
  const canvas = generateIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const path = `./public/${name}`;
  
  fs.writeFileSync(path, buffer);
  console.log(`✅ Created ${name} (${size}x${size})`);
});

console.log('\n🎉 All icons generated successfully!');
console.log('📁 Icons saved to: ./public/\n');
