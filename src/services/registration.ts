import type { RegistrationPayload, SubmitResult } from '../types';

const SUBMIT_URL = (import.meta.env.VITE_REGISTRATION_PROXY ?? '/api/register').trim();
const TIMEOUT_MS = 25000;

export const GENERIC_ERROR =
  'No pudimos confirmar el registro en este momento. Sus datos permanecen en pantalla. Intente nuevamente.';

export function readSource(): string {
  if (typeof window === 'undefined') return 'directo';
  const raw = new URLSearchParams(window.location.search).get('source');
  if (!raw) return 'directo';
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'directo';
}

export async function submitRegistration(payload: RegistrationPayload): Promise<SubmitResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: { ok?: boolean; message?: string; error?: string; saved?: number } = {};
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      return {
        ok: false,
        message: GENERIC_ERROR,
        detail: `respuesta no JSON, HTTP ${response.status}`,
      };
    }

    if (response.ok && parsed.ok === true) return { ok: true, saved: parsed.saved };

    return {
      ok: false,
      message: parsed.message || GENERIC_ERROR,
      detail: parsed.error || `HTTP ${response.status}`,
    };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    console.error('[registro] Error al enviar.', error);
    return {
      ok: false,
      message: GENERIC_ERROR,
      detail: aborted ? 'timeout' : String(error),
    };
  } finally {
    window.clearTimeout(timer);
  }
}
