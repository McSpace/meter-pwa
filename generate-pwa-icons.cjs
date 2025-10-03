const fs = require('fs');
const path = require('path');

console.log('📱 PWA Icon Generator\n');
console.log('Icons have been pre-generated and are located in the public/ folder:');
console.log('');

const sizes = [
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'apple-touch-icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon-120x120.png', size: 120 }
];

let allExist = true;

sizes.forEach(({ name, size }) => {
  const filePath = path.join(__dirname, 'public', name);
  const exists = fs.existsSync(filePath);

  if (exists) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${name} (${size}x${size}) - ${(stats.size / 1024).toFixed(1)}KB`);
  } else {
    console.log(`❌ ${name} (${size}x${size}) - MISSING`);
    allExist = false;
  }
});

console.log('');

if (allExist) {
  console.log('✨ All icons are ready!');
} else {
  console.log('⚠️  Some icons are missing!');
  console.log('');
  console.log('To generate icons:');
  console.log('1. Open public/generate-pwa-icons.html in your browser');
  console.log('2. Download all the PNG files');
  console.log('3. Save them to the public/ folder');
  console.log('');
  console.log('Or use an online tool:');
  console.log('- https://realfavicongenerator.net');
  console.log('- https://www.pwabuilder.com/imageGenerator');
}
