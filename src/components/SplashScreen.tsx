// src/components/SplashScreen.tsx

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`
        fixed inset-0 flex items-center justify-center 
        bg-gradient-to-b from-black via-zinc-900 to-black
        transition-opacity duration-700
        ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
      style={{ zIndex: 9999 }}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Простой сплэш без lottie-react, чтобы избежать ошибок хуков */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center rounded-[28px] bg-white/5 border border-white/10 shadow-lg shadow-black/40">
          <span className="text-4xl" role="img" aria-label="food">
            🥗
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5 mt-1">
          <div className="text-white text-xl font-semibold tracking-wide">
            Food Tracker
          </div>
          <div className="text-zinc-400 text-xs">
            Разогреваем сковородку… 🍳
          </div>
        </div>
      </div>
    </div>
  );
}
