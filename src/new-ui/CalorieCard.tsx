import React from 'react';
import { BarChart2 } from 'lucide-react';

interface CalorieCardProps {
  current: number;
  target: number;
}

export const CalorieCard: React.FC<CalorieCardProps> = ({ current, target }) => {
  const percentage = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);

  return (
    <div className="mx-4 mt-6 p-5 bg-white rounded-[24px] shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-gray-500 text-sm font-medium mb-1">Калории сегодня</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{current}</span>
            <span className="text-gray-400 font-medium">/ {target} ккал</span>
          </div>
        </div>
        <button className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
          <BarChart2 className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="mt-4 mb-2">
        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-ios-blue rounded-full transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 font-medium mt-2">
        Осталось: <span className="text-gray-900 font-bold">{remaining} ккал</span>
      </p>
    </div>
  );
};