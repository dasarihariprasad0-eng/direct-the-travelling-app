import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  Loader2,
  Users,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  listTripMessages,
  sendTripMessage,
  type TripChatMessage,
} from "@/lib/travel.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/language-context";

type TripChatProps = {
  tripId: string;
  tripTitle?: string | undefined;
  currentUserId: string;
  isMember: boolean;
  membersCount: number;
  maxTravelers?: number | undefined;
  onJoinTrip?: (() => void) | undefined;
  isJoining?: boolean | undefined;
};

export function TripChat({
  tripId,
  tripTitle,
  currentUserId,
  isMember,
  membersCount,
  maxTravelers,
  onJoinTrip,
  isJoining,
}: TripChatProps) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    data: messages = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["trip-messages", tripId],
    queryFn: () => listTripMessages({ data: { tripId } }),
    enabled: isMember,
    refetchInterval: 4000,
  });

  const sendMut = useMutation({
    mutationFn: (text: string) => sendTripMessage({ data: { tripId, content: text } }),
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["trip-messages", tripId] });
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("Could not send message."));
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || sendMut.isPending) return;
    sendMut.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const starterPrompts = [
    t("Hi everyone! Excited for our trip plans."),
    t("Where is our first meetup point?"),
    t("Are there any packing essentials to coordinate?"),
  ];

  return (
    <div className="surface-card flex h-[600px] flex-col overflow-hidden rounded-2xl border border-border shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-5 py-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {t("Traveler Chat")}
              </h2>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("Active")}
              </span>
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>
                {membersCount} {maxTravelers ? `/ ${maxTravelers}` : ""} {t("members in group")}
              </span>
              {tripTitle ? <span>· {tripTitle}</span> : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMember && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => void refetch()}
              disabled={isFetching}
              title={t("Refresh messages")}
              aria-label={t("Refresh messages")}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </div>
      {/* Messages Scroll Area */}
      <div
        className="flex-1 space-y-3.5 overflow-y-auto p-5"
        role="log"
        aria-label={t("Trip chat messages")}
      >
        {!isMember ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-4">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              {t("Member-only trip conversation")}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {t("Join this trip to chat in real time with fellow travelers, coordinate schedules, and plan activities.")}
            </p>
            {onJoinTrip && (
              <Button
                className="mt-5"
                onClick={onJoinTrip}
                disabled={isJoining}
              >
                {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("Join this trip to chat")}
              </Button>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-destructive">{t("Could not load group messages.")}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void refetch()}
            >
              {t("Try again")}
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {t("Start the conversation!")}
            </h3>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {t("No messages yet. Say hello and coordinate your plans with the group!")}
            </p>

            <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Quick starters")}
              </p>
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setContent(prompt)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-foreground transition hover:border-primary hover:bg-accent/40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg: TripChatMessage) => {
            const isMe = msg.user_id === currentUserId;
            const initial = (msg.sender_name || "T").slice(0, 1).toUpperCase();
            const timeStr = formatTime(msg.created_at);

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div
                    className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground border border-border"
                    title={msg.sender_name}
                  >
                    {initial}
                  </div>
                )}

                <div
                  className={`group relative max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all ${
                    isMe
                      ? "rounded-br-sm bg-accent text-foreground border border-accent/80"
                      : "rounded-bl-sm bg-card text-card-foreground border border-border"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[11px]">
                    <span className="font-semibold">
                      {isMe ? t("You") : msg.sender_name}
                    </span>
                    {msg.sender_role === "organizer" && (
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[10px] font-normal border-primary/40 text-primary"
                      >
                        {t("Organizer")}
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-[10px] ml-auto">
                      {timeStr}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap break-words leading-relaxed text-[13.5px]">
                    {msg.content}
                  </p>
                </div>

                {isMe && (
                  <div
                    className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                    title={t("You")}
                  >
                    {initial}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      {isMember && (
        <div className="border-t border-border bg-card/80 p-3.5 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <div className="relative flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("Send a message to your group… (Enter to send)")}
                rows={2}
                maxLength={2000}
                className="resize-none py-2 px-3 text-sm rounded-xl border-border focus-visible:ring-1 focus-visible:ring-primary"
                disabled={sendMut.isPending}
                aria-label={t("Chat message input")}
              />
              <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
                {content.length}/2000
              </span>
            </div>

            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={!content.trim() || sendMut.isPending}
              aria-label={t("Send message")}
            >
              {sendMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            {t("Press Enter to send, Shift + Enter for a new line")}
          </p>
        </div>
      )}

    </div>
  );
}
