import { useEffect, useRef } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
}

const gramsOptions = Array.from({ length: 41 }, (_, i) => i * 5); // 0..200 step 5

export default function GramsPicker({ value, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-end justify-center bg-black/40 z-50 transition-opacity">
      <div
        ref={ref}
        className="w-full bg-white rounded-t-3xl p-4 pb-6 shadow-xl animate-slide-up"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3 px-2">
          <button
            onClick={onClose}
            className="text-blue-500 text-sm font-medium"
          >
            Отмена
          </button>

          <button
            onClick={onClose}
            className="text-blue-600 text-sm font-semibold"
          >
            Готово
          </button>
        </div>

        {/* Wheel container */}
        <div className="relative h-48 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none border-y border-gray-300" style={{ top: "50%", marginTop: -22, height: 44 }}></div>

          <div className="overflow-y-scroll h-full snap-y snap-mandatory no-scrollbar">
            {gramsOptions.map((g) => (
              <div
                key={g}
                onClick={() => onChange(g)}
                className={`snap-center h-11 flex items-center justify-center text-lg transition-colors ${
                  g === value ? "text-black font-semibold" : "text-gray-400"
                }`}
              >
                {g} г
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
