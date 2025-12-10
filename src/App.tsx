import { useEffect, useState } from "react";
import { BottomNav } from "./new-ui/BottomNav";
import LogFoodPage from "./pages/LogFoodPage";
import SplashScreen from "./components/SplashScreen";
import ProductsScreen from "./pages/ProductsScreen";
import HomeScreen from "./pages/HomeScreen";
import DynamicsScreen from "./pages/DynamicsScreen";

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
  const [mealMode, setMealMode] = useState<"home" | "add">("home");

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
    activeTab === "meal" && mealMode === "home"
      ? "home"
      : activeTab === "meal" && mealMode === "add"
      ? "add"
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

  return (
    <>
      <SplashScreen />

      <div className="w-full min-h-screen bg-gray-100 flex flex-col relative">
        <div className="flex-1">
          {activeTab === "meal" &&
            (mealMode === "home" ? (
              <HomeScreen
                refreshKey={statsRefreshKey}
                onAddMeal={() => setMealMode("add")}
              />
            ) : (
              <LogFoodPage
                key={statsRefreshKey}
                onLogSaved={handleLogSaved}
                onBack={() => setMealMode("home")}
              />
            ))}

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
