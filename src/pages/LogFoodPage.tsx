import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import GramsPicker from "@/components/GramsPicker";
import DailyStatsCard from "@/components/DailyStatsCard";
import { Trash2 } from "lucide-react";
import { preprocessImage } from "@/lib/image-preprocess";
import {
  createMeal,
  searchProducts,
  createProduct,
  CATEGORY_LABELS,
  CATEGORY_BG_CLASSES,
  type PendingItem,
  type SearchResult,
  type MealType,
  type ProductCategoryKey
} from "@/lib/api";

const DRAFT_KEY = "draft_selected_products_v2";

interface SelectedItem {
  id: string; // local row id
  dict_id?: string; // id продукта в словаре (если есть)
  product: string;
  quantity: number;
  source?: string;
  category?: ProductCategoryKey;
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

// Авто-выбор типа приёма в зависимости от текущего времени
// 00:00–11:59 — Завтрак, 12:00–16:59 — Обед, 17:00+ — Ужин
function getDefaultMealType(): MealType {
  const now = new Date();
  const hours = now.getHours();

  if (hours < 12) return "Breakfast";
  if (hours < 17) return "Lunch";
  return "Dinner";
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const normalized = value.replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

interface LogFoodPageProps {
  onLogSaved?: () => void;
}

export default function LogFoodPage({ onLogSaved }: LogFoodPageProps) {
  const [mealType, setMealType] = useState<MealType>(() => getDefaultMealType());
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [productsTab, setProductsTab] = useState<"search" | "photo">("search");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Создание нового продукта
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCategoryKey, setCreateCategoryKey] =
    useState<ProductCategoryKey>("protein");
  const [createKcal, setCreateKcal] = useState("");
  const [createProtein, setCreateProtein] = useState("");
  const [createFat, setCreateFat] = useState("");
  const [createCarbs, setCreateCarbs] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoDebug, setPhotoDebug] = useState<{
    originalSize: number;
    processedSize: number;
  } | null>(null);
  const [photoTimeoutFired, setPhotoTimeoutFired] = useState(false);
  const photoAbortControllerRef = useRef<AbortController | null>(null);
  const photoTimeoutRef = useRef<number | null>(null);

  const handleClearPhotoResult = () => {
    setPhotoResult([]);
    setPhotoSelected([]);
    setPhotoTotals(null);
    setPhotoPreviewUrl(null);
    setPhotoDebug(null);
    setPhotoError(null);
    setPhotoTimeoutFired(false);
  };

