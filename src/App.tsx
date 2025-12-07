import { useEffect, useState } from "react";
import { UtensilsCrossed, History, BarChart3 } from "lucide-react";
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
          <div className="flex justify-around px-3 pt-2 pb-3 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("meal")}
              className="flex flex-col items-center gap-0.5 min-w-[80px]"
            >
              <UtensilsCrossed
                className={
                  "h-5 w-5 " +
                  (activeTab === "meal" ? "text-blue-600" : "text-slate-400")
                }
              />
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
              className="flex flex-col items-center gap-0.5 min-w-[80px]"
            >
              <History
                className={
                  "h-5 w-5 " +
                  (activeTab === "history" ? "text-blue-600" : "text-slate-400")
                }
              />
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
              className="flex flex-col items-center gap-0.5 min-w-[80px]"
            >
              <BarChart3
                className={
                  "h-5 w-5 " +
                  (activeTab === "analytics" ? "text-blue-600" : "text-slate-400")
                }
              />
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
