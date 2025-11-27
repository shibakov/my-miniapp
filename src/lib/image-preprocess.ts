const MAX_SIDE = 700;
// JPEG качество ~80% для уменьшения размера, но без заметной потери качества
const JPEG_QUALITY = 0.8;

export async function preprocessImage(file: File): Promise<Blob> {
  const img = await loadImage(file);

  // Только ресайз до MAX_SIDE по длинной стороне
  const canvas = resizeImage(img, MAX_SIDE);

  // Простая компрессия в JPEG с фиксированным качеством
  const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY);
  return blob;
}

/**
 * File -> HTMLImageElement
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Resize image preserving aspect ratio, limiting max side to maxSide.
 * Returns a canvas with the resized image.
 */
export function resizeImage(
  img: HTMLImageElement,
  maxSide: number
): HTMLCanvasElement {
  const { width, height } = img;

  const currentMaxSide = Math.max(width, height);
  const scale = currentMaxSide > maxSide ? maxSide / currentMaxSide : 1;

  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for resize");
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas;
}

/**
 * Преобразование canvas в JPEG Blob с указанным качеством.
 */
function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to convert canvas to JPEG blob"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}
