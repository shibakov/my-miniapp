import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const WEEK_DATA = [
  { day: 'Пн', cals: 1650, protein: 140, fat: 60, carbs: 180 },
  { day: 'Вт', cals: 1800, protein: 160, fat: 70, carbs: 150 },
  { day: 'Ср', cals: 1500, protein: 130, fat: 55, carbs: 160 },
  { day: 'Чт', cals: 1950, protein: 170, fat: 80, carbs: 190 },
  { day: 'Пт', cals: 1700, protein: 150, fat: 65, carbs: 170 },
  { day: 'Сб', cals: 2100, protein: 120, fat: 90, carbs: 220 },
  { day: 'Вс', cals: 1270, protein: 95, fat: 45, carbs: 120 }, // Today
];

export const DynamicsScreen: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const [metric, setMetric] = useState<'calories' | 'macros'>('calories');

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 pt-14 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Динамика</h1>

      {/* Filters */}
      <div className="bg-gray-100 p-1 rounded-xl flex mb-6">
        <button 
          onClick={() => setTimeframe('week')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all shadow-sm ${timeframe === 'week' ? 'bg-white text-gray-900' : 'bg-transparent text-gray-500'}`}
        >
          Неделя
        </button>
        <button 
          onClick={() => setTimeframe('month')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all shadow-sm ${timeframe === 'month' ? 'bg-white text-gray-900' : 'bg-transparent text-gray-500'}`}
        >
          Месяц
        </button>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white p-5 rounded-[24px] shadow-sm mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-semibold text-gray-900">
            {metric === 'calories' ? 'Калорийность' : 'Баланс БЖУ'}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setMetric('calories')}
              className={`w-2 h-2 rounded-full ${metric === 'calories' ? 'bg-blue-500 ring-2 ring-blue-200' : 'bg-gray-300'}`}
            />
            <button 
              onClick={() => setMetric('macros')}
              className={`w-2 h-2 rounded-full ${metric === 'macros' ? 'bg-blue-500 ring-2 ring-blue-200' : 'bg-gray-300'}`}
            />
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metric === 'calories' ? (
              <AreaChart data={WEEK_DATA}>
                <defs>
                  <linearGradient id="colorCals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  cursor={{stroke: '#007AFF', strokeWidth: 1, strokeDasharray: '4 4'}}
                />
                <Area type="monotone" dataKey="cals" stroke="#007AFF" strokeWidth={3} fillOpacity={1} fill="url(#colorCals)" />
              </AreaChart>
            ) : (
              <BarChart data={WEEK_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <Tooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '12px', border: 'none'}}
                />
                <Bar dataKey="protein" stackId="a" fill="#3B82F6" radius={[0,0,4,4]} />
                <Bar dataKey="fat" stackId="a" fill="#A855F7" />
                <Bar dataKey="carbs" stackId="a" fill="#F97316" radius={[4,4,0,0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Grid */}
      <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Средние показатели</h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="text-gray-500 text-xs font-medium mb-1">Калории</div>
          <div className="text-2xl font-bold text-gray-900">1,720</div>
          <div className="text-xs text-green-500 font-medium mt-1">✓ Норма</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="text-gray-500 text-xs font-medium mb-1">Белки</div>
          <div className="text-2xl font-bold text-gray-900">138г</div>
          <div className="text-xs text-blue-500 font-medium mt-1">+12% от цели</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="text-gray-500 text-xs font-medium mb-1">Жиры</div>
          <div className="text-2xl font-bold text-gray-900">65г</div>
          <div className="text-xs text-green-500 font-medium mt-1">✓ Норма</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="text-gray-500 text-xs font-medium mb-1">Углеводы</div>
          <div className="text-2xl font-bold text-gray-900">170г</div>
          <div className="text-xs text-orange-500 font-medium mt-1">-5% от цели</div>
        </div>
      </div>

    </div>
  );
};