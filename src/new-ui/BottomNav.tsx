import React from 'react';
import { Home, Plus, Settings, TrendingUp, Package } from 'lucide-react';

interface BottomNavProps {
  onNavigate: (screen: 'home' | 'products' | 'add' | 'dynamics' | 'settings') => void;
  activeScreen: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onNavigate, activeScreen }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 pb-safe z-30">
      <div className="flex justify-between items-end px-2 h-[80px] pb-5">
        
        {/* Home */}
        <button 
          onClick={() => onNavigate('home')}
          className="flex-1 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <Home 
            className={`w-6 h-6 ${activeScreen === 'home' ? 'text-ios-blue' : 'text-gray-400'}`} 
            strokeWidth={activeScreen === 'home' ? 2.5 : 2}
          />
          <span className={`text-[10px] font-medium ${activeScreen === 'home' ? 'text-ios-blue' : 'text-gray-400'}`}>
            Главная
          </span>
        </button>

        {/* Products */}
        <button 
          onClick={() => onNavigate('products')}
          className="flex-1 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <Package 
            className={`w-6 h-6 ${activeScreen === 'products' ? 'text-ios-blue' : 'text-gray-400'}`} 
            strokeWidth={activeScreen === 'products' ? 2.5 : 2}
          />
          <span className={`text-[10px] font-medium ${activeScreen === 'products' ? 'text-ios-blue' : 'text-gray-400'}`}>
            Продукты
          </span>
        </button>

        {/* CENTER ADD BUTTON */}
        <div className="flex-1 flex flex-col items-center justify-end">
          <button 
            onClick={() => onNavigate('add')}
            className="w-14 h-14 bg-ios-blue text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 mb-2 active:scale-90 transition-transform"
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        </div>

        {/* Dynamics */}
        <button 
          onClick={() => onNavigate('dynamics')}
          className="flex-1 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <TrendingUp 
            className={`w-6 h-6 ${activeScreen === 'dynamics' ? 'text-ios-blue' : 'text-gray-400'}`} 
            strokeWidth={activeScreen === 'dynamics' ? 2.5 : 2}
          />
          <span className={`text-[10px] font-medium ${activeScreen === 'dynamics' ? 'text-ios-blue' : 'text-gray-400'}`}>
            Динамика
          </span>
        </button>

        {/* Settings / Profile */}
        <button 
          onClick={() => onNavigate('settings')}
          className="flex-1 flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <Settings 
            className={`w-6 h-6 ${activeScreen === 'settings' ? 'text-ios-blue' : 'text-gray-400'}`} 
            strokeWidth={activeScreen === 'settings' ? 2.5 : 2}
          />
          <span className={`text-[10px] font-medium ${activeScreen === 'settings' ? 'text-ios-blue' : 'text-gray-400'}`}>
            Настр.
          </span>
        </button>

      </div>
    </div>
  );
};