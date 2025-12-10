import React from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { HistoryMeal } from "@/lib/api";
import { buildProductsLine, formatMealTime, getMealLabel } from "@/lib/meal-format";
import { SwipeableItem } from "./SwipeableItem";

interface MealListProps {
  meals: HistoryMeal[];
  onAddMeal: () => void;
  onEditMeal?: (meal: HistoryMeal) => void;
  onDeleteMeal?: (meal: HistoryMeal) => void;
}

export const MealList: React.FC<MealListProps> = ({
  meals,
  onAddMeal,
  onEditMeal,
  onDeleteMeal
}) => {
  const hasMeals = meals.length > 0;

  return (
    <div className="mt-6 px-4 mb-24">
      <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Приёмы пищи</h3>

      {!hasMeals && (
        <div className="bg-white/70 border border-dashed border-gray-200 rounded-2xl px-4 py-4 text-xs text-gray-500">
          За выбранный день пока нет ни одного приёма. Нажми кнопку ниже, чтобы
          добавить первый.
        </div>
      )}

      {hasMeals && (
        <div className="space-y-4">
          {meals.map((meal) => {
            const productsLine = buildProductsLine(meal);
            const macros = meal.totals;

            const handleEdit = onEditMeal
              ? () => onEditMeal(meal)
              : undefined;
            const handleDelete = onDeleteMeal
              ? () => onDeleteMeal(meal)
              : undefined;

            return (
              <div
                key={meal.meal_id}
                className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-gray-100"
              >
                <SwipeableItem onEdit={handleEdit} onDelete={handleDelete}>
                  <div className="p-4 flex justify-between items-start bg-white w-full active:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {getMealLabel(meal.meal_type)}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {formatMealTime(meal.time)}
                        </span>
                      </div>
                      {productsLine && (
                        <h4 className="text-gray-900 font-medium text-[15px] leading-tight mb-2 line-clamp-2">
                          {productsLine}
                        </h4>
                      )}
                      <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500">
                        <span className="font-bold text-gray-900">
                          {Math.round(macros.kcal)} ккал
                        </span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>Б: {Math.round(macros.protein)}</span>
                        <span>Ж: {Math.round(macros.fat)}</span>
                        <span>У: {Math.round(macros.carbs)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 mt-1 shrink-0" />
                  </div>
                </SwipeableItem>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={onAddMeal}
        className="w-full mt-6 h-14 bg-ios-blue text-white rounded-2xl flex items-center justify-center gap-2 font-semibold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
        Добавить приём пищи
      </button>
    </div>
  );
};
