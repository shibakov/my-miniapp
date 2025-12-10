import React, { useMemo } from 'react';
import type { DayData } from "./types";

const DAYS_OF_WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const DateStrip: React.FC<DateStripProps> = ({ selectedDate, onSelectDate }) => {
  // Generate last 5 days + today + next 1 day (to show disabled state example)
  const days: DayData[] = useMemo(() => {
    const arr: DayData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -5; i <= 1; i++) {
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
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth()
    );
  };

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 pl-4">
      <div className="flex space-x-3">
        {days.map((day, idx) => {
          const selected = isSelected(day.date);
          const dayNum = day.date.getDate();
          const dayName = DAYS_OF_WEEK[day.date.getDay()];

          return (
            <button
              key={idx}
              disabled={day.isFuture}
              onClick={() => onSelectDate(day.date)}
              className={`
                flex flex-col items-center justify-center min-w-[56px] h-[72px] rounded-2xl transition-all duration-200
                ${day.isFuture ? 'opacity-30 grayscale cursor-not-allowed' : 'active:scale-95'}
                ${selected ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-500 shadow-sm'}
              `}
            >
              <span className={`text-xs font-medium mb-1 ${selected ? 'text-gray-300' : 'text-gray-400'}`}>
                {dayName}
              </span>
              <span className={`text-xl font-bold ${selected ? 'text-white' : 'text-gray-900'}`}>
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
