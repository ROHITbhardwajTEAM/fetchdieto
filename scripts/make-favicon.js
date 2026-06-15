const sharp = require('sharp');
const path = require('path');

const inputPath  = path.join(__dirname, '../public/logo.png');
const outputPath = path.join(__dirname, '../app/icon.png');

async function makeCircular() {
  const size = 512;

  // Create a circular SVG mask
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
    </svg>`
  );

  await sharp(inputPath)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toFile(outputPath);

  console.log('✅ Circular favicon saved to app/icon.png');
}

makeCircular().catch(console.error);
