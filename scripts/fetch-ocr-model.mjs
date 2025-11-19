import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_URL = 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz';
const DEST_PATH = path.resolve(__dirname, '../public/tesseract/lang-data/eng.traineddata.gz');

const args = process.argv.slice(2);
const force = args.includes('--force');
const sourceUrl = process.env.OCR_MODEL_URL ?? DEFAULT_URL;

async function isValidGzip(filePath) {
  try {
    const file = await stat(filePath);
    if (file.size === 0) return false;
    const buffer = await readFileChunk(filePath, 2);
    return buffer[0] === 0x1f && buffer[1] === 0x8b;
  } catch {
    return false;
  }
}

async function readFileChunk(filePath, length) {
  return await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { start: 0, end: length - 1 });
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function download(url, dest) {
  await mkdir(path.dirname(dest), { recursive: true });
  console.log(`Downloading OCR model from ${url} …`);
  await new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        response.resume();
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await writeFile(dest, buffer);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
  if (!(await isValidGzip(dest))) {
    throw new Error('Downloaded file is not a valid gzip archive. Please retry.');
  }
}

const run = async () => {
  if (!force && (await isValidGzip(DEST_PATH))) {
    console.log('OCR model already exists. Use --force to re-download.');
    return;
  }
  await download(sourceUrl, DEST_PATH);
  console.log(`Saved OCR model to ${DEST_PATH}`);
};

run().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
