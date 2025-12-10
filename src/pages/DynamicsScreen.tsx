import { useEffect, useMemo, useState } from "react";
import { getHistoryDays, type HistoryDay } from "@/lib/api";

type Timeframe = "week" | "month";

interface DynamicsScreenProps {
  onBack?: () => void;
}

interface HistoryPoint {
  date: string;
  totals: HistoryDay["totals"];
}

function formatDateLabel(dateIso: string) {
  const d = new Date(dateIso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short"
  });
}

export default function DynamicsScreen({ onBack }: DynamicsScreenProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysCount = timeframe === "week" ? 7 : 30;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const days = await getHistoryDays(daysCount);
        if (!cancelled) {
          setPoints(days);
        }
      } catch (e) {
        console.error("Ошибка загрузки динамики", e);
        if (!cancelled) setError("Не удалось загрузить динамику питания");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [daysCount]);

  const maxKcal = useMemo(() => {
    if (!points.length) return 0;
    return Math.max(...points.map((p) => p.totals.kcal));
  }, [points]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="px-5 pt-6 pb-3 bg-white shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-slate-500 px-2 py-1 rounded-full hover:bg-slate-100"
            >
              Назад
            </button>
          )}
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Динамика</h1>
            <p className="text-xs text-gray-500">
              Как меняется твой рацион по дням
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => setTimeframe("week")}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              timeframe === "week"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            Неделя
          </button>
          <button
            type="button"
            onClick={() => setTimeframe("month")}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              timeframe === "month"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            Месяц
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-4 space-y-4">
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2.5">
            {error}
          </div>
        )}

        {loading && !points.length && (
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5">
            Загружаем динамику питания…
          </div>
        )}

        {!loading && !error && !points.length && (
          <div className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-2xl px-3 py-3">
            Пока нет данных для отображения динамики. Заполни несколько дней логов
            питания, и здесь появится график.
          </div>
        )}

        {/* Простая бар-гистограмма по дням (без внешних библиотек) */}
        {points.length > 0 && (
          <section className="bg-white rounded-[24px] shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Калории по дням
              </h2>
              <span className="text-[11px] text-slate-500">
                {timeframe === "week" ? "Последние 7 дней" : "Последние 30 дней"}
              </span>
            </div>
            <div className="mt-2 flex items-end gap-2 h-40">
              {points.map((p) => {
                const heightPercent = maxKcal
                  ? Math.round((p.totals.kcal / maxKcal) * 100)
                  : 0;
                return (
                  <div
                    key={p.date}
                    className="flex flex-col items-center justify-end flex-1 min-w-[18px]"
                  >
                    <div
                      className="w-full rounded-full bg-blue-100 flex items-end justify-center overflow-hidden"
                      style={{ height: "100%" }}
                    >
                      <div
                        className="w-full bg-blue-500 rounded-full transition-all"
                        style={{ height: `${heightPercent || 4}%` }}
                      />
                    </div>
                    <span className="mt-1 text-[10px] text-slate-500">
                      {formatDateLabel(p.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Таблица значений по дням */}
        {points.length > 0 && (
          <section className="bg-white rounded-[24px] shadow-sm px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              Подробности по дням
            </h2>
            <div className="divide-y divide-slate-100 text-[11px] text-slate-600">
              {points.map((p) => (
                <div
                  key={p.date}
                  className="flex items-center justify-between py-2 gap-3"
                >
                  <div className="flex flex-col min-w-[72px]">
                    <span className="font-medium text-slate-900">
                      {formatDateLabel(p.date)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end flex-1 text-right">
                    <span>
                      <span className="font-semibold">Ккал:</span> {Math.round(p.totals.kcal)}
                    </span>
                    <span>
                      <span className="font-semibold">Б:</span> {Math.round(p.totals.protein)} г
                    </span>
                    <span>
                      <span className="font-semibold">Ж:</span> {Math.round(p.totals.fat)} г
                    </span>
                    <span>
                      <span className="font-semibold">У:</span> {Math.round(p.totals.carbs)} г
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
