// Chiffre les musiques pour le site (AES-GCM 256, compatible avec le navigateur).
//
//   Sources en clair : audio-source/music/*.mp3  (dossier JAMAIS envoyé sur GitHub)
//   Résultat         : public/assets/audio/music/*.bin  (12 octets d'IV + chiffré)
//   Clé              : VITE_MUSIC_KEY dans .env.local (base64, 32 octets) — créée si absente.
//
// Usage : npm run music:encrypt
import { createCipheriv, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'audio-source/music';
const OUT = 'public/assets/audio/music';
const ENV = '.env.local';

function readKey() {
  if (fs.existsSync(ENV)) {
    const m = fs.readFileSync(ENV, 'utf8').match(/^VITE_MUSIC_KEY=(.+)$/m);
    if (m) return Buffer.from(m[1].trim(), 'base64');
  }
  const key = randomBytes(32);
  const line = `VITE_MUSIC_KEY=${key.toString('base64')}\n`;
  fs.appendFileSync(ENV, (fs.existsSync(ENV) && !fs.readFileSync(ENV, 'utf8').endsWith('\n') ? '\n' : '') + line);
  console.log(`Nouvelle clé créée dans ${ENV} (à garder secrète, à copier dans le secret GitHub MUSIC_KEY).`);
  return key;
}

const key = readKey();
if (key.length !== 32) throw new Error('La clé VITE_MUSIC_KEY doit faire 32 octets (base64).');
fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const file of fs.readdirSync(SRC).filter((f) => /\.mp3$/i.test(f)).sort()) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(fs.readFileSync(path.join(SRC, file))), cipher.final(), cipher.getAuthTag()]);
  const out = path.join(OUT, file.replace(/\.mp3$/i, '.bin'));
  fs.writeFileSync(out, Buffer.concat([iv, data]));
  n++;
}
console.log(`${n} morceau(x) chiffré(s) dans ${OUT}.`);
