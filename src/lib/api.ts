// Central API layer with types and real HTTP implementations
// Adapted to the current backend contract described in the task

// --- Shared types used across UI ---

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack" | string;

export type ProductCategoryKey =
  | "cards"
  | "fats"
  | "protein"
  | "veg_fruit"
  | "junk_food"
  | "dairy"; // UI-only categorisation

export interface SearchResult {
  id: string;
  product: string;
  brand?: string | null;
  source?: string | null;
  category?: ProductCategoryKey;
  freq_usage?: number;
  last_used?: string | null;
  kcal_100?: number;
  protein_100?: number;
  fat_100?: number;
  carbs_100?: number;
}

export interface CreateProductInput {
  product: string;
  category: ProductCategoryKey; // UI-only, не уходит на бэк
  kcal_100?: number;
  protein_100?: number;
  fat_100?: number;
  carbs_100?: number;
  brand?: string | null;
}

export interface PendingItem {
  id: string; // локальный ID строки в UI
  dict_id?: string; // id продукта в словаре (если есть)
  product: string;
  grams: number;
  category?: ProductCategoryKey;
  kcal_100?: number;
  protein_100?: number;
  fat_100?: number;
  carbs_100?: number;
  source?: string;
}

export interface CreateMealPayload {
  meal_type: MealType;
  items: PendingItem[];
  created_at?: string; // не используется бэком, но оставляем для будущего
}

// UI-тип для карточки дневной статистики
export interface DailyStats {
  date: string; // YYYY-MM-DD
  kcal_limit: number;
  kcal_used: number;
  protein_limit: number;
  protein_used: number;
  fat_limit: number;
  fat_used: number;
  carbs_limit: number;
  carbs_used: number;
}

