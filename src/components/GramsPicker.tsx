import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  // Вызывается ТОЛЬКО по нажатию «Готово» — финальное значение
  onChange: (value: number) => void;
  // Закрытие по «Отмена» или клику вне
  onClose: () => void;
}

// Эталонный диапазон 1–1000 г с шагом 1 г
const RANGE = Array.from({ length: 1000 }, (_, i) => i + 1);
const ROW_HEIGHT = 40; // высота строки как в iOS

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function GramsPicker({ value, onChange, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const snapTimeoutRef = useRef<number | null>(null);

  // Внутреннее выбранное значение, пока пользователь крутит колесо
  const [internalValue, setInternalValue] = useState<number>(() => {
    const clamped = clamp(value, 1, RANGE.length);
    return clamped;
  });

  // Закрытие по клику вне модалки
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  // Блокируем скролл фона, пока открыт пикер
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // При монтировании и смене value прокручиваем к нужной позиции
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const clamped = clamp(value, 1, RANGE.length);
    const index = clamped - 1; // RANGE начинается с 1

    // Мгновенный скролл к текущему значению
    container.scrollTo({
      top: index * ROW_HEIGHT
    });

    setInternalValue(clamped);
  }, [value]);

  // Snap к ближайшей строке после остановки скролла
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    if (snapTimeoutRef.current != null) {
      window.clearTimeout(snapTimeoutRef.current);
    }

    snapTimeoutRef.current = window.setTimeout(() => {
      const scrollTop = container.scrollTop;
      const nearestIndex = Math.round(scrollTop / ROW_HEIGHT);
      const clampedIndex = clamp(nearestIndex, 0, RANGE.length - 1);
      const grams = RANGE[clampedIndex];

      setInternalValue(grams);

      container.scrollTo({
        top: clampedIndex * ROW_HEIGHT,
        behavior: "smooth"
      });
    }, 90) as unknown as number;
  };

  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current != null) {
        window.clearTimeout(snapTimeoutRef.current);
      }
    };
  }, []);

  const handleSelect = (grams: number, index: number) => {
    const container = scrollRef.current;
    setInternalValue(grams);

    if (container) {
      container.scrollTo({
        top: index * ROW_HEIGHT,
        behavior: "smooth"
      });
    }
  };

  const handleConfirm = () => {
    onChange(internalValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity">
      <div
        ref={modalRef}
        className="w-full bg-white rounded-t-3xl p-4 pb-6 shadow-xl animate-slide-up"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3 px-2">
          <button
            type="button"
            onClick={onClose}
            className="text-blue-500 text-sm font-medium"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="text-blue-600 text-sm font-semibold"
          >
            Готово
          </button>
        </div>

        {/* Wheel container: 5 видимых строк по 40px каждая */}
        <div
          className="relative overflow-hidden"
          style={{ height: ROW_HEIGHT * 5 }}
        >
          {/* Центральная подсветка (3-я строка из 5) */}
          <div
            className="pointer-events-none absolute inset-x-6 border-y border-slate-300"
            style={{ top: ROW_HEIGHT * 2, height: ROW_HEIGHT }}
          />

          <div
            ref={scrollRef}
            className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
            onScroll={handleScroll}
            style={{
              paddingTop: ROW_HEIGHT * 2,
              paddingBottom: ROW_HEIGHT * 2
            }}
          >
            {RANGE.map((g, index) => (
              <div
                key={g}
                onClick={() => handleSelect(g, index)}
                className={`snap-center flex items-center justify-center transition-all`}
                style={{ height: ROW_HEIGHT }}
              >
                <span
                  className={
                    g === internalValue
                      ? "text-black font-semibold text-xl"
                      : "text-slate-400 text-lg"
                  }
                >
                  {g} г
                </span>
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
