const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Konwersja głównego logo (520x120)
const logoPath = path.join(publicDir, 'logo.svg');
const logoPngPath = path.join(publicDir, 'logo.png');

// Konwersja ikony (120x120)
const iconPath = path.join(publicDir, 'logo-icon.svg');
const iconPngPath = path.join(publicDir, 'logo-icon.png');

async function convertLogos() {
  try {
    // Konwersja głównego logo
    if (fs.existsSync(logoPath)) {
      await sharp(logoPath)
        .resize(520, 120, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(logoPngPath);
      console.log('✓ Utworzono logo.png');
    } else {
      console.error('✗ Nie znaleziono logo.svg');
    }

    // Konwersja ikony
    if (fs.existsSync(iconPath)) {
      await sharp(iconPath)
        .resize(120, 120, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(iconPngPath);
      console.log('✓ Utworzono logo-icon.png');
    } else {
      console.error('✗ Nie znaleziono logo-icon.svg');
    }

    console.log('\n✓ Konwersja zakończona pomyślnie!');
  } catch (error) {
    console.error('Błąd podczas konwersji:', error);
    process.exit(1);
  }
}

convertLogos();