  // ---------- Photo analysis ----------
  const handlePhoto = async (e: any) => {
    console.log("🎯 Начал анализ фото");
    const handleStart = performance.now();

    const file = e.target.files?.[0];
    if (!file) {
      console.log("❌ Файл не выбран");
      return;
    }

    console.log("📁 Выбран файл:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Отменяем предыдущий запрос, если он ещё идёт
    if (photoAbortControllerRef.current) {
      photoAbortControllerRef.current.abort();
    }
    if (photoTimeoutRef.current) {
      window.clearTimeout(photoTimeoutRef.current);
      photoTimeoutRef.current = null;
    }
    setPhotoTimeoutFired(false);

    const abortController = new AbortController();
    photoAbortControllerRef.current = abortController;

    // Таймер, после которого покажем fallback на ручной ввод
    photoTimeoutRef.current = window.setTimeout(() => {
      setPhotoTimeoutFired(true);
    }, 3000) as unknown as number;

    setPhotoLoading(true);
    setPhotoResult([]);
    setPhotoSelected([]);
    setPhotoError(null);

    // URLs API (через nginx proxy, чтобы не упираться в CORS)
    const RECOGNIZE_URL = "/api/recognize";
    const ANALYZE_URL = "/api/analyze";

    try {
      // ---------- Предобработка фото на клиенте ----------
      const preprocessStart = performance.now();
      const processedBlob = await preprocessImage(file);
      const preprocessEnd = performance.now();
      console.log(
        `[ImagePreprocess] Frontend preprocessing: ${(
          preprocessEnd - preprocessStart
        ).toFixed(0)} ms`
      );

      const originalSizeKb = file.size / 1024;
      const processedSizeKb = processedBlob.size / 1024;
      console.log(
        `[ImagePreprocess] Original: ${originalSizeKb.toFixed(
          1
        )} KB, Processed: ${processedSizeKb.toFixed(1)} KB`
      );

      setPhotoDebug({
        originalSize: file.size,
        processedSize: processedBlob.size
      });

      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      const previewUrl = URL.createObjectURL(processedBlob);
      setPhotoPreviewUrl(previewUrl);

      // Формируем payload ИМЕННО из обработанного изображения
      const formData = new FormData();
      formData.append(
        "image",
        processedBlob,
        file.name.replace(/\.[^.]+$/, "") + "-processed.jpg"
      );

      // ---- Функция запроса (общая) ----
      const callApi = async (url: string, signal: AbortSignal) => {
        console.log(`🚀 Запрос к API: ${url}`);
        const response = await fetch(url, {
          method: "POST",
          body: formData,
          signal
        });

        console.log("📥 Ответ API:", {
          status: response.status,
          statusText: response.statusText
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(`API error ${response.status}: ${errorText}`);
        }

        // JSON-parse fallback
        try {
          return await response.json();
        } catch (err) {
          console.error("❌ Ошибка JSON:", err);
          throw new Error("API вернул некорректный JSON");
        }
      };

      // ---------- 1 попытка — быстрый endpoint ----------
      let result;
      try {
        result = await callApi(RECOGNIZE_URL, abortController.signal);
        console.log("⚡ Успех: /recognize", result);
      } catch (err) {
        console.warn("⚠️ Fallback: переходим на /analyze", err);
        result = await callApi(ANALYZE_URL, abortController.signal);
        console.log("🐢 Успех: /analyze", result);
      }

      // ---------- Обработка данных ----------
      const items: PhotoAnalysisResult[] = result.products || [];
      const totals = result.totals || null;

      console.log("🍽️ Продукты:", items);
      console.log("🏆 Totals:", totals);

      // Превращаем фото-продукты в структуры для редактирования
      const selectedProducts: SelectedItem[] = items.map(
        (item: PhotoAnalysisResult, index: number) => ({
          id: `photo-${item.product_name}-${index}-${Date.now()}`,
          product: item.product_name,
          quantity: Math.round(item.quantity_g || 100),

          source: "photo_analysis" as const,

          kcal_100:
            item.quantity_g && item.kcal
              ? (item.kcal / item.quantity_g) * 100
              : item.kcal || 0,

          protein_100:
            item.quantity_g && item.protein
              ? (item.protein / item.quantity_g) * 100
              : item.protein || 0,

          fat_100:
            item.quantity_g && item.fat
              ? (item.fat / item.quantity_g) * 100
              : item.fat || 0,

          carbs_100:
            item.quantity_g && item.carbs
              ? (item.carbs / item.quantity_g) * 100
              : item.carbs || 0
        })
      );

      setPhotoResult(items);
      setPhotoSelected(selectedProducts);
      setPhotoTotals(totals);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("🚫 Анализ фото прерван пользователем");
      } else {
        console.error("💥 Общая ошибка:", error);
        setPhotoResult([]);
        setPhotoError(
          error instanceof Error ? error.message : "Неизвестная ошибка"
        );
      }
    } finally {
      if (photoTimeoutRef.current) {
        window.clearTimeout(photoTimeoutRef.current);
        photoTimeoutRef.current = null;
      }
      photoAbortControllerRef.current = null;
      setPhotoTimeoutFired(false);

      setPhotoLoading(false);
      const handleEnd = performance.now();
      console.log(
        `[ImagePreprocess] Frontend total (preprocess + API + UI): ${(
          handleEnd - handleStart
        ).toFixed(0)} ms`
      );
      console.log("🔚 Завершен анализ фото");
    }
  };

  const handleCancelPhoto = () => {
    if (photoAbortControllerRef.current) {
      photoAbortControllerRef.current.abort();
    }
    if (photoTimeoutRef.current) {
      window.clearTimeout(photoTimeoutRef.current);
      photoTimeoutRef.current = null;
    }

    setPhotoLoading(false);
    setPhotoTimeoutFired(false);
    setPhotoResult([]);
    setPhotoSelected([]);
    setPhotoTotals(null);

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(null);
    setPhotoDebug(null);

    setPhotoError("Распознавание отменено. Продолжи заполнять приём вручную.");
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
      const items = await searchProducts(trimmed);
      setResults(items);
    } catch (e) {
      console.error("Ошибка поиска:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const groupedResults = useMemo(
    () => {
      if (!results.length) return [] as [ProductCategoryKey | "other", SearchResult[]][];

      const map = new Map<ProductCategoryKey | "other", SearchResult[]>();

      for (const item of results) {
        const key = (item.category ?? "other") as ProductCategoryKey | "other";
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(item);
      }

      const compareByFreqAndName = (a: SearchResult, b: SearchResult) => {
        const fa = (a as any).freq_usage ?? 0;
        const fb = (b as any).freq_usage ?? 0;
        if (fa !== fb) return fb - fa;
        return a.product.localeCompare(b.product, "ru");
      };

      const order: (ProductCategoryKey | "other")[] = [
        "protein",
        "veg_fruit",
        "cards",
        "fats",
        "dairy",
        "junk_food",
        "other"
      ];

      const entries = Array.from(map.entries());
      for (const [, items] of entries) {
        items.sort(compareByFreqAndName);
      }

      entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));

      return entries;
    },
    [results]
  );

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

