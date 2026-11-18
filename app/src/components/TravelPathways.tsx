import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Compass, Map, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

const PATHWAYS = [
  {
    number: "01",
    icon: Users,
    title: "Meet your people",
    description: "Find travelers with a similar pace, budget, and list of things they love doing.",
    action: "Find travelers",
    to: "/discover",
  },
  {
    number: "02",
    icon: Map,
    title: "Find a group trip",
    description: "Browse trips with space to join, or bring your own travel idea to a new group.",
    action: "Browse group trips",
    to: "/trips",
  },
  {
    number: "03",
    icon: Compass,
    title: "Choose where to go",
    description: "Get destination ideas shaped around your interests, timing, and budget.",
    action: "Explore destinations",
    to: "/ideas",
  },
] as const;

export function TravelPathways() {
  const { t } = useLanguage();
  return (
    <section
      aria-labelledby="travel-pathways-heading"
      className="mx-auto max-w-6xl px-4 py-16 sm:py-20"
    >
      <div className="max-w-2xl">
        <p className="eyebrow">{t("A good trip starts somewhere")}</p>
        <h2 id="travel-pathways-heading" className="mt-3 text-3xl sm:text-4xl">
          {t("What would make your next trip better?")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t(
            "Start with the part you care about most. DIRECT brings the people, plans, and places together as you go.",
          )}
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PATHWAYS.map((pathway) => (
          <article
            key={pathway.number}
            className="surface-card group flex min-h-64 flex-col items-start p-6 transition-transform hover:-translate-y-1"
          >
            <div className="flex w-full items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
                <pathway.icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="text-xs tracking-[0.16em] text-muted-foreground">
                {pathway.number}
              </span>
            </div>
            <h3 className="mt-6 text-xl">{t(pathway.title)}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {t(pathway.description)}
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link to={pathway.to}>
                {t(pathway.action)}
                <ArrowUpRight aria-hidden="true" className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
