/**
 * Génère les icônes PNG de la PWA à partir de public/icons/icon.svg.
 * À relancer seulement si l'icône change :
 *   npm install --no-save sharp && node scripts/generate-icons.cjs
 */
const path = require("node:path");
const sharp = require("sharp");

const dir = path.join(__dirname, "..", "public", "icons");
const svg = path.join(dir, "icon.svg");

async function main() {
  await sharp(svg).resize(192, 192).png().toFile(path.join(dir, "icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(path.join(dir, "icon-512.png"));
  await sharp(svg).resize(180, 180).png().toFile(path.join(dir, "apple-touch-icon.png"));
  // Maskable : Android découpe l'icône en cercle, on laisse une marge de sécurité.
  await sharp(svg)
    .resize(360, 360)
    .flatten({ background: "#0b1210" })
    .extend({ top: 76, bottom: 76, left: 76, right: 76, background: "#0b1210" })
    .png()
    .toFile(path.join(dir, "maskable-512.png"));
}

main().then(() => console.log("Icônes générées dans public/icons"));
