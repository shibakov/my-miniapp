import { useState } from "react";

export default function RecognizePhoto({ onResult }) {
  const [loading, setLoading] = useState(false);

  const handlePhoto = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    // читаем фото → base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];

      const response = await fetch(
        "https://food-photo-analyzer-production.up.railway.app/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64 })
        }
      );

      const result = await response.json();
      setLoading(false);
      onResult(result.items);
    };

    reader.readAsDataURL(file);
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
    </div>
  );
}
