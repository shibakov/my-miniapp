import React from 'react';
import { Sparkles } from 'lucide-react';

export const DailyTip: React.FC = () => {
  return (
    <div className="mx-4 mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3 shadow-sm">
      <div className="p-2 bg-indigo-100 rounded-full shrink-0">
        <Sparkles className="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-indigo-900 mb-1">Хорошая работа!</h3>
        <p className="text-xs text-indigo-700 leading-relaxed">
          Ты отлично справляешься с белками. Попробуй добавить больше овощей к ужину для клетчатки.
        </p>
      </div>
    </div>
  );
};