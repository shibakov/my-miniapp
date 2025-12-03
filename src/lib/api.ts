// Central API layer with types and mock implementations.
// Later you can replace mocks with real fetch calls to your backend.

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export type ProductCategoryKey =
  | "cards"
  | "fats"
  | "protein"
  | "veg_fruit"
  | "junk_food"
  | "dairy"; // fixed spelling

export interface SearchResult {
  id: string;
  product: string;
  brand?: string | null;
  source?: string;
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
  category: ProductCategoryKey;
  kcal_100?: number;
  protein_100?: number;
  fat_100?: number;
  carbs_100?: number;
  brand?: string | null;
}

export interface PendingItem {
  id: string;
  dict_id?: string;
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
  created_at?: string;
}

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

export interface HistoryProductItem {
  log_item_id: string;
  dict_id?: string;
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
  time: string; // ISO string or HH:MM
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

// --- Category helpers ---

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

// --- Mock implementations ---

const MOCK_LATENCY = 250;

function delay<T>(value: T, ms: number = MOCK_LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function searchProducts(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  // Simple mock with some hard-coded examples; replace with real fetch later.
  const base: SearchResult[] = [
    {
      id: "1",
      product: "Куриная грудка",
      category: "protein",
      freq_usage: 10,
      kcal_100: 165,
      protein_100: 31,
      fat_100: 3.6,
      carbs_100: 0,
      source: "mock"
    },
    {
      id: "2",
      product: "Овсянка",
      category: "cards",
      freq_usage: 8,
      kcal_100: 350,
      protein_100: 12,
      fat_100: 7,
      carbs_100: 60,
      source: "mock"
    },
    {
      id: "3",
      product: "Яблоко",
      category: "veg_fruit",
      freq_usage: 12,
      kcal_100: 52,
      protein_100: 0.3,
      fat_100: 0.2,
      carbs_100: 14,
      source: "mock"
    },
    {
      id: "4",
      product: "Сыр творожный",
      category: "dairy",
      freq_usage: 5,
      kcal_100: 250,
      protein_100: 7,
      fat_100: 22,
      carbs_100: 3,
      source: "mock"
    }
  ];

  const filtered = base.filter((item) =>
    item.product.toLowerCase().includes(query.toLowerCase())
  );

  return delay(filtered);
}

export async function createProduct(
  input: CreateProductInput
): Promise<SearchResult> {
  const result: SearchResult = {
    id: `local-${Date.now()}`,
    product: input.product,
    brand: input.brand,
    category: input.category,
    kcal_100: input.kcal_100,
    protein_100: input.protein_100,
    fat_100: input.fat_100,
    carbs_100: input.carbs_100,
    source: "user"
  };

  console.log("[mock] createProduct", input, "→", result);
  return delay(result, 400);
}

export async function createMeal(payload: CreateMealPayload): Promise<void> {
  console.log("[mock] createMeal", payload);
  await delay(null, 600);
}

export async function getDailyStats(): Promise<DailyStats> {
  const today = new Date();
  const date = today.toISOString().slice(0, 10);

  const result: DailyStats = {
    date,
    kcal_limit: 2000,
    kcal_used: 850,
    protein_limit: 120,
    protein_used: 45,
    fat_limit: 70,
    fat_used: 30,
    carbs_limit: 250,
    carbs_used: 110
  };

  console.log("[mock] getDailyStats →", result);
  return delay(result, 300);
}

export async function getHistoryDays(): Promise<Pick<HistoryDay, "date" | "totals">[]> {
  const days: Pick<HistoryDay, "date" | "totals">[] = [
    {
      date: new Date().toISOString().slice(0, 10),
      totals: { kcal: 1800, protein: 110, fat: 60, carbs: 220 }
    },
    {
      date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      totals: { kcal: 1950, protein: 115, fat: 68, carbs: 240 }
    }
  ];

  console.log("[mock] getHistoryDays →", days);
  return delay(days, 300);
}

export async function getHistoryByDay(date: string): Promise<HistoryDay> {
  const day: HistoryDay = {
    date,
    totals: { kcal: 1800, protein: 110, fat: 60, carbs: 220 },
    meals: [
      {
        meal_id: "m1",
        meal_type: "Breakfast",
        time: `${date}T08:30:00Z`,
        totals: { kcal: 450, protein: 25, fat: 15, carbs: 55 },
        items: [
          {
            log_item_id: "li1",
            dict_id: "1",
            product: "Овсянка",
            grams: 60,
            category: "cards",
            kcal: 210,
            protein: 7,
            fat: 4,
            carbs: 36
          },
          {
            log_item_id: "li2",
            dict_id: "3",
            product: "Яблоко",
            grams: 150,
            category: "veg_fruit",
            kcal: 80,
            protein: 1,
            fat: 0,
            carbs: 20
          }
        ]
      },
      {
        meal_id: "m2",
        meal_type: "Lunch",
        time: `${date}T13:15:00Z`,
        totals: { kcal: 650, protein: 40, fat: 25, carbs: 60 },
        items: [
          {
            log_item_id: "li3",
            dict_id: "1",
            product: "Куриная грудка",
            grams: 150,
            category: "protein",
            kcal: 250,
            protein: 46,
            fat: 5,
            carbs: 0
          }
        ]
      }
    ]
  };

  console.log("[mock] getHistoryByDay", date, "→", day);
  return delay(day, 400);
}

export async function updateLogItem(params: {
  log_item_id: string;
  grams: number;
}): Promise<void> {
  console.log("[mock] updateLogItem", params);
  await delay(null, 300);
}

export async function updateProductNutrition(params: {
  dict_id: string;
  kcal_100: number;
  protein_100: number;
  fat_100: number;
  carbs_100: number;
}): Promise<void> {
  console.log("[mock] updateProductNutrition", params);
  await delay(null, 300);
}
