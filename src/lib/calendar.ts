import { EVENT } from '../data/event';

/** Archivo .ics para Outlook / Apple Calendar, generado en el navegador. */
export function downloadIcs(): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Plaza Grafica Dominicana//Evento 2026//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:evento-2026-09-09@plazagraficadr.com`,
    `DTSTAMP:${EVENT.icsStart}`,
    `DTSTART:${EVENT.icsStart}`,
    `DTEND:${EVENT.icsEnd}`,
    `SUMMARY:${EVENT.name} — ${EVENT.organizer}`,
    `LOCATION:${EVENT.venue}\, ${EVENT.venueBrand} — ${EVENT.room}\, ${EVENT.city}`,
    `DESCRIPTION:Exhibición ${EVENT.exhibitionHours} · Cóctel ${EVENT.cocktailHours}.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'demostracion-plaza-grafica-2026.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
