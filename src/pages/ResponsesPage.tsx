import { Card } from "@/components/ui/card";
import type { LogResponseMessage } from "../App";

interface ResponsesPageProps {
  messages: LogResponseMessage[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function formatMessageText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const blocks = trimmed.split(/\n{2,}/); // абзацы разделяем по пустым строкам

  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n");
    const trimmedLines = lines.map((l) => l.trim());

    // Маркированный список, если каждая строка начинается с "- " или "• "
    const isList =
      trimmedLines.length > 1 &&
      trimmedLines.every((line) => /^[-•]\s+/.test(line));

    if (isList) {
      return (
        <ul
          key={blockIndex}
          className="list-disc list-inside space-y-0.5 text-[11px] leading-snug text-slate-800"
        >
          {trimmedLines.map((line, i) => (
            <li key={i}>{line.replace(/^[-•]\s+/, "")}</li>
          ))}
        </ul>
      );
    }

    // Заголовок: одна строка, начинается с # или заканчивается на ":"
    if (
      trimmedLines.length === 1 &&
      (/^#+\s+/.test(trimmedLines[0]) || trimmedLines[0].endsWith(":"))
    ) {
      const heading = trimmedLines[0].replace(/^#+\s+/, "");
      return (
        <p
          key={blockIndex}
          className="font-semibold text-[11px] leading-snug text-slate-800"
        >
          {heading}
        </p>
      );
    }

    // Обычный абзац с сохранением переводов строк
    return (
      <p
        key={blockIndex}
        className="whitespace-pre-wrap text-[11px] leading-snug text-slate-800"
      >
        {block}
      </p>
    );
  });
}

export default function ResponsesPage({ messages, loading, error, onRetry }: ResponsesPageProps) {
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
          {loading && messages.length === 0 && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-[2px] border-slate-300 border-t-blue-500" />
              <span>Загружаем ответы за сегодня…</span>
            </div>
          )}

          {!loading && error && (
            <div className="text-[11px] text-red-600 space-y-2">
              <div>{error}</div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-blue-600 underline underline-offset-2"
                >
                  Повторить запрос
                </button>
              )}
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="text-[11px] text-slate-500">
              За сегодня ещё нет ответов. После сохранения лога здесь появятся
              сообщения и дневные саммари.
            </div>
          )}

          {!loading && messages.length > 0 && (
            <div className="space-y-1.5">
              {messages.map((msg) => (
                <div key={msg.id} className="text-[11px] text-slate-700">
                  <span className="block text-[10px] text-slate-400">
                    {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                  <div className="mt-0.5 bg-slate-100 rounded-xl px-2 py-1">
                    {formatMessageText(msg.text)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
