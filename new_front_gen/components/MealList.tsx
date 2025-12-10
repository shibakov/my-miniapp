import React, { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { MealItem } from '../types';
import { SwipeableItem } from './SwipeableItem';

const INITIAL_MEALS: MealItem[] = [
  {
    id: '1',
    title: 'Завтрак',
    time: '09:30',
    description: 'Овсянка на воде, Яйцо вареное, Кофе',
    calories: 420,
    protein: 18,
    fats: 12,
    carbs: 55,
  },
  {
    id: '2',
    title: 'Обед',
    time: '13:15',
    description: 'Куриная грудка, Гречка, Салат овощной',
    calories: 580,
    protein: 45,
    fats: 10,
    carbs: 65,
  },
  {
    id: '3',
    title: 'Перекус',
    time: '16:45',
    description: 'Творог 5%, Яблоко зеленое',
    calories: 270,
    protein: 22,
    fats: 5,
    carbs: 18,
  }
];

interface MealListProps {
  onAddMeal: () => void;
}

export const MealList: React.FC<MealListProps> = ({ onAddMeal }) => {
  const [meals, setMeals] = useState(INITIAL_MEALS);

  const handleDelete = (id: string) => {
    if (window.confirm('Удалить этот прием пищи?')) {
      setMeals(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleEdit = (id: string) => {
    console.log('Edit meal', id);
    // Logic to open edit screen would go here
  };

  return (
    <div className="mt-6 px-4 mb-24">
      <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Приёмы пищи</h3>
      <div className="space-y-4">
        {meals.map((meal) => (
          <div 
            key={meal.id} 
            className="bg-white rounded-[20px] shadow-sm overflow-hidden"
          >
            <SwipeableItem 
              onEdit={() => handleEdit(meal.id)} 
              onDelete={() => handleDelete(meal.id)}
            >
              <div className="p-4 flex justify-between items-start bg-white w-full active:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {meal.title}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{meal.time}</span>
                  </div>
                  <h4 className="text-gray-900 font-medium text-[15px] leading-tight mb-2">
                    {meal.description}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-bold text-gray-900">{meal.calories} ккал</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span>Б: {meal.protein}</span>
                    <span>Ж: {meal.fats}</span>
                    <span>У: {meal.carbs}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 mt-1 shrink-0" />
              </div>
            </SwipeableItem>
          </div>
        ))}
      </div>

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