import { useEffect, useState } from "react";
import { BottomNav } from "./new-ui/BottomNav";
import { AddMealScreen } from "./new-ui/AddMealScreen";
import { MealDetailsScreen } from "./new-ui/MealDetailsScreen";
import { BottomSheet } from "./new-ui/BottomSheet";
import SplashScreen from "./components/SplashScreen";
import ProductsScreen from "./pages/ProductsScreen";
import HomeScreen from "./pages/HomeScreen";
import DynamicsScreen from "./pages/DynamicsScreen";
import type { HistoryMeal } from "./lib/api";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<"meal" | "history" | "analytics">(
    "meal"
  );
  const [mealMode, setMealMode] = useState<"home" | "add" | "details">("home");
  const [selectedMeal, setSelectedMeal] = useState<HistoryMeal | null>(null);
  const [selectedMealDate, setSelectedMealDate] = useState<string | null>(null);

  const handleNavigate = (
    screen: "home" | "products" | "add" | "dynamics" | "settings"
  ) => {
    switch (screen) {
      case "home":
        setActiveTab("meal");
        setMealMode("home");
        break;
      case "add":
        setActiveTab("meal");
        setMealMode("add");
        break;
      case "products":
        setActiveTab("analytics");
        break;
      case "dynamics":
        setActiveTab("history");
        break;
      case "settings":
        setActiveTab("history");
        break;
      default:
        setActiveTab("meal");
        setMealMode("home");
    }
  };

  const activeScreen: "home" | "products" | "add" | "dynamics" | "settings" =
    activeTab === "meal"
      ? mealMode === "add"
        ? "add"
        : "home"
      : activeTab === "analytics"
      ? "products"
      : activeTab === "history"
      ? "dynamics"
      : "settings";

  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  const handleLogSaved = async () => {
    // После сохранения приёма просто обновляем ключ статистики
    // и возвращаемся на главный экран
    setStatsRefreshKey((key) => key + 1);
    setMealMode("home");
  };

  const handleOpenMeal = (meal: HistoryMeal, dateIso: string) => {
    setSelectedMeal(meal);
    setSelectedMealDate(dateIso);
    setMealMode("details");
  };

  const handleMealUpdated = () => {
    // После изменения граммов в деталях обновляем дневную статистику
    setStatsRefreshKey((key) => key + 1);
  };

  return (
    <>
      <SplashScreen />

      <div className="w-full min-h-screen bg-ios-bg flex flex-col relative">
        <div className="flex-1">
          {activeTab === "meal" && (
            <>
              {/* Базовый домашний экран всегда под шторками */}
              <HomeScreen
                refreshKey={statsRefreshKey}
                onAddMeal={() => setMealMode("add")}
                onOpenMeal={handleOpenMeal}
              />

              {/* Bottom sheet: Добавить приём пищи */}
              <BottomSheet
                isOpen={mealMode === "add"}
                onClose={() => setMealMode("home")}
                enableSwipeDown
              >
                <AddMealScreen
                  key={statsRefreshKey}
                  onSave={handleLogSaved}
                  onBack={() => setMealMode("home")}
                />
              </BottomSheet>

              {/* Bottom sheet: Детали приёма пищи */}
              <BottomSheet
                isOpen={mealMode === "details" && !!selectedMeal && !!selectedMealDate}
                onClose={() => setMealMode("home")}
                enableSwipeDown
              >
                {selectedMeal && selectedMealDate && (
                  <MealDetailsScreen
                    meal={selectedMeal}
                    date={selectedMealDate}
                    onBack={() => setMealMode("home")}
                    onUpdated={handleMealUpdated}
                  />
                )}
              </BottomSheet>
            </>
          )}

          {activeTab === "history" && (
            <DynamicsScreen onBack={() => setActiveTab("meal")} />
          )}

          {activeTab === "analytics" && <ProductsScreen />}
        </div>

        <BottomNav onNavigate={handleNavigate} activeScreen={activeScreen} />
      </div>
    </>
  );
}

export default App;
