import React, { useEffect, useMemo, useState } from "react";
import { format1 } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { getHistoryDays, getLimits, type HistoryDay } from "@/lib/api";

interface DynamicsScreenProps {
  onBack?: () => void;
}

type Timeframe = "week" | "month";
type Metric = "calories" | "macros";

interface ChartPoint {
  date: string;
  dayLabel: string;
  cals: number;
  protein: number;
  fat: number;
  carbs: number;
}

function formatDayLabel(dateIso: string) {
  const d = new Date(dateIso);
  return d.toLocaleDateString("ru-RU", {
    weekday: "short"
  });
}

function buildDeltaLabel(avg: number, target: number) {
  if (!target || !Number.isFinite(avg)) return { label: "—", color: "text-gray-400" };

  const diffPct = ((avg - target) / target) * 100;
  const rounded = Math.round(diffPct);

  if (Math.abs(rounded) <= 5) {
    return { label: "✓ Норма", color: "text-green-500" };
  }

  if (rounded > 0) {
    return { label: `+${rounded}% от цели`, color: "text-blue-500" };
  }

  return { label: `${rounded}% от цели`, color: "text-orange-500" };
}

export const DynamicsScreen: React.FC<DynamicsScreenProps> = ({ onBack }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  const [metric, setMetric] = useState<Metric>("calories");
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimitsState] = useState<{
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  } | null>(null);

  const daysCount = timeframe === "week" ? 7 : 30;

  // Загружаем лимиты один раз
  useEffect(() => {
    let cancelled = false;

    const loadLimits = async () => {
      try {
        const data = await getLimits();
        if (!cancelled) {
          setLimitsState(data);
        }
      } catch (e) {
        console.error("Ошибка загрузки лимитов", e);
      }
    };

    loadLimits();

    return () => {
      cancelled = true;
    };
  }, []);

  // Загружаем историю по дням при смене диапазона
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const days: Array<Pick<HistoryDay, "date" | "totals">> = await getHistoryDays(
          daysCount
        );

        if (cancelled) return;

        const chartPoints: ChartPoint[] = days
          .slice() // не мутируем исходный массив
          .reverse() // показываем старые дни слева, новые справа
          .map((d) => ({
            date: d.date,
            dayLabel: formatDayLabel(d.date),
            cals: d.totals.kcal,
            protein: d.totals.protein,
            fat: d.totals.fat,
            carbs: d.totals.carbs
          }));

        setPoints(chartPoints);
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
    return Math.max(...points.map((p) => p.cals));
  }, [points]);

  const averages = useMemo(() => {
    if (!points.length || !limits) return null;

    const total = points.reduce(
      (acc, p) => {
        acc.cals += p.cals;
        acc.protein += p.protein;
        acc.fat += p.fat;
        acc.carbs += p.carbs;
        return acc;
      },
      { cals: 0, protein: 0, fat: 0, carbs: 0 }
    );

    const count = points.length || 1;

    const avg = {
      cals: total.cals / count,
      protein: total.protein / count,
      fat: total.fat / count,
      carbs: total.carbs / count
    };

    return {
      avg,
      kcalStatus: buildDeltaLabel(avg.cals, limits.kcal),
      proteinStatus: buildDeltaLabel(avg.protein, limits.protein),
      fatStatus: buildDeltaLabel(avg.fat, limits.fat),
      carbsStatus: buildDeltaLabel(avg.carbs, limits.carbs)
    };
  }, [points, limits]);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 pt-14 px-4 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-slate-500 px-2 py-1 rounded-full hover:bg-slate-100"
            >
              Назад
            </button>
          )}
          <h1 className="text-3xl font-bold text-gray-900">Динамика</h1>
        </div>

        {/* Timeframe toggle */}
        <div className="bg-gray-100 p-1 rounded-xl flex">
          <button
            onClick={() => setTimeframe("week")}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all shadow-sm ${
              timeframe === "week" ? "bg-white text-gray-900" : "bg-transparent text-gray-500"
            }`}
          >
            Неделя
          </button>
          <button
            onClick={() => setTimeframe("month")}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all shadow-sm ${
              timeframe === "month" ? "bg-white text-gray-900" : "bg-transparent text-gray-500"
            }`}
          >
            Месяц
          </button>
        </div>
      </div>

      {/* Loading / error / empty states */}
      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2.5">
          {error}
        </div>
      )}

      {loading && !points.length && !error && (
        <div className="mb-3 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5">
          Загружаем динамику питания…
        </div>
      )}

      {!loading && !error && !points.length && (
        <div className="mb-3 text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-2xl px-3 py-3">
          Пока нет данных для отображения динамики. Заполни несколько дней логов
          питания, и здесь появится график.
        </div>
      )}

      {/* Main Chart Card */}
      {points.length > 0 && (
        <div className="bg-white p-5 rounded-[24px] shadow-sm mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-gray-900">
              {metric === "calories" ? "Калории по дням" : "Баланс БЖУ"}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setMetric("calories")}
                className={`w-2 h-2 rounded-full ${
                  metric === "calories" ? "bg-blue-500 ring-2 ring-blue-200" : "bg-gray-300"
                }`}
              />
              <button
                onClick={() => setMetric("macros")}
                className={`w-2 h-2 rounded-full ${
                  metric === "macros" ? "bg-blue-500 ring-2 ring-blue-200" : "bg-gray-300"
                }`}
              />
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {metric === "calories" ? (
                <AreaChart data={points}>
                  <defs>
                    <linearGradient id="colorCals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="dayLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis hide domain={[0, maxKcal ? maxKcal * 1.1 : 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                    }}
                    cursor={{ stroke: "#3B82F6", strokeWidth: 1, strokeDasharray: "4 4" }}
                    formatter={(value: number) => [format1(value), "ккал"]}
                    labelFormatter={(label: string) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="cals"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCals)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="dayLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                    dy={10}
                  />
                  <Tooltip
                    cursor={{ fill: "#F3F4F6" }}
                    contentStyle={{ borderRadius: "12px", border: "none" }}
                  />
                  <Bar dataKey="protein" stackId="a" fill="#3B82F6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="fat" stackId="a" fill="#A855F7" />
                  <Bar dataKey="carbs" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {averages && (
        <>
          <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Средние показатели</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <div className="text-gray-500 text-xs font-medium mb-1">Калории</div>
              <div className="text-2xl font-bold text-gray-900">
                {format1(averages.avg.cals)}
              </div>
              <div className={`text-xs font-medium mt-1 ${averages.kcalStatus.color}`}>
                {averages.kcalStatus.label}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <div className="text-gray-500 text-xs font-medium mb-1">Белки</div>
              <div className="text-2xl font-bold text-gray-900">
                {format1(averages.avg.protein)}г
              </div>
              <div className={`text-xs font-medium mt-1 ${averages.proteinStatus.color}`}>
                {averages.proteinStatus.label}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <div className="text-gray-500 text-xs font-medium mb-1">Жиры</div>
              <div className="text-2xl font-bold text-gray-900">
                {format1(averages.avg.fat)}г
              </div>
              <div className={`text-xs font-medium mt-1 ${averages.fatStatus.color}`}>
                {averages.fatStatus.label}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <div className="text-gray-500 text-xs font-medium mb-1">Углеводы</div>
              <div className="text-2xl font-bold text-gray-900">
                {format1(averages.avg.carbs)}г
              </div>
              <div className={`text-xs font-medium mt-1 ${averages.carbsStatus.color}`}>
                {averages.carbsStatus.label}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
