import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getDailyStats, type DailyStats } from "@/lib/api";

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

  const kcalLeft = Math.max(stats.kcal_limit - stats.kcal_used, 0);
  const proteinLeft = Math.max(stats.protein_limit - stats.protein_used, 0);
  const fatLeft = Math.max(stats.fat_limit - stats.fat_used, 0);
  const carbsLeft = Math.max(stats.carbs_limit - stats.carbs_used, 0);

  const ratio = (used: number, limit: number) => {
    if (!limit) return 0;
    return Math.min(used / limit, 1);
  };

  const kcalRatio = ratio(stats.kcal_used, stats.kcal_limit);

  return (
    <Card className="border-slate-200 bg-white px-3 py-2.5 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-800">
          Дневной баланс
        </span>
        <span className="text-[11px] text-slate-500">
          Осталось {formatNumber(kcalLeft)} ккал
        </span>
      </div>

      {/* Прогресс по калориям */}
      <div className="mb-1.5">
        <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
          <span>
            {formatNumber(stats.kcal_used)} / {formatNumber(stats.kcal_limit)} ккал
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={
              "h-full rounded-full " +
              (kcalRatio < 0.7
                ? "bg-emerald-400"
                : kcalRatio < 1
                ? "bg-amber-400"
                : "bg-red-400")
            }
            style={{ width: `${kcalRatio * 100}%` }}
          />
        </div>
      </div>

      {/* БЖУ */}
      <div className="mt-1 grid grid-cols-3 gap-1.5 text-[10px] text-slate-600">
        <div>
          <div className="flex justify-between">
            <span>Б</span>
            <span>
              {formatNumber(stats.protein_used)} / {formatNumber(stats.protein_limit)} г
            </span>
          </div>
          <div className="mt-0.5 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-400"
              style={{
                width: `${ratio(stats.protein_used, stats.protein_limit) * 100}%`
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between">
            <span>Ж</span>
            <span>
              {formatNumber(stats.fat_used)} / {formatNumber(stats.fat_limit)} г
            </span>
          </div>
          <div className="mt-0.5 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{
                width: `${ratio(stats.fat_used, stats.fat_limit) * 100}%`
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between">
            <span>У</span>
            <span>
              {formatNumber(stats.carbs_used)} / {formatNumber(stats.carbs_limit)} г
            </span>
          </div>
          <div className="mt-0.5 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{
                width: `${ratio(stats.carbs_used, stats.carbs_limit) * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
