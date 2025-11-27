const MAX_SIDE = 900;
const JPEG_MAX_QUALITY = 0.88;
// позволяем чуть больше сжатия при необходимости
const JPEG_MIN_QUALITY = 0.8;
// более жёсткий таргет без заметной потери качества
const TARGET_MAX_BYTES = 280 * 1024;

export async function preprocessImage(file: File): Promise<Blob> {
  const img = await loadImage(file);

  let canvas = resizeImage(img, MAX_SIDE);

  const borderBox = detectBorderBox(canvas);
  if (borderBox) {
    canvas = cropCanvas(canvas, borderBox);
  }

  canvas = removeBackgroundSimple(canvas);
  canvas = cropToSquare(canvas);

  const blob = await compress(canvas);
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

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Detects border box by scanning from edges and trimming uniform/white/black borders.
 * Returns null if no significant border is detected.
 */
export function detectBorderBox(canvas: HTMLCanvasElement): CropBox | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for detectBorderBox");
  }

  const width = canvas.width;
  const height = canvas.height;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const isBorderColor = (r: number, g: number, b: number): boolean => {
    const isWhite = r > 245 && g > 245 && b > 245;
    const isBlack = r < 10 && g < 10 && b < 10;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const isUniform = maxC - minC <= 5;
    return isWhite || isBlack || isUniform;
  };

  const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 200));

  const columnIsBorder = (x: number): boolean => {
    let borderCount = 0;
    let totalCount = 0;
    for (let y = 0; y < height; y += sampleStep) {
      const idx = 4 * (y * width + x);
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (isBorderColor(r, g, b)) {
        borderCount++;
      }
      totalCount++;
    }
    // Consider border if vast majority of pixels are border-like
    return totalCount > 0 && borderCount / totalCount > 0.95;
  };

  const rowIsBorder = (y: number): boolean => {
    let borderCount = 0;
    let totalCount = 0;
    for (let x = 0; x < width; x += sampleStep) {
      const idx = 4 * (y * width + x);
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (isBorderColor(r, g, b)) {
        borderCount++;
      }
      totalCount++;
    }
    return totalCount > 0 && borderCount / totalCount > 0.95;
  };

  let left = 0;
  let right = width - 1;
  let top = 0;
  let bottom = height - 1;

  while (left < width && columnIsBorder(left)) left++;
  while (right >= 0 && columnIsBorder(right)) right--;
  while (top < height && rowIsBorder(top)) top++;
  while (bottom >= 0 && rowIsBorder(bottom)) bottom--;

  // Ensure valid box and that we are actually cropping something
  if (left >= right || top >= bottom) {
    return null;
  }
  const margin = 1;
  const x = Math.max(0, left - margin);
  const y = Math.max(0, top - margin);
  const w = Math.min(width - x, right - left + 1 + 2 * margin);
  const h = Math.min(height - y, bottom - top + 1 + 2 * margin);

  // If cropping is negligible, skip
  const croppedArea = w * h;
  const originalArea = width * height;
  if (croppedArea / originalArea > 0.98) {
    return null;
  }

  return { x, y, w, h };
}

/**
 * Crop canvas to given box.
 */
export function cropCanvas(
  canvas: HTMLCanvasElement,
  box: CropBox
): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = box.w;
  dst.height = box.h;

  const ctx = dst.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for cropCanvas");
  }

  ctx.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);

  return dst;
}

/**
 * Simple background removal based on color clustering (k-means k=2 on edge samples)
 * and trimming to the bounding box of non-background pixels.
 */
