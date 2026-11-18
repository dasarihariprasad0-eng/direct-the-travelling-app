import { Users, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
import type { TripCollaboration } from "@/lib/travel.api";

type TripGroupTabProps = {
  members: Array<{
    user_id: string;
    role: string;
    profile: { display_name: string } | null;
  }>;
  maxTravelers: number;
  currentUserId: string;
  isMember: boolean;
  hasItinerary: boolean;
  collaboration?: TripCollaboration | undefined;
  isCollaborationError: boolean;
  onRefetchCollaboration: () => void;
  onOpenChat: () => void;
  expenseTitle: string;
  setExpenseTitle: (v: string) => void;
  expenseAmount: string;
  setExpenseAmount: (v: string) => void;
  onAddExpense: () => void;
  isAddingExpense: boolean;
};

export function TripGroupTab({
  members,
  maxTravelers,
  currentUserId,
  isMember,
  hasItinerary,
  collaboration,
  isCollaborationError,
  onRefetchCollaboration,
  onOpenChat,
  expenseTitle,
  setExpenseTitle,
  expenseAmount,
  setExpenseAmount,
  onAddExpense,
  isAddingExpense,
}: TripGroupTabProps) {
  const { t, language } = useLanguage();

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <section className="surface-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">{t("Travel group")}</p>
              <h2 className="mt-1 text-xl font-semibold">{t("Trip Members")}</h2>
            </div>
            <Badge variant="secondary">
              {members.length}/{maxTravelers} {t("travelers")}
            </Badge>
          </div>

          <ul className="mt-4 space-y-2.5">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {(member.profile?.display_name ?? "T").slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.profile?.display_name ?? t("Traveler")}
                      {member.user_id === currentUserId ? ` (${t("You")})` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {t(member.role)}
                    </p>
                  </div>
                </div>
                {member.role === "organizer" && (
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    {t("Organizer")}
                  </Badge>
                )}
              </li>
            ))}
          </ul>

          {isMember && (
            <div className="mt-5 border-t border-border pt-4">
              <Button
                className="w-full"
                variant="outline"
                onClick={onOpenChat}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {t("Chat with members in Traveler Chat")}
              </Button>
            </div>
          )}
        </section>

        {isMember && (
          <section className="surface-card p-6 rounded-2xl border border-border shadow-sm">
            <p className="eyebrow">{t("Group decisions")}</p>
            <h2 className="mt-1 text-xl font-semibold">{t("Vote on activities")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Votes and shared expenses refresh automatically every 10 seconds.")}
            </p>
            {isCollaborationError ? (
              <div role="alert" className="mt-3">
                <p className="text-sm text-destructive">{t("Could not load group updates.")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={onRefetchCollaboration}
                >
                  {t("Try again")}
                </Button>
              </div>
            ) : null}
            {!hasItinerary ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("Generate a day-by-day plan to start voting on activities.")}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("Vote for your preferred schedule items on the Schedule & Plan tab.")}
              </p>
            )}
          </section>
        )}
      </div>
      <div>
        {isMember ? (
          <section className="surface-card p-6 rounded-2xl border border-border shadow-sm">
            <p className="eyebrow">{t("Shared costs · INR")}</p>
            <h2 className="mt-1 text-xl font-semibold">{t("Expense split")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "Splits are shared equally among current trip members. This tracks balances only; no payments are collected.",
              )}
            </p>

            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                onAddExpense();
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
                className="w-full"
                disabled={isAddingExpense || !expenseTitle.trim() || !expenseAmount}
              >
                {isAddingExpense ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("Add shared expense")}
              </Button>
            </form>

            {collaboration?.balances.length ? (
              <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">{t("Group balances")}</h3>
                <ul className="mt-3 space-y-2 text-xs">
                  {collaboration.balances.map((balance) => (
                    <li
                      key={balance.user_id}
                      className="flex justify-between items-center rounded-lg bg-secondary/80 p-2.5"
                    >
                      <span className="font-medium">{balance.name}</span>
                      <span
                        className={
                          balance.balance_inr > 0
                            ? "text-emerald-700 font-semibold"
                            : balance.balance_inr < 0
                              ? "text-muted-foreground font-semibold"
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

            {collaboration?.expenses.length ? (
              <ul className="mt-5 space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold mb-2">{t("Recent expenses")}</h3>
                {collaboration.expenses.slice(0, 8).map((expense) => (
                  <li key={expense.id} className="rounded-lg border border-border p-2.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold text-foreground">{expense.title}</span>
                      <span className="font-medium text-primary">₹{expense.amount_inr.toLocaleString("en-IN")}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {t("Paid by")} {expense.paid_by_name} · {t("split")}{" "}
                      {expense.split_members.length} {t("ways")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">{t("No shared expenses yet.")}</p>
            )}
          </section>
        ) : (
          <section className="surface-card p-6 text-center rounded-2xl border border-border">
            <p className="text-sm text-muted-foreground">
              {t("Join this trip to participate in expense splitting.")}
            </p>
          </section>
        )}
      </div>

    </div>
  );
}
