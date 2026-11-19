// Pages CMS로 올라온 사진이 너무 크면 자동으로 줄여서 다시 저장합니다.
// 기준: 400KB 넘는 사진만, 긴 변 1600px 이하로 줄이고 JPG·WEBP는 품질 80, PNG는 무손실 압축 (파일 이름과 형식은 그대로 유지)
import sharp from 'sharp';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

const MAX = 1600;
const LIMIT = 400 * 1024;
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

let changed = 0;
for (const f of walk('assets')) {
  const ext = extname(f).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
  const size = statSync(f).size;
  if (size <= LIMIT) continue;
  const img = sharp(readFileSync(f), { failOn: 'none' })
    .rotate()
    .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true });
  let out;
  if (ext === '.png') out = await img.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer(); // PNG는 화질 손실 없이(무손실)만 줄임
  else if (ext === '.webp') out = await img.webp({ quality: 80 }).toBuffer();
  else out = await img.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  if (out.length < size * 0.9) {
    writeFileSync(f, out);
    changed++;
    console.log(`${f}: ${Math.round(size / 1024)}KB -> ${Math.round(out.length / 1024)}KB`);
  }
}
console.log(`optimized ${changed} file(s)`);
