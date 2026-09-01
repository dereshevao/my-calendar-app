import { MONTH_NAMES, WEEKDAY_LABELS, monthWeeks } from "./dates";
import type { DayInfo } from "./storage";

type YearHeatmapProps = {
  year: number;
  days: Record<string, DayInfo>;
  selected: Set<string>;
  rangeAnchor: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  onDayClick: (iso: string) => void;
};

function dayClassName(
  iso: string,
  days: Record<string, DayInfo>,
  selected: Set<string>,
  rangeAnchor: string | null,
  periodFrom: string | null,
  periodTo: string | null,
): string {
  return [
    "day",
    days[iso] ? "day-abroad" : "day-home",
    selected.has(iso) ? "day-selected" : "",
    rangeAnchor === iso ? "day-range-anchor" : "",
    periodFrom && periodTo && iso >= periodFrom && iso <= periodTo
      ? "day-in-period"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function YearHeatmap({
  year,
  days,
  selected,
  rangeAnchor,
  periodFrom,
  periodTo,
  onDayClick,
}: YearHeatmapProps) {
  return (
    <section className="year-block">
      <h2 className="year-title">{year}</h2>
      <div className="months">
        {MONTH_NAMES.map((name, month) => (
          <div key={`${year}-${month}`} className="month-block">
            <div className="month-label">{name}</div>
            <div className="weekday-row" aria-hidden>
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="weekday-label">
                  {label}
                </span>
              ))}
            </div>
            <div className="month-days">
              {monthWeeks(year, month).map((week, wi) => (
                <div key={`${year}-${month}-w-${wi}`} className="month-week">
                  {week.map((iso, di) =>
                    iso ? (
                      <button
                        key={iso}
                        type="button"
                        className={dayClassName(
                          iso,
                          days,
                          selected,
                          rangeAnchor,
                          periodFrom,
                          periodTo,
                        )}
                        title={iso}
                        aria-label={`${iso}${days[iso] ? ", вне РФ" : ", в РФ"}`}
                        onClick={() => onDayClick(iso)}
                      >
                        {Number(iso.slice(8, 10))}
                      </button>
                    ) : (
                      <span
                        key={`${year}-${month}-empty-${wi}-${di}`}
                        className="day day-empty"
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
