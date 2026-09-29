import konicaLogo from '../assets/brands/konica-minolta.webp';
import epsonLogo from '../assets/brands/epson.webp';
import valloyLogo from '../assets/brands/valloy.webp';
import techkonLogo from '../assets/brands/techkon.webp';
import accurioPhoto from '../assets/equipos/accuriopress.webp';
import epsonPhoto from '../assets/equipos/epson-p7570.webp';
import duobladePhoto from '../assets/equipos/duoblade-fx.webp';
import spectrodensPhoto from '../assets/equipos/spectrodens.webp';

export interface Brand {
  id: string;
  /** Debe coincidir con `brand` en EQUIPMENT (src/data/event.ts). */
  name: string;
  logo: string;
  /** Fuerza una base blanca uniforme para archivos con transparencia. */
  whiteBacking?: boolean;
}

/**
 * Logotipos suministrados por Plaza Gráfica, recortados y optimizados localmente.
 * Epson conserva transparencia y se monta sobre una muestra blanca.
 */
export const BRANDS: Brand[] = [
  { id: 'epson', name: 'Epson', logo: epsonLogo, whiteBacking: true },
  { id: 'konica', name: 'Konica Minolta', logo: konicaLogo },
  { id: 'valloy', name: 'Valloy', logo: valloyLogo },
  { id: 'techkon', name: 'Techkon', logo: techkonLogo },
];

/**
 * Fotos locales por id de equipo. Ninguna tarjeta depende de recursos remotos.
 */
export const EQUIPMENT_PHOTOS: Record<string, string | undefined> = {
  accuriopress: accurioPhoto,
  p7570: epsonPhoto,
  duoblade: duobladePhoto,
  spectrodens: spectrodensPhoto,
};

export function findBrand(name: string): Brand | undefined {
  return BRANDS.find((brand) => brand.name === name);
}
