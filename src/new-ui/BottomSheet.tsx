import React, { useCallback, useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /**
   * Текстовая кнопка слева в хедере (например, "Отмена" или "Назад").
   * Если не задана, слева ничего не рендерим.
   */
  leftLabel?: string;
  onLeftAction?: () => void;
  /**
   * Текстовая кнопка справа в хедере (например, "Готово" или "Сохранить").
   */
  rightLabel?: string;
  onRightAction?: () => void;
  rightDisabled?: boolean;
  /** Клик по тёмному фону закрывает шторку (по умолчанию true). */
  closeOnBackdrop?: boolean;
  /** Включает свайп-вниз для закрытия. */
  enableSwipeDown?: boolean;
  children: React.ReactNode;
  /** Дополнительные классы для корневого контейнера шторки. */
  className?: string;
  /** Дополнительные классы для области контента внутри шторки. */
  contentClassName?: string;
}

/**
 * Унифицированный Bottom Sheet в iOS-стиле:
 * - полупрозрачный фон с blur
 * - закруглённый верх
 * - общий хедер с текстовыми кнопками
 * - поддержка свайпа вниз для закрытия
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  leftLabel,
  onLeftAction,
  rightLabel,
  onRightAction,
  rightDisabled = false,
  closeOnBackdrop = true,
  enableSwipeDown = true,
  children,
  className = "",
  contentClassName = "",
}) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [dragY, setDragY] = useState(0);

  // Блокируем скролл фона, пока шторка открыта
  useBodyScrollLock(isOpen);
  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  // Закрытие по Esc
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!closeOnBackdrop) return;
      // не закрываем, если клик был по самой шторке
      if (sheetRef.current && sheetRef.current.contains(e.target as Node)) {
        return;
      }
      onClose();
    },
    [closeOnBackdrop, onClose]
  );

  const resetDrag = () => {
    setDragY(0);
    startYRef.current = null;
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enableSwipeDown) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!enableSwipeDown) return;
    if (!isDraggingRef.current || startYRef.current == null) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startYRef.current;

    if (deltaY <= 0) {
      // не даём тянуть вверх
      setDragY(0);
      return;
    }

    // Ограничим максимальное смещение, чтобы шторка не "улетала"
    const limited = Math.min(deltaY, 200);
    setDragY(limited);
  };

  const handleTouchEnd = () => {
    if (!enableSwipeDown) return;
    if (!isDraggingRef.current) return;

    const threshold = 80; // порог в пикселях для закрытия
    if (dragY > threshold) {
      onClose();
    }

    // Возвращаем шторку в исходное положение
    resetDrag();
  };

  const handleLeftClick = () => {
    if (onLeftAction) {
      onLeftAction();
    } else {
      onClose();
    }
  };

  const handleRightClick = () => {
    if (rightDisabled) return;
    if (onRightAction) {
      onRightAction();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`bg-ios-bg w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl min-h-[60vh] max-h-[80vh] sm:h-auto flex flex-col overflow-hidden transform transition-transform duration-200 ${className}`}
        style={{ transform: `translateY(${dragY}px)` }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        {(leftLabel || title || rightLabel) && (
          <div className="px-4 pb-2 flex items-center justify-between gap-2">
            <div className="min-w-[60px]">
              {leftLabel && (
                <button
                  type="button"
                  onClick={handleLeftClick}
                  className="text-[15px] font-medium text-ios-blue active:opacity-60 transition-opacity"
                >
                  {leftLabel}
                </button>
              )}
            </div>

            {title && (
              <div className="flex-1 text-center">
                <h2 className="text-[17px] font-semibold text-gray-900 truncate">
                  {title}
                </h2>
              </div>
            )}

            <div className="min-w-[60px] text-right">
              {rightLabel && (
                <button
                  type="button"
                  onClick={handleRightClick}
                  disabled={rightDisabled}
                  className={`text-[15px] font-semibold transition-opacity ${
                    rightDisabled ? "text-gray-300" : "text-ios-blue active:opacity-60"
                  }`}
                >
                  {rightLabel}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className={`flex-1 overflow-y-auto no-scrollbar px-4 pb-6 pb-safe overscroll-contain ${contentClassName}`}
        >
          {children}
        </div>
      </div>

      {/* Локальные анимации */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