  // ---------- Добавление продукта из словаря ----------
  function handleSelectProduct(item: SearchResult) {
    const id = `${item.id ?? item.product}-${Date.now()}`;

    setSelected((prev) => [
      ...prev,
      {
        id,
        dict_id: item.id,
        product: item.product,
        quantity: 0,
        source: item.source ?? undefined,
        category: item.category,
        kcal_100: item.kcal_100,
        protein_100: item.protein_100,
        fat_100: item.fat_100,
        carbs_100: item.carbs_100
      }
    ]);

    setResults([]);
    setQuery("");
    setSaveStatus("idle");
  }

  // ---------- Создание нового продукта ----------
  const handleOpenCreateProduct = () => {
    setCreateName(query.trim());
    setCreateCategoryKey("protein");
    setCreateKcal("");
    setCreateProtein("");
    setCreateFat("");
    setCreateCarbs("");
    setCreateError(null);
    setShowCreateProduct(true);
  };

  const handleCreateProductSave = async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError("Укажи название продукта");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const created = await createProduct({
        product: name,
        category: createCategoryKey,
        kcal_100: parseOptionalNumber(createKcal),
        protein_100: parseOptionalNumber(createProtein),
        fat_100: parseOptionalNumber(createFat),
        carbs_100: parseOptionalNumber(createCarbs)
      });

      const id = `${created.id}-${Date.now()}`;
      const newItem: SelectedItem = {
        id,
        dict_id: created.id,
        product: created.product,
        quantity: 0,
        source: created.source ?? undefined,
        category: created.category,
        kcal_100: created.kcal_100,
        protein_100: created.protein_100,
        fat_100: created.fat_100,
        carbs_100: created.carbs_100
      };

