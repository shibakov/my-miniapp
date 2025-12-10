import type { MealType, HistoryMeal } from "./api";

export function getMealLabel(mealType: MealType | string): string {
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

export function formatMealTime(time: string): string {
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return time;
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function buildProductsLine(meal: HistoryMeal): string {
  if (!meal.items.length) return "";
  const names = meal.items.map((it) => it.product);
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;

  let line = shown.join(", ");
  if (rest > 0) {
    line += ` + ещё ${rest}`;
  }
  return line;
}
