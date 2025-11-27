import { ChangeEvent, useState } from "react";
import { preprocessImage } from "../lib/image-preprocess";

interface RecognizePhotoProps {
  onResult: (items: any[]) => void;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1] ?? "";
        resolve(base64);
      } else {
        reject(new Error("Failed to read blob as data URL"));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

export default function RecognizePhoto({ onResult }: RecognizePhotoProps) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    originalSize: number;
    processedSize: number;
  } | null>(null);

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      // Preprocess image: resize, trim borders/background, compress
      const processedBlob = await preprocessImage(file);

      // Debug: log original vs processed size in KB
      const originalSizeKb = file.size / 1024;
      const processedSizeKb = processedBlob.size / 1024;
      console.log(
        `[ImagePreprocess] Original: ${originalSizeKb.toFixed(
          1
        )} KB, Processed: ${processedSizeKb.toFixed(1)} KB`
      );
      setDebugInfo({
        originalSize: file.size,
        processedSize: processedBlob.size
      });

      // Show to user exactly what we send to backend
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const url = URL.createObjectURL(processedBlob);
      setPreviewUrl(url);

      // Convert processed blob to base64 for current backend API
      const base64 = await blobToBase64(processedBlob);

      const response = await fetch(
        "https://food-photo-analyzer-production.up.railway.app/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64 })
        }
      );

      const result = await response.json();
      onResult(result.items);
    } catch (error) {
      console.error("Failed to analyze photo", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="btn">
        📸 Распознать по фото
        <input
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handlePhoto}
        />
      </label>

      {loading && <p>⏳ Анализируем фото…</p>}

      {debugInfo && (
        <p className="mt-2 text-xs text-gray-500">
          Размер: исходный {(debugInfo.originalSize / 1024).toFixed(1)} KB → отправляем{" "}
          {(debugInfo.processedSize / 1024).toFixed(1)} KB
        </p>
      )}

      {previewUrl && (
        <div className="mt-2">
          <p className="text-xs text-gray-500">Фото, отправляемое на бэкенд:</p>
          <img
            src={previewUrl}
            alt="Предобработанное фото"
            className="mt-1 max-w-full max-h-64 object-contain border rounded"
          />
        </div>
      )}
    </div>
  );
}
