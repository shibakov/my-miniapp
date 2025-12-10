import React, { useState, useMemo } from 'react';
import { Search, Camera, ChevronLeft, X, Plus, ScanLine, Minus } from 'lucide-react';
import type { FoodItem, SelectedFood } from "./types";

// TODO: этот экран пока работает на моковых данных.
// На следующих шагах сюда будет подключён хук useMealComposer и реальные API
// (searchProducts/createProduct/createMeal), после чего FOOD_DATABASE будет удалён.
// Mock Database
const FOOD_DATABASE: FoodItem[] = [
  { id: '1', name: 'Куриная грудка (вареная)', calories: 113, protein: 23.6, fats: 1.9, carbs: 0.4 },
  { id: '2', name: 'Гречка (отварная)', calories: 110, protein: 4.2, fats: 1.1, carbs: 21.3 },
  { id: '3', name: 'Яйцо куриное', calories: 157, protein: 12.7, fats: 11.5, carbs: 0.7 },
  { id: '4', name: 'Авокадо', calories: 160, protein: 2, fats: 14.7, carbs: 1.8 },
  { id: '5', name: 'Творог 5%', calories: 121, protein: 17.2, fats: 5, carbs: 1.8 },
  { id: '6', name: 'Банан', calories: 89, protein: 1.1, fats: 0.3, carbs: 22.8 },
  { id: '7', name: 'Овсянка (на воде)', calories: 88, protein: 3, fats: 1.7, carbs: 15 },
  { id: '8', name: 'Миндаль', calories: 579, protein: 21, fats: 49, carbs: 22 },
];

interface AddMealScreenProps {
  onBack: () => void;
  onSave: () => void;
}