export function removeBackgroundSimple(
  canvas: HTMLCanvasElement
): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for removeBackgroundSimple");
  }

  const width = canvas.width;
  const height = canvas.height;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  interface RGB {
    r: number;
    g: number;
    b: number;
  }

  const samples: RGB[] = [];
  const maxSamples = 2000;

  const addSample = (x: number, y: number) => {
    const idx = 4 * (y * width + x);
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    samples.push({ r, g, b });
  };

  // Sample from borders (likely background)
  const borderThicknessX = Math.max(1, Math.floor(width * 0.1));
  const borderThicknessY = Math.max(1, Math.floor(height * 0.1));

  for (let x = 0; x < width && samples.length < maxSamples; x += 2) {
    for (
      let y = 0;
      y < borderThicknessY && samples.length < maxSamples;
      y += 2
    ) {
      addSample(x, y);
    }
    for (
      let y = height - borderThicknessY;
      y < height && samples.length < maxSamples;
      y += 2
    ) {
      addSample(x, y);
    }
  }

  for (let y = 0; y < height && samples.length < maxSamples; y += 2) {
    for (
      let x = 0;
      x < borderThicknessX && samples.length < maxSamples;
      x += 2
    ) {
      addSample(x, y);
    }
    for (
      let x = width - borderThicknessX;
      x < width && samples.length < maxSamples;
      x += 2
    ) {
      addSample(x, y);
    }
  }

  if (samples.length === 0) {
    return canvas;
  }

  // k-means with k=2 on sampled colors
  let c1 = { ...samples[0] };
  let c2 = { ...samples[Math.floor(samples.length / 2)] };

  const dist2 = (a: RGB, b: RGB) => {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return dr * dr + dg * dg + db * db;
  };

  for (let iter = 0; iter < 6; iter++) {
    const cluster1: RGB[] = [];
    const cluster2: RGB[] = [];

    for (const s of samples) {
      const d1 = dist2(s, c1);
      const d2 = dist2(s, c2);
      if (d1 <= d2) {
        cluster1.push(s);
      } else {
        cluster2.push(s);
      }
    }

    const recompute = (cluster: RGB[], fallback: RGB): RGB => {
      if (cluster.length === 0) return fallback;
      let r = 0,
        g = 0,
        b = 0;
      for (const s of cluster) {
        r += s.r;
        g += s.g;
        b += s.b;
      }
      return {
        r: r / cluster.length,
        g: g / cluster.length,
        b: b / cluster.length,
      };
    };

    c1 = recompute(cluster1, c1);
    c2 = recompute(cluster2, c2);
  }

  // Background is the cluster with more samples
  let bgColor: RGB;
  {
    let count1 = 0;
    let count2 = 0;
    for (const s of samples) {
      const d1 = dist2(s, c1);
      const d2 = dist2(s, c2);
      if (d1 <= d2) {
        count1++;
      } else {
        count2++;
      }
    }
    bgColor = count1 >= count2 ? c1 : c2;
  }

  // Determine bounding box of non-background pixels
  // Чуть более строгий порог: фон режется агрессивнее, но still safe
  const bgThreshold = 35; // color distance threshold in RGB space
  const bgThreshold2 = bgThreshold * bgThreshold;

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  const step = 1; // you can increase step (2,3) for performance if needed
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = 4 * (y * width + x);
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const d2 =
        (r - bgColor.r) * (r - bgColor.r) +
        (g - bgColor.g) * (g - bgColor.g) +
        (b - bgColor.b) * (b - bgColor.b);
      const isBackground = d2 <= bgThreshold2;

      if (!isBackground) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    // Could not find clear foreground
    return canvas;
  }

  // поменьше отступ, чтобы меньше тащить фона
  const margin = Math.floor(Math.min(width, height) * 0.015);
  const x = Math.max(0, minX - margin);
  const y = Math.max(0, minY - margin);
  const w = Math.min(width - x, maxX - minX + 1 + 2 * margin);
  const h = Math.min(height - y, maxY - minY + 1 + 2 * margin);

  // If bounding box is almost whole image, skip
  const croppedArea = w * h;
  const originalArea = width * height;
  // делаем порог чуть менее щадящим: больше случаев реально обрезаем
  if (croppedArea / originalArea > 0.97) {
    return canvas;
  }

  return cropCanvas(canvas, { x, y, w, h });
}

/**
 * Crop to centered square.
 */
export function cropToSquare(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = canvas.width;
  const height = canvas.height;

  if (width === height) {
    return canvas;
  }

  const size = Math.min(width, height);
  const x = Math.max(0, Math.round(width / 2 - size / 2));
  const y = Math.max(0, Math.round(height / 2 - size / 2));

  return cropCanvas(canvas, { x, y, w: size, h: size });
}

/**
 * JPEG compression helper with simple quality adjustment
 * to try to stay under TARGET_MAX_BYTES.
 */
export async function compress(canvas: HTMLCanvasElement): Promise<Blob> {
  let quality = JPEG_MAX_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);

  // If larger than target size, reduce quality but not below JPEG_MIN_QUALITY
  while (blob.size > TARGET_MAX_BYTES && quality > JPEG_MIN_QUALITY) {
    quality = Math.max(JPEG_MIN_QUALITY, quality - 0.02);
    blob = await canvasToJpegBlob(canvas, quality);
  }

  return blob;
}

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
