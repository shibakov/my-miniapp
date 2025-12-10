import type React from "react";
import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/new-ui/BottomSheet";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const isProgrammaticScroll = useRef(false);

  // Внутреннее выбранное значение, пока пользователь крутит колесо
  const [internalValue, setInternalValue] = useState<number>(() => {
    const clamped = clamp(value, 1, RANGE.length);
    return clamped;
  });

  // Строка для ручного ввода, всегда отображает текущий выбор
  const [customValue, setCustomValue] = useState<string>(() => {
    const clamped = clamp(value, 1, RANGE.length);
    return String(clamped);
  });


  // При монтировании и смене value прокручиваем к нужной позиции и синхронизируем customValue
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
    setCustomValue(String(clamped));
  }, [value]);

  // Snap к ближайшей строке после остановки скролла + быстрый прокрас выбранного значения
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    // Если это программный скролл (от кода), просто сбрасываем флаг и
    // не запускаем дополнительные анимации/прилипания
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }

    // Мгновенный пересчёт выделенного значения при каждом scroll-событии
    const scrollTopNow = container.scrollTop;
    const nearestIndexNow = Math.round(scrollTopNow / ROW_HEIGHT);
    const clampedIndexNow = clamp(nearestIndexNow, 0, RANGE.length - 1);
    const gramsNow = RANGE[clampedIndexNow];

    setInternalValue(gramsNow);
    setCustomValue(String(gramsNow));

    if (snapTimeoutRef.current != null) {
      window.clearTimeout(snapTimeoutRef.current);
    }

    // Небольшая задержка только для плавного "прилипания" к ближайшей строке
    snapTimeoutRef.current = window.setTimeout(() => {
      const scrollTop = container.scrollTop;
      const nearestIndex = Math.round(scrollTop / ROW_HEIGHT);
      const clampedIndex = clamp(nearestIndex, 0, RANGE.length - 1);

      isProgrammaticScroll.current = true;
      container.scrollTo({
        top: clampedIndex * ROW_HEIGHT,
        behavior: "smooth"
      });
    }, 50) as unknown as number;
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
    setCustomValue(String(grams));

    if (container) {
      isProgrammaticScroll.current = true;
      container.scrollTo({
        top: index * ROW_HEIGHT,
        behavior: "smooth"
      });
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCustomValue(raw);

    if (!raw.trim()) return; // пустое поле — не трогаем колесо

    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) return;

    const clamped = clamp(Math.round(parsed), 1, RANGE.length);
    setInternalValue(clamped);

    const container = scrollRef.current;
    if (container) {
      // Для ручного ввода делаем мгновенный скролл без анимации,
      // чтобы не было двойного "дёрганья" при каждом символе
      isProgrammaticScroll.current = true;
      container.scrollTo({
        top: (clamped - 1) * ROW_HEIGHT
      });
    }
  };

  const handleConfirm = () => {
    const normalized = customValue.trim().replace(",", ".");
    const parsed = Number(normalized);
    const isValid =
      Number.isFinite(parsed) && parsed >= 1 && parsed <= RANGE.length;

    const finalValue = isValid ? Math.round(parsed) : internalValue;

    onChange(finalValue);
    onClose();
  };

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      title="Граммы"
      leftLabel="Отмена"
      onLeftAction={onClose}
      rightLabel="Готово"
      onRightAction={handleConfirm}
      enableSwipeDown
      contentClassName="pt-2"
    >
      {/* Ручной ввод граммов */}
      <div className="mb-3 px-2">
        <label className="block text-[11px] text-slate-500 mb-1">
          Ввести граммы вручную
        </label>
        <input
          type="number"
          inputMode="decimal"
          className="w-full h-9 rounded-2xl border border-slate-300 px-3 text-sm"
          placeholder="Например, 150"
          value={customValue}
          onChange={handleCustomChange}
        />
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
              className="snap-center flex items-center justify-center transition-all"
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
    </BottomSheet>
  );
}