// Типы для истории (агрегированная структура поверх /api/stats/daily)
export interface HistoryProductItem {
  log_item_id: string; // id записи food_log
  dict_id?: string; // id продукта в словаре, если вернётся с бэка
  product: string;
  grams: number;
  category?: ProductCategoryKey;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface HistoryMeal {
  meal_id: string;
  meal_type: MealType;
  time: string; // ISO string
  items: HistoryProductItem[];
  totals: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

export interface HistoryDay {
  date: string; // YYYY-MM-DD
  totals: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  meals: HistoryMeal[];
}

// --- Backend DTO types ---

// /api/search
interface BackendSearchItem {
  source: string; // "local" | "usda" | ...
  id: number;
  product: string;
  brand: string | null;
  product_type: string | null;
  freq_usage: number | null;
  last_used_at: string | null;
  kcal_100: number | null;
  protein_100: number | null;
  fat_100: number | null;
  carbs_100: number | null;
  meta: unknown | null;
}

interface BackendSearchResponse {
  query: string;
  limit: number;
  source?: string; // "local" | "usda" | ...
  counts?: {
    local: number;
    usda: number;
    off: number;
    total: number;
  };
  status?: string; // "not_found" и т.п.
  results?: BackendSearchItem[];
}

// /api/auto-add и /api/dict/update /api/dict/create_via_gpt
interface BackendFoodDictItem {
  id: number;
  product: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  kcal_100: string | number; // бэк может вернуть как текстовое число
  protein_100: string | number;
  fat_100: string | number;
  carbs_100: string | number;
}

// /api/dict/product — персональный словарь пользователя
interface BackendDictProduct {
  id: number;
  product: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  kcal_100: number | null;
  protein_100: number | null;
  fat_100: number | null;
  carbs_100: number | null;
}

export interface DictProduct {
  id: string; // UI-friendly
  product: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  kcal_100: number | null;
  protein_100: number | null;
  fat_100: number | null;
  carbs_100: number | null;
}

function mapBackendDictProduct(p: BackendDictProduct): DictProduct {
  return {
    id: String(p.id),
    product: p.product,
    source: p.source,
    created_at: p.created_at,
    updated_at: p.updated_at,
    kcal_100: p.kcal_100,
    protein_100: p.protein_100,
    fat_100: p.fat_100,
    carbs_100: p.carbs_100
  };
}

// /api/log/add_list и /api/log/update_item
export interface BackendDailyTotalsResponse {
  total_kcal: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  left_kcal: number | null;
  left_macros: {
    p: number | null;
    f: number | null;
    c: number | null;
    kcal: number | null;
  };
}

// /api/stats/daily
interface BackendDailyItem {
  id: number; // id записи в food_log
  product: string;
  product_type: string | null;
  meal_type: string; // Breakfast/Lunch/...
  weight: number; // quantity_g
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  time: string; // created_at
  // потенциально здесь могут появиться product_id и БЖУ на 100 г
  product_id?: number;
  kcal_100?: number;
  protein_100?: number;
  fat_100?: number;
  carbs_100?: number;
}

interface BackendDailyStats {
  date: string; // YYYY-MM-DD
  macros_total: {
    p: number;
    f: number;
    c: number;
    kcal: number;
  };
  macros_left: {
    p: number;
    f: number;
    c: number;
    kcal: number;
  } | null;
  items: BackendDailyItem[];
}

interface BackendLogResponseItem {
  id: number;
  text_report: string;
  datetime: string;
  // остальные поля personal.log_response нам сейчас не нужны
  [key: string]: unknown;
}

interface BackendDailyStatsWithText extends BackendDailyStats {
  text_report?: string | null;
  log_responses?: BackendLogResponseItem[];
}

interface BackendLimits {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export async function getDailyTextReport(date?: string): Promise<string | null> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const data = await request<BackendDailyStatsWithText | null>(
    `/api/stats/daily${qs}`
  );
  if (!data) return null;
  return data.text_report ?? null;
}

// Список текстовых ответов по логам за день (log_responses)
export async function getDailyLogResponses(
  date?: string
): Promise<BackendLogResponseItem[]> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const data = await request<BackendDailyStatsWithText | null>(
    `/api/stats/daily${qs}`
  );

  if (!data || !Array.isArray(data.log_responses)) return [];
  return data.log_responses;
}

export async function getLimits(): Promise<BackendLimits> {
  return request<BackendLimits>("/api/stats/limits");
}

// --- Category helpers (UI-only) ---

export const CATEGORY_LABELS: Record<ProductCategoryKey | "other", string> = {
  cards: "Крупы и хлеб",
  fats: "Жиры и масла",
  protein: "Белок",
  veg_fruit: "Овощи и фрукты",
  junk_food: "Снэки и фастфуд",
  dairy: "Молочка",
  other: "Прочее"
};

export const CATEGORY_BG_CLASSES: Record<ProductCategoryKey | "other", string> = {
  protein: "bg-rose-50",
  veg_fruit: "bg-emerald-50",
  cards: "bg-amber-50",
  fats: "bg-orange-50",
  dairy: "bg-sky-50",
  junk_food: "bg-violet-50",
  other: "bg-slate-50"
};

// --- Low-level HTTP helper ---

const API_BASE = ""; // nginx уже проксирует /api/* на бэк

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    headers: {
      "Content-Type": "application/json",
      ...(init && init.headers)
    },
    ...init
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // может быть пустой ответ; в таком случае оставляем data = null
  }

  if (!res.ok) {
    const message = (data && (data.error as string)) || `Request failed with ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

// --- Health ---

export async function checkHealth(): Promise<boolean> {
  try {
    const data = await request<{ ok: boolean }>("/health");
    return !!data.ok;
  } catch {
    return false;
  }
}

// --- Products search & dictionary ---

export async function searchProducts(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({ query: trimmed, limit: "20" });
  const data = await request<BackendSearchResponse>(`/api/search?${params.toString()}`);

  if ((data as any).status === "not_found") {
    return [];
  }

  const results = data.results ?? [];

  return results.map((item) => ({
    id: String(item.id),
    product: item.product,
    brand: item.brand,
    source: item.source ?? data.source ?? "local",
    // category на бэке нет — оставляем undefined, попадёт в группу "other"
    kcal_100: item.kcal_100 ?? undefined,
    protein_100: item.protein_100 ?? undefined,
    fat_100: item.fat_100 ?? undefined,
    carbs_100: item.carbs_100 ?? undefined,
    freq_usage: item.freq_usage ?? undefined,
    last_used: item.last_used_at
  }));
}

// Ручное создание продукта (через общий авто-словарь)
export async function createProduct(input: CreateProductInput): Promise<SearchResult> {
  if (
    input.kcal_100 == null ||
    input.protein_100 == null ||
    input.fat_100 == null ||
    input.carbs_100 == null
  ) {
    throw new Error("MacrosRequired");
  }

  const body = {
    product: input.product,
    kcal_100: input.kcal_100,
    protein_100: input.protein_100,
    fat_100: input.fat_100,
    carbs_100: input.carbs_100,
    source: "manual" as const
  };

  const created = await request<BackendFoodDictItem>("/api/auto-add", {
    method: "POST",
    body: JSON.stringify(body)
  });

  const toNumber = (v: string | number) => (typeof v === "string" ? Number(v) : v);

  return {
    id: String(created.id),
    product: created.product,
    brand: null,
    source: created.source ?? "manual",
    kcal_100: toNumber(created.kcal_100),
    protein_100: toNumber(created.protein_100),
    fat_100: toNumber(created.fat_100),
    carbs_100: toNumber(created.carbs_100)
  };
}

// --- Персональный словарь продуктов (/api/dict/product) ---

// Список всех продуктов пользователя
export async function getMyProducts(): Promise<DictProduct[]> {
  const data = await request<{ items: BackendDictProduct[] }>(
    "/api/dict/product"
  );
  return data.items.map(mapBackendDictProduct);
}

// Создание продукта в персональном словаре
export async function createDictProduct(input: {
  product: string;
  kcal_100: number;
  protein_100: number;
  fat_100: number;
  carbs_100: number;
  source?: string;
}): Promise<DictProduct> {
  const body = {
    ...input,
    source: input.source ?? "manual"
  };

  const created = await request<BackendDictProduct>("/api/dict/product", {
    method: "POST",
    body: JSON.stringify(body)
  });

  return mapBackendDictProduct(created);
}

// Частичное обновление продукта
export async function patchDictProduct(
  product_id: string,
  patch: Partial<{
    product: string;
    kcal_100: number;
    protein_100: number;
    fat_100: number;
    carbs_100: number;
    source: string | null;
  }>
): Promise<DictProduct> {
  const body = {
    product_id: Number(product_id),
    ...patch
  };

  const updated = await request<BackendDictProduct>("/api/dict/product", {
    method: "PATCH",
    body: JSON.stringify(body)
  });

  return mapBackendDictProduct(updated);
}

// Удаление продукта
export async function deleteDictProduct(product_id: string): Promise<DictProduct> {
  const deleted = await request<BackendDictProduct>("/api/dict/product", {
    method: "DELETE",
    body: JSON.stringify({ product_id: Number(product_id) })
  });

  return mapBackendDictProduct(deleted);
}

// Обновление БЖУ существующего продукта
export async function updateProductNutrition(params: {
  dict_id: string;
  kcal_100: number;
  protein_100: number;
  fat_100: number;
  carbs_100: number;
}): Promise<void> {
  const body = {
    product_id: Number(params.dict_id),
    kcal_100: params.kcal_100,
    protein_100: params.protein_100,
    fat_100: params.fat_100,
    carbs_100: params.carbs_100
  };

  await request<BackendFoodDictItem>("/api/dict/update", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// --- Logging food ---

// Добавление списка логов через /api/log/add_list
export async function createMeal(payload: CreateMealPayload): Promise<BackendDailyTotalsResponse> {
  const body = payload.items.map((item) => {
    const base: any = {
      weight: item.grams,
      meal_type: payload.meal_type || "unspecified"
    };

    if (item.dict_id) {
      base.product_id = Number(item.dict_id);
    } else {
      base.product = item.product;
    }

    return base;
  });

  return request<BackendDailyTotalsResponse>("/api/log/add_list", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// Обновление граммовки записи в логе
export async function updateLogItem(params: {
  log_item_id: string;
  grams: number;
}): Promise<BackendDailyTotalsResponse> {
  const body = {
    id: Number(params.log_item_id),
    weight: params.grams
  };

  return request<BackendDailyTotalsResponse>("/api/log/update_item", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

// --- Daily stats & history ---

export async function getDailyStats(date?: string): Promise<DailyStats> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";

  const [statsRaw, limits] = await Promise.all([
    request<BackendDailyStats | null>(`/api/stats/daily${qs}`),
    getLimits()
  ]);

  // Бэк может вернуть null/пустой ответ, если за день нет логов.
  // В этом случае считаем, что всё по нулям, но лимиты подтягиваем как обычно.
  const stats = statsRaw ?? null;
  if (!stats || !stats.macros_total) {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    return {
      date: targetDate,
      kcal_limit: limits.kcal,
      kcal_used: 0,
      protein_limit: limits.protein,
      protein_used: 0,
      fat_limit: limits.fat,
      fat_used: 0,
      carbs_limit: limits.carbs,
      carbs_used: 0
    };
  }

  const used = stats.macros_total;

  return {
    date: stats.date,
    kcal_limit: limits.kcal,
    kcal_used: used.kcal,
    protein_limit: limits.protein,
    protein_used: used.p,
    fat_limit: limits.fat,
    fat_used: used.f,
    carbs_limit: limits.carbs,
    carbs_used: used.c
  };
}

// Список дней с логами: берём последние N дней и тянем по ним /api/stats/daily
export async function getHistoryDays(
  daysCount: number = 7
): Promise<Pick<HistoryDay, "date" | "totals">[]> {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const statsList = await Promise.all(dates.map((date) => getDailyStats(date)));

  // На случай, если бэк по разным датам вернёт одну и ту же фактическую дату
  // (например, всегда "сегодня"), убираем дубли по полю date.
  const byDate = new Map<string, (typeof statsList)[number]>();
  for (const s of statsList) {
    if (!byDate.has(s.date)) {
      byDate.set(s.date, s);
    }
  }

  return Array.from(byDate.values()).map((s) => ({
    date: s.date,
    totals: {
      kcal: s.kcal_used,
      protein: s.protein_used,
      fat: s.fat_used,
      carbs: s.carbs_used
    }
  }));
}

// История по конкретному дню через /api/stats/daily
export async function getHistoryByDay(date: string): Promise<HistoryDay> {
  const data = await request<BackendDailyStats | null>(
    `/api/stats/daily?date=${encodeURIComponent(date)}`
  );

  // Если за день нет логов, возвращаем пустую историю с нулевыми итогами
  if (!data || !data.macros_total) {
    return {
      date,
      totals: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      meals: []
    };
  }

  // Группируем items по meal_type (упрощённый вариант, которого тебе достаточно)
  const groups = new Map<string, BackendDailyItem[]>();
  for (const item of data.items) {
    const key = item.meal_type || "unspecified";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const meals: HistoryMeal[] = [];
  let mealIndex = 0;

  for (const [mealType, items] of groups.entries()) {
    if (!items.length) continue;

    // Сортируем по времени, чтобы время приёма было консистентным
    items.sort((a, b) => a.time.localeCompare(b.time));

    const meal_id = `${mealType}-${mealIndex++}`;
    const time = items[0].time;

    const historyItems: HistoryProductItem[] = items.map((it) => ({
      log_item_id: String(it.id),
      dict_id: it.product_id != null ? String(it.product_id) : undefined,
      product: it.product,
      grams: it.weight,
      kcal: it.kcal,
      protein: it.protein,
      fat: it.fat,
      carbs: it.carbs
    }));

    const totals = historyItems.reduce(
      (acc, it) => {
        acc.kcal += it.kcal;
        acc.protein += it.protein;
        acc.fat += it.fat;
        acc.carbs += it.carbs;
        return acc;
      },
      { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    );

    meals.push({
      meal_id,
      meal_type: mealType,
      time,
      items: historyItems,
      totals
    });
  }

  // Сортируем приёмы по времени
  meals.sort((a, b) => a.time.localeCompare(b.time));

  const totals = {
    kcal: data.macros_total.kcal,
    protein: data.macros_total.p,
    fat: data.macros_total.f,
    carbs: data.macros_total.c
  };

  return {
    date: data.date,
    totals,
    meals
  };
}
