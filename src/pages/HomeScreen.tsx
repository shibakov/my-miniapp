import { useEffect, useMemo, useState } from "react";
import { DateStrip } from "@/new-ui/DateStrip";
import { CalorieCard } from "@/new-ui/CalorieCard";
import { MacroSection } from "@/new-ui/MacroSection";
import { DailyTip } from "@/new-ui/DailyTip";
import { MealList } from "@/new-ui/MealList";
import {
  getDailyStats,
  getHistoryByDay,
  type DailyStats,
  type HistoryDay,
  type HistoryMeal,
} from "@/lib/api";

interface HomeScreenProps {
  refreshKey: number;
  onAddMeal: () => void;
  onOpenMeal: (meal: HistoryMeal, dateIso: string) => void;
}

export default function HomeScreen({
  refreshKey,
  onAddMeal,
  onOpenMeal,
}: HomeScreenProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Ограничиваем переход не более чем на 14 дней назад
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const minDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() - 14);
    return d;
  }, [today]);

  const clampDate = (candidate: Date) => {
    const c = new Date(candidate);
    c.setHours(0, 0, 0, 0);
    if (c < minDate) return minDate;
    if (c > today) return today;
    return c;
  };

  // Локальная дата без UTC-сдвигов, чтобы при переключении дней не "прыгали" цифры
  const dateIso = useMemo(() => {
    const d = selectedDate;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [selectedDate]);

  const [dayData, setDayData] = useState<HistoryDay | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [history, dailyStats] = await Promise.all([
          getHistoryByDay(dateIso),
          getDailyStats(dateIso),
        ]);

        if (!cancelled) {
          setDayData(history);
          setStats(dailyStats);
        }
      } catch (e) {
        console.error("Ошибка загрузки данных за день", e);
        if (!cancelled)
          setError("Не удалось загрузить данные за выбранный день");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [dateIso, refreshKey]);

  const weekdayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
      })
        .format(selectedDate)
        .replace(/^./, (ch) => ch.toUpperCase()),
    [selectedDate]
  );

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "long",
      }).format(selectedDate),
    [selectedDate]
  );

  const currentKcal = stats?.kcal_used ?? 0;
  const targetKcal = stats?.kcal_limit ?? 0;

  const proteinCurrent = stats?.protein_used ?? 0;
  const proteinTarget = stats?.protein_limit ?? 0;
  const fatCurrent = stats?.fat_used ?? 0;
  const fatTarget = stats?.fat_limit ?? 0;
  const carbsCurrent = stats?.carbs_used ?? 0;
  const carbsTarget = stats?.carbs_limit ?? 0;

  // Открытие деталей приёма (передаём наверх выбранный приём и дату дня)
  const handleEditMeal = (meal: HistoryMeal) => {
    onOpenMeal(meal, dateIso);
  };

  const handleDeleteMeal = (_meal: HistoryMeal) => {
    // TODO: добавить реальное удаление приёма из лога
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="px-5 pt-6 pb-3 bg-white shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Easy Diet 🥗
          </h1>
          <p className="text-gray-500 text-xs font-medium">
            {weekdayLabel}, {dateLabel}
          </p>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto no-scrollbar pb-6"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          (e.currentTarget as any).dataset.swipeStartX = String(touch.clientX);
          (e.currentTarget as any).dataset.swipeStartY = String(touch.clientY);
        }}
        onTouchEnd={(e) => {
          const startX = parseFloat(
            (e.currentTarget as any).dataset.swipeStartX || "0"
          );
          const startY = parseFloat(
            (e.currentTarget as any).dataset.swipeStartY || "0"
          );
          const touch = e.changedTouches[0];
          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;

          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          // Игнорируем вертикальные свайпы и слишком короткие движения
          if (absX < 40 || absX < absY) return;

          // Свайп влево -> следующий день, но не дальше сегодня
          if (deltaX < 0) {
            const next = new Date(selectedDate);
            next.setDate(selectedDate.getDate() + 1);
            setSelectedDate(clampDate(next));
          }

          // Свайп вправо -> предыдущий день, но не старше minDate
          if (deltaX > 0) {
            const prev = new Date(selectedDate);
            prev.setDate(selectedDate.getDate() - 1);
            setSelectedDate(clampDate(prev));
          }
        }}
      >
        {/* Date picker strip */}
        <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* Daily calories card */}
        {stats && (
          <CalorieCard current={currentKcal} target={targetKcal || 1} />
        )}

        {/* Macros */}
        {stats && (
          <MacroSection
            proteinCurrent={proteinCurrent}
            proteinTarget={proteinTarget || 1}
            fatCurrent={fatCurrent}
            fatTarget={fatTarget || 1}
            carbsCurrent={carbsCurrent}
            carbsTarget={carbsTarget || 1}
          />
        )}

        {/* Error state for stats/history */}
        {error && (
          <div className="mx-4 mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2.5">
            {error}
          </div>
        )}

        {/* Daily tip (static for now) */}
        <DailyTip />

        {/* Meals list for the selected day */}
        <MealList
          meals={dayData?.meals ?? []}
          onAddMeal={onAddMeal}
          onEditMeal={handleEditMeal}
          onDeleteMeal={handleDeleteMeal}
        />

        {/* Loading indicator overlay for initial load */}
        {loading && !dayData && !stats && (
          <div className="mx-4 mt-4 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5">
            Загружаем данные за выбранный день…
          </div>
        )}
      </main>
    </div>
  );
}
