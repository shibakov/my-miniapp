import React, { useState } from 'react';
import { DateStrip } from './components/DateStrip';
import { CalorieCard } from './components/CalorieCard';
import { MacroSection } from './components/MacroSection';
import { DailyTip } from './components/DailyTip';
import { MealList } from './components/MealList';
import { BottomNav } from './components/BottomNav';
import { AddMealScreen } from './components/AddMealScreen';
import { MyProductsScreen } from './components/MyProductsScreen';
import { DynamicsScreen } from './components/DynamicsScreen';

type Screen = 'home' | 'products' | 'add' | 'dynamics' | 'settings';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const renderScreen = () => {
    switch(currentScreen) {
      case 'add':
        return <AddMealScreen onBack={() => setCurrentScreen('home')} onSave={() => setCurrentScreen('home')} />;
      case 'products':
        return <MyProductsScreen />;
      case 'dynamics':
        return <DynamicsScreen />;
      case 'settings':
        return (
           <div className="flex-1 flex items-center justify-center bg-gray-100">
             <p className="text-gray-400">Настройки (в разработке)</p>
           </div>
        );
      case 'home':
      default:
        return (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-[100px]">
            {/* Header Section */}
            <div className="pt-12 pb-2 px-5">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Easy Diet 🥗</h1>
              <p className="text-gray-500 text-sm font-medium capitalize">
                {capitalizeFirstLetter(formatDate(selectedDate))}
              </p>
            </div>

            {/* Date Picker */}
            <DateStrip 
              selectedDate={selectedDate} 
              onSelectDate={setSelectedDate} 
            />

            {/* Main Dashboard Widgets */}
            <CalorieCard current={1270} target={1800} />
            
            <MacroSection />
            
            <DailyTip />
            
            <MealList onAddMeal={() => setCurrentScreen('add')} />
          </div>
        );
    }
  };

  return (
    // Outer container to center the mobile view on desktop
    <div className="min-h-screen bg-gray-200 flex justify-center items-center font-sans">
      {/* Mobile Frame */}
      <div className="w-full max-w-[390px] h-screen bg-ios-bg relative overflow-hidden flex flex-col shadow-2xl sm:h-[844px] sm:rounded-[40px] sm:border-[8px] sm:border-gray-900 box-content transition-all duration-300">
        
        {renderScreen()}

        {/* Bottom Navigation (Hidden on Add Meal Screen for immersion, or keep if preferred. Typically Add Screen is modal, so hidden) */}
        {currentScreen !== 'add' && (
          <BottomNav 
            onNavigate={(screen) => setCurrentScreen(screen)} 
            activeScreen={currentScreen} 
          />
        )}
        
      </div>
    </div>
  );
};

export default App;