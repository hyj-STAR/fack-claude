import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const buildDir = join(process.cwd(), "build");
const iconsetDir = join(buildDir, "icon.iconset");

mkdirSync(buildDir, { recursive: true });
rmSync(iconsetDir, { recursive: true, force: true });
mkdirSync(iconsetDir, { recursive: true });

function crc32(buffer) {
  let c = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    c ^= buffer[i];
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(file, width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const rows = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0]));
    rows.push(Buffer.from(pixels.subarray(y * width * 4, (y + 1) * width * 4)));
  }

  writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function setPixel(pixels, size, x, y, rgba) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  const alpha = rgba[3] / 255;
  pixels[index] = mix(pixels[index], rgba[0], alpha);
  pixels[index + 1] = mix(pixels[index + 1], rgba[1], alpha);
  pixels[index + 2] = mix(pixels[index + 2], rgba[2], alpha);
  pixels[index + 3] = Math.max(pixels[index + 3], rgba[3]);
}

function fillCircle(pixels, size, cx, cy, radius, rgba) {
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= radius) setPixel(pixels, size, x, y, rgba);
    }
  }
}

function strokeLine(pixels, size, x1, y1, x2, y2, width, rgba) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 1.8);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    fillCircle(pixels, size, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, rgba);
  }
}

function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const d = Math.hypot(dx, dy);
      const index = (y * size + x) * 4;
      if (d <= radius) {
        const t = (x + y) / (size * 2);
        pixels[index] = mix(24, 21, t);
        pixels[index + 1] = mix(91, 132, t);
        pixels[index + 2] = mix(66, 95, t);
        pixels[index + 3] = 255;
      }
    }
  }

  fillCircle(pixels, size, center, center, size * 0.34, [236, 249, 241, 255]);
  fillCircle(pixels, size, center, center, size * 0.26, [32, 111, 74, 255]);

  const lineColor = [255, 255, 255, 255];
  const green = [107, 232, 163, 255];
  const w = Math.max(2, size * 0.055);
  strokeLine(pixels, size, size * 0.25, size * 0.52, size * 0.37, size * 0.42, w, lineColor);
  strokeLine(pixels, size, size * 0.37, size * 0.42, size * 0.48, size * 0.61, w, lineColor);
  strokeLine(pixels, size, size * 0.48, size * 0.61, size * 0.66, size * 0.34, w, lineColor);
  strokeLine(pixels, size, size * 0.66, size * 0.34, size * 0.76, size * 0.47, w, green);

  fillCircle(pixels, size, size * 0.25, size * 0.52, w * 0.65, lineColor);
  fillCircle(pixels, size, size * 0.76, size * 0.47, w * 0.65, green);

  return pixels;
}

function createPng(size, file) {
  writePng(file, size, size, renderIcon(size));
}

const macIcons = [
  ["icon_16x16.png", 16],
  ["icon_16x16@2x.png", 32],
  ["icon_32x32.png", 32],
  ["icon_32x32@2x.png", 64],
  ["icon_128x128.png", 128],
  ["icon_128x128@2x.png", 256],
  ["icon_256x256.png", 256],
  ["icon_256x256@2x.png", 512],
  ["icon_512x512.png", 512],
  ["icon_512x512@2x.png", 1024]
];

for (const [name, size] of macIcons) {
  createPng(size, join(iconsetDir, name));
}

createPng(1024, join(buildDir, "store-icon-1024.png"));

if (process.platform === "darwin" && existsSync("/usr/bin/iconutil")) {
  execFileSync("iconutil", ["-c", "icns", iconsetDir, "-o", join(buildDir, "icon.icns")], { stdio: "inherit" });
}

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const pngEntries = icoSizes.map((size) => {
  const file = join(buildDir, `icon-${size}.png`);
  createPng(size, file);
  return { size, data: readFileSync(file) };
});

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngEntries.length, 4);

let offset = 6 + pngEntries.length * 16;
const directory = [];
for (const entry of pngEntries) {
  const row = Buffer.alloc(16);
  row[0] = entry.size === 256 ? 0 : entry.size;
  row[1] = entry.size === 256 ? 0 : entry.size;
  row[2] = 0;
  row[3] = 0;
  row.writeUInt16LE(1, 4);
  row.writeUInt16LE(32, 6);
  row.writeUInt32LE(entry.data.length, 8);
  row.writeUInt32LE(offset, 12);
  offset += entry.data.length;
  directory.push(row);
}

writeFileSync(join(buildDir, "icon.ico"), Buffer.concat([
  header,
  ...directory,
  ...pngEntries.map((entry) => entry.data)
]));

console.log("Generated build/icon.icns, build/icon.ico, and build/store-icon-1024.png");
