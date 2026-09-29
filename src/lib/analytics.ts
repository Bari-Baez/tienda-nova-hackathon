/**
 * Capa mínima de analítica. No instala nada.
 * Si más adelante se agrega GA4 o Meta Pixel en index.html, estos eventos
 * empiezan a fluir solos: registration_open, step_completed, registration_success...
 */
type Params = Record<string, unknown>;

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
}

export function track(event: string, params: Params = {}): void {
  if (typeof window === 'undefined') return;
  const w = window as AnalyticsWindow;

  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event, ...params });
  if (typeof w.gtag === 'function') w.gtag('event', event, params);
  if (typeof w.fbq === 'function') w.fbq('trackCustom', event, params);

  if (import.meta.env.DEV) console.debug('[track]', event, params);
}
