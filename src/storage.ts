export type DayInfo = {
  country?: string;
};

export type Store = {
  periodStart: string | null;
  days: Record<string, DayInfo>;
};

const STORAGE_KEY = "tax-residency-tracker";

const emptyStore = (): Store => ({ periodStart: null, days: {} });

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      periodStart:
        typeof parsed.periodStart === "string" ? parsed.periodStart : null,
      days:
        parsed.days && typeof parsed.days === "object" ? parsed.days : {},
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
