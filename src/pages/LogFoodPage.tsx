import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import GramsPicker from "@/components/GramsPicker";
import { Trash2 } from "lucide-react";

const API_SEARCH =
  "https://calroiesinfoms-production.up.railway.app/api/search";
const API_LOG = "https://shibakovk.app.n8n.cloud/webhook/food_log";

const DRAFT_KEY = "draft_selected_products_v2";

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

interface SearchResult {
  id?: string;
  product: string;
  brand?: string | null;
  source?: string;
  kcal_100?: number;
  protein_100?: number;
  fat_100?: number;
  carbs_100?: number;
}

interface SelectedItem {
  id: string;
  product: string;
  quantity: number;
  source?: string;
  kcal_100?: number;
  protein_100?: number;
  fat_100?: number;
  carbs_100?: number;
}

type SaveStatus = "idle" | "success" | "error";

interface PhotoAnalysisResult {
  product_name: string;
  quantity_g?: number;
  confidence?: number;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

function getMealLabel(mealType: MealType) {
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

export default function LogFoodPage() {
  const [mealType, setMealType] = useState<MealType>("Snack");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [pickerItemId, setPickerItemId] = useState<string | null>(null);

  // ---------- Photo analysis state ----------
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoResult, setPhotoResult] = useState<PhotoAnalysisResult[]>([]);
  const [photoSelected, setPhotoSelected] = useState<SelectedItem[]>([]);
  const [photoPickerId, setPhotoPickerId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoTotals, setPhotoTotals] = useState<{
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  } | null>(null);

  // ---------- Photo analysis ----------
  const handlePhoto = async (e: any) => {
    console.log("🎯 Начал анализ фото");

    const file = e.target.files[0];
    if (!file) {
      console.log("❌ Файл не выбран");
      return;
    }

    console.log("📁 Выбран файл:", { name: file.name, size: file.size, type: file.type });

    setPhotoLoading(true);
    setPhotoResult([]);
    setPhotoSelected([]);
    setPhotoError(null);

    try {
      console.log("🚀 Отправляю запрос API...");
      const formData = new FormData();
      formData.append('image', file); // API хочет 'image' поле с файлом
      console.log(" FormData подготовлен:", { file_name: file.name, file_size: file.size, file_type: file.type });

      const response = await fetch(
        "https://food-photo-analyzer-production.up.railway.app/analyze",
        {
          method: "POST",
          body: formData // multipart/form-data без заголовков
        }
      );

      console.log("📥 Ответ API:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(Object.entries(response.headers))
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API вернул ошибку:", errorText);
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Получен результат API:", result);

      const items = result.products || [];
      const totals = result.totals || null;
      console.log("🍽️ Распознанные продукты:", items);
      console.log("🏆 Totals:", totals);
      // Отладка убрана - код адаптирован под новый формат API


      // Конвертируем фото-результаты в редактируемые продукты
      const selectedProducts = items.map((item, index) => ({
        id: `photo-${item.product_name}-${index}-${Date.now()}`,
        product: item.product_name,
        quantity: Math.round(item.quantity_g || 100), // Если нет количества, ставим 100г
        source: "photo_analysis" as const,
        kcal_100: item.quantity_g && item.kcal ? (item.kcal / item.quantity_g) * 100 : (item.kcal || 0),
        protein_100: item.quantity_g && item.protein ? (item.protein / item.quantity_g) * 100 : (item.protein || 0),
        fat_100: item.quantity_g && item.fat ? (item.fat / item.quantity_g) * 100 : (item.fat || 0),
        carbs_100: item.quantity_g && item.carbs ? (item.carbs / item.quantity_g) * 100 : (item.carbs || 0),
      }));

      setPhotoResult(items);
      setPhotoSelected(selectedProducts);
      setPhotoTotals(totals);
    } catch (error) {
      console.error("💥 Общая ошибка:", error);
      setPhotoResult([]);
      setPhotoError(error instanceof Error ? error.message : "Неизвестная ошибка");
    } finally {
      setPhotoLoading(false);
      console.log("🔚 Завершен анализ фото");
    }
  };

  const searchTimeoutRef = useRef<number | null>(null);

  const isTelegram =
    typeof window !== "undefined" && !!window.Telegram?.WebApp;

  // ---------- Загрузка черновика ----------
  useEffect(() => {
    try {
      const saved =
        typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelected(parsed);
        }
      }
    } catch (e) {
      console.warn("Не удалось загрузить черновик", e);
    }
  }, []);

