export const FIRST_YEAR = 2026;
export const RESIDENCY_LIMIT = 183;

const MONTH_NAMES = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

const WEEKDAY_LABELS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export function formatISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return formatISO(new Date());
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = parseISO(iso);
  date.setDate(date.getDate() + days);
  return formatISO(date);
}

export function addCalendarMonths(iso: string, months: number): string {
  const date = parseISO(iso);
  const day = date.getDate();
  const shifted = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(
    shifted.getFullYear(),
    shifted.getMonth() + 1,
    0,
  ).getDate();
  shifted.setDate(Math.min(day, lastDay));
  return formatISO(shifted);
}

export function periodEnd(periodStart: string): string {
  return addDays(addCalendarMonths(periodStart, 12), -1);
}

export function visibleYears(now = new Date()): number[] {
  const currentYear = now.getFullYear();
  const years = [
    Math.max(FIRST_YEAR, currentYear - 1),
    Math.max(FIRST_YEAR, currentYear),
    Math.max(FIRST_YEAR, currentYear + 1),
  ];
  return [...new Set(years)].sort((a, b) => a - b);
}

export function eachDay(from: string, to: string): string[] {
  if (from > to) return [];
  const days: string[] = [];
  let current = from;
  while (current <= to) {
    days.push(current);
    current = addDays(current, 1);
  }
  return days;
}

export function countAbroad(
  days: Record<string, unknown>,
  from: string,
  to: string,
): number {
  let count = 0;
  for (const key of Object.keys(days)) {
    if (key >= from && key <= to) count += 1;
  }
  return count;
}

export function findResidencyExceedance(
  days: Record<string, unknown>,
  limit = RESIDENCY_LIMIT,
): { start: string; end: string; count: number } | null {
  const dates = Object.keys(days).sort();
  if (dates.length < limit) return null;

  const last = dates[dates.length - 1];
  let left = 0;
  let right = 0;
  let start = `${FIRST_YEAR}-01-01`;

  while (start <= last) {
    const end = periodEnd(start);
    while (left < dates.length && dates[left] < start) left += 1;
    while (right < dates.length && dates[right] <= end) right += 1;
    const count = right - left;
    if (count >= limit) return { start, end, count };
    start = addDays(start, 1);
  }

  return null;
}

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function monthWeeks(year: number, month: number): (string | null)[][] {
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = [null, null, null, null, null, null, null];
  const cursor = new Date(year, month, 1);

  while (cursor.getMonth() === month) {
    const idx = mondayIndex(cursor);
    if (idx === 0 && week.some((cell) => cell !== null)) {
      weeks.push(week);
      week = [null, null, null, null, null, null, null];
    }
    week[idx] = formatISO(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  weeks.push(week);
  return weeks;
}

export function formatLongDate(iso: string): string {
  return parseISO(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export { WEEKDAY_LABELS, MONTH_NAMES };
