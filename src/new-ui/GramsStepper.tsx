import React, { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";

export interface GramsStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

/**
 * Унифицированный inline-степпер для выбора граммовки.
 * - Шаг по умолчанию 5 г.
 * - Кнопки "+" / "-" и ручной ввод.
 */
export const GramsStepper: React.FC<GramsStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 5,
  disabled = false,
  className = "",
}) => {
  const [internal, setInternal] = useState<number>(() =>
    clamp(roundToStep(Number.isFinite(value) ? value : 0, step), min, max)
  );

  // Синхронизация при изменении внешнего value
  useEffect(() => {
    const next = clamp(roundToStep(Number.isFinite(value) ? value : 0, step), min, max);
    setInternal(next);
  }, [value, min, max, step]);

  const apply = (next: number) => {
    const clamped = clamp(roundToStep(next, step), min, max);
    setInternal(clamped);
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  const handleDec = () => {
    if (disabled) return;
    apply(internal - step);
  };

  const handleInc = () => {
    if (disabled) return;
    apply(internal + step);
  };

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const raw = e.target.value;
    if (!raw.trim()) {
      setInternal(0);
      return;
    }
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    setInternal(parsed);
  };

  const handleBlur = () => {
    apply(internal);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div
      className={
        "flex items-center bg-gray-50 rounded-xl p-1 shadow-inner ring-1 ring-gray-100 " +
        (disabled ? "opacity-60 pointer-events-none " : "") +
        className
      }
    >
      <button
        type="button"
        onClick={handleDec}
        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-90 transition-transform bg-white rounded-lg shadow-sm border border-gray-100"
        disabled={disabled}
      >
        <Minus className="w-4 h-4" strokeWidth={3} />
      </button>

      <div className="flex items-baseline justify-center w-[72px] px-1">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(internal) ? internal : ""}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full text-center bg-transparent font-bold text-gray-900 text-lg focus:outline-none p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          disabled={disabled}
        />
        <span className="text-xs font-medium text-gray-400 -ml-1">г</span>
      </div>

      <button
        type="button"
        onClick={handleInc}
        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-90 transition-transform bg-white rounded-lg shadow-sm border border-gray-100"
        disabled={disabled}
      >
        <Plus className="w-4 h-4" strokeWidth={3} />
      </button>
    </div>
  );
};
