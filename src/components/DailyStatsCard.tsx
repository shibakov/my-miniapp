import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  getDailyStats,
  getDailyTopProducts,
  type DailyStats,
  type DailyTopProducts,
  type TopProductRow
} from "@/lib/api";

interface DailyStatsCardProps {
  refreshKey: number;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(value);
}

export default function DailyStatsCard({ refreshKey }: DailyStatsCardProps) {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [top, setTop] = useState<DailyTopProducts | null>(null);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [activeMacro, setActiveMacro] = useState<"protein" | "fat" | "carbs">(
    "protein"
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDailyStats();
        if (!cancelled) setStats(data);
      } catch (e) {
        console.error("Ошибка загрузки суточной статистики", e);
        if (!cancelled) setError("Не удалось загрузить статистику");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Отдельно загружаем топ-3 продуктов по макросам
  useEffect(() => {
    let cancelled = false;
    const loadTop = async () => {
      setTopLoading(true);
      setTopError(null);
      try {
        const data = await getDailyTopProducts();
        if (!cancelled) {
          setTop(data);
        }
      } catch (e) {
        console.error("Ошибка загрузки топ-3 продуктов", e);
        if (!cancelled) {
          setTopError("Не удалось загрузить топ продуктов");
        }
      } finally {
        if (!cancelled) setTopLoading(false);
      }
    };

    loadTop();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading && !stats) {
    return (
      <Card className="border-slate-200 bg-slate-50/80 px-3 py-2.5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-700">
            Дневной баланс
          </span>
          <span className="h-4 w-4 animate-spin rounded-full border-[2px] border-slate-300 border-t-blue-500" />
        </div>
        <div className="text-[11px] text-slate-500">
          Загружаем статистику за сегодня…
        </div>
      </Card>
    );
  }

  if (error && !stats) {
    return (
      <Card className="border-amber-200 bg-amber-50/80 px-3 py-2.5 rounded-2xl shadow-sm">
        <div className="text-xs font-semibold text-amber-900 mb-0.5">
          Дневной баланс
        </div>
        <div className="text-[11px] text-amber-800">{error}</div>
      </Card>
    );
  }

  if (!stats) return null;

  // Остаток теперь может быть отрицательным, чтобы было видно перебор
  const kcalLeft = stats.kcal_limit - stats.kcal_used;
  const proteinLeft = stats.protein_limit - stats.protein_used;
  const fatLeft = stats.fat_limit - stats.fat_used;
  const carbsLeft = stats.carbs_limit - stats.carbs_used;

  const ratio = (used: number, limit: number) => {
    if (!limit) return 0;
    return Math.min(used / limit, 1);
  };

  const percent = (used: number, limit: number) => {
    if (!limit) return 0;
    return (used / limit) * 100;
  };

  const kcalRatio = ratio(stats.kcal_used, stats.kcal_limit);
  const isKcalOverLimit = stats.kcal_used > stats.kcal_limit;

  const currentTopList: TopProductRow[] = (() => {
    if (!top) return [];
    if (activeMacro === "protein") return top.proteinTop;
    if (activeMacro === "fat") return top.fatTop;
    return top.carbsTop;
  })();

  return (
    <Card className="border-slate-200 bg-white px-3 py-2.5 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-800">
          Дневной баланс
        </span>
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          {isKcalOverLimit && (
            <span className="text-[10px] text-red-500">выше лимита</span>
          )}
          <span>Осталось {formatNumber(kcalLeft)} ккал</span>
        </div>
      </div>

      {/* Прогресс по калориям */}
      <div className="mb-1.5">
        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-0.5">
          <span>
            {formatNumber(stats.kcal_used)} / {formatNumber(stats.kcal_limit)} ккал
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={
              "h-full rounded-full " +
              (kcalRatio < 0.7
                ? "bg-emerald-400"
                : kcalRatio < 1
                ? "bg-amber-400"
                : "bg-red-400")
            }
            style={{ width: `${Math.min(kcalRatio, 1) * 100}%` }}
          />
        </div>
      </div>

      {/* БЖУ как пайчарты */}
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-600">
        {/* Белки */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-10 h-10 text-sky-400">
              {(() => {
                const r = 16;
                const c = 2 * Math.PI * r;
                const value = ratio(stats.protein_used, stats.protein_limit);
                const dash = c * value;
                const gap = c - dash;
                return (
                  <>
                    <circle
                      cx="20"
                      cy="20"
                      r={r}
                      fill="none"
                      stroke="#e5e7eb" // slate-200
                      strokeWidth={4}
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r={r}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${gap}`}
                      strokeDashoffset={c * 0.25}
                    />
                  </>
                );
              })()}
            </svg>
            <div className="absolute text-[8px] font-medium text-slate-700 leading-tight text-center">
              {stats.protein_limit
                ? `${Math.round(percent(stats.protein_used, stats.protein_limit))}%`
                : "—"}
            </div>
          </div>
          <div className="text-[9px] text-slate-500 text-center">
            Б {formatNumber(stats.protein_used)} / {formatNumber(stats.protein_limit)} г
            {stats.protein_used > stats.protein_limit && (
              <span className="block text-[9px] text-red-500 mt-0.5">
                выше лимита
              </span>
            )}
          </div>
        </div>

        {/* Жиры */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-10 h-10 text-amber-400">
              {(() => {
                const r = 16;
                const c = 2 * Math.PI * r;
                const value = ratio(stats.fat_used, stats.fat_limit);
                const dash = c * value;
                const gap = c - dash;
                return (
                  <>
                    <circle
                      cx="20"
                      cy="20"
                      r={r}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth={4}
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r={r}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${gap}`}
                      strokeDashoffset={c * 0.25}
                    />
                  </>
                );
              })()}
            </svg>
            <div className="absolute text-[8px] font-medium text-slate-700 leading-tight text-center">
              {stats.fat_limit
                ? `${Math.round(percent(stats.fat_used, stats.fat_limit))}%`
                : "—"}
            </div>
          </div>
          <div className="text-[9px] text-slate-500 text-center">
            Ж {formatNumber(stats.fat_used)} / {formatNumber(stats.fat_limit)} г
            {stats.fat_used > stats.fat_limit && (
              <span className="block text-[9px] text-red-500 mt-0.5">
                выше лимита
              </span>
            )}
          </div>
        </div>

        {/* Углеводы */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-10 h-10 text-emerald-400">
              {(() => {
                const r = 16;
                const c = 2 * Math.PI * r;
                const value = ratio(stats.carbs_used, stats.carbs_limit);
                const dash = c * value;
                const gap = c - dash;
                return (
                  <>
                    <circle
                      cx="20"
                      cy="20"
                      r={r}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth={4}
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r={r}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${gap}`}
                      strokeDashoffset={c * 0.25}
                    />
                  </>
                );
              })()}
            </svg>
            <div className="absolute text-[8px] font-medium text-slate-700 leading-tight text-center">
              {stats.carbs_limit
                ? `${Math.round(percent(stats.carbs_used, stats.carbs_limit))}%`
                : "—"}
            </div>
          </div>
          <div className="text-[9px] text-slate-500 text-center">
            У {formatNumber(stats.carbs_used)} / {formatNumber(stats.carbs_limit)} г
            {stats.carbs_used > stats.carbs_limit && (
              <span className="block text-[9px] text-red-500 mt-0.5">
                выше лимита
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Топ-3 продуктов по макросам */}
      <div className="mt-3 text-[10px] text-slate-600">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-800">
            Топ-3 продуктов
          </span>
          <div className="inline-flex rounded-full bg-slate-100 p-0.5">
            {[
              { key: "protein" as const, label: "Б" },
              { key: "fat" as const, label: "Ж" },
              { key: "carbs" as const, label: "У" }
            ].map((tab) => {
              const active = activeMacro === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveMacro(tab.key)}
                  className={[
                    "px-2 py-0.5 rounded-full text-[9px] font-medium",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600"
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {topLoading && !top && (
          <div className="text-slate-500">
            Загружаем топ продуктов за сегодня…
          </div>
        )}

        {!topLoading && topError && (
          <div className="text-red-500">{topError}</div>
        )}

        {!topLoading && !topError && currentTopList.length === 0 && (
          <div className="text-slate-500">
            За сегодня ещё нет продуктов в этой категории.
          </div>
        )}

        {!topLoading && !topError && currentTopList.length > 0 && (
          <div className="space-y-0.5">
            {currentTopList.map((row) => (
              <div
                key={row.product}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate max-w-[55%] text-slate-800">
                  {row.product}
                </span>
                <span className="text-slate-500">
                  {Math.round(row.totalGrams)} г · {Math.round(row.totalKcal)} ккал
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
