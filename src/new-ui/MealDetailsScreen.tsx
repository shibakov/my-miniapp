import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { GramsStepper } from "@/new-ui/GramsStepper";
import { getMealLabel, formatMealTime } from "@/lib/meal-format";
import { format1 } from "@/lib/utils";
import {
  getHistoryByDay,
  updateLogItem,
  type HistoryDay,
  type HistoryMeal,
  type HistoryProductItem
} from "@/lib/api";

interface MealDetailsScreenProps {
  meal: HistoryMeal;
  /** ISO-дата дня (YYYY-MM-DD), которую мы открыли на главном экране */
  date: string;
  onBack: () => void;
  /** Вызывается после успешного изменения граммов, чтобы обновить статистику на главном экране */
  onUpdated?: () => void;
}

function isEditableDate(dateIso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(dateIso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);

  const diffDays = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  // Разрешаем правку только за сегодня и вчера
  return diffDays === 0 || diffDays === 1;
}

export const MealDetailsScreen: React.FC<MealDetailsScreenProps> = ({
  meal,
  date,
  onBack,
  onUpdated
}) => {
  const [dayData, setDayData] = useState<HistoryDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingGramsId, setUpdatingGramsId] = useState<string | null>(null);

  const editable = isEditableDate(date);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getHistoryByDay(date);
        if (!cancelled) setDayData(data);
      } catch (e) {
        console.error("Ошибка загрузки деталей приёма", e);
        if (!cancelled) setError("Не удалось загрузить данные за день");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [date, meal.meal_id]);

  const currentMeal: HistoryMeal | null = useMemo(() => {
    if (!dayData) return meal;
    const found = dayData.meals.find((m) => m.meal_id === meal.meal_id);
    return found ?? meal;
  }, [dayData, meal]);

  const handleInlineGramsChange = async (
    item: HistoryProductItem,
    grams: number
  ) => {
    if (!editable) return;

    const logItemId = item.log_item_id;
    setUpdatingGramsId(logItemId);

    try {
      await updateLogItem({ log_item_id: logItemId, grams });

      // Перезагружаем день, чтобы подтянуть пересчитанные КБЖУ
      const freshDay = await getHistoryByDay(date);
      setDayData(freshDay);

      onUpdated?.();
    } catch (e) {
      console.error("Ошибка обновления граммов", e);
      // TODO: можно показать тост/ошибку
    } finally {
      setUpdatingGramsId(null);
    }
  };

  if (!currentMeal) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
        <header className="px-4 pt-6 pb-3 bg-white shadow-sm flex items-center">
          <button
            onClick={onBack}
            className="mr-2 flex items-center text-ios-blue hover:opacity-70 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[17px] -ml-0.5">Назад</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Приём не найден</h1>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-gray-500 text-center">
            Не удалось найти данные по этому приёму. Попробуй вернуться назад и
            открыть его ещё раз.
          </p>
        </main>
      </div>
    );
  }

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date(date + "T00:00:00")),
    [date]
  );

  const mealLabel = getMealLabel(currentMeal.meal_type);
  const mealTime = formatMealTime(currentMeal.time);

  const totals = currentMeal.totals;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="px-4 pt-6 pb-3 bg-white shadow-sm flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-ios-blue hover:opacity-70 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-[17px] -ml-0.5">Назад</span>
        </button>
        <div className="flex flex-col items-end ml-3">
          <span className="text-sm font-semibold text-gray-900">{mealLabel}</span>
          <span className="text-xs text-gray-500">
            {mealTime} · {dateLabel}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-6">
        {/* Summary card */}
        <section className="px-4 mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-end">
            <div>
              <div className="text-xs text-gray-400 font-medium mb-1">
                Итого за приём
              </div>
              <div className="text-3xl font-bold text-gray-900 leading-none mb-1">
                {format1(totals.kcal)} <span className="text-base text-gray-500">ккал</span>
              </div>
              <div className="text-xs text-gray-500 font-medium flex gap-3 mt-1">
                <span>Б: {format1(totals.protein)} г</span>
                <span>Ж: {format1(totals.fat)} г</span>
                <span>У: {format1(totals.carbs)} г</span>
              </div>
            </div>
            {!editable && (
              <div className="text-[11px] text-gray-400 text-right max-w-[120px]">
                Редактирование доступно только за сегодня и вчера
              </div>
            )}
          </div>
        </section>

        {/* Items list */}
        <section className="px-4 mt-6 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 ml-1">
            Продукты в приёме
          </h2>

          {currentMeal.items.map((item) => (
            <div
              key={item.log_item_id}
              className="bg-white rounded-2xl shadow-sm mb-3 px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium text-gray-900 truncate">
                  {item.product}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {item.grams} г · ≈ {format1(item.kcal)} ккал
                </div>
                <div className="mt-1 text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Б {format1(item.protein)} г</span>
                  <span>Ж {format1(item.fat)} г</span>
                  <span>У {format1(item.carbs)} г</span>
                </div>
              </div>

              {editable && (
                <div className="shrink-0">
                  <GramsStepper
                    value={item.grams}
                    disabled={updatingGramsId === item.log_item_id}
                    onChange={(grams) => handleInlineGramsChange(item, grams)}
                  />
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="mt-2 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2.5">
              {error}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
