import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({ 
  children, 
  onEdit, 
  onDelete,
  className = "" 
}) => {
  return (
    <div className={`relative w-full overflow-x-auto snap-x snap-mandatory no-scrollbar flex ${className}`}>
      {/* Main Content (Snaps to center) */}
      <div className="w-full flex-shrink-0 snap-center">
        {children}
      </div>

      {/* Actions (Snap to reveal) */}
      <div className="flex snap-center pl-1">
        {onEdit && (
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering parent clicks
              onEdit();
            }}
            className="w-[70px] bg-yellow-400 flex flex-col items-center justify-center text-white active:bg-yellow-500 transition-colors first:rounded-l-none"
          >
            <Edit2 className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Измен.</span>
          </button>
        )}
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`w-[70px] bg-red-500 flex flex-col items-center justify-center text-white active:bg-red-600 transition-colors ${!onEdit ? 'rounded-l-none' : ''} rounded-r-[20px]`}
          >
            <Trash2 className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Удалить</span>
          </button>
        )}
      </div>
    </div>
  );
};