import { ExternalLink } from "lucide-react";
import { getBookingOptions } from "@/lib/travel-links";
import { useLanguage } from "@/lib/language-context";

type BookingOptionsProps = {
  destination: string;
  origin: string | null;
  startDate: string | null;
  endDate: string | null;
  travelers: number;
  rooms: number;
};

export function BookingOptions({
  destination,
  origin,
  startDate,
  endDate,
  travelers,
  rooms,
}: BookingOptionsProps) {
  const { language, t } = useLanguage();
  const options = getBookingOptions({
    destination,
    origin,
    startDate,
    endDate,
    travelers,
    rooms,
  });

  return (
    <section
      className="other-plans-panel"
      aria-label={`${t("Booking options for")} ${destination}`}
    >
      <div className="other-plans-heading">
        <div>
          <p className="eyebrow">{t("OTHER PLANS")}</p>
          <h3>{t("Find and book your travel")}</h3>
        </div>
        <span>{t("Opens provider sites")}</span>
      </div>
      <p className="other-plans-note">
        {t(
          "Compare options and complete your booking directly with the provider. Prices and availability are set by each provider.",
        )}
      </p>
      <div className="other-plans-grid">
        {options.map((option) => (
          <a
            className="other-plan-link"
            href={option.href}
            key={option.label}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>
              <strong>{option.label}</strong>
              <small>{t(option.description)}</small>
            </span>
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        ))}
      </div>
      {origin ? (
        <p className="other-plans-route">
          {t("Route")}: {origin} → {destination}
          {startDate && endDate
            ? ` · ${new Intl.DateTimeFormat(language).format(new Date(`${startDate}T00:00:00`))} – ${new Intl.DateTimeFormat(language).format(new Date(`${endDate}T00:00:00`))}`
            : ""}
        </p>
      ) : (
        <p className="other-plans-route">
          {t("Add your home city in travel preferences to personalize flight searches.")}
        </p>
      )}
    </section>
  );
}