      setSelected((prev) => [...prev, newItem]);
      setShowCreateProduct(false);
      setPickerItemId(id); // сразу спрашиваем граммы через GramsPicker
      setSaveStatus("idle");
    } catch (e) {
      console.error("Ошибка при создании продукта", e);
      setCreateError("Не удалось создать продукт. Попробуй ещё раз.");
    } finally {
      setCreateLoading(false);
    }
  };

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
      carbs: Math.round(carbs)
    };
  }, [selected]);

  // ---------- Сохранение ----------
  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setSaveStatus("idle");

    const items: PendingItem[] = selected.map((s) => ({
      id: s.id,
      dict_id: s.dict_id,
      product: s.product,
      grams: s.quantity,
      category: s.category,
      kcal_100: s.kcal_100,
      protein_100: s.protein_100,
      fat_100: s.fat_100,
      carbs_100: s.carbs_100,
      source: s.source
    }));

    const payload = {
      meal_type: mealType,
      items,
      created_at: new Date().toISOString()
    };

    try {
      await createMeal(payload);

      setSaveStatus("success");
      onLogSaved?.();

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

      // обновляем карточку дневной статистики
      setStatsRefreshKey((key) => key + 1);
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
    pickerItemId
      ? selected.find((item) => item.id === pickerItemId)?.quantity ?? 0
      : 0;

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
                month: "2-digit"
              })}
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
            {new Date().toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 overflow-y-auto space-y-4">
        {/* Карточка дневного баланса */}
        <DailyStatsCard refreshKey={statsRefreshKey} />

        {/* Переключатель типа приёма */}
        <section>
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
                        : "text-slate-600"
                    ].join(" ")}
                  >
                    {getMealLabel(type)}
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* Вкладки способа добавления продуктов */}
        <section>
          <div className="inline-flex w-full rounded-full bg-slate-100 p-1 mb-2">
            {["search", "photo"].map((key) => {
              const active = productsTab === key;
              const label = key === "search" ? "Поиск" : "Распознать по фото";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProductsTab(key as "search" | "photo")}
                  className={[
                    "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600"
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Основной контент */}
        {/* Контейнер под вкладками с фиксированной высотой и внутренним скроллом */}
        <section>
          <Card className="border-slate-200 bg-white px-3 py-2.5 rounded-2xl shadow-sm flex flex-col min-h-[260px] max-h-[360px]">
            {productsTab === "search" ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-none mb-1.5">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Поиск продукта
                  </label>
                </div>
                <div className="flex-none mb-2">
                  <div className="relative">
                    <Input
                      ref={searchInputRef}
                      value={query}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      onFocus={handleSearchFocus}
                      placeholder="Начни вводить название…"
                      className="rounded-2xl border-slate-200 bg-white pr-10 text-sm"
                    />
                    {loading && (
                      <div className="absolute inset-y-0 right-3 flex items-center">
                        <span className="h-4 w-4 animate-spin rounded-full border-[2px] border-slate-300 border-t-blue-500" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {/* Результаты поиска по категориям */}
                  {!!results.length && (
                    <div
                      className="max-h-full overflow-y-auto"
                      style={{ scrollSnapType: "y mandatory" }}
                    >
                      <div className="py-1 space-y-2">
                        {groupedResults.map(([categoryKey, items]) => {
                          const label =
                            CATEGORY_LABELS[categoryKey] ?? CATEGORY_LABELS.other;
                          const bgClass =
                            CATEGORY_BG_CLASSES[categoryKey] ??
                            CATEGORY_BG_CLASSES.other;

                          return (
                            <div key={categoryKey} className="mb-1">
                              <div className="px-3 pt-1 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                {label}
                              </div>
                              <div className="space-y-1">
                                {items.map((item) => (
                                  <button
                                    key={item.id ?? item.product}
                                    type="button"
                                    onClick={() => handleSelectProduct(item)}
                                    className={`w-full px-3 py-2 text-left transition-colors flex flex-col gap-0.5 rounded-xl hover:bg-opacity-80 ${bgClass}`}
                                    style={{ scrollSnapAlign: "start" }}
                                  >
                                    <div className="text-sm font-medium text-slate-900">
                                      {item.product}
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <div className="text-[11px] text-slate-600">
                                        {item.brand && <span>{item.brand} · </span>}
                                        {item.kcal_100 != null && (
                                          <span>
                                            {Math.round(item.kcal_100)} ккал / 100 г
                                          </span>
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
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Нет результатов */}
                  {query.trim() && !loading && results.length === 0 && (
                    <Card className="mt-2 border-dashed border-slate-300 bg-slate-50/60 text-xs text-slate-600 px-3 py-4 shadow-none">
                      Ничего не найдено по запросу «{query.trim()}». Ты можешь
                      добавить этот продукт вручную.
                    </Card>
                  )}
                </div>

                {/* Кнопка создания нового продукта */}
                {query.trim() && (
                  <div className="flex-none mt-2 pt-1 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 rounded-full text-xs font-medium border-dashed border-slate-300"
                      onClick={handleOpenCreateProduct}
                    >
                      + Добавить новый продукт
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-none mb-2">
                  <div className="flex items-center gap-2">
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
                        hidden
                        onChange={handlePhoto}
                      />
                    </Button>
                    {photoLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-[2px] border-blue-300 border-t-blue-500" />
                    )}
                    {!photoLoading &&
                      (photoResult.length > 0 || photoPreviewUrl) && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 rounded-full px-2 text-[11px] text-slate-500 hover:text-red-600 hover:bg-red-50"
                          onClick={handleClearPhotoResult}
                        >
                          Очистить
                        </Button>
                      )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {/* Статусы и результаты анализа фото */}
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

                  {photoLoading && photoTimeoutFired && (
                    <Card className="mt-2 border-amber-200 bg-amber-50/80">
                      <div className="px-3 pt-2 pb-3 text-center">
                        <div className="text-sm font-medium text-amber-900 mb-1">
                          Ожидание распознавания затянулось
                        </div>
                        <div className="text-[11px] text-amber-800 mb-2">
                          Ты можешь отменить анализ фото и продолжить вводить
                          продукты вручную.
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-full border-amber-300 bg-white text-amber-900 text-xs font-medium"
                          onClick={handleCancelPhoto}
                        >
                          Отменить распознавание
                        </Button>
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
                        <div className="max-h-40 overflow-y-auto">
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
                                    {item.confidence != null &&
                                      `${Math.round(item.confidence * 100)}% уверенности`}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600">
                                  {item.kcal != null &&
                                    `Ккал: ${Math.round(item.kcal)}`}
                                  {item.kcal != null &&
                                    item.protein != null &&
                                    " · "}
                                  {item.protein != null &&
                                    `Б: ${Math.round(item.protein)}г`}
                                  {item.protein != null &&
                                    item.fat != null &&
                                    " · "}
                                  {item.fat != null &&
                                    `Ж: ${Math.round(item.fat)}г`}
                                  {item.fat != null &&
                                    item.carbs != null &&
                                    " · "}
                                  {item.carbs != null &&
                                    `У: ${Math.round(item.carbs)}г`}
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-full border-slate-300 bg-slate-50 px-3 text-xs font-medium"
                                  onClick={() =>
                                    setPhotoPickerId(
                                      photoSelected[index]?.id ?? null
                                    )
                                  }
                                >
                                  {photoSelected[index]?.quantity > 0
                                    ? `${photoSelected[index]?.quantity} г`
                                    : "Выбрать граммы"}
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
                              setSelected((prev) => [
                                ...prev,
                                ...photoSelected
                              ]);
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
                      Выбери фото блюда, и мы попробуем распознать продукты в
                      нём автоматически.
                    </Card>
                  )}
                </div>
              </div>
            )}
          </Card>
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
                      : "border-amber-200 bg-amber-50/60"
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

      {/* Кнопка сохранения для веб-версии (вне Telegram) */}
      {!isTelegram && (
        <div className="px-4 pb-24 pt-2 bg-gradient-to-t from-white/80 to-transparent">
          <Button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="w-full h-11 rounded-2xl text-sm font-semibold shadow-md"
          >
            {saving ? "Сохраняю..." : "Сохранить приём"}
          </Button>
        </div>
      )}

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
          value={
            photoSelected.find((item) => item.id === photoPickerId)
              ?.quantity ?? 0
          }
          onChange={(val) => {
            setPhotoSelected((prev) =>
              prev.map((item) =>
                item.id === photoPickerId ? { ...item, quantity: val } : item
              )
            );
            setSaveStatus("idle");
          }}
          onClose={() => setPhotoPickerId(null)}
        />
      )}

      {/* Модалка создания нового продукта */}
      {showCreateProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full bg-white rounded-t-3xl p-4 pb-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Новый продукт
              </h2>
              <button
                type="button"
                className="text-xs text-slate-500"
                onClick={() => setShowCreateProduct(false)}
              >
                Закрыть
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Название
                </label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Например, Творог 5%"
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Категория
                </label>
                <select
                  value={createCategoryKey}
                  onChange={(e) =>
                    setCreateCategoryKey(e.target.value as ProductCategoryKey)
                  }
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-800"
                >
                  <option value="protein">{CATEGORY_LABELS.protein}</option>
                  <option value="veg_fruit">
                    {CATEGORY_LABELS.veg_fruit}
                  </option>
                  <option value="cards">{CATEGORY_LABELS.cards}</option>
                  <option value="fats">{CATEGORY_LABELS.fats}</option>
                  <option value="dairy">{CATEGORY_LABELS.dairy}</option>
                  <option value="junk_food">
                    {CATEGORY_LABELS.junk_food}
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Ккал / 100 г
                  </label>
                  <Input
                    value={createKcal}
                    onChange={(e) => setCreateKcal(e.target.value)}
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Белки / 100 г
                  </label>
                  <Input
                    value={createProtein}
                    onChange={(e) => setCreateProtein(e.target.value)}
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Жиры / 100 г
                  </label>
                  <Input
                    value={createFat}
                    onChange={(e) => setCreateFat(e.target.value)}
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Углеводы / 100 г
                  </label>
                  <Input
                    value={createCarbs}
                    onChange={(e) => setCreateCarbs(e.target.value)}
                    inputMode="decimal"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {createError && (
                <div className="mt-1 text-[11px] text-red-600">
                  {createError}
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9 rounded-full text-xs"
                onClick={() => setShowCreateProduct(false)}
                disabled={createLoading}
              >
                Отмена
              </Button>
              <Button
                type="button"
                className="flex-1 h-9 rounded-full text-xs font-semibold"
                onClick={handleCreateProductSave}
                disabled={createLoading || !createName.trim()}
              >
                {createLoading
                  ? "Создаём..."
                  : "Сохранить и выбрать граммы"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
