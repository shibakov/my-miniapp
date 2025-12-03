import { useEffect, useState } from "react";
import LogFoodPage from "./pages/LogFoodPage";
import HistoryPage from "./pages/HistoryPage";
import SplashScreen from "./components/SplashScreen";

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
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  const handleStatsChanged = () => {
    setStatsRefreshKey((key) => key + 1);
  };

  return (
    <>
      <SplashScreen />

      <div className="w-full min-h-screen bg-gray-100 flex flex-col">
        <div className="flex-1">
          {activeTab === "meal" && (
            <LogFoodPage key={statsRefreshKey} />
          )}
          {activeTab === "history" && (
            <HistoryPage onStatsChanged={handleStatsChanged} />
          )}
          {activeTab === "analytics" && (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">
              Аналитика появится позже
            </div>
          )}
        </div>

        {/* Нижняя навигация */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
          <div className="flex justify-around px-2 pt-1 pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("meal")}
              className="flex flex-col items-center"
            >
              <span
                className={
                  activeTab === "meal" ? "font-medium text-blue-600" : "text-slate-400"
                }
              >
                Приём
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className="flex flex-col items-center"
            >
              <span
                className={
                  activeTab === "history"
                    ? "font-medium text-blue-600"
                    : "text-slate-400"
                }
              >
                История
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className="flex flex-col items-center"
            >
              <span
                className={
                  activeTab === "analytics"
                    ? "font-medium text-blue-600"
                    : "text-slate-400"
                }
              >
                Аналитика
              </span>
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
