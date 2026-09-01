import { useEffect, useMemo, useRef, useState } from "react";
import { YearHeatmap } from "./calendar";
import {
  RESIDENCY_LIMIT,
  countAbroad,
  eachDay,
  findResidencyExceedance,
  formatLongDate,
  periodEnd,
  todayISO,
  visibleYears,
} from "./dates";
import { loadStore, saveStore, type DayInfo, type Store } from "./storage";

function persist(next: Store) {
  saveStore(next);
  return next;
}

function sharedCountry(days: Record<string, DayInfo>, selected: string[]): string {
  const countries = selected.map((iso) => days[iso]?.country?.trim() ?? "");
  const unique = new Set(countries);
  if (unique.size === 1) return countries[0] ?? "";
  return "";
}

function mixedCountries(days: Record<string, DayInfo>, selected: string[]): boolean {
  const unique = new Set(selected.map((iso) => days[iso]?.country?.trim() ?? ""));
  return unique.size > 1;
}

export default function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [selected, setSelected] = useState<string[]>([]);
  const countryInputRef = useRef<HTMLInputElement>(null);
  const rangeAnchorRef = useRef<string | null>(null);
  const rangeTimerRef = useRef<number | null>(null);
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [periodDraft, setPeriodDraft] = useState(
    () => loadStore().periodStart ?? todayISO(),
  );

  const years = useMemo(() => visibleYears(), []);
  const analyticsStart = store.periodStart ?? periodDraft;
  const periodTo = analyticsStart ? periodEnd(analyticsStart) : null;
  const abroadCount =
    analyticsStart && periodTo
      ? countAbroad(store.days, analyticsStart, periodTo)
      : 0;
  const remaining = Math.max(0, RESIDENCY_LIMIT - abroadCount);
  const lost = abroadCount >= RESIDENCY_LIMIT;
  const exceedance = useMemo(
    () => findResidencyExceedance(store.days),
    [store.days],
  );

  const selectedAbroad = selected.filter((iso) => store.days[iso]);
  const countryValue = sharedCountry(store.days, selectedAbroad);
  const countryMixed = mixedCountries(store.days, selectedAbroad);
  const selectionKey = selectedAbroad.join("|");

  function update(mutator: (prev: Store) => Store) {
    setStore((prev) => persist(mutator(prev)));
  }

  useEffect(() => {
    if (selectionKey) countryInputRef.current?.focus();
  }, [selectionKey]);

  useEffect(() => {
    return () => {
      if (rangeTimerRef.current != null) window.clearTimeout(rangeTimerRef.current);
    };
  }, []);

  function clearRangeAnchor() {
    if (rangeTimerRef.current != null) {
      window.clearTimeout(rangeTimerRef.current);
      rangeTimerRef.current = null;
    }
    rangeAnchorRef.current = null;
    setRangeAnchor(null);
  }

  function armRangeAnchor(iso: string) {
    if (rangeTimerRef.current != null) window.clearTimeout(rangeTimerRef.current);
    rangeAnchorRef.current = iso;
    setRangeAnchor(iso);
    rangeTimerRef.current = window.setTimeout(() => {
      rangeAnchorRef.current = null;
      setRangeAnchor(null);
      rangeTimerRef.current = null;
    }, 5000);
  }

  function markDays(dates: string[]) {
    update((prev) => {
      const nextDays = { ...prev.days };
      for (const date of dates) {
        nextDays[date] = { ...nextDays[date] };
      }
      return { ...prev, days: nextDays };
    });
    setSelected(dates);
  }

  function handleDayClick(iso: string) {
    setLastClicked(iso);
    const anchor = rangeAnchorRef.current;
    if (anchor && iso !== anchor) {
      const from = anchor < iso ? anchor : iso;
      const to = anchor < iso ? iso : anchor;
      markDays(eachDay(from, to));
      clearRangeAnchor();
      return;
    }

    const wasAbroad = Boolean(store.days[iso]);
    const onlyThisSelected = selected.length === 1 && selected[0] === iso;

    if (wasAbroad && !onlyThisSelected) {
      setSelected([iso]);
      armRangeAnchor(iso);
      return;
    }

    if (wasAbroad) {
      update((prev) => {
        const nextDays = { ...prev.days };
        delete nextDays[iso];
        return { ...prev, days: nextDays };
      });
      setSelected([]);
      clearRangeAnchor();
      return;
    }

    markDays([iso]);
    armRangeAnchor(iso);
  }

  function clearDaysWhere(match: (iso: string) => boolean) {
    update((prev) => {
      const nextDays = { ...prev.days };
      for (const iso of Object.keys(nextDays)) {
        if (match(iso)) delete nextDays[iso];
      }
      return { ...prev, days: nextDays };
    });
    setSelected((prev) => prev.filter((iso) => !match(iso)));
    if (lastClicked && match(lastClicked)) setLastClicked(null);
    clearRangeAnchor();
  }

  function resetSelectedMonth() {
    if (!lastClicked) return;
    const prefix = lastClicked.slice(0, 7);
    clearDaysWhere((iso) => iso.startsWith(prefix));
  }

  function resetSelectedYear() {
    if (!lastClicked) return;
    const prefix = lastClicked.slice(0, 4);
    clearDaysWhere((iso) => iso.startsWith(prefix));
  }

  function setCountry(value: string) {
    update((prev) => {
      const nextDays = { ...prev.days };
      for (const iso of selectedAbroad) {
        if (!nextDays[iso]) continue;
        nextDays[iso] = value.trim() ? { country: value } : {};
      }
      return { ...prev, days: nextDays };
    });
  }

  function confirmPeriod() {
    if (!periodDraft) return;
    update((prev) => ({ ...prev, periodStart: periodDraft }));
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Календарь налогового резидентства РФ</h1>
        <p className="lede">
          Отметьте дни за пределами РФ. Два клика в течение 5 секунд отмечают
          период между датами. Порог — {RESIDENCY_LIMIT} дня за 12 календарных
          месяцев подряд. Первый отсчёт — 1 января 2026.
        </p>
      </header>

      <div className="layout">
        <div className="calendars">
          <div className="calendar-toolbar">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!lastClicked}
              onClick={resetSelectedMonth}
            >
              Сбросить выбранный месяц
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!lastClicked}
              onClick={resetSelectedYear}
            >
              Сбросить все
            </button>
          </div>
          {years.map((year) => (
            <YearHeatmap
              key={year}
              year={year}
              days={store.days}
              selected={new Set(selected)}
              rangeAnchor={rangeAnchor}
              periodFrom={analyticsStart}
              periodTo={periodTo}
              onDayClick={handleDayClick}
            />
          ))}
        </div>

        {selectedAbroad.length > 0 && (
          <aside className="country-panel">
            <label>
              Страна пребывания
              <input
                ref={countryInputRef}
                type="text"
                value={countryValue}
                placeholder={countryMixed ? "разные страны" : "необязательно"}
                onChange={(e) => setCountry(e.target.value)}
              />
            </label>
            <p className="hint">
              {selectedAbroad.length === 1
                ? formatLongDate(selectedAbroad[0])
                : `${selectedAbroad.length} дн.`}
            </p>
          </aside>
        )}
      </div>

      <section className="analytics">
        <h2>Аналитика</h2>
        <div className="period-row">
          <label>
            Дата начала периода для расчёта
            <input
              type="date"
              min="2026-01-01"
              value={periodDraft}
              onChange={(e) => setPeriodDraft(e.target.value)}
            />
          </label>
          <button type="button" className="btn" onClick={confirmPeriod}>
            ОК
          </button>
        </div>

        <div className="metrics">
          {analyticsStart && periodTo && (
            <p className="period-caption">
              Период: {formatLongDate(analyticsStart)} —{" "}
              {formatLongDate(periodTo)}
              {!store.periodStart ? " (нажмите «ОК», чтобы сохранить)" : ""}
            </p>
          )}
          <div className="metric">
            <span className="metric-label">А. Дней вне РФ в текущем периоде</span>
            <strong>{abroadCount}</strong>
          </div>
          <div className="metric">
            <span className="metric-label">
              Б. Осталось дней до потери резидентства
            </span>
            <strong>{remaining}</strong>
          </div>
          {lost && (
            <p className="warning">
              За выбранные 12 месяцев отмечено {abroadCount} дн. вне РФ (≥{" "}
              {RESIDENCY_LIMIT}). Это справочный счётчик, не юридическая
              консультация.
            </p>
          )}
          {exceedance && (
            <p className="warning">
              Превышение срока резидентства: с{" "}
              {formatLongDate(exceedance.start)} по{" "}
              {formatLongDate(exceedance.end)} — {exceedance.count} дн. вне РФ
              (≥ {RESIDENCY_LIMIT}).
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
