import imageCompression from 'browser-image-compression';

const baseUrl = (import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/');
const compressionLibUrl = `${baseUrl}vendor/browser-image-compression.js`;

export async function compressToWebp(file: File | Blob, maxWidth = 2560) {
  const options = {
    maxWidthOrHeight: maxWidth,
    initialQuality: 0.7,
    fileType: 'image/webp',
    useWebWorker: true,
    libURL: compressionLibUrl,
  } as imageCompression.Options;
  const out = await imageCompression(file, options);
  // サムネイル用に小さめも
  const thumb = await imageCompression(file, {
    maxWidthOrHeight: 512,
    initialQuality: 0.7,
    fileType: 'image/webp',
    useWebWorker: true,
    libURL: compressionLibUrl,
  });
  return { blob: out, thumb };
}
