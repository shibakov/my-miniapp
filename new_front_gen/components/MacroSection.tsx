import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MacroProps {
  label: string;
  keyName: string; // 'protein' | 'fat' | 'carbs'
  current: number;
  target: number;
  color: string;
  fillColor: string;
}

const MacroItem: React.FC<MacroProps> = ({ label, current, target, color, fillColor }) => {
  const remaining = Math.max(target - current, 0);
  const percent = Math.round((current / target) * 100);
  
  const data = [
    { name: 'Current', value: current },
    { name: 'Remaining', value: remaining }
  ];

  return (
    <div className="flex flex-col items-center flex-1 bg-white mx-1 first:ml-0 last:mr-0 rounded-2xl p-3 shadow-sm min-w-[100px]">
      <div className="relative w-[64px] h-[64px] mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={22}
              outerRadius={32}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
              cornerRadius={10}
              paddingAngle={5}
            >
              <Cell key="current" fill={fillColor} />
              <Cell key="remaining" fill="#F3F4F6" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-bold text-gray-800">{percent}%</span>
        </div>
      </div>
      
      <span className="text-sm font-semibold text-gray-900 mb-0.5">{label}</span>
      <span className="text-[10px] text-gray-500 font-medium mb-1">
        {current}/{target} г
      </span>
      <span className="text-[10px] text-gray-400">
        ост. {remaining}
      </span>
    </div>
  );
};

export const MacroSection: React.FC = () => {
  return (
    <div className="px-4 mt-4 flex justify-between gap-3">
      <MacroItem 
        label="Белки" 
        keyName="protein"
        current={95} 
        target={180} 
        color="text-blue-500"
        fillColor="#3B82F6" 
      />
      <MacroItem 
        label="Жиры" 
        keyName="fat"
        current={45} 
        target={70} 
        color="text-purple-500" 
        fillColor="#A855F7"
      />
      <MacroItem 
        label="Углеводы" 
        keyName="carbs"
        current={120} 
        target={250} 
        color="text-orange-500" 
        fillColor="#F97316"
      />
    </div>
  );
};