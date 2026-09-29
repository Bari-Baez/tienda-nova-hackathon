import { useEffect, useState } from 'react';
import { requestBestBrowserLocation } from '../lib/geolocation';
import s from './LocationSetup.module.css';

type Position = { latitude: number; longitude: number; accuracy: number };

export default function LocationSetup() {
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'Preparar ubicación de prueba | Tienda Nova'; }, []);

  async function requestLocation() {
    setError('');
    setPosition(null);
    if (!window.isSecureContext || !navigator.geolocation) {
      setError('Abre esta misma dirección mediante HTTPS confiable en tu teléfono. La ubicación no funciona desde una página HTTP de la red local.');
      return;
    }
    setBusy(true);
    const result = await requestBestBrowserLocation();
    if (result.position) {
      const { coords } = result.position;
      setPosition({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
    } else {
      setError(result.permission === 'denied'
        ? 'El navegador no tiene permiso para acceder a la ubicación. Revisa la configuración del sitio y vuelve a intentarlo.'
        : 'El dispositivo no pudo determinar su ubicación. Comprueba los ajustes de ubicación precisa y vuelve a intentarlo.');
    }
    setBusy(false);
  }

  return <main className={s.page}>
    <section className={s.card}>
      <p className={s.eyebrow}>Preparación de prueba personal</p>
      <h1>Comprobar ubicación</h1>
      <p>Abre esta página en tu teléfono usando la misma dirección HTTPS del formulario. Pulsa el botón y concede el permiso que solicite el navegador.</p>
      <button type="button" onClick={requestLocation} disabled={busy}>{busy ? 'Consultando ubicación…' : 'Autorizar y comprobar ubicación'}</button>
      {error && <p className={s.error} role="alert">{error}</p>}
      {position && <div className={s.result} role="status">
        <strong>Ubicación recibida en este dispositivo</strong>
        <dl>
          <div><dt>Latitud</dt><dd>{position.latitude.toFixed(6)}</dd></div>
          <div><dt>Longitud</dt><dd>{position.longitude.toFixed(6)}</dd></div>
          <div><dt>Radio de precisión informado</dt><dd>{Math.round(position.accuracy)} m</dd></div>
        </dl>
        <p>Esta lectura se muestra únicamente en tu dispositivo y no se añade al formulario de reembolso.</p>
        <a href="/">Ir al formulario</a>
      </div>}
      <p className={s.note}>Esta comprobación muestra las coordenadas solo aquí y no las envía al servidor. Las coordenadas representan un punto con un margen de precisión, no una dirección postal garantizada.</p>
    </section>
  </main>;
}
