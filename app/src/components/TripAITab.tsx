import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/language-context";
import type { AssistantMessage } from "@/lib/travel.api";

type TripAITabProps = {
  thread?: AssistantMessage[] | undefined;
  isThreadError: boolean;
  onAsk: (content: string) => void;
  isAsking: boolean;
  localizedItinerary: (key: string, original: string | null | undefined) => string;
};

export function TripAITab({
  thread,
  isThreadError,
  onAsk,
  isAsking,
  localizedItinerary,
}: TripAITabProps) {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed && !isAsking) {
      onAsk(trimmed);
      setMessage("");
    }
  };

  return (
    <section className="surface-card mt-6 p-6 rounded-2xl border border-border shadow-sm max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="eyebrow">{t("Travel AI")}</p>
          <h2 className="text-xl font-semibold">{t("Ask about your trip")}</h2>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("AI suggestions can be wrong. Check official sources for safety-critical details.")}
      </p>

      <div className="mt-5 max-h-96 space-y-3.5 overflow-y-auto p-1" aria-live="polite">
        {thread?.map((entry) => (
          <div
            key={entry.id}
            className={`rounded-2xl p-4 text-sm ${
              entry.role === "assistant"
                ? "bg-secondary text-foreground"
                : "border border-border bg-card text-foreground"
            }`}
          >
            <p className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
              {entry.role === "assistant" ? t("Travel AI") : t("You")}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">
              {entry.role === "assistant"
                ? localizedItinerary(`assistant.${entry.id}`, entry.content)
                : entry.content}
            </p>
          </div>
        ))}
        {isThreadError && (
          <p role="alert" className="text-sm text-destructive">
            {t("Could not load the assistant conversation.")}
          </p>
        )}
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <Textarea
          aria-label={t("Ask Travel AI about this trip")}
          placeholder={t("What should we do if it rains?")}
          rows={3}
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="rounded-xl resize-none"
        />
        <Button
          type="submit"
          className="w-full"
          disabled={!message.trim() || isAsking}
        >
          {isAsking ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {t("Send question")}
        </Button>
      </form>
    </section>
  );
}
