const KEY = 'pg-evento-2026-registro';

export interface StoredRegistration {
  schemaVersion: 4;
  at: string;
  company: string;
  attendeeCount?: number;
}

/** Evita reenvíos accidentales y permite saludar distinto a quien ya confirmó. */
export function readRegistration(): StoredRegistration | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<StoredRegistration>;
    if (stored.schemaVersion !== 4 || !stored.at || !stored.company) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return stored as StoredRegistration;
  } catch {
    return null;
  }
}

export function saveRegistration(value: StoredRegistration): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* modo privado o almacenamiento lleno: no es crítico */
  }
}

export function clearRegistration(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* sin efecto */
  }
}
