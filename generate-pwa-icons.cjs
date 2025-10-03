const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(canvas, size) {
  const ctx = canvas.getContext('2d');
  const radius = size * 0.2;

  // Background with rounded corners
  ctx.fillStyle = '#11211e';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();

  // Center point
  const centerX = size / 2;
  const centerY = size / 2;
  const chartRadius = size * 0.3;

  // Draw pie chart icon in primary color
  ctx.fillStyle = '#30e8c9';

  // Large pie slice (270 degrees from -90)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, chartRadius, -Math.PI/2, Math.PI, false);
  ctx.lineTo(centerX, centerY);
  ctx.fill();

  // Small pie slice (60 degrees from -90)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, chartRadius, -Math.PI/2, -Math.PI/2 + Math.PI/3, false);
  ctx.lineTo(centerX, centerY);
  ctx.fill();
}

const sizes = [
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'apple-touch-icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon-120x120.png', size: 120 }
];

console.log('🎨 Generating PWA icons...\n');

sizes.forEach(({ name, size }) => {
  const canvas = createCanvas(size, size);
  drawIcon(canvas, size);

  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(__dirname, 'public', name);

  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Generated: ${name} (${size}x${size})`);
});

console.log('\n✨ All icons generated successfully!');
