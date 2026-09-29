import type { AppointmentSlot, Equipment, VisitOption } from '../types';

/**
 * Fuente única de verdad del evento.
 * Cualquier cambio de fecha, salón, horario o contacto se hace SOLO aquí.
 * Los textos siguen la invitación impresa oficial.
 */
export const EVENT = {
  name: 'Demostración de Equipos de Impresión Digital',
  organizer: 'Plaza Gráfica Dominicana',

  weekday: 'Miércoles',
  day: '09',
  monthYear: 'Septiembre 2026',
  dateLong: 'Miércoles 09 de septiembre de 2026',
  dateShort: '09 septiembre 2026',

  venue: 'Hotel Santiago',
  venueBrand: 'Curio Collection by Hilton',
  room: 'Salón Grand Samán',
  street: 'Avenida Juan Pablo Duarte',
  city: 'Santiago de los Caballeros',
  country: 'República Dominicana',

  exhibitionLabel: 'Exhibición',
  exhibitionHours: '9:00 a. m. – 7:00 p. m.',
  cocktailLabel: 'Cóctel',
  cocktailHours: '7:00 p. m. – 8:00 p. m.',

  /** República Dominicana es UTC-4 todo el año: 9:00 a. m. = 13:00Z. */
  icsStart: '20260909T130000Z',
  icsEnd: '20260910T000000Z',

  /** Coordenadas verificadas del hotel (OpenStreetMap). */
  lat: 19.4581742,
  lon: -70.6866037,
} as const;

/** Contacto para citas, tal como aparece en la invitación impresa. */
export const CONTACT = {
  phone: '809-221-4242',
  phoneExt: '224',
  phoneHref: 'tel:+18092214242,224',
  whatsapp: '809-224-2427',
  whatsappHref: 'https://wa.me/18092242427',
  email: 'ventas@plazagraficadr.com',
  emailHref: 'mailto:ventas@plazagraficadr.com',
} as const;

export const FULL_ADDRESS = `${EVENT.venue}, ${EVENT.venueBrand} — ${EVENT.room}. ${EVENT.street}, ${EVENT.city}, ${EVENT.country}.`;

export const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(`Hotel Santiago Curio Collection by Hilton, ${EVENT.city}`);

export const WAZE_URL = `https://waze.com/ul?ll=${EVENT.lat},${EVENT.lon}&navigate=yes`;

export const GOOGLE_CALENDAR_URL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  '&text=' +
  encodeURIComponent(EVENT.name + ' — ' + EVENT.organizer) +
  '&dates=' +
  EVENT.icsStart +
  '/' +
  EVENT.icsEnd +
  '&location=' +
  encodeURIComponent(FULL_ADDRESS) +
  '&details=' +
  encodeURIComponent(
    `Exhibición ${EVENT.exhibitionHours} · Cóctel ${EVENT.cocktailHours}. Organiza ${EVENT.organizer}.`,
  );

export const EQUIPMENT: Equipment[] = [
  {
    id: 'accuriopress',
    brand: 'Konica Minolta',
    model: 'AccurioPress C5080',
    category: 'Prensa digital de color',
    description: 'Tecnología de producción digital para aplicaciones gráficas.',
    productUrl:
      'https://www.konicaminolta.eu/eu-en/professional-printing/devices/production-printing/accuriopress-c5080',
    accent: 'var(--m)',
  },
  {
    id: 'p7570',
    brand: 'Epson',
    model: 'SureColor P7570',
    category: 'Impresora de gran formato',
    description: 'Soluciones profesionales para impresión de gran formato.',
    productUrl:
      'https://epson.co.cr/Para-el-trabajo/Impresoras/Gran-Formato/Impresora-SureColor-P7570/p/SCP7570SE',
    accent: 'var(--c)',
  },
  {
    id: 'duoblade',
    brand: 'Valloy',
    model: 'Duoblade FX',
    category: 'Troqueladora digital',
    description: 'Soluciones digitales para procesos de acabado y corte.',
    productUrl: 'https://valloy.com/products/duoblade-fx/',
    accent: 'var(--y)',
  },
  {
    id: 'spectrodens',
    brand: 'Techkon',
    model: 'SpectroDens',
    category: 'Medición y control de color',
    description: 'Herramientas profesionales para la gestión y el control del color.',
    productUrl:
      'https://www.techkon.com/files/downloads/prospekte/SpectroDens%20Brochure%20Web.pdf',
    accent: 'var(--ink)',
  },
];

export const VISIT_OPTIONS: VisitOption[] = [
  {
    id: 'confirmar',
    mark: 'A',
    accent: 'var(--ink-3)',
    title: 'Confirmar asistencia',
    support: 'Visitaré la exhibición durante el día, dentro del horario del evento y sin cita previa.',
  },
  {
    id: 'contacto',
    mark: 'D',
    accent: 'var(--c)',
    title: 'Agendar una demostración personalizada',
    support: 'Reservaré una hora específica para recibir atención personalizada.',
  },
];

export const APPOINTMENT_SLOTS: AppointmentSlot[] = [
  { id: '09:00-10:00', label: '9:00 a. m. – 10:00 a. m.' },
  { id: '10:00-11:00', label: '10:00 a. m. – 11:00 a. m.' },
  { id: '11:00-12:00', label: '11:00 a. m. – 12:00 p. m.' },
  { id: '12:00-13:00', label: '12:00 p. m. – 1:00 p. m.' },
  { id: '13:00-14:00', label: '1:00 p. m. – 2:00 p. m.' },
  { id: '14:00-15:00', label: '2:00 p. m. – 3:00 p. m.' },
  { id: '15:00-16:00', label: '3:00 p. m. – 4:00 p. m.' },
  { id: '16:00-17:00', label: '4:00 p. m. – 5:00 p. m.' },
  { id: '17:00-18:00', label: '5:00 p. m. – 6:00 p. m.' },
  { id: '18:00-19:00', label: '6:00 p. m. – 7:00 p. m.' },
];

export const PRIVACY_NOTE =
  'Utilizaremos esta información únicamente para gestionar su participación y contactarle en relación con el evento.';
