import React, { useMemo, useEffect, useRef } from 'react';
import type { DayData } from "./types";

const DAYS_OF_WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const DateStrip: React.FC<DateStripProps> = ({ selectedDate, onSelectDate }) => {
  // Показываем последние 14 дней + немного будущих для наглядности
  const days: DayData[] = useMemo(() => {
    const arr: DayData[] = [];
    const today = startOfDay(new Date());

    // 14 дней назад до сегодня + 2 дня вперёд (как disabled)
    for (let i = -14; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push({
        date: d,
        isToday: i === 0,
        isFuture: i > 0,
      });
    }
    return arr;
  }, []);

  const isSelected = (d: Date) => {
    return isSameDay(d, selectedDate);
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Автоцентровка выбранной даты (или сегодняшней, если что-то пошло не так)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLButtonElement>('button[data-role="day"]');
    if (!items.length) return;

    let selectedIndex = days.findIndex((d) => isSelected(d.date));

    // если выбранная дата вне диапазона, центрируем сегодня
    if (selectedIndex === -1) {
      selectedIndex = days.findIndex((d) => d.isToday);
    }

    if (selectedIndex === -1) return;

    const selectedEl = items[selectedIndex];
    if (!selectedEl) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = selectedEl.getBoundingClientRect();

    const offset =
      itemRect.left -
      containerRect.left -
      containerRect.width / 2 +
      itemRect.width / 2;

    container.scrollTo({
      left: container.scrollLeft + offset,
      behavior: 'smooth',
    });
  }, [days, selectedDate]);

  return (
    <div ref={scrollRef} className="w-full overflow-x-auto no-scrollbar py-2 pl-4">
      <div className="flex space-x-3">
        {days.map((day, idx) => {
          const selected = isSelected(day.date);
          const dayNum = day.date.getDate();
          const dayName = DAYS_OF_WEEK[day.date.getDay()];

          return (
            <button
              key={idx}
              data-role="day"
              disabled={day.isFuture}
              onClick={() => onSelectDate(day.date)}
              className={`
                flex flex-col items-center justify-center min-w-[48px] h-[64px] rounded-2xl transition-all duration-200
                ${day.isFuture ? 'opacity-30 grayscale cursor-not-allowed' : 'active:scale-95'}
                ${selected ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-500 shadow-sm'}
              `}
            >
              <span className={`text-xs font-medium mb-1 ${selected ? 'text-gray-300' : 'text-gray-400'}`}>
                {dayName}
              </span>
              <span className={`text-lg font-bold ${selected ? 'text-white' : 'text-gray-900'}`}>
                {dayNum}
              </span>
            </button>
          );
        })}
        {/* Spacer for right padding in scroll view */}
        <div className="w-2 flex-shrink-0" />
      </div>
    </div>
  );
};
