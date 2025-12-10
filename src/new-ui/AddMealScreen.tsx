import React, { useState, useMemo, useRef, useCallback } from "react";
import { Search, Camera, ChevronLeft, X, Plus, ScanLine, Minus } from "lucide-react";
import { SwipeableItem } from "./SwipeableItem";
import { useMealComposer } from "@/lib/useMealComposer";
import {
  searchProducts,
  createProduct,
  createMeal,
  CATEGORY_LABELS,
  CATEGORY_BG_CLASSES,
  type SearchResult,
  type MealType,
  type CreateMealPayload
} from "@/lib/api";
import { getMealLabel } from "@/lib/meal-format";

interface AddMealScreenProps {
  onBack: () => void;
  onSave: () => void; // вызывается после успешного сохранения приёма
}

// Маппинг локализованных лейблов к типам приёма
const MEAL_TYPE_TAGS: { label: string; value: MealType }[] = [
  { label: "Завтрак", value: "Breakfast" },
  { label: "Обед", value: "Lunch" },
  { label: "Ужин", value: "Dinner" },
  { label: "Перекус", value: "Snack" }
];

export const AddMealScreen: React.FC<AddMealScreenProps> = ({ onBack, onSave }) => {
  const composer = useMealComposer();

  // --- Поиск по словарю продуктов ---
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  const searchResults = results; // для совместимости с версткой

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setLoadingSearch(true);
    try {
      const items = await searchProducts(trimmed);
      setResults(items);
    } catch (e) {
      console.error("Ошибка поиска продуктов", e);
      setResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    composer.setSaveStatus("idle");

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
  };

  const handleSelectProduct = (item: SearchResult) => {
    composer.addFromSearch(item);
    setResults([]);
    setQuery("");
  };

  // --- Создание нового продукта ---
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBrand, setCreateBrand] = useState("");
  const [createKcal, setCreateKcal] = useState("");
  const [createProtein, setCreateProtein] = useState("");
  const [createFat, setCreateFat] = useState("");
  const [createCarbs, setCreateCarbs] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const parseNumber = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(",", ".");
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  };

  const resetCreateForm = () => {
    setCreateName("");
    setCreateBrand("");
    setCreateKcal("");
    setCreateProtein("");
    setCreateFat("");
    setCreateCarbs("");
    setCreateError(null);
    setShowScanner(false);
  };

  const handleOpenCreateProduct = () => {
    setCreateName(query.trim());
    setIsCreatingProduct(true);
  };

  const simulateLabelScan = () => {
    setShowScanner(true);
    setTimeout(() => {
      setCreateName("Йогурт Греческий (Scanned)");
      setCreateBrand("Teos");
      setCreateKcal("68");
      setCreateProtein("8");
      setCreateFat("2");
      setCreateCarbs("4.2");
      setShowScanner(false);
    }, 1500);
  };

  const handleSaveCustomProduct = async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError("Укажи название продукта");
      return;
    }

    const kcal = parseNumber(createKcal);
    const protein = parseNumber(createProtein);
    const fat = parseNumber(createFat);
    const carbs = parseNumber(createCarbs);

    if (kcal == null || protein == null || fat == null || carbs == null) {
      setCreateError("Заполни все поля КБЖУ корректными числами");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await createProduct({
        product: name,
        brand: createBrand || undefined,
        category: "protein", // UI-only категория, не уходит на бэк
        kcal_100: kcal,
        protein_100: protein,
        fat_100: fat,
        carbs_100: carbs
      });

      // сразу добавляем в приём
      composer.addFromSearch(created);
      setIsCreatingProduct(false);
      resetCreateForm();
    } catch (e: any) {
      console.error("Ошибка при создании продукта", e);
      const apiError = e as { message?: string };
      if ((apiError as any).message === "MacrosRequired") {
        setCreateError("Нужно заполнить все поля КБЖУ");
      } else {
        setCreateError("Не удалось создать продукт. Попробуй ещё раз.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  // --- Выбранные продукты ---
  const weightInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleWeightChange = (id: string, newWeightStr: string) => {
    const grams = Number(newWeightStr);
    composer.updateQuantity(id, Number.isNaN(grams) ? 0 : grams);
  };

  const adjustWeight = (id: string, delta: number) => {
    const item = composer.selected.find((i) => i.id === id);
    const current = item?.quantity ?? 0;
    const next = Math.max(0, current + delta);
    composer.updateQuantity(id, next);
  };

  const handleRemove = (id: string) => {
    composer.removeItem(id);
  };

  const handleEdit = (id: string) => {
    const input = weightInputRefs.current[id];
    if (input) {
      input.focus();
      input.select();
    }
  };

  // --- Сохранение приёма ---
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave = composer.canSave && !!composer.mealType;

  const handleSaveMeal = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setSaveError(null);
    composer.setSaveStatus("idle");

    const items = composer.buildPayloadItems();
    const payload: CreateMealPayload = {
      meal_type: composer.mealType,
      items,
      created_at: new Date().toISOString()
    };

    try {
      await createMeal(payload);

      // очищаем локальное состояние
      composer.setSelected([]);
      composer.setSaveStatus("success");
      setQuery("");
      setResults([]);

      // сообщаем родителю, что приём сохранён (он обновит статистику и вернётся на home)
      onSave();
    } catch (e) {
      console.error("Ошибка при сохранении приёма", e);
      composer.setSaveStatus("error");
      setSaveError("Не удалось сохранить приём. Попробуй ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const totals = composer.totals;

  const selectedMealsCount = composer.selected.length;

  return (
    <div className="h-full flex flex-col bg-ios-bg relative">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-gray-200 sticky top-0 z-20 pt-12 sm:pt-4">
        <button
          onClick={onBack}
          className="flex items-center text-ios-blue hover:opacity-70 transition-opacity"
        >
          <ChevronLeft className="w-6 h-6" />
          <span className="text-[17px] -ml-1">Назад</span>
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">
          Добавить приём
        </h1>
        <button
          onClick={handleSaveMeal}
          disabled={!canSave || saving}
          className={`text-[17px] font-semibold transition-opacity ${
            canSave ? "text-ios-blue" : "text-gray-300"
          }`}
        >
          {saving ? "Сохраняю…" : "Сохранить"}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[180px]">
        {/* Search & Camera & Meal Type Section */}
        <div className="bg-white p-4 pb-6 shadow-sm rounded-b-[24px] mb-6">
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск продукта..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full bg-gray-100 h-10 rounded-xl pl-10 pr-10 text-[17px] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {loadingSearch && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-ios-blue rounded-full animate-spin" />
              )}
            </div>
            <button
              type="button"
              disabled
              className="w-10 h-10 bg-black/20 text-white/40 rounded-xl flex items-center justify-center shadow-md cursor-not-allowed"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Тип приёма пищи <span className="text-red-400">*</span>
            </h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {MEAL_TYPE_TAGS.map((tag) => (
                <button
                  key={tag.value}
                  onClick={() => composer.setMealType(tag.value)}
                  className={`px-4 py-2 rounded-xl text-[15px] font-medium whitespace-nowrap transition-all duration-200 border ${
                    composer.mealType === tag.value
                      ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200 scale-[1.02]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Items List */}
        {selectedMealsCount > 0 && (
          <div className="px-4 mb-6">
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
              Выбрано
            </h3>
            <div className="flex flex-col gap-3">
              {composer.selected.map((item) => {
                const kcalPer100 = item.kcal_100 ?? 0;
                const itemCals = Math.round(kcalPer100 * (item.quantity / 100));

                const protein = item.protein_100 != null ? Math.round(item.protein_100 * (item.quantity / 100)) : 0;
                const fat = item.fat_100 != null ? Math.round(item.fat_100 * (item.quantity / 100)) : 0;
                const carbs = item.carbs_100 != null ? Math.round(item.carbs_100 * (item.quantity / 100)) : 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-[20px] shadow-sm overflow-hidden"
                  >
                    <SwipeableItem
                      onEdit={() => handleEdit(item.id)}
                      onDelete={() => handleRemove(item.id)}
                    >
                      <div className="p-4 relative">
                        {/* Top Row: Name & Delete (иконка крестика оставляем как дубликат быстрого удаления) */}
                        <div className="flex justify-between items-start mb-4 pr-6">
                          <h4 className="font-semibold text-gray-900 text-[17px] leading-snug">
                            {item.product}
                          </h4>
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="absolute right-4 top-4 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Bottom Row: Macros & Weight Stepper */}
                        <div className="flex items-end justify-between">
                          {/* Left: Info */}
                          <div>
                            <div className="text-xl font-bold text-gray-900 mb-0.5">
                              {itemCals} <span className="text-sm font-medium text-gray-500">ккал</span>
                            </div>
                            <div className="text-xs text-gray-400 font-medium tracking-wide">
                              Б:{protein} Ж:{fat} У:{carbs}
                            </div>
                          </div>

                          {/* Right: Stepper Control */}
                          <div className="flex items-center bg-gray-50 rounded-xl p-1 shadow-inner ring-1 ring-gray-100">
                            <button
                              onClick={() => adjustWeight(item.id, -10)}
                              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-90 transition-transform bg-white rounded-lg shadow-sm border border-gray-100"
                            >
                              <Minus className="w-4 h-4" strokeWidth={3} />
                            </button>

                            <div className="flex items-baseline justify-center w-[72px] px-1">
                              <input
                                type="number"
                                inputMode="decimal"
                                value={item.quantity}
                                onChange={(e) => handleWeightChange(item.id, e.target.value)}
                                ref={(el) => {
                                  weightInputRefs.current[item.id] = el;
                                }}
                                className="w-full text-center bg-transparent font-bold text-gray-900 text-lg focus:outline-none p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <span className="text-xs font-medium text-gray-400 -ml-1">г</span>
                            </div>

                            <button
                              onClick={() => adjustWeight(item.id, 10)}
                              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-90 transition-transform bg-white rounded-lg shadow-sm border border-gray-100"
                            >
                              <Plus className="w-4 h-4" strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </SwipeableItem>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Results & Add Custom */}
        <div className="px-4">
          <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
            {query ? "Результаты поиска" : "Недавнее"}
          </h3>
          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden divide-y divide-gray-100">
            {searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectProduct(item)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
              >
                <div>
                  <h4 className="font-medium text-gray-900 text-[15px] mb-0.5">
                    {item.product}
                  </h4>
                  <div className="text-xs text-gray-500">
                    {item.kcal_100 != null && (
                      <>
                        {Math.round(item.kcal_100)} ккал • {" "}
                        <span className="text-gray-400">100 г</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-ios-blue flex items-center justify-center group-active:bg-ios-blue group-active:text-white transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
              </button>
            ))}

            {/* Sticky "Add Custom Product" button at the end of the list */}
            <button
              onClick={handleOpenCreateProduct}
              className="w-full p-4 flex items-center justify-center gap-2 text-ios-blue hover:bg-gray-50 active:bg-blue-50 transition-colors border-t border-gray-100"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              <span className="font-semibold text-[15px]">Создать свой продукт</span>
            </button>
          </div>
        </div>

        {saveError && (
          <div className="px-4 mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2.5">
            {saveError}
          </div>
        )}
      </div>

      {/* Sticky Bottom Summary */}
      {selectedMealsCount > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 animate-slide-up">
          <div className="p-4">
            <div className="flex justify-between items-end mb-4 px-2">
              <div>
                <div className="text-xs text-gray-400 font-medium mb-1">
                  Итого за {composer.mealType ? getMealLabel(composer.mealType as MealType) : "..."}
                </div>
                <div className="text-2xl font-bold text-gray-900 leading-none">
                  {Math.round(totals.kcal)} {" "}
                  <span className="text-base font-medium text-gray-500">ккал</span>
                </div>
              </div>
              <div className="flex gap-4 text-xs font-medium">
                <div className="text-center">
                  <div className="w-10 h-1 rounded-full bg-blue-500 mb-1"></div>
                  <span className="text-gray-500">{Math.round(totals.protein)}г</span>
                </div>
                <div className="text-center">
                  <div className="w-10 h-1 rounded-full bg-purple-500 mb-1"></div>
                  <span className="text-gray-500">{Math.round(totals.fat)}г</span>
                </div>
                <div className="text-center">
                  <div className="w-10 h-1 rounded-full bg-orange-500 mb-1"></div>
                  <span className="text-gray-500">{Math.round(totals.carbs)}г</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Product Modal (Embedded) */}
      {isCreatingProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in sm:p-4">
          <div className="bg-ios-bg w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-slide-up h-[85vh] sm:h-auto overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[22px] font-bold text-gray-900">Новый продукт</h2>
              <button
                onClick={() => {
                  setIsCreatingProduct(false);
                  resetCreateForm();
                }}
                className="p-2 bg-gray-200/50 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form Content */}
            <div className="space-y-6">
              <button
                onClick={simulateLabelScan}
                className="w-full h-12 bg-black text-white rounded-xl flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform"
                disabled={showScanner}
              >
                {showScanner ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Сканирую...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-5 h-5" />
                    Сканировать этикетку
                  </>
                )}
              </button>

              <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-100 border border-gray-100">
                <input
                  placeholder="Название продукта"
                  className="w-full bg-white h-12 px-4 text-[17px] text-gray-900 placeholder-gray-400 focus:outline-none"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
                <input
                  placeholder="Бренд (необязательно)"
                  className="w-full bg-white h-12 px-4 text-[17px] text-gray-900 placeholder-gray-400 focus:outline-none"
                  value={createBrand}
                  onChange={(e) => setCreateBrand(e.target.value)}
                />
              </div>

              <div className="pl-4 pb-1 mt-4 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Пищевая ценность на 100 г
                </span>
              </div>

              <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-100 border border-gray-100">
                <div className="flex items-center justify-between h-12 px-4">
                  <span className="text-[17px] text-gray-900">Калории</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={createKcal}
                      onChange={(e) => setCreateKcal(e.target.value)}
                    />
                    <span className="text-[17px] text-gray-400 w-8 text-right">ккал</span>
                  </div>
                </div>
                <div className="flex items-center justify-between h-12 px-4">
                  <span className="text-[17px] text-gray-900">Белки</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={createProtein}
                      onChange={(e) => setCreateProtein(e.target.value)}
                    />
                    <span className="text-[17px] text-gray-400 w-8 text-right">г</span>
                  </div>
                </div>
                <div className="flex items-center justify-between h-12 px-4">
                  <span className="text-[17px] text-gray-900">Жиры</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={createFat}
                      onChange={(e) => setCreateFat(e.target.value)}
                    />
                    <span className="text-[17px] text-gray-400 w-8 text-right">г</span>
                  </div>
                </div>
                <div className="flex items-center justify-between h-12 px-4">
                  <span className="text-[17px] text-gray-900">Углеводы</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={createCarbs}
                      onChange={(e) => setCreateCarbs(e.target.value)}
                    />
                    <span className="text-[17px] text-gray-400 w-8 text-right">г</span>
                  </div>
                </div>
              </div>

              {createError && (
                <div className="mt-1 text-xs text-red-600">{createError}</div>
              )}

              <button
                onClick={handleSaveCustomProduct}
                disabled={createLoading}
                className="w-full h-14 mt-8 bg-ios-blue text-white rounded-2xl font-bold text-[17px] shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-60"
              >
                {createLoading ? "Сохраняем…" : "Сохранить продукт"}
              </button>
              <div className="h-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
