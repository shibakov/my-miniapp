import { useEffect } from "react";
import LogFoodPage from "./pages/LogFoodPage";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

function App() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-100">
      <LogFoodPage />
    </div>
  );
}

export default App;