  // ---------- Поиск продуктов с дебаунсом ----------
  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_SEARCH}?query=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      const items = (data?.results || []) as SearchResult[];
      setResults(items);
    } catch (e) {
      console.error("Ошибка поиска:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSaveStatus("idle");

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      runSearch(value);
    }, 300) as unknown as number;
  }

  // ---------- Добавление продукта ----------
  function handleSelectProduct(item: SearchResult) {
    const id = `${item.id ?? item.product}-${Date.now()}`;

    setSelected((prev) => [
      ...prev,
      {
        id,
        product: item.product,
        quantity: 0,
        source: item.source,
        kcal_100: item.kcal_100,
        protein_100: item.protein_100,
        fat_100: item.fat_100,
        carbs_100: item.carbs_100,
      },
    ]);

    setResults([]);
    setQuery("");
    setSaveStatus("idle");
  }

  // ---------- Обновление граммовки ----------
  function handleQuantityChange(id: string, value: string) {
    const num = Number(value);
    setSelected((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Number.isNaN(num) ? 0 : num }
          : item
      )
    );
    setSaveStatus("idle");
  }

  function handleQuickAdd(id: string, grams: number) {
    setSelected((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: grams } : item))
    );
    setSaveStatus("idle");
  }

  // ---------- Удаление продукта ----------
  function handleRemove(id: string) {
    setSelected((prev) => prev.filter((item) => item.id !== id));
    setSaveStatus("idle");
  }

  // ---------- Можно ли сохранить ----------
  const canSave = useMemo(() => {
    if (!selected.length) return false;
    return selected.every((item) => item.quantity && item.quantity > 0);
  }, [selected]);

  // ---------- Подсчёт суммарных КБЖУ ----------
  const totals = useMemo(() => {
    let kcal = 0;
    let protein = 0;
    let fat = 0;
    let carbs = 0;

    for (const item of selected) {
      if (!item.quantity) continue;

      const ratio = item.quantity / 100;
      if (item.kcal_100 != null) kcal += item.kcal_100 * ratio;
      if (item.protein_100 != null) protein += item.protein_100 * ratio;
      if (item.fat_100 != null) fat += item.fat_100 * ratio;
      if (item.carbs_100 != null) carbs += item.carbs_100 * ratio;
    }

    return {
      kcal: Math.round(kcal),
      protein: Math.round(protein),
      fat: Math.round(fat),
      carbs: Math.round(carbs),
    };
  }, [selected]);

  // ---------- Сохранение ----------
  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setSaveStatus("idle");

    const logInfo = selected
      .map((s) => JSON.stringify({ product: s.product, quantity: s.quantity }))
      .join("\n");

    const payload = {
      meal_type: mealType,
      request_type: "ready to insert",
      log_info: logInfo,
    };

    try {
      const res = await fetch(API_LOG, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setSaveStatus("success");

      // очищаем черновик и состояние
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      setSelected([]);
      setQuery("");
      setResults([]);
      setPickerItemId(null);
      setPhotoPickerId(null);
      window.scrollTo({ top: 0, behavior: "smooth" });

      try {
        const tg = window.Telegram?.WebApp;
        tg?.MainButton?.hide();
        tg?.showAlert?.("🍽️ Приём пищи сохранён!");
      } catch {
        // ignore
      }
    } catch (e) {
      console.error("Ошибка при сохранении:", e);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [canSave, saving, selected, mealType]);

  // ---------- Telegram MainButton ----------
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const mainButton = tg.MainButton;

    if (canSave) {
      mainButton.setText(saving ? "Сохраняю..." : "Сохранить приём");
      mainButton.show();
      mainButton.enable();
    } else {
      mainButton.hide();
    }

    const onClick = () => {
      handleSave();
    };

    mainButton.onClick(onClick);

    return () => {
      mainButton.offClick(onClick);
    };
  }, [canSave, saving, handleSave]);

  // ---------- Авто-сохранение черновика ----------
  useEffect(() => {
    try {
      if (selected.length === 0) {
        localStorage.removeItem(DRAFT_KEY);
      } else {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(selected));
      }
    } catch (e) {
      console.warn("Не удалось сохранить черновик", e);
    }
  }, [selected]);

  const currentPickerValue =
    pickerItemId &&
    selected.find((item) => item.id === pickerItemId)?.quantity;

  // ---------- UI ----------
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="px-4 pt-4 pb-3 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight">
              Добавить приём пищи
            </h1>
            <span className="text-[11px] text-slate-500">
              Лог питания ·{" "}
              {new Date().toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
            {new Date().toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Переключатель типа приёма */}
        <div className="inline-flex w-full rounded-full bg-slate-100 p-1">
          {(["Breakfast", "Lunch", "Dinner", "Snack"] as MealType[]).map(
            (type) => {
              const active = mealType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={[
                    "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600",
                  ].join(" ")}
                >
                  {getMealLabel(type)}
                </button>
              );
            }
          )}
        </div>
      </header>

      {/* Основной контент */}
      <main className="flex-1 px-4 pt-4 overflow-y-auto space-y-4">
        {/* Поиск */}
        <section>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Поиск продукта
          </label>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Начни вводить название…"
              className="rounded-2xl border-slate-200 bg-white pr-10 text-sm"
            />
            {loading && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <span className="h-4 w-4 animate-spin rounded-full border-[2px] border-slate-300 border-t-blue-500" />
              </div>
            )}
          </div>
        </section>

        {/* Результаты поиска */}
        {!!results.length && (
          <Card className="border-slate-200 shadow-sm">
            <div className="px-3 pt-2 pb-1 text-[11px] text-slate-500 uppercase tracking-wide">
              Результаты
            </div>
            <div
              className="max-h-64 overflow-y-auto"
              style={{ scrollSnapType: 'y mandatory' }}
            >
              <div className="py-1">
                {results.map((item) => (
                  <button
                    key={item.id ?? item.product}
                    type="button"
                    onClick={() => handleSelectProduct(item)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex flex-col gap-0.5"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="text-sm font-medium text-slate-900">
                      {item.product}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[11px] text-slate-500">
                        {item.brand && <span>{item.brand} · </span>}
                        {item.kcal_100 != null && (
                          <span>{Math.round(item.kcal_100)} ккал / 100 г</span>
                        )}
                      </div>
                      {item.source && (
                        <span className="text-[10px] uppercase text-slate-400">
                          {item.source}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Анализ фото */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Добавить по фото
            </h2>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-full border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 text-xs font-medium"
              disabled={photoLoading}
            >
              <label
                htmlFor="photo-input"
                className="cursor-pointer flex items-center gap-1"
              >
                📸 {photoLoading ? "Анализируем..." : "Выбрать фото"}
              </label>
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handlePhoto}
              />
            </Button>
            {photoLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-[2px] border-blue-300 border-t-blue-500" />
            )}
          </div>

          {/* Результаты анализа фото */}
          {photoLoading && photoResult.length === 0 && (
            <Card className="border-slate-200 shadow-sm bg-blue-50/50">
              <div className="px-3 pt-2 pb-3 text-center">
                <div className="h-6 w-6 mx-auto mb-2 animate-spin rounded-full border-[2px] border-blue-300 border-t-blue-500"></div>
                <div className="text-sm font-medium text-slate-800 mb-1">
                  🍽️ Считаем калории...
                </div>
                <div className="text-[11px] text-slate-500">
                  Анализируем блюдо с помощью ИИ
                </div>
              </div>
            </Card>
          )}

          {!!photoResult.length && (
            <Card className="border-slate-200 shadow-sm bg-blue-50/50">
              <div className="px-3 pt-2 pb-1 text-[11px] text-slate-500 uppercase tracking-wide">
                <span className="flex items-center gap-1">
                  🎯 Распознанные продукты
                </span>
              </div>
              <div className="px-3 pb-3">
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {photoResult.map((item, index) => (
                      <div
                        key={`${item.product_name}-${index}`}
                        className="flex flex-col gap-1 py-2 px-3 bg-white rounded-xl border border-slate-100"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900">
                            {item.product_name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.confidence != null && `${Math.round(item.confidence * 100)}% уверенности`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {item.kcal != null && `Ккал: ${Math.round(item.kcal)}`}
                          {item.kcal != null && item.protein != null && " · "}
                          {item.protein != null && `Б: ${Math.round(item.protein)}г`}
                          {item.protein != null && item.fat != null && " · "}
                          {item.fat != null && `Ж: ${Math.round(item.fat)}г`}
                          {item.fat != null && item.carbs != null && " · "}
                          {item.carbs != null && `У: ${Math.round(item.carbs)}г`}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-full border-slate-300 bg-slate-50 px-3 text-xs font-medium"
                          onClick={() => setPhotoPickerId(photoSelected[index]?.id || "")}
                        >
                          {photoSelected[index]?.quantity > 0 ? `${photoSelected[index]?.quantity} г` : "Выбрать граммы"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-3 h-9 rounded-full border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium"
                  onClick={() => {
                    if (photoSelected.length > 0) {
                      setSelected((prev) => [...prev, ...photoSelected]);
                      setPhotoSelected([]);
                      setPhotoResult([]);
                      setPhotoTotals(null);
                      setPhotoPickerId(null);
                      setSaveStatus("idle");
                    }
                  }}
                >
                  Добавить отмеченные в приём ({photoSelected.length})
                </Button>
              </div>
            </Card>
          )}

          {photoError && (
            <Card className="border-red-200 shadow-sm bg-red-50/50">
              <div className="px-3 pt-2 pb-3 text-center">
                <div className="text-sm font-medium text-red-800 mb-1">
                  ❌ Ошибка при анализе фото
                </div>
                <div className="text-[11px] text-red-600">
                  {photoError}
                </div>
              </div>
            </Card>
          )}

          {!photoResult.length && !photoLoading && !photoError && (
            <Card className="border-dashed border-slate-300 bg-slate-50/60 text-xs text-slate-500 px-3 py-4 shadow-none">
              Выбери фото блюда, и мы попробуем распознать продукты в нём автоматически.
            </Card>
          )}
        </section>



        {/* Выбранные продукты */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Выбранные продукты
            </h2>
            {selected.length > 0 && (
              <span className="text-[11px] text-slate-500">
                {selected.length} шт.
              </span>
            )}
          </div>

          {selected.length === 0 && (
            <Card className="border-dashed border-slate-300 bg-slate-50/60 text-xs text-slate-500 px-3 py-4 shadow-none">
              Пока ничего не выбрано. Найди продукт выше и добавь его в приём
              пищи.
            </Card>
          )}

          <div className="space-y-3">
            {selected.map((item) => {
              const ratio = item.quantity / 100;
              const kcal = item.kcal_100
                ? Math.round(item.kcal_100 * ratio)
                : null;
              const protein = item.protein_100
                ? Math.round(item.protein_100 * ratio)
                : null;
              const fat = item.fat_100
                ? Math.round(item.fat_100 * ratio)
                : null;
              const carbs = item.carbs_100
                ? Math.round(item.carbs_100 * ratio)
                : null;

              const hasQuantity = item.quantity > 0;

              return (
                <Card
                  key={item.id}
                  className={[
                    "border px-3 py-2.5 rounded-2xl transition-colors",
                    hasQuantity
                      ? "border-slate-200 bg-white"
                      : "border-amber-200 bg-amber-50/60",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {item.product}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.source && (
                          <span className="text-[10px] uppercase text-slate-400">
                            {item.source}
                          </span>
                        )}
                        {!hasQuantity && (
                          <span className="text-[10px] text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                            Укажи граммы
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(item.id)}
                      className="h-7 w-7 p-0 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <span className="sr-only">Удалить</span>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-2">
                    {/* Кнопка открытия колеса граммов */}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-full border-slate-300 bg-slate-50 px-3 text-xs font-medium"
                      onClick={() => setPickerItemId(item.id)}
                    >
                      {item.quantity > 0
                        ? `${item.quantity} г`
                        : "Выбрать граммы"}
                    </Button>
                  </div>

                  {(kcal != null ||
                    protein != null ||
                    fat != null ||
                    carbs != null) && (
                    <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                      {kcal != null && <span>≈ {kcal} ккал</span>}
                      {protein != null && <span>Б {protein} г</span>}
                      {fat != null && <span>Ж {fat} г</span>}
                      {carbs != null && <span>У {carbs} г</span>}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* Итог по КБЖУ */}
        {selected.length > 0 && (
          <Card className="mt-1 border-slate-200 bg-white px-3 py-2.5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-800">
                Итого за приём
              </span>
              <span className="text-[11px] text-slate-500">
                {getMealLabel(mealType)}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
              <span>
                <span className="font-semibold">Ккал:</span> {totals.kcal}
              </span>
              <span>
                <span className="font-semibold">Б:</span> {totals.protein} г
              </span>
              <span>
                <span className="font-semibold">Ж:</span> {totals.fat} г
              </span>
              <span>
                <span className="font-semibold">У:</span> {totals.carbs} г
              </span>
            </div>
          </Card>
        )}

        {/* Статус сохранения */}
        {saveStatus === "success" && (
          <div className="mt-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs text-emerald-800">
            Приём пищи сохранён в лог.
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mt-2 rounded-2xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
            Ошибка при сохранении. Попробуй ещё раз.
          </div>
        )}
      </main>

      {/* Нижняя панель навигации + кнопка для веб-версии */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="flex justify-around px-2 pt-1 pb-1 text-[11px]">
          <div className="flex flex-col items-center text-blue-600">
            <span className="font-medium">Приём</span>
          </div>
          <div className="flex flex-col items-center text-slate-400">
            <span>История</span>
          </div>
          <div className="flex flex-col items-center text-slate-400">
            <span>Аналитика</span>
          </div>
        </div>

        {!isTelegram && (
          <div className="px-3 pb-3 pt-1 bg-white">
            <Button
              type="button"
              disabled={!canSave || saving}
              onClick={handleSave}
              className="w-full h-11 rounded-2xl text-sm font-semibold"
            >
              {saving ? "Сохраняю..." : "Сохранить приём"}
            </Button>
          </div>
        )}
      </footer>

      {/* Колесо выбора граммов */}
      {pickerItemId && (
        <GramsPicker
          value={currentPickerValue ?? 0}
          onChange={(val) => {
            setSelected((prev) =>
              prev.map((item) =>
                item.id === pickerItemId ? { ...item, quantity: val } : item
              )
            );
            setSaveStatus("idle");
          }}
          onClose={() => setPickerItemId(null)}
        />
      )}

      {/* GramsPicker for photo products */}
      {photoPickerId && (
        <GramsPicker
          value={photoSelected.find(item => item.id === photoPickerId)?.quantity ?? 0}
          onChange={(val) => {
            setPhotoSelected(prev =>
              prev.map(item =>
                item.id === photoPickerId ? { ...item, quantity: val } : item
              )
            );
            setSaveStatus("idle");
          }}
          onClose={() => setPhotoPickerId(null)}
        />
      )}
    </div>
  );
}
