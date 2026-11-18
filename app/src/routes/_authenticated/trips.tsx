import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CloudSun,
  ExternalLink,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  addTripExpense,
  askAssistant,
  createTrip,
  generateItinerary,
  getAssistantThread,
  getTrip,
  getTripTranslations,
  getTripCollaboration,
  joinTrip,
  listTrips,
  toggleProgress,
  voteOnItinerary,
  type TripCard,
} from "@/lib/travel.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookingOptions } from "@/components/BookingOptions";
import { TripChat } from "@/components/TripChat";
import { TripGroupTab } from "@/components/TripGroupTab";
import { TripAITab } from "@/components/TripAITab";

import { useLanguage } from "@/lib/language-context";

type Search = { trip?: string };

export const Route = createFileRoute("/_authenticated/trips")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search["trip"] === "string" ? { trip: search["trip"] } : {},
  head: () => ({
    meta: [
      { title: "Group trips — DIRECT" },
      {
        name: "description",
        content: "Browse open group trips or start one for compatible travelers.",
      },
      { property: "og:title", content: "Group trips — DIRECT" },
      { property: "og:description", content: "Find a group trip or organize your own." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const { trip: selectedTrip } = Route.useSearch();
  return selectedTrip ? <TripDetail tripId={selectedTrip} /> : <TripsList />;
}

function TripsList() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    destination: "",
    additional_stops: "",
    start_date: "",
    end_date: "",
    max_travelers: 6,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["trips", search],
    queryFn: () => listTrips({ data: { search } }),
  });

  const createMut = useMutation({
    mutationFn: () => {
      const { additional_stops, ...trip } = form;
      const destinations = [trip.destination, ...additional_stops.split(";")]
        .map((destination) => destination.trim())
        .filter(Boolean);
      return createTrip({ data: { ...trip, destinations, visibility: "public" } });
    },
    onSuccess: () => {
      toast.success(t("Trip created"));
      setForm({
        title: "",
        destination: "",
        additional_stops: "",
        start_date: "",
        end_date: "",
        max_travelers: 6,
      });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["my-trips"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("Could not create trip.")),
  });
  const valid =
    form.title.trim().length >= 3 &&
    form.destination.trim().length >= 2 &&
    Boolean(form.start_date && form.end_date) &&
    form.end_date >= form.start_date;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="eyebrow">{t("Group trips")}</p>
      <h1 className="mt-2 text-3xl">{t("Find or start a group trip")}</h1>

      <form
        className="surface-card mt-8 grid gap-3 p-5 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) createMut.mutate();
        }}
      >
        <Input
          aria-label={t("Trip title")}
          placeholder={t("Trip title")}
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          minLength={3}
          maxLength={120}
          required
        />
        <Input
          aria-label={t("Destination")}
          placeholder={t("Starting destination (e.g. Jaipur)")}
          value={form.destination}
          onChange={(event) => setForm({ ...form, destination: event.target.value })}
          minLength={2}
          maxLength={120}
          required
        />
        <Input
          aria-label={t("Additional route stops")}
          placeholder={t("Additional stops, in order (optional; separate with semicolons)")}
          value={form.additional_stops}
          onChange={(event) => setForm({ ...form, additional_stops: event.target.value })}
        />
        <Input
          type="date"
          aria-label={t("Start date")}
          value={form.start_date}
          onChange={(event) => setForm({ ...form, start_date: event.target.value })}
          required
        />
        <Input
          type="date"
          aria-label={t("End date")}
          value={form.end_date}
          min={form.start_date || undefined}
          onChange={(event) => setForm({ ...form, end_date: event.target.value })}
          required
        />
        <Input
          type="number"
          min={2}
          max={20}
          aria-label={t("Maximum travelers")}
          value={form.max_travelers}
          onChange={(event) => setForm({ ...form, max_travelers: Number(event.target.value) || 2 })}
        />
        <Button type="submit" disabled={!valid || createMut.isPending}>
          {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("Start trip")}
        </Button>
        {form.end_date && form.start_date && form.end_date < form.start_date && (
          <p role="alert" className="text-sm text-destructive md:col-span-2">
            {t("The end date must be on or after the start date.")}
          </p>
        )}
      </form>

      <Input
        className="mt-8"
        aria-label={t("Search trips by destination")}
        placeholder={t("Search by destination")}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {isLoading ? (
        <Loader2
          aria-label={t("Loading trips")}
          className="mt-8 h-5 w-5 animate-spin text-muted-foreground"
        />
      ) : isError ? (
        <div role="alert" className="surface-card mt-6 p-5">
          <p className="text-sm text-destructive">{t("Could not load group trips.")}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            {t("Try again")}
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(data ?? []).map((trip) => (
            <TripCardView key={trip.id} trip={trip} />
          ))}
          {data?.length === 0 && (
            <p className="surface-card p-5 text-sm text-muted-foreground md:col-span-2">
              {t("No trips match this destination yet. Try another search or start a group trip.")}
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function TripCardView({ trip }: { trip: TripCard }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const joinMut = useMutation({
    mutationFn: () => joinTrip({ data: { tripId: trip.id } }),
    onSuccess: () => {
      toast.success(t("You joined the trip"));
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["my-trips"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("Could not join trip.")),
  });

  return (
    <article className="surface-card flex flex-col justify-between rounded-2xl border border-border p-5 shadow-sm transition hover:border-primary/40">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{trip.title}</h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {trip.destination}
            </p>
          </div>
          <Badge variant="secondary" className="capitalize text-xs font-medium">
            {t(trip.status.replaceAll("_", " "))}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-foreground font-medium">
            <Users className="h-3 w-3 text-primary" /> {trip.memberCount}/{trip.max_travelers}{" "}
            {t("travelers")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-muted-foreground">
            <CalendarDays className="h-3 w-3" /> {trip.start_date} → {trip.end_date}
          </span>
          {trip.isMember && (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-accent-foreground font-medium">
              <MessageSquare className="h-3 w-3 text-primary" />
              {t("Joined")}
            </span>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link to="/trips" search={{ trip: trip.id }}>
            {t("View trip plan")}
          </Link>
        </Button>
        {!trip.isMember && (
          <Button
            size="sm"
            disabled={joinMut.isPending || trip.memberCount >= trip.max_travelers}
            onClick={() => joinMut.mutate()}
          >
            {joinMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {trip.memberCount >= trip.max_travelers ? t("Group full") : t("Join trip")}
          </Button>
        )}
      </div>
    </article>
  );
}

function TripDetail({ tripId }: { tripId: string }) {
  const { language, t } = useLanguage();
  const { profile } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"plan" | "chat" | "group" | "ai">("plan");

  const [message, setMessage] = useState("");
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const detail = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTrip({ data: { tripId } }),
  });
  const itineraryTranslation = useQuery({
    queryKey: ["trip-translations", tripId, language, detail.data?.itinerary?.id],
    queryFn: () => getTripTranslations({ data: { tripId, language } }),
    enabled: Boolean(
      detail.data?.isMember &&
      detail.data?.itinerary &&
      detail.data.itinerary.language !== language,
    ),
    retry: false,
  });
  const collaboration = useQuery({
    queryKey: ["trip-collaboration", tripId],
    queryFn: () => getTripCollaboration({ data: { tripId } }),
    enabled: Boolean(detail.data?.isMember),
    refetchInterval: 10_000,
  });
  const thread = useQuery({
    queryKey: ["assistant-thread", tripId],
    queryFn: () => getAssistantThread({ data: { tripId } }),
    enabled: Boolean(detail.data?.isMember && detail.data?.itinerary),
  });

  const generateMut = useMutation({
    mutationFn: () => generateItinerary({ data: { tripId, language } }),
    onSuccess: () => {
      toast.success(t("Suggested trip schedule is ready"));
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      qc.invalidateQueries({ queryKey: ["assistant-thread", tripId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("Could not build schedule.")),
  });
  const progressMut = useMutation({
    mutationFn: (data: { dayId: string; itemIndex: number; done: boolean }) =>
      toggleProgress({ data: { tripId, ...data } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", tripId] }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("Could not update progress.")),
  });
  const voteMut = useMutation({
    mutationFn: (input: { dayId: string; itemIndex: number; value: "up" | "down" | "clear" }) =>
      voteOnItinerary({ data: { tripId, ...input } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip-collaboration", tripId] }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("Could not save your vote.")),
  });
  const expenseMut = useMutation({
    mutationFn: () =>
      addTripExpense({
        data: { tripId, title: expenseTitle.trim(), amountInr: Number(expenseAmount) },
      }),
    onSuccess: () => {
      setExpenseTitle("");
      setExpenseAmount("");
      toast.success(t("Shared expense added"));
      qc.invalidateQueries({ queryKey: ["trip-collaboration", tripId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("Could not add the expense.")),
  });
  const joinMut = useMutation({
    mutationFn: () => joinTrip({ data: { tripId } }),
    onSuccess: () => {
      toast.success(t("You joined the trip"));
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["my-trips"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("Could not join trip.")),
  });
  const askMut = useMutation({
    mutationFn: (content: string) => askAssistant({ data: { tripId, message: content, language } }),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["assistant-thread", tripId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("Travel AI is unavailable.")),
  });

  if (detail.isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
        <Loader2
          aria-label={t("Loading trip")}
          className="h-5 w-5 animate-spin text-muted-foreground"
        />
      </main>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div role="alert" className="surface-card p-6">
          <h1 className="text-xl">{t("Could not load this trip")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("The trip may have been removed, or you may not have permission to view it.")}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/trips">{t("Back to group trips")}</Link>
          </Button>
        </div>
      </main>
    );
  }

  const data = detail.data;
  const needsItineraryTranslation =
    Boolean(data.itinerary) && data.itinerary?.language !== language && data.isMember;
  const localizedItinerary = (key: string, original: string | null | undefined) =>
    needsItineraryTranslation
      ? (itineraryTranslation.data?.translations[key] ?? original ?? "")
      : (original ?? "");
  const allItems = data.days.reduce((sum, day) => sum + day.items.length, 0);
  const myDone = data.progress.filter((item) => item.user_id === data.userId && item.done).length;
  const percent = allItems ? Math.round((myDone / allItems) * 100) : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to="/trips">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("All group trips")}
        </Link>
      </Button>

      <header className="surface-card mt-3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t(data.trip.country || "Group trip")}</p>
            <h1 className="mt-2 text-3xl">{data.trip.title}</h1>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {data.trip.destination}
            </p>
          </div>
          <Badge variant="secondary">{t(data.trip.status.replaceAll("_", " "))}</Badge>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span>
            {data.trip.start_date} → {data.trip.end_date}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" /> {data.members.length}/{data.trip.max_travelers}{" "}
            {t("travelers")}
          </span>
          {data.trip.budget_level && (
            <span>
              {t("Budget:")} {t(data.trip.budget_level)}
            </span>
          )}
        </div>
        {data.trip.description && (
          <p className="mt-4 text-sm leading-relaxed">{data.trip.description}</p>
        )}
        {!data.isMember && (
          <Button
            className="mt-5"
            onClick={() => joinMut.mutate()}
            disabled={joinMut.isPending || data.members.length >= data.trip.max_travelers}
          >
            {joinMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {data.members.length >= data.trip.max_travelers ? t("Group full") : t("Join this trip")}
          </Button>
        )}
      </header>

      <BookingOptions
        destination={data.trip.destination}
        origin={profile?.home_city ?? null}
        startDate={data.trip.start_date}
        endDate={data.trip.end_date}
        travelers={Math.max(data.members.length, 1)}
        rooms={Math.ceil(Math.max(data.members.length, 1) / 2)}
      />

      {/* Modern View Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("plan")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "plan"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-foreground hover:bg-muted"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>{t("Schedule & Plan")}</span>
          {data.itinerary ? (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                activeTab === "plan"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted-foreground/15 text-muted-foreground"
              }`}
            >
              {data.days.length}d
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "chat"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-foreground hover:bg-muted"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{t("Traveler Chat")}</span>
          {data.isMember && (
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("group")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "group"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{t("Travel Group & Costs")}</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
              activeTab === "group"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted-foreground/15 text-muted-foreground"
            }`}
          >
            {data.members.length}
          </span>
        </button>

        {data.isMember && data.itinerary ? (
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeTab === "ai"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-foreground hover:bg-muted"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>{t("Ask Travel AI")}</span>
          </button>
        ) : null}
      </div>

      {activeTab === "chat" && (
        <section className="mt-6">
          <TripChat
            tripId={tripId}
            tripTitle={data.trip.title}
            currentUserId={data.userId}
            isMember={data.isMember}
            membersCount={data.members.length}
            maxTravelers={data.trip.max_travelers}
            onJoinTrip={() => joinMut.mutate()}
            isJoining={joinMut.isPending}
          />
        </section>
      )}


      {activeTab === "plan" && (
        <section className="mt-6 grid gap-5 md:grid-cols-[1fr_18rem]">
          <div>
            {data.itinerary && data.isMember && (
              <div className="surface-card mb-5 flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-primary p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("Plan is ready! Chat with fellow travelers")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("Discuss timing, packing, and coordinate with all members in the group.")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary text-primary hover:bg-accent/40"
                  onClick={() => setActiveTab("chat")}
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  {t("Open Chat")}
                </Button>
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{t("Day-by-day plan")}</p>
              <h2 className="mt-1 text-2xl">
                {data.itinerary ? t("Suggested schedule") : t("Plan this trip")}
              </h2>
            </div>
            {data.isMember && (
              <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
                {generateMut.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("Building schedule…")}
                  </>
                ) : data.itinerary ? (
                  t("Regenerate suggestion")
                ) : (
                  t("Generate schedule")
                )}
              </Button>
            )}
          </div>

          {needsItineraryTranslation && itineraryTranslation.isLoading ? (
            <p role="status" className="surface-card p-5 text-sm text-muted-foreground">
              {t("Translating your trip plan…")}
            </p>
          ) : needsItineraryTranslation && itineraryTranslation.isError ? (
            <div role="alert" className="surface-card p-5">
              <p className="text-sm text-destructive">{t("Could not translate this trip plan.")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void itineraryTranslation.refetch()}
              >
                {t("Try again")}
              </Button>
            </div>
          ) : data.itinerary ? (
            <div className="space-y-4">
              <article className="surface-card p-5">
                <p className="text-sm leading-relaxed">
                  {localizedItinerary("summary", data.itinerary.summary)}
                </p>
                {data.itinerary.weather_overview && (
                  <p className="mt-3 flex gap-2 text-sm text-muted-foreground">
                    <CloudSun className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {localizedItinerary("weather_overview", data.itinerary.weather_overview)}
                    </span>
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  {t(
                    "AI-generated suggestion · Verify weather, hours, permits, and costs before travel.",
                  )}
                </p>
                {data.itinerary.packing_notes.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium">{t("Packing notes")}</h3>
                    <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                      {data.itinerary.packing_notes.map((note, index) => (
                        <li key={`${index}-${note}`}>
                          {localizedItinerary(`packing.${index}`, note)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>

              {data.days.map((day) => (
                <section key={day.id} className="surface-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="eyebrow">
                        {t("Day")} {day.day_number}
                        {day.day_date ? ` · ${formatDate(day.day_date, language)}` : ""}
                      </p>
                      <h3 className="mt-1 text-xl">
                        {localizedItinerary(`day.${day.id}.title`, day.title)}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {day.destination && <Badge variant="outline">{day.destination}</Badge>}
                      {day.weather_summary && (
                        <Badge variant="outline">
                          {localizedItinerary(`day.${day.id}.weather`, day.weather_summary)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {day.weather_temp_high !== null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("Weather source summary · high")} {day.weather_temp_high}°C · {t("low")}{" "}
                      {day.weather_temp_low ?? "—"}°C
                    </p>
                  )}
                  <ol className="mt-5 space-y-4 border-l border-border pl-4">
                    {day.items.map((item, index) => {
                      const isDone = data.progress.some(
                        (entry) =>
                          entry.user_id === data.userId &&
                          entry.day_id === day.id &&
                          entry.item_index === index &&
                          entry.done,
                      );
                      const itemVote = collaboration.data?.votes.find(
                        (vote) => vote.day_id === day.id && vote.item_index === index,
                      );
                      return (
                        <li key={`${day.id}-${index}`} className="relative">
                          <span className="absolute -left-[1.33rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-primary">{item.time}</p>
                              <h4
                                className={`mt-1 font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}
                              >
                                {localizedItinerary(`item.${day.id}.${index}.title`, item.title)}
                              </h4>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                {localizedItinerary(
                                  `item.${day.id}.${index}.description`,
                                  item.description,
                                )}
                              </p>
                              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                                {item.location && (
                                  <a
                                    className="underline underline-offset-2"
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MapPin className="mr-1 inline h-3 w-3" />
                                    {item.location}
                                  </a>
                                )}
                                {item.cost_estimate && (
                                  <span>
                                    {localizedItinerary(
                                      `item.${day.id}.${index}.cost`,
                                      item.cost_estimate,
                                    )}{" "}
                                    · {t("estimate")}
                                  </span>
                                )}
                                {item.indoor && <span>{t("Indoors")}</span>}
                              </p>
                              {item.sources?.length ? (
                                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                  {item.sources.map((source) => (
                                    <li key={source.url}>
                                      <a
                                        className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink size={12} aria-hidden="true" />
                                        {source.title}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {t("No direct source found for this stop.")}
                                </p>
                              )}
                            </div>
                            {data.isMember && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant={isDone ? "secondary" : "outline"}
                                  onClick={() =>
                                    progressMut.mutate({
                                      dayId: day.id,
                                      itemIndex: index,
                                      done: !isDone,
                                    })
                                  }
                                  disabled={progressMut.isPending}
                                  aria-label={`${t(isDone ? "Mark incomplete" : "Mark complete")}: ${item.title}`}
                                >
                                  <Check className="mr-1.5 h-4 w-4" />
                                  {t(isDone ? "Done" : "Complete")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={itemVote?.my_vote === "up" ? "secondary" : "outline"}
                                  disabled={voteMut.isPending}
                                  aria-label={`${t("Vote for")} ${item.title}`}
                                  aria-pressed={itemVote?.my_vote === "up"}
                                  onClick={() =>
                                    voteMut.mutate({
                                      dayId: day.id,
                                      itemIndex: index,
                                      value: itemVote?.my_vote === "up" ? "clear" : "up",
                                    })
                                  }
                                >
                                  <ThumbsUp className="mr-1 h-3.5 w-3.5" />
                                  {itemVote?.up ?? 0}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={itemVote?.my_vote === "down" ? "secondary" : "outline"}
                                  disabled={voteMut.isPending}
                                  aria-label={`${t("Vote against")} ${item.title}`}
                                  aria-pressed={itemVote?.my_vote === "down"}
                                  onClick={() =>
                                    voteMut.mutate({
                                      dayId: day.id,
                                      itemIndex: index,
                                      value: itemVote?.my_vote === "down" ? "clear" : "down",
                                    })
                                  }
                                >
                                  <ThumbsDown className="mr-1 h-3.5 w-3.5" />
                                  {itemVote?.down ?? 0}
                                </Button>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
              {data.sources.length > 0 && (
                <section className="surface-card p-5">
                  <h3 className="text-base font-medium">{t("Research sources")}</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {data.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          className="text-primary underline underline-offset-2"
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <div className="surface-card p-6">
              <p className="text-sm text-muted-foreground">
                Create a suggested day-by-day schedule for your group. AI planning requires a
                server-side Gemini or Groq key.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="surface-card p-5">
            <p className="eyebrow">{t("Your progress")}</p>
            <p className="mt-2 font-display text-3xl">{percent}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {myDone} {t("of")} {allItems} {t("activities marked complete")}
            </p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label={t("Personal trip progress")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </section>
          {data.isMember && (
            <section className="surface-card p-5 border border-primary/20 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="eyebrow">{t("Traveler Chat")}</p>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="mt-2 text-sm font-semibold">{t("Chat with your group")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Coordinate meetup times, pack items, and make decisions in real-time.")}
              </p>
              <Button
                size="sm"
                className="mt-3.5 w-full"
                onClick={() => setActiveTab("chat")}
              >
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                {t("Open Traveler Chat")}
              </Button>
            </section>
          )}



          <section className="surface-card p-5">
            <p className="eyebrow">{t("Travel group")}</p>
            <ul className="mt-3 space-y-2">
              {data.members.map((member) => (
                <li key={member.user_id} className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs">
                    {(member.profile?.display_name ?? "T").slice(0, 1).toUpperCase()}
                  </span>
                  <span>{member.profile?.display_name ?? t("Traveler")}</span>
                  {member.role === "organizer" && <Badge variant="outline">{t("Organizer")}</Badge>}
                </li>
              ))}
            </ul>
          </section>

          {data.isMember && (
            <section className="surface-card p-5">
              <p className="eyebrow">{t("Group decisions")}</p>
              <h2 className="mt-1 text-lg">{t("Vote on activities")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Votes and shared expenses refresh automatically every 10 seconds.")}
              </p>
              {collaboration.isError ? (
                <div role="alert" className="mt-3">
                  <p className="text-sm text-destructive">{t("Could not load group updates.")}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => void collaboration.refetch()}
                  >
                    {t("Try again")}
                  </Button>
                </div>
              ) : null}
              {!data.itinerary && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("Generate a day-by-day plan to start voting on activities.")}
                </p>
              )}
            </section>
          )}

          {data.isMember && (
            <section className="surface-card p-5">
              <p className="eyebrow">{t("Shared costs · INR")}</p>
              <h2 className="mt-1 text-lg">{t("Expense split")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "Splits are shared equally among current trip members. This tracks balances only; no payments are collected.",
                )}
              </p>
              <form
                className="mt-4 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const amount = Number(expenseAmount);
                  if (
                    expenseTitle.trim().length >= 2 &&
                    Number.isSafeInteger(amount) &&
                    amount > 0 &&
                    amount <= 10_000_000
                  ) {
                    expenseMut.mutate();
                  }
                }}
              >
                <Input
                  aria-label={t("Expense description")}
                  placeholder={t("Expense (e.g. shared taxi)")}
                  maxLength={120}
                  minLength={2}
                  value={expenseTitle}
                  onChange={(event) => setExpenseTitle(event.target.value)}
                  required
                />
                <Input
                  aria-label={t("Expense amount in rupees")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10_000_000}
                  step={1}
                  placeholder={t("Amount in ₹")}
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={expenseMut.isPending || !expenseTitle.trim() || !expenseAmount}
                >
                  {expenseMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t("Add shared expense")}
                </Button>
              </form>

              {collaboration.data?.balances.length ? (
                <div className="mt-4 border-t border-border pt-3">
                  <h3 className="text-sm font-medium">{t("Group balances")}</h3>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {collaboration.data.balances.map((balance) => (
                      <li key={balance.user_id} className="flex justify-between gap-2">
                        <span>{balance.name}</span>
                        <span
                          className={
                            balance.balance_inr > 0
                              ? "text-emerald-700"
                              : balance.balance_inr < 0
                                ? "text-muted-foreground"
                                : ""
                          }
                        >
                          {balance.balance_inr > 0
                            ? `${t("is owed")} ₹${balance.balance_inr.toLocaleString(language === "en" ? "en-IN" : language)}`
                            : balance.balance_inr < 0
                              ? `${t("owes")} ₹${Math.abs(balance.balance_inr).toLocaleString(language === "en" ? "en-IN" : language)}`
                              : t("settled")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {collaboration.data?.expenses.length ? (
                <ul className="mt-4 space-y-2 border-t border-border pt-3">
                  {collaboration.data.expenses.slice(0, 8).map((expense) => (
                    <li key={expense.id} className="text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{expense.title}</span>
                        <span>₹{expense.amount_inr.toLocaleString("en-IN")}</span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {t("Paid by")} {expense.paid_by_name} · {t("split")}{" "}
                        {expense.split_members.length} {t("ways")}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">{t("No shared expenses yet.")}</p>
              )}
            </section>
          )}

          {data.isMember && data.itinerary && (
            <section className="surface-card p-5">
              <p className="eyebrow">{t("Travel AI")}</p>
              <h2 className="mt-1 text-lg">{t("Ask about your trip")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "AI suggestions can be wrong. Check official sources for safety-critical details.",
                )}
              </p>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto" aria-live="polite">
                {thread.data?.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-lg p-3 text-sm ${entry.role === "assistant" ? "bg-secondary" : "border border-border"}`}
                  >
                    <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                      {entry.role === "assistant" ? t("Travel AI") : t("You")}
                    </p>
                    <p className="whitespace-pre-wrap">
                      {entry.role === "assistant"
                        ? localizedItinerary(`assistant.${entry.id}`, entry.content)
                        : entry.content}
                    </p>
                  </div>
                ))}
                {thread.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {t("Could not load the assistant conversation.")}
                  </p>
                )}
              </div>
              <form
                className="mt-3 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = message.trim();
                  if (trimmed) askMut.mutate(trimmed);
                }}
              >
                <Textarea
                  aria-label={t("Ask Travel AI about this trip")}
                  placeholder={t("What should we do if it rains?")}
                  rows={3}
                  maxLength={2000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={!message.trim() || askMut.isPending}
                >
                  {askMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {t("Send question")}
                </Button>
              </form>
            </section>
          )}
        </aside>
      </section>
      )}

      {activeTab === "group" && (
        <TripGroupTab
          members={data.members}
          maxTravelers={data.trip.max_travelers}
          currentUserId={data.userId}
          isMember={data.isMember}
          hasItinerary={Boolean(data.itinerary)}
          collaboration={collaboration.data}
          isCollaborationError={collaboration.isError}
          onRefetchCollaboration={() => void collaboration.refetch()}
          onOpenChat={() => setActiveTab("chat")}
          expenseTitle={expenseTitle}
          setExpenseTitle={setExpenseTitle}
          expenseAmount={expenseAmount}
          setExpenseAmount={setExpenseAmount}
          onAddExpense={() => {
            const amount = Number(expenseAmount);
            if (
              expenseTitle.trim().length >= 2 &&
              Number.isSafeInteger(amount) &&
              amount > 0 &&
              amount <= 10_000_000
            ) {
              expenseMut.mutate();
            }
          }}
          isAddingExpense={expenseMut.isPending}
        />
      )}

      {activeTab === "ai" && data.isMember && data.itinerary && (
        <TripAITab
          thread={thread.data}
          isThreadError={thread.isError}
          onAsk={(content) => askMut.mutate(content)}
          isAsking={askMut.isPending}
          localizedItinerary={localizedItinerary}
        />
      )}
    </main>
  );
}

function formatDate(value: string, language: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(language, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(parsed);
}
