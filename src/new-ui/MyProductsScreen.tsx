import React, { useState } from 'react';
import { Plus, ScanLine, Package, X } from 'lucide-react';
import { SwipeableItem } from "./SwipeableItem";
import { format1 } from "@/lib/utils";
import type { FoodItem } from "./types";

interface MyProductsScreenProps {
  foods: FoodItem[];
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  onCreate: (payload: Omit<FoodItem, 'id'>) => Promise<void> | void;
  onUpdate?: (id: string, payload: Omit<FoodItem, 'id'>) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export const MyProductsScreen: React.FC<MyProductsScreenProps> = ({
  foods,
  loading = false,
  error = null,
  onReload,
  onCreate,
  onUpdate,
  onDelete
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New / edit product form state (per 100 g)
  const [newProduct, setNewProduct] = useState<Partial<FoodItem>>({
    name: '',
    brand: '',
    calories: undefined,
    protein: undefined,
    fats: undefined,
    carbs: undefined
  });

  const openCreate = () => {
    setEditingId(null);
    setFormError(null);
    setNewProduct({
      name: '',
      brand: '',
      calories: undefined,
      protein: undefined,
      fats: undefined,
      carbs: undefined
    });
    setIsAdding(true);
  };

  const openEdit = (food: FoodItem) => {
    setEditingId(food.id);
    setFormError(null);
    setNewProduct({
      name: food.name,
      brand: food.brand,
      calories: food.calories,
      protein: food.protein,
      fats: food.fats,
      carbs: food.carbs
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить этот продукт?')) return;
    try {
      await onDelete(id);
    } catch (e) {
      console.error('Ошибка удаления продукта', e);
      alert('Не удалось удалить продукт. Попробуй ещё раз.');
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name) {
      setFormError('Укажи название продукта');
      return;
    }

    const name = newProduct.name.trim();
    const calories = Number(newProduct.calories);
    const protein = Number(newProduct.protein);
    const fats = Number(newProduct.fats);
    const carbs = Number(newProduct.carbs);

    if (
      !Number.isFinite(calories) ||
      !Number.isFinite(protein) ||
      !Number.isFinite(fats) ||
      !Number.isFinite(carbs)
    ) {
      setFormError('Заполни все поля КБЖУ корректными числами');
      return;
    }

    const payload: Omit<FoodItem, 'id'> = {
      name,
      brand: newProduct.brand,
      calories,
      protein,
      fats,
      carbs
    };

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId && onUpdate) {
        await onUpdate(editingId, payload);
      } else {
        await onCreate(payload);
      }
      setIsAdding(false);
      setEditingId(null);
      setNewProduct({
        name: '',
        brand: '',
        calories: undefined,
        protein: undefined,
        fats: undefined,
        carbs: undefined
      });
    } catch (e: any) {
      console.error('Ошибка сохранения продукта', e);
      const message = e instanceof Error ? e.message : 'Не удалось сохранить продукт. Попробуй ещё раз.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const simulateScan = () => {
    setShowScanner(true);
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

  const hasFoods = foods.length > 0;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 pt-14 bg-ios-bg relative h-full">
      {/* Header */}
      <div className="px-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Мои продукты</h1>
          {error && (
            <p className="text-xs text-red-500 mt-1">
              {error}
              {onReload && !loading && (
                <button
                  type="button"
                  onClick={onReload}
                  className="ml-2 underline"
                >
                  Обновить
                </button>
              )}
            </p>
          )}
          {loading && !hasFoods && !error && (
            <p className="text-xs text-gray-400 mt-1">Загружаем словарь продуктов…</p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="w-10 h-10 bg-ios-blue text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* List */}
      <div className="space-y-3 px-4">
        {hasFoods && (
          foods.map((food) => (
            <div key={food.id} className="bg-white rounded-[20px] shadow-sm overflow-hidden">
              <SwipeableItem
                onEdit={onUpdate ? () => openEdit(food) : undefined}
                onDelete={() => handleDelete(food.id)}
              >
                <div className="p-4 flex items-center gap-4 w-full bg-white">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 leading-tight">{food.name}</h3>
                    {food.brand && <p className="text-xs text-gray-400 mb-0.5">{food.brand}</p>}
                    <div className="text-xs font-medium text-gray-500">
                      {format1(food.calories)} ккал • Б:{format1(food.protein)} Ж:{format1(food.fats)} У:{format1(food.carbs)}
                    </div>
                  </div>
                </div>
              </SwipeableItem>
            </div>
          ))
        )}

        {!hasFoods && !loading && !error && (
          <div className="text-center py-10 text-gray-400">
            <p>У вас пока нет своих продуктов</p>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal Overlay */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in sm:p-4">
          <div className="bg-ios-bg w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-slide-up h-[85vh] sm:h-auto overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[22px] font-bold text-gray-900">
                {editingId ? 'Редактировать продукт' : 'Новый продукт'}
              </h2>
              <button
                onClick={() => !submitting && setIsAdding(false)}
                className="p-2 bg-gray-200/50 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                disabled={submitting}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form Content */}
            <div className="space-y-6">
              {/* Scan Button */}
              <button
                onClick={simulateScan}
                className="w-full h-12 bg-black text-white rounded-xl flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform disabled:opacity-50"
                disabled={submitting}
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

              {/* Basic Info */}
              <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-100 border border-gray-100">
                <input
                  placeholder="Название продукта"
                  className="w-full bg-white h-12 px-4 text-[17px] text-gray-900 placeholder-gray-400 focus:outline-none"
                  value={newProduct.name ?? ''}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  disabled={submitting}
                />
                <input
                  placeholder="Бренд (необязательно)"
                  className="w-full bg-white h-12 px-4 text-[17px] text-gray-900 placeholder-gray-400 focus:outline-none"
                  value={newProduct.brand ?? ''}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  disabled={submitting}
                />
              </div>

              {/* Macros Header */}
              <div className="pl-4 pb-1 mt-4 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Пищевая ценность на 100 г
                </span>
              </div>

              {/* Macros List (iOS Style: Label Left, Input Right) */}
              <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-100 border border-gray-100">
                {/* Calories */}
                <div className="flex items-center justify-between h-12 px-4">
                  <span className="text-[17px] text-gray-900">Калории</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={newProduct.calories ?? ''}
                      onChange={(e) => setNewProduct({ ...newProduct, calories: Number(e.target.value) })}
                      disabled={submitting}
                    />
                    <span className="text-[17px] text-gray-400 w-8 text-right">ккал</span>
                  </div>
                </div>

                {/* Protein */}
                <div className="flex items-center justify-between h-12 px-4">
                  <span className="text-[17px] text-gray-900">Белки</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={newProduct.protein ?? ''}
                      onChange={(e) => setNewProduct({ ...newProduct, protein: Number(e.target.value) })}
                      disabled={submitting}
                    />
                    <span className="text-[17px] text-gray-400 w-8 text-right">г</span>
                  </div>
                </div>

                {/* Fats */}
                <div className="flex items-center justify-between h-12 px-4">
                  <span className="text-[17px] text-gray-900">Жиры</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={newProduct.fats ?? ''}
                      onChange={(e) => setNewProduct({ ...newProduct, fats: Number(e.target.value) })}
                      disabled={submitting}
                    />
                    <span className="text-[17px] text-gray-400 w-8 text-right">г</span>
                  </div>
                </div>

                {/* Carbs */}
                <div className="flex items-center justify-between h-12 px-4">
                  <span className="text-[17px] text-gray-900">Углеводы</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-24 text-right text-[17px] text-blue-600 placeholder-gray-300 focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={newProduct.carbs ?? ''}
                      onChange={(e) => setNewProduct({ ...newProduct, carbs: Number(e.target.value) })}
                      disabled={submitting}
                    />
                    <span className="text-[17px] text-gray-400 w-8 text-right">г</span>
                  </div>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-500 mt-2">{formError}</p>
              )}
            </div>

            <button
              onClick={handleSaveProduct}
              className="w-full h-14 mt-8 bg-ios-blue text-white rounded-2xl font-bold text-[17px] shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Сохраняем…' : 'Сохранить продукт'}
            </button>
            <div className="h-6" /> {/* Safe area spacer */}
          </div>
        </div>
      )}
    </div>
  );
};
