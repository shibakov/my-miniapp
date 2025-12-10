import MyProductsPage from "./MyProductsPage";

export default function ProductsScreen() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header в стиле нового дизайна */}
      <header className="px-5 pt-6 pb-3 bg-white shadow-sm flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Мои продукты</h1>
          <p className="text-xs text-gray-500">
            Личный словарь продуктов с КБЖУ
          </p>
        </div>
      </header>

      {/* Основной контент: переиспользуем всю логику MyProductsPage */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <MyProductsPage />
      </main>
    </div>
  );
}
