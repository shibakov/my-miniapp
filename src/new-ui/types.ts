export interface Macro {
  current: number;
  target: number;
  unit: string;
  color: string;
}

export interface MealItem {
  id: string;
  title: string;
  time: string;
  description: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
}

export interface DayData {
  date: Date;
  isToday: boolean;
  isFuture: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories: number; // per 100g
  protein: number;
  fats: number;
  carbs: number;
}

export interface SelectedFood extends FoodItem {
  weight: number; // in grams
  uid: string; // unique id for list rendering
}
