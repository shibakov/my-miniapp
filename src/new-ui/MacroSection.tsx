import React from "react";
import { format1 } from "@/lib/utils";

interface MacroItemProps {
  label: string;
  current: number;
  target: number;
  fillColor: string;
}

const MacroItem: React.FC<MacroItemProps> = ({ label, current, target, fillColor }) => {
  const safeTarget = target > 0 ? target : 1;
  const remaining = Math.max(safeTarget - current, 0);
  const percent = Math.min(Math.round((current / safeTarget) * 100), 999);

  const r = 22;
  const c = 2 * Math.PI * r;
  const value = Math.min(current / safeTarget, 1);
  const dash = c * value;
  const gap = c - dash;

  return (
    <div className="flex flex-col items-center flex-1 bg-white mx-1 first:ml-0 last:mr-0 rounded-2xl p-3 shadow-sm min-w-[100px]">
      <div className="relative w-[64px] h-[64px] mb-2">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#E5E7EB" // slate-200
            strokeWidth={6}
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={fillColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={c * 0.25}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[11px] font-bold text-gray-800">{percent}%</span>
        </div>
      </div>

      <span className="text-sm font-semibold text-gray-900 mb-0.5">{label}</span>
      <span className="text-[10px] text-gray-500 font-medium mb-1">
        {format1(current)}/{format1(safeTarget)} г
      </span>
      <span className="text-[10px] text-gray-400">ост. {format1(remaining)} г</span>
    </div>
  );
};

interface MacroSectionProps {
  proteinCurrent: number;
  proteinTarget: number;
  fatCurrent: number;
  fatTarget: number;
  carbsCurrent: number;
  carbsTarget: number;
}

export const MacroSection: React.FC<MacroSectionProps> = ({
  proteinCurrent,
  proteinTarget,
  fatCurrent,
  fatTarget,
  carbsCurrent,
  carbsTarget
}) => {
  return (
    <div className="px-4 mt-4 flex justify-between gap-3">
      <MacroItem
        label="Белки"
        current={proteinCurrent}
        target={proteinTarget}
        fillColor="#3B82F6" // blue-500
      />
      <MacroItem
        label="Жиры"
        current={fatCurrent}
        target={fatTarget}
        fillColor="#A855F7" // purple-500
      />
      <MacroItem
        label="Углеводы"
        current={carbsCurrent}
        target={carbsTarget}
        fillColor="#F97316" // orange-500
      />
    </div>
  );
};