export const AddMealScreen: React.FC<AddMealScreenProps> = ({ onBack, onSave }) => {
  const [query, setQuery] = useState('');
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [mealType, setMealType] = useState<string | null>(null);
  
  // Custom Product Creation State
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<FoodItem>>({});
  const [showScanner, setShowScanner] = useState(false);

  // Filter items based on search
  const searchResults = useMemo(() => {
    if (!query) return FOOD_DATABASE.slice(0, 5); // Show first 5 as "recent" if empty
    return FOOD_DATABASE.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  // Add item to selection
  const handleAdd = (item: FoodItem) => {
    const newItem: SelectedFood = {
      ...item,
      weight: 100, // Default weight
      uid: Math.random().toString(36).substr(2, 9),
    };
    setSelectedFoods(prev => [...prev, newItem]);
    setQuery(''); // Clear search
  };

  // Remove item
  const handleRemove = (uid: string) => {
    setSelectedFoods(prev => prev.filter(item => item.uid !== uid));
  };

  // Update weight
  const handleWeightChange = (uid: string, newWeightStr: string) => {
    const weight = parseInt(newWeightStr);
    if (isNaN(weight)) return; // Don't update if empty or invalid, or handle differently
    
    setSelectedFoods(prev => prev.map(item => 
      item.uid === uid ? { ...item, weight } : item
    ));
  };

  const adjustWeight = (uid: string, delta: number) => {
    setSelectedFoods(prev => prev.map(item => 
      item.uid === uid ? { ...item, weight: Math.max(0, item.weight + delta) } : item
    ));
  };

  // Simulate AI Photo Scan (Meal Recognition)
  const handleScanMeal = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const scannedItem: SelectedFood = {
        id: 'scan_1',
        name: 'Цезарь с курицей (AI)',
        calories: 180,
        protein: 12,
        fats: 10,
        carbs: 8,
        weight: 250,
        uid: Math.random().toString(36).substr(2, 9),
      };
      setSelectedFoods(prev => [...prev, scannedItem]);
    }, 1500);
  };

  // Simulate Label Scan (New Product)
  const simulateLabelScan = () => {
    setTimeout(() => {
      setNewProduct({
        name: 'Йогурт Греческий (Scanned)',
        brand: 'Teos',
        calories: 68,
        protein: 8,
        fats: 2,
        carbs: 4.2
      });
      setShowScanner(false);
    }, 1500);
  };

  const handleSaveCustomProduct = () => {
    if (!newProduct.name) return;
    const product: FoodItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newProduct.name || 'Custom Product',
      brand: newProduct.brand,
      calories: Number(newProduct.calories) || 0,
      protein: Number(newProduct.protein) || 0,
      fats: Number(newProduct.fats) || 0,
      carbs: Number(newProduct.carbs) || 0,
    };
    handleAdd(product);
    setIsCreatingProduct(false);
    setNewProduct({});
  };

  // Calculate Totals
  const totals = useMemo(() => {
    return selectedFoods.reduce((acc, item) => {
      const multiplier = item.weight / 100;
      return {
        calories: acc.calories + (item.calories * multiplier),
        protein: acc.protein + (item.protein * multiplier),
        fats: acc.fats + (item.fats * multiplier),
        carbs: acc.carbs + (item.carbs * multiplier),
      };
    }, { calories: 0, protein: 0, fats: 0, carbs: 0 });
  }, [selectedFoods]);

  return (
    <div className="h-full flex flex-col bg-ios-bg relative">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-gray-200 sticky top-0 z-20 pt-12 sm:pt-4">
        <button onClick={onBack} className="flex items-center text-ios-blue hover:opacity-70 transition-opacity">
          <ChevronLeft className="w-6 h-6" />
          <span className="text-[17px] -ml-1">Назад</span>
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900">Добавить прием</h1>
        <button 
          onClick={onSave}
          disabled={selectedFoods.length === 0 || !mealType}
          className={`text-[17px] font-semibold transition-opacity ${
            selectedFoods.length > 0 && mealType ? 'text-ios-blue' : 'text-gray-300'
          }`}
        >
          Сохранить
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[180px]">
        
        {/* Search & Camera & Meal Type Section */}
        <div className="bg-white p-4 pb-6 shadow-sm rounded-b-[24px] mb-6">
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Поиск продукта..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-gray-100 h-10 rounded-xl pl-10 pr-4 text-[17px] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <button 
              onClick={handleScanMeal}
              className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center active:scale-95 transition-transform shadow-md"
            >
              {isScanning ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"/> : <Camera className="w-5 h-5" />}
            </button>
          </div>

          <div>
             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">Тип приема пищи <span className="text-red-400">*</span></h3>
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
               {['Завтрак', 'Обед', 'Ужин', 'Перекус'].map(tag => (
                 <button
                   key={tag}
                   onClick={() => setMealType(tag)}
                   className={`px-4 py-2 rounded-xl text-[15px] font-medium whitespace-nowrap transition-all duration-200 border ${
                     mealType === tag
                       ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200 scale-[1.02]'
                       : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                   }`}
                 >
                   {tag}
                 </button>
               ))}
             </div>
          </div>
        </div>

        {/* Selected Items List */}
        {selectedFoods.length > 0 && (
          <div className="px-4 mb-6">
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">Выбрано</h3>
            <div className="flex flex-col gap-3">
              {selectedFoods.map((item) => {
                 const itemCals = Math.round(item.calories * (item.weight / 100));
                 return (
                  <div key={item.uid} className="bg-white rounded-[20px] p-4 shadow-sm relative">
                    {/* Top Row: Name & Delete */}
                    <div className="flex justify-between items-start mb-4 pr-6">
                      <h4 className="font-semibold text-gray-900 text-[17px] leading-snug">{item.name}</h4>
                      <button 
                        onClick={() => handleRemove(item.uid)} 
                        className="absolute right-4 top-4 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Bottom Row: Macros & Weight Stepper */}
                    <div className="flex items-end justify-between">
                      {/* Left: Info */}
                      <div>
                        <div className="text-xl font-bold text-gray-900 mb-0.5">{itemCals} <span className="text-sm font-medium text-gray-500">ккал</span></div>
                        <div className="text-xs text-gray-400 font-medium tracking-wide">
                          Б:{Math.round(item.protein * (item.weight/100))}  Ж:{Math.round(item.fats * (item.weight/100))}  У:{Math.round(item.carbs * (item.weight/100))}
                        </div>
                      </div>

                      {/* Right: Stepper Control */}
                      <div className="flex items-center bg-gray-50 rounded-xl p-1 shadow-inner ring-1 ring-gray-100">
                        <button 
                          onClick={() => adjustWeight(item.uid, -10)}
                          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-90 transition-transform bg-white rounded-lg shadow-sm border border-gray-100"
                        >
                          <Minus className="w-4 h-4" strokeWidth={3} />
                        </button>
                        
                        <div className="flex items-baseline justify-center w-[72px] px-1">
                          <input 
                            type="number"
                            inputMode="decimal"
                            value={item.weight}
                            onChange={(e) => handleWeightChange(item.uid, e.target.value)}
                            className="w-full text-center bg-transparent font-bold text-gray-900 text-lg focus:outline-none p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-xs font-medium text-gray-400 -ml-1">г</span>
                        </div>

                        <button 
                          onClick={() => adjustWeight(item.uid, 10)}
                          className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-90 transition-transform bg-white rounded-lg shadow-sm border border-gray-100"
                        >
                          <Plus className="w-4 h-4" strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                 )
              })}
            </div>
          </div>
        )}

        {/* Search Results & Add Custom */}
        <div className="px-4">
          <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
            {query ? 'Результаты поиска' : 'Недавнее'}
          </h3>
          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden divide-y divide-gray-100">
            {searchResults.map((item) => (
              <button 
                key={item.id} 
                onClick={() => handleAdd(item)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
              >
                <div>
                  <h4 className="font-medium text-gray-900 text-[15px] mb-0.5">{item.name}</h4>
                  <div className="text-xs text-gray-500">
                    {item.calories} ккал • <span className="text-gray-400">100 г</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-ios-blue flex items-center justify-center group-active:bg-ios-blue group-active:text-white transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
              </button>
            ))}

            {/* Sticky "Add Custom Product" button at the end of the list */}
            <button 
              onClick={() => setIsCreatingProduct(true)}
              className="w-full p-4 flex items-center justify-center gap-2 text-ios-blue hover:bg-gray-50 active:bg-blue-50 transition-colors border-t border-gray-100"
            >
               <Plus className="w-5 h-5" strokeWidth={2.5} />
               <span className="font-semibold text-[15px]">Создать свой продукт</span>
            </button>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Summary */}
      {selectedFoods.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 animate-slide-up">
           <div className="p-4">
              <div className="flex justify-between items-end mb-4 px-2">
                <div>
                  <div className="text-xs text-gray-400 font-medium mb-1">Итого за {mealType || '...'}</div>
                  <div className="text-2xl font-bold text-gray-900 leading-none">
                    {Math.round(totals.calories)} <span className="text-base font-medium text-gray-500">ккал</span>
                  </div>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                  <div className="text-center">
                    <div className="w-10 h-1 rounded-full bg-blue-500 mb-1"></div>
                    <span className="text-gray-500">{Math.round(totals.protein)}г</span>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-1 rounded-full bg-purple-500 mb-1"></div>
                    <span className="text-gray-500">{Math.round(totals.fats)}г</span>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-1 rounded-full bg-orange-500 mb-1"></div>
                    <span className="text-gray-500">{Math.round(totals.carbs)}г</span>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Create Product Modal (Embedded) */}
      {isCreatingProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in sm:p-4">
          <div className="bg-ios-bg w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-slide-up h-[85vh] sm:h-auto overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-[22px] font-bold text-gray-900">Новый продукт</h2>
              <button onClick={() => setIsCreatingProduct(false)} className="p-2 bg-gray-200/50 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form Content */}
            <div className="space-y-6">
               <button 
                 onClick={() => { setShowScanner(true); simulateLabelScan(); }}
                 className="w-full h-12 bg-black text-white rounded-xl flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform"
               >
                 {showScanner ? (
                   <>
                     <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                     Сканирую...
                   </>
                 ) : (
                   <>
                     <ScanLine className="w-5 h-5" />
                     Сканировать этикетку
                   </>
                 )}
               </button>

               <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-100 border border-gray-100">
                 <input 
                   placeholder="Название продукта" 
                   className="w-full bg-white h-12 px-4 text-[17px] text-gray-900 placeholder-gray-400 focus:outline-none"
                   value={newProduct.name || ''}
                   onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                 />
                 <input 
                   placeholder="Бренд (необязательно)" 
                   className="w-full bg-white h-12 px-4 text-[17px] text-gray-900 placeholder-gray-400 focus:outline-none"
                   value={newProduct.brand || ''}
                   onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                 />
               </div>

               <div className="pl-4 pb-1 mt-4 border-b border-gray-200">
                 <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                   Пищевая ценность на 100 г
                 </span>
               </div>

               <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-100 border border-gray-100">
                  <div className="flex items-center justify-between h-12 px-4">
                    <span className="text-[17px] text-gray-900">Калории</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="0"
                        className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={newProduct.calories || ''}
                        onChange={(e) => setNewProduct({...newProduct, calories: Number(e.target.value)})}
                      />
                      <span className="text-[17px] text-gray-400 w-8 text-right">ккал</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between h-12 px-4">
                    <span className="text-[17px] text-gray-900">Белки</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="0"
                        className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={newProduct.protein || ''}
                        onChange={(e) => setNewProduct({...newProduct, protein: Number(e.target.value)})}
                      />
                      <span className="text-[17px] text-gray-400 w-8 text-right">г</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between h-12 px-4">
                    <span className="text-[17px] text-gray-900">Жиры</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="0"
                        className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={newProduct.fats || ''}
                        onChange={(e) => setNewProduct({...newProduct, fats: Number(e.target.value)})}
                      />
                      <span className="text-[17px] text-gray-400 w-8 text-right">г</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between h-12 px-4">
                    <span className="text-[17px] text-gray-900">Углеводы</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="0"
                        className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={newProduct.carbs || ''}
                        onChange={(e) => setNewProduct({...newProduct, carbs: Number(e.target.value)})}
                      />
                      <span className="text-[17px] text-gray-400 w-8 text-right">г</span>
                    </div>
                  </div>
               </div>

               <button 
                onClick={handleSaveCustomProduct}
                className="w-full h-14 mt-8 bg-ios-blue text-white rounded-2xl font-bold text-[17px] shadow-lg shadow-blue-200 active:scale-95 transition-transform"
              >
                Сохранить продукт
              </button>
               <div className="h-6" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
