import { Card } from "@/components/ui/card";
import type { LogResponseMessage } from "../App";

interface ResponsesPageProps {
  messages: LogResponseMessage[];
}

export default function ResponsesPage({ messages }: ResponsesPageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-16">
      <header className="px-4 pt-4 pb-3 bg-white shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight mb-1">
          Ответы на логи
        </h1>
        <p className="text-[11px] text-slate-500">
          Здесь будут появляться ответы и саммари по сохранённым логам.
        </p>
      </header>

      <main className="flex-1 px-4 pt-3 overflow-y-auto space-y-3">
        <Card className="border-slate-200 bg-white px-3 py-2.5 rounded-2xl shadow-sm min-h-[120px]">
          {messages.length === 0 ? (
            <div className="text-[11px] text-slate-500">
              Пока нет ответов. После сохранения лога здесь появится сообщение
              «лог успешно записан», а позже — комментарии и дневные саммари.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="text-[11px] text-slate-700">
                  <span className="block text-[10px] text-slate-400">
                    {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                  <span className="inline-block bg-slate-100 rounded-xl px-2 py-1 mt-0.5">
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
