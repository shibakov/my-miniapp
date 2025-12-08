import { useCallback, useEffect, useState } from "react";
import { UtensilsCrossed, History, BarChart3, MessageCircle } from "lucide-react";
import LogFoodPage from "./pages/LogFoodPage";
import HistoryPage from "./pages/HistoryPage";
import SplashScreen from "./components/SplashScreen";
import ResponsesPage from "./pages/ResponsesPage";
import MyProductsPage from "./pages/MyProductsPage";
import { getDailyLogResponses, getDailyTextReport } from "./lib/api";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export interface LogResponseMessage {
  id: string;
  text: string;
  created_at: string;
  type: "system";
}

function App() {
  const [activeTab, setActiveTab] = useState<
    "meal" | "history" | "analytics" | "responses"
  >("meal");
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [responses, setResponses] = useState<LogResponseMessage[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesError, setResponsesError] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  const loadTodayResponses = useCallback(async () => {
    setResponsesLoading(true);
    setResponsesError(null);
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const raw = await getDailyLogResponses(today);
      setResponses(
        raw.map((item) => ({
          id: String(item.id),
          text: item.text_report,
          created_at: item.datetime,
          type: "system" as const
        }))
      );
    } catch (e) {
      console.error("Не удалось загрузить log_responses за сегодня", e);
      setResponsesError("Не удалось загрузить ответы за сегодня");
    } finally {
      setResponsesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "responses") {
      loadTodayResponses();
    }
  }, [activeTab, loadTodayResponses]);

  const handleStatsChanged = () => {
    setStatsRefreshKey((key) => key + 1);
  };

  const handleLogSaved = async () => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    try {
      const text = await getDailyTextReport(today);
      const finalText =
        text ?? "Лог сохранён, но текстовый отчёт пока недоступен.";

      setResponses((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          text: finalText,
          created_at: new Date().toISOString(),
          type: "system"
        }
      ]);
    } catch (e) {
      console.error("Не удалось получить text_report", e);
      setResponses((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          text: "Лог сохранён, но не удалось получить отчёт за день.",
          created_at: new Date().toISOString(),
          type: "system"
        }
      ]);
    }
  };

  return (
    <>
      <SplashScreen />

      <div className="w-full min-h-screen bg-gray-100 flex flex-col">
        <div className="flex-1">
          {activeTab === "meal" && (
            <LogFoodPage key={statsRefreshKey} onLogSaved={handleLogSaved} />
          )}
          {activeTab === "responses" && (
            <ResponsesPage
              messages={responses}
              loading={responsesLoading}
              error={responsesError}
              onRetry={loadTodayResponses}
            />
          )}
          {activeTab === "history" && (
            <HistoryPage onStatsChanged={handleStatsChanged} />
          )}
          {activeTab === "analytics" && <MyProductsPage />}
        </div>

        {/* Нижняя навигация */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
          <div className="flex justify-around px-2 pt-2 pb-3 text-[11px]">
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
              className="flex flex-col items-center gap-0.5 min-w-[64px]"
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
                Мои продукты
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("responses")}
              className="flex flex-col items-center gap-0.5 min-w-[64px]"
            >
              <MessageCircle
                className={
                  "h-5 w-5 " +
                  (activeTab === "responses" ? "text-blue-600" : "text-slate-400")
                }
              />
              <span
                className={
                  activeTab === "responses"
                    ? "font-medium text-blue-600"
                    : "text-slate-400"
                }
              >
                Ответы
              </span>
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
