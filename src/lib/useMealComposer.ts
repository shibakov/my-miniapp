import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MealType,
  PendingItem,
  ProductCategoryKey,
  SearchResult
} from "@/lib/api";

export interface SelectedItem {
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

export type SaveStatus = "idle" | "success" | "error";

export interface MealComposerOptions {
  draftStorageKey?: string;
}

export interface UseMealComposerResult {
  mealType: MealType;
  setMealType: (type: MealType) => void;

  selected: SelectedItem[];
  setSelected: React.Dispatch<React.SetStateAction<SelectedItem[]>>;

  addFromSearch: (item: SearchResult) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, grams: number) => void;

  canSave: boolean;
  totals: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  };

  saving: boolean;
  saveStatus: SaveStatus;
  setSaveStatus: (s: SaveStatus) => void;

  buildPayloadItems: () => PendingItem[];
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

export function useMealComposer(
  options: MealComposerOptions = {}
): UseMealComposerResult {
  const draftKey = options.draftStorageKey ?? "draft_selected_products_v2";

  const [mealType, setMealType] = useState<MealType>(() => getDefaultMealType());
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // -------- Загрузка черновика --------
  useEffect(() => 
  {
    try {
      const saved =
        typeof window !== "undefined" ? localStorage.getItem(draftKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelected(parsed);
        }
      }
    } catch (e) {
      console.warn("Не удалось загрузить черновик", e);
    }
  }, [draftKey]);

  // -------- Сохранение черновика --------
  useEffect(() => {
    try {
      if (selected.length === 0) {
        localStorage.removeItem(draftKey);
      } else {
        localStorage.setItem(draftKey, JSON.stringify(selected));
      }
    } catch (e) {
      console.warn("Не удалось сохранить черновик", e);
    }
  }, [selected, draftKey]);

  // -------- Операции с выбранными продуктами --------
  const addFromSearch = useCallback((item: SearchResult) => {
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

    setSaveStatus("idle");
  }, []);

  const removeItem = useCallback((id: string) => {
    setSelected((prev) => prev.filter((item) => item.id !== id));
    setSaveStatus("idle");
  }, []);

  const updateQuantity = useCallback((id: string, grams: number) => {
    setSelected((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Number.isNaN(grams) ? 0 : grams }
          : item
      )
    );
    setSaveStatus("idle");
  }, []);

  // -------- Можно ли сохранить --------
  const canSave = useMemo(() => {
    if (!selected.length) return false;
    return selected.every((item) => item.quantity && item.quantity > 0);
  }, [selected]);

  // -------- Подсчёт суммарных КБЖУ --------
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

  const buildPayloadItems = useCallback((): PendingItem[] => {
    return selected.map((s) => ({
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
  }, [selected]);

  return {
    mealType,
    setMealType,
    selected,
    setSelected,
    addFromSearch,
    removeItem,
    updateQuantity,
    canSave,
    totals,
    saving,
    saveStatus,
    setSaveStatus,
    buildPayloadItems
  };
}
