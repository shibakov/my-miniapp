import { useEffect } from "react";

/**
 * Блокирует скролл body/html, пока isLocked = true.
 * Делает это аккуратно: фиксирует текущую позицию и возвращает её при разблокировке.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const documentElement = document.documentElement;
    const body = document.body;

    const scrollY = window.scrollY || window.pageYOffset;

    const prevHtmlOverflow = documentElement.style.overflow;
    const prevHtmlPosition = documentElement.style.position;
    const prevHtmlTop = documentElement.style.top;
    const prevHtmlWidth = documentElement.style.width;

    // Фиксируем страницу
    documentElement.style.overflow = "hidden";
    documentElement.style.position = "fixed";
    documentElement.style.top = `-${scrollY}px`;
    documentElement.style.width = "100%";

    // На всякий случай запрещаем вертикальный скролл body
    const prevBodyOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      // Возвращаем исходные стили
      documentElement.style.overflow = prevHtmlOverflow;
      documentElement.style.position = prevHtmlPosition;
      documentElement.style.top = prevHtmlTop;
      documentElement.style.width = prevHtmlWidth;
      body.style.overflow = prevBodyOverflow;

      // Восстанавливаем позицию скролла
      const y = Math.abs(parseInt(prevHtmlTop || "0", 10));
      if (!Number.isNaN(y) && y > 0) {
        window.scrollTo(0, y);
      } else {
        window.scrollTo(0, scrollY);
      }
    };
  }, [isLocked]);
}
