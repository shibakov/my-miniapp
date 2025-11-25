// src/components/SplashScreen.tsx

import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import animationData from "../assets/food-lotti.json";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1800);
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
        {/* Анимация с контролируемым размером */}
        <div className="w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
          <Lottie
            animationData={animationData}
            loop={true}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </div>

        {/* Текст ближе к анимации */}
        <div className="flex flex-col items-center gap-0.5">
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
