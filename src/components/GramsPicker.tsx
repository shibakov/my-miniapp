import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
}

// 0..500 с шагом 5 г — колесо крутится быстрее, но при этом
// пользователь может ввести любое значение руками в поле ввода.
const gramsOptions = Array.from({ length: 101 }, (_, i) => i * 5);

const ITEM_HEIGHT = 44; // h-11 ≈ 44px
const CONTAINER_HEIGHT = 192; // h-48 ≈ 192px
const CENTER_OFFSET = CONTAINER_HEIGHT / 2 - ITEM_HEIGHT / 2; // смещение до центральной строки

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function GramsPicker({ value, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Внутреннее значение, которое отображается в поле ввода (любой грамм)
  const [internalValue, setInternalValue] = useState<number>(value);

  // Индекс выбранного значения на колесе (шаг 5 г)
  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    const initial = Math.round(value / 5);
    return clamp(initial, 0, gramsOptions.length - 1);
  });

  // Закрытие по клику вне модалки
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Синхронизация с внешним value (если модалка открыта для другого продукта)
  useEffect(() => {
    setInternalValue(value);
    const idx = clamp(Math.round(value / 5), 0, gramsOptions.length - 1);
    setSelectedIndex(idx);

    const container = scrollRef.current;
    if (!container) return;

    const targetScrollTop = idx * ITEM_HEIGHT - CENTER_OFFSET;
    container.scrollTop = clamp(targetScrollTop, 0, container.scrollHeight);
  }, [value]);

  // Обработчик ввода руками
  const handleManualChange = (raw: string) => {
    const numeric = Number(raw.replace(/[^0-9]/g, ""));
    if (Number.isNaN(numeric)) {
      setInternalValue(0);
      onChange(0);
      setSelectedIndex(0);
      const container = scrollRef.current;
      if (container) container.scrollTop = 0;
      return;
    }

    const clamped = clamp(numeric, 0, 500);
    setInternalValue(clamped);
    onChange(clamped);

    const idx = clamp(Math.round(clamped / 5), 0, gramsOptions.length - 1);
    setSelectedIndex(idx);

    const container = scrollRef.current;
    if (container) {
      const targetScrollTop = idx * ITEM_HEIGHT - CENTER_OFFSET;
      container.scrollTop = clamp(targetScrollTop, 0, container.scrollHeight);
    }
  };

  // Обработчик скролла: находим ближайшее значение по центру колеса
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const approxIndex = Math.round((scrollTop + CENTER_OFFSET) / ITEM_HEIGHT);
    const idx = clamp(approxIndex, 0, gramsOptions.length - 1);

    if (idx === selectedIndex) return;

    const grams = gramsOptions[idx];
    setSelectedIndex(idx);
    setInternalValue(grams);
    onChange(grams);
  };

  // Клик по конкретному значению в колесе
  const handleSelectFromWheel = (grams: number, index: number) => {
    setInternalValue(grams);
    setSelectedIndex(index);
    onChange(grams);

    const container = scrollRef.current;
    if (container) {
      const targetScrollTop = index * ITEM_HEIGHT - CENTER_OFFSET;
      container.scrollTop = clamp(targetScrollTop, 0, container.scrollHeight);
    }
  };

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

        {/* Поле для ручного ввода граммовки */}
        <div className="mb-3 px-2">
          <input
            type="number"
            min={0}
            max={500}
            value={Number.isNaN(internalValue) ? "" : internalValue}
            onChange={(e) => handleManualChange(e.target.value)}
            className="w-full h-9 rounded-2xl border border-slate-300 px-3 text-sm text-center"
          />
          <div className="mt-1 text-[11px] text-slate-500 text-center">
            Можно ввести любое значение, колесо двигается с шагом 5 г.
          </div>
        </div>

        {/* Wheel container */}
        <div className="relative h-48 overflow-hidden">
          {/* Центральная линия выбора (iOS-style) */}
          <div className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 h-11 rounded-xl border border-sky-200 bg-sky-50/30" />

          <div
            ref={scrollRef}
            className="overflow-y-scroll h-full no-scrollbar"
            onScroll={handleScroll}
          >
            {gramsOptions.map((g, index) => (
              <div
                key={g}
                onClick={() => handleSelectFromWheel(g, index)}
                className={`h-11 flex items-center justify-center text-lg transition-colors ${
                  index === selectedIndex
                    ? "text-slate-900 font-semibold"
                    : "text-slate-400"
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
