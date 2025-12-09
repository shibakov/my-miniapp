import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DailyStatsCard from "@/components/DailyStatsCard";
import { getHistoryByDay, type HistoryDay, type HistoryMeal } from "@/lib/api";

interface HomeMealsPageProps {
  statsRefreshKey: number;
  onAddMeal: () => void;
}

function getMealLabel(mealType: string) {
  switch (mealType) {
    case "Breakfast":
      return "Завтрак";
    case "Lunch":
      return "Обед";
    case "Dinner":
      return "Ужин";
    case "Snack":
      return "Перекус";
    default:
      return mealType;
  }
}

function formatTimeLabel(time: string) {
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function buildProductsLine(meal: HistoryMeal): string {
  if (!meal.items.length) return "";
  const names = meal.items.map((it) => it.product);
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;

  let line = shown.join(", ");
  if (rest > 0) {
    line += ` + ещё ${rest}`;
  }
  return line;
}

export default function HomeMealsPage({
  statsRefreshKey,
  onAddMeal
}: HomeMealsPageProps) {
  const todayIso = useMemo(
    () => new Date().toISOString().slice(0, 10),
    []
  );

  const [dayData, setDayData] = useState<HistoryDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getHistoryByDay(todayIso);
        if (!cancelled) setDayData(data);
      } catch (e) {
        console.error("Ошибка загрузки приёмов за сегодня", e);
        if (!cancelled) setError("Не удалось загрузить приёмы за сегодня");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [todayIso, statsRefreshKey]);

  const todayDate = useMemo(() => new Date(), []);
  const weekdayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        weekday: "long"
      })
        .format(todayDate)
        .replace(/^./, (ch) => ch.toUpperCase()),
    [todayDate]
  );
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "long"
      }).format(todayDate),
    [todayDate]
  );

  const hasMeals = !!dayData && dayData.meals.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="px-4 pt-4 pb-3 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight">Привет! 👋</h1>
            <span className="text-[11px] text-slate-500">
              {weekdayLabel}, {dateLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 pb-4 overflow-y-auto space-y-4">
        {/* Карточка дневного баланса */}
        <DailyStatsCard refreshKey={statsRefreshKey} />

        {/* Секция "Сегодня" со списком приёмов */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">Сегодня</h2>
            {hasMeals && (
              <span className="text-[11px] text-slate-500">
                {dayData?.meals.length} приёма(ов)
              </span>
            )}
          </div>

          {loading && !dayData && (
            <Card className="px-3 py-3 text-[11px] text-slate-500 bg-slate-50/80 border-slate-200">
              Загружаем приёмы за сегодня…
            </Card>
          )}

          {error && !hasMeals && !loading && (
            <Card className="px-3 py-3 text-[11px] text-red-600 bg-red-50/60 border-red-200">
              {error}
            </Card>
          )}

          {hasMeals && (
            <div className="space-y-2">
              {dayData!.meals.map((meal) => {
                const productsLine = buildProductsLine(meal);
                return (
                  <Card
                    key={meal.meal_id}
                    className="border-slate-200 bg-white px-3 py-2.5 rounded-2xl shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">
                          {getMealLabel(meal.meal_type)}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatTimeLabel(meal.time)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 text-right">
                        <span className="font-semibold">{Math.round(meal.totals.kcal)}</span>{" "}
                        ккал
                      </div>
                    </div>

                    {productsLine && (
                      <div className="text-[11px] text-slate-600 mb-1 line-clamp-2">
                        {productsLine}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                      <span>
                        <span className="font-semibold">Б:</span>{" "}
                        {Math.round(meal.totals.protein)} г
                      </span>
                      <span>
                        <span className="font-semibold">Ж:</span>{" "}
                        {Math.round(meal.totals.fat)} г
                      </span>
                      <span>
                        <span className="font-semibold">У:</span>{" "}
                        {Math.round(meal.totals.carbs)} г
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && !hasMeals && !error && (
            <Card className="border-dashed border-slate-300 bg-slate-50/60 px-3 py-4 text-xs text-slate-500 shadow-none">
              За сегодня пока нет ни одного приёма. Нажми кнопку ниже, чтобы
              добавить первый.
            </Card>
          )}
        </section>

        {/* CTA добавить приём */}
        <section>
          <Card className="border-slate-200 bg-white px-3 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900 mb-0.5">
                Добавить приём пищи
              </div>
              <div className="text-[11px] text-slate-500">
                Укажи, что ты съел, мы посчитаем калории и БЖУ.
              </div>
            </div>
            <Button
              type="button"
              className="h-9 rounded-full px-4 text-xs font-semibold"
              onClick={onAddMeal}
            >
              Добавить
            </Button>
          </Card>
        </section>
      </main>
    </div>
  );
}
