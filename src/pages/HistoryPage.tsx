import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GramsPicker from "@/components/GramsPicker";
import {
  getHistoryDays,
  getHistoryByDay,
  updateLogItem,
  updateProductNutrition,
  type HistoryDay,
  type HistoryMeal,
  type HistoryProductItem
} from "@/lib/api";

interface HistoryPageProps {
  onStatsChanged?: () => void;
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const diffDays = Math.floor(
    (today.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(dateStr + "T00:00:00"));
}

function formatTimeLabel(time: string) {
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage({ onStatsChanged }: HistoryPageProps) {
  const [days, setDays] = useState<Pick<HistoryDay, "date" | "totals">[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayData, setDayData] = useState<HistoryDay | null>(null);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Разрешаем правку только за сегодня и вчера.
  // Сравниваем выбранную дату из истории с сегодняшней датой по разнице в полных днях.
  const isEditableDay = (() => {
    if (!selectedDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const date = new Date(selectedDate + "T00:00:00");
    if (Number.isNaN(date.getTime())) return false;
    date.setHours(0, 0, 0, 0);

    const diffDays =
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    // Разрешаем редактировать только сегодняшний день (0) и вчерашний (1)
    return diffDays === 0 || diffDays === 1;
  })();

  const [gramsPickerItem, setGramsPickerItem] = useState<{
    logItemId: string;
    currentGrams: number;
  } | null>(null);

  const [editNutritionItem, setEditNutritionItem] =
    useState<HistoryProductItem | null>(null);
  const [editKcal, setEditKcal] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editFat, setEditFat] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [savingNutrition, setSavingNutrition] = useState(false);

  useEffect(() => {
    const loadDays = async () => {
      setLoadingDays(true);
      setError(null);
      try {
        const data = await getHistoryDays();
        setDays(data);
        if (data.length && !selectedDate) {
          setSelectedDate(data[0].date);
        }
      } catch (e) {
        console.error("Ошибка загрузки списка дней", e);
        setError("Не удалось загрузить историю");
      } finally {
        setLoadingDays(false);
      }
    };

    loadDays();
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;

    const loadDay = async () => {
      setLoadingDay(true);
      setError(null);
      try {
        const data = await getHistoryByDay(selectedDate);
        setDayData(data);
      } catch (e) {
        console.error("Ошибка загрузки истории по дню", e);
        setError("Не удалось загрузить детали дня");
      } finally {
        setLoadingDay(false);
      }
    };

    loadDay();
  }, [selectedDate]);

  const handleOpenGramsPicker = (item: HistoryProductItem) => {
    if (!isEditableDay) return;
    setGramsPickerItem({ logItemId: item.log_item_id, currentGrams: item.grams });
  };

  const handleGramsChange = async (grams: number) => {
    if (!gramsPickerItem || !selectedDate) return;

    const { logItemId } = gramsPickerItem;
    setGramsPickerItem(null);

    try {
      await updateLogItem({ log_item_id: logItemId, grams });

      // после успешного обновления перезагружаем день с сервера,
      // чтобы пересчитались КБЖУ и итоги
      const freshDay = await getHistoryByDay(selectedDate);
      setDayData(freshDay);

      onStatsChanged?.();
    } catch (e) {
      console.error("Ошибка обновления граммов", e);
      // TODO: можно показать тост/ошибку
    }
  };

  const openNutritionEditor = (item: HistoryProductItem) => {
    if (!isEditableDay) return;
    setEditNutritionItem(item);

    const grams = item.grams || 100;
    const factor = grams > 0 ? 100 / grams : 1;

    setEditKcal(String(Math.round(item.kcal * factor)));
    setEditProtein(String(Math.round(item.protein * factor)));
    setEditFat(String(Math.round(item.fat * factor)));
    setEditCarbs(String(Math.round(item.carbs * factor)));
  };

  const handleSaveNutrition = async () => {
    if (!editNutritionItem || !editNutritionItem.dict_id || !selectedDate) return;

    const kcal = Number(editKcal.replace(",", "."));
    const protein = Number(editProtein.replace(",", "."));
    const fat = Number(editFat.replace(",", "."));
    const carbs = Number(editCarbs.replace(",", "."));

    if ([kcal, protein, fat, carbs].some((n) => !Number.isFinite(n))) {
      return;
    }

    setSavingNutrition(true);
    try {
      await updateProductNutrition({
        dict_id: editNutritionItem.dict_id,
        kcal_100: kcal,
        protein_100: protein,
        fat_100: fat,
        carbs_100: carbs
      });

      // перезагружаем день, чтобы подтянуть пересчитанные КБЖУ
      const freshDay = await getHistoryByDay(selectedDate);
      setDayData(freshDay);

      setEditNutritionItem(null);
      onStatsChanged?.();
    } catch (e) {
      console.error("Ошибка обновления КБЖУ товара", e);
    } finally {
      setSavingNutrition(false);
    }
  };

  const selectedDayTotals = dayData?.totals;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-16">
      <header className="px-4 pt-4 pb-3 bg-white shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight mb-1">
          История приёмов
        </h1>
        <p className="text-[11px] text-slate-500">
          Просматривай и исправляй логи за прошлые дни.
        </p>
      </header>

      <main className="flex-1 px-4 pt-3 overflow-y-auto space-y-4">
        {/* Список дней */}
        <section>
          <h2 className="text-xs font-semibold text-slate-700 mb-2">
            Дни с логами
          </h2>
          {loadingDays && !days.length && (
            <Card className="px-3 py-2.5 text-[11px] text-slate-500">
              Загружаем историю…
            </Card>
          )}
          {error && !days.length && (
            <Card className="px-3 py-2.5 text-[11px] text-red-600">
              {error}
            </Card>
          )}
          {days.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => {
                const active = day.date === selectedDate;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={[
                      "min-w-[96px] rounded-2xl border px-3 py-2 text-left text-xs",
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-white text-slate-700"
                    ].join(" ")}
                  >
                    <div className="font-semibold mb-0.5">
                      {formatDateLabel(day.date)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {Math.round(day.totals.kcal)} ккал
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Детали выбранного дня */}
        <section>
          {!selectedDate && !loadingDay && (
            <Card className="px-3 py-3 text-[11px] text-slate-500">
              Выбери день, чтобы посмотреть историю.
            </Card>
          )}

          {selectedDate && loadingDay && !dayData && (
            <Card className="px-3 py-3 text-[11px] text-slate-500">
              Загружаем логи за выбранный день…
            </Card>
          )}

          {selectedDate && dayData && (
            <div className="space-y-3">
              {/* Итого за день */}
              {selectedDayTotals && (
                <Card className="border-slate-200 bg-white px-3 py-2.5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-800">
                      Итого за день
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDateLabel(dayData.date)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    <span>
                      <span className="font-semibold">Ккал:</span>{" "}
                      {Math.round(selectedDayTotals.kcal)}
                    </span>
                    <span>
                      <span className="font-semibold">Б:</span>{" "}
                      {Math.round(selectedDayTotals.protein)} г
                    </span>
                    <span>
                      <span className="font-semibold">Ж:</span>{" "}
                      {Math.round(selectedDayTotals.fat)} г
                    </span>
                    <span>
                      <span className="font-semibold">У:</span>{" "}
                      {Math.round(selectedDayTotals.carbs)} г
                    </span>
                  </div>
                </Card>
              )}

              {/* Приёмы внутри дня */}
              {dayData.meals.map((meal) => (
                <Card
                  key={meal.meal_id}
                  className="border-slate-200 bg-white px-3 py-2.5 rounded-2xl shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-800">
                        {meal.meal_type}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatTimeLabel(meal.time)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 text-right">
                      <div>
                        <span className="font-semibold">Ккал:</span>{" "}
                        {Math.round(meal.totals.kcal)}
                      </div>
                      <div>
                        <span className="font-semibold">БЖУ:</span>{" "}
                        {Math.round(meal.totals.protein)} /{" "}
                        {Math.round(meal.totals.fat)} /{" "}
                        {Math.round(meal.totals.carbs)} г
                      </div>
                    </div>
                  </div>

                  <div className="mt-1 space-y-2">
                    {meal.items.map((item) => (
                      <div
                        key={item.log_item_id}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-xs font-medium text-slate-900">
                              {item.product}
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {item.grams} г · ≈ {Math.round(item.kcal)} ккал
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-7 rounded-full px-2 text-[10px]"
                              onClick={() => handleOpenGramsPicker(item)}
                              disabled={!isEditableDay}
                            >
                              Изменить граммы
                            </Button>
                            {item.dict_id && (
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-7 rounded-full px-2 text-[10px] text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:hover:text-slate-500"
                                onClick={() => openNutritionEditor(item)}
                                disabled={!isEditableDay}
                              >
                                Исправить КБЖУ
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                          <span>Б {Math.round(item.protein)} г</span>
                          <span>Ж {Math.round(item.fat)} г</span>
                          <span>У {Math.round(item.carbs)} г</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* GramsPicker для изменения граммовки в истории */}
      {gramsPickerItem && (
        <GramsPicker
          value={gramsPickerItem.currentGrams}
          onChange={(val) => handleGramsChange(val)}
          onClose={() => setGramsPickerItem(null)}
        />
      )}

      {/* Модалка редактирования КБЖУ продукта в словаре */}
      {editNutritionItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full bg-white rounded-t-3xl p-4 pb-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Исправить КБЖУ
              </h2>
              <button
                type="button"
                className="text-xs text-slate-500"
                onClick={() => setEditNutritionItem(null)}
              >
                Закрыть
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-800">
                {editNutritionItem.product}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Ккал / 100 г
                  </label>
                  <input
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs"
                    value={editKcal}
                    onChange={(e) => setEditKcal(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Белки / 100 г
                  </label>
                  <input
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs"
                    value={editProtein}
                    onChange={(e) => setEditProtein(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Жиры / 100 г
                  </label>
                  <input
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs"
                    value={editFat}
                    onChange={(e) => setEditFat(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Углеводы / 100 г
                  </label>
                  <input
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs"
                    value={editCarbs}
                    onChange={(e) => setEditCarbs(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9 rounded-full text-xs"
                onClick={() => setEditNutritionItem(null)}
                disabled={savingNutrition}
              >
                Отмена
              </Button>
              <Button
                type="button"
                className="flex-1 h-9 rounded-full text-xs font-semibold"
                onClick={handleSaveNutrition}
                disabled={savingNutrition}
              >
                {savingNutrition ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
