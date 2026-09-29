import { useEffect, useMemo, useState } from 'react';
import s from './Dashboard.module.css';

type Claim = {
  id: string;
  receivedAt: string;
  name: string;
  phone?: string;
  description: string;
  photo: {
    filename: string;
    mime: string;
    bytes: number;
    exif: {
      status: 'not_jpeg' | 'absent' | 'present' | 'unreadable';
      make?: string | null;
      model?: string | null;
      dateTime?: string | null;
      gps?: { latitude: number; longitude: number } | null;
    };
  };
  location: { latitude: number; longitude: number; accuracy: number | null; source: string; permission: string } | null;
  locationPermission: 'granted' | 'denied' | 'prompt' | 'unavailable';
  network: { observedIp: string | null; source: string; forwardedFor: null };
  browserHeaders: { userAgent: string; acceptLanguage: string };
  clientDevice: {
    userAgent?: string;
    language?: string;
    platform?: string;
    timezone?: string;
    screenWidth?: number;
    screenHeight?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  };
};

const TOKEN_KEY = 'demo-dashboard-token';
const MAX_MAPPED_ACCURACY_METERS = 100;

function readToken(): string {
  try { return sessionStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium', timeStyle: 'medium',
  }).format(date);
}

function formatBytes(value: number): string {
  return `${(value / 1024).toFixed(0)} KB`;
}

function formatAccuracy(value: number | null): string {
  if (value === null) return 'No disponible';
  if (value >= 1000) return `Radio aproximado de ${(value / 1000).toLocaleString('es-DO', { maximumFractionDigits: 1 })} km`;
  return `Radio aproximado de ${Math.round(value)} m`;
}

function canShowPoint(accuracy: number | null): boolean {
  return accuracy !== null && Number.isFinite(accuracy) && accuracy <= MAX_MAPPED_ACCURACY_METERS;
}

function mapUrls(latitude: number, longitude: number) {
  const mapLatitude = Math.max(-85, Math.min(85, latitude));
  const latitudeSpan = 0.003;
  const longitudeSpan = 0.005 / Math.max(0.2, Math.cos(mapLatitude * Math.PI / 180));
  const bounds = [
    Math.max(-180, longitude - longitudeSpan),
    Math.max(-85, mapLatitude - latitudeSpan),
    Math.min(180, longitude + longitudeSpan),
    Math.min(85, mapLatitude + latitudeSpan),
  ].join(',');
  const query = new URLSearchParams({ bbox: bounds, layer: 'mapnik', marker: `${latitude},${longitude}` });
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?${query}`,
    page: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
  };
}

function Datum({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className={s.datum}><dt>{label}</dt><dd>{children ?? 'No disponible'}</dd></div>;
}

export default function Dashboard() {
  const [token, setToken] = useState(readToken);
  const [draft, setDraft] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    document.title = 'Panel de demostración | Tienda Nova';
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    let timer: number | undefined;
    const controller = new AbortController();

    async function refresh() {
      try {
        const response = await fetch('/api/claims', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store', signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          if (active) {
            setError('La clave no es válida. Introduce la clave actual del servidor.');
            setToken('');
            try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* almacenamiento bloqueado */ }
          }
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { claims?: Claim[] };
        if (active) {
          const next = Array.isArray(payload.claims) ? payload.claims : [];
          setClaims(next);
          setSelectedId(current => current && next.some(item => item.id === current)
            ? current : (next[0]?.id ?? null));
          setLastUpdate(new Date().toLocaleTimeString('es-DO'));
          setError('');
        }
      } catch (cause) {
        if (active && !(cause instanceof DOMException && cause.name === 'AbortError')) {
          setError('No se pudo actualizar el panel. Comprueba que el servidor esté activo.');
        }
      } finally {
        if (active) timer = window.setTimeout(refresh, 2000);
      }
    }

    void refresh();
    return () => {
      active = false;
      controller.abort();
      if (timer) window.clearTimeout(timer);
    };
  }, [token]);

  const selected = useMemo(() => claims.find(item => item.id === selectedId) ?? null, [claims, selectedId]);

  useEffect(() => { setCopyMessage(''); setMapVisible(false); }, [selectedId]);

  useEffect(() => {
    if (!token || !selected) { setPhotoUrl(null); return; }
    setPhotoUrl(null);
    let active = true;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    fetch(`/api/claims/${encodeURIComponent(selected.id)}/photo`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store',
    }).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    }).then(blob => {
      objectUrl = URL.createObjectURL(blob);
      if (active) setPhotoUrl(objectUrl);
      else URL.revokeObjectURL(objectUrl);
    }).catch(() => { if (active) setPhotoUrl(null); });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, selected?.id]);

  function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft.trim();
    if (!next) return;
    try { sessionStorage.setItem(TOKEN_KEY, next); } catch { /* almacenamiento bloqueado */ }
    setToken(next);
    setDraft('');
    setError('');
  }

  if (!token) return (
    <main className={s.locked}>
      <div className={s.lockCard}>
        <p className={s.eyebrow}>Solo para presentación</p>
        <h1>Panel de demostración</h1>
        <p>Introduce la clave que muestra el servidor al iniciar.</p>
        <form onSubmit={unlock}>
          <label htmlFor="dashboard-token">Clave del panel</label>
          <input id="dashboard-token" type="password" autoComplete="off" value={draft}
            onChange={event => setDraft(event.target.value)} required />
          <button type="submit">Abrir panel</button>
        </form>
        {error && <p className={s.error} role="alert">{error}</p>}
      </div>
    </main>
  );

  return (
    <main className={s.dashboard}>
      <header className={s.header}>
        <div><p className={s.eyebrow}>Demostración controlada</p><h1>Información recibida</h1></div>
        <div className={s.headerRight}>
          <span className={s.live}><span aria-hidden="true" />Actualización cada 2 s</span>
          <button type="button" className={s.exit} onClick={() => {
            try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* almacenamiento bloqueado */ }
            setToken(''); setClaims([]);
          }}>Cerrar panel</button>
        </div>
      </header>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.meta}><span>{claims.length} solicitud{claims.length === 1 ? '' : 'es'}</span><span>Última actualización: {lastUpdate || 'pendiente'}</span></div>
      <div className={s.layout}>
        <aside className={s.list} aria-label="Solicitudes recibidas">
          {claims.length === 0 && <p className={s.empty}>Aún no se ha recibido ninguna solicitud.</p>}
          {claims.map(claim => <button type="button" key={claim.id}
            className={`${s.claimButton} ${claim.id === selectedId ? s.active : ''}`}
            onClick={() => setSelectedId(claim.id)} aria-pressed={claim.id === selectedId}>
            <strong>{claim.name}</strong><span>{formatDate(claim.receivedAt)}</span>
            <small>{claim.id}</small>
          </button>)}
        </aside>
        <section className={s.detail} aria-live="polite">
          {!selected ? <div className={s.emptyDetail}>La próxima solicitud aparecerá aquí.</div> : <>
            <div className={s.detailHeader}><div><p className={s.eyebrow}>Solicitud {selected.id}</p><h2>{selected.name}</h2></div><time>{formatDate(selected.receivedAt)}</time></div>
            <div className={s.columns}>
              <section className={s.panel}>
                <h3>Lo que introdujo en el formulario</h3>
                <dl>
                  <Datum label="Nombre">{selected.name}</Datum>
                  <Datum label="Número de teléfono">{selected.phone || 'No disponible en este registro'}</Datum>
                  <Datum label="Problema">{selected.description}</Datum>
                  <Datum label="Fotografía">{selected.photo.filename} · {formatBytes(selected.photo.bytes)}</Datum>
                </dl>
                <div className={s.photoFrame}>{photoUrl ? <img src={photoUrl} alt="Foto del producto recibida" /> : <span>Imagen no disponible</span>}</div>
              </section>
              <section className={s.panel}>
                <h3>Lo que el sistema pudo observar</h3>
                <dl>
                  <Datum label="IP observada por el servidor">{selected.network?.observedIp ?? 'No disponible'}</Datum>
                  <Datum label="Agente de usuario">{selected.browserHeaders?.userAgent ?? 'No disponible'}</Datum>
                  <Datum label="Idioma">{selected.clientDevice?.language ?? selected.browserHeaders?.acceptLanguage ?? 'No disponible'}</Datum>
                  <Datum label="Plataforma">{selected.clientDevice?.platform ?? 'No disponible'}</Datum>
                  <Datum label="Zona horaria">{selected.clientDevice?.timezone ?? 'No disponible'}</Datum>
                  <Datum label="Pantalla">{selected.clientDevice?.screenWidth && selected.clientDevice?.screenHeight ? `${selected.clientDevice.screenWidth} × ${selected.clientDevice.screenHeight}` : 'No disponible'}</Datum>
                  <Datum label="Ventana">{selected.clientDevice?.viewportWidth && selected.clientDevice?.viewportHeight ? `${selected.clientDevice.viewportWidth} × ${selected.clientDevice.viewportHeight}` : 'No disponible'}</Datum>
                </dl>
              </section>
            </div>
            <div className={s.columns}>
              <section className={s.panel}>
                <h3>Ubicación por permiso del navegador</h3>
                {selected.location ? <dl>
                  <Datum label="Latitud">{selected.location.latitude.toFixed(6)}</Datum>
                  <Datum label="Longitud">{selected.location.longitude.toFixed(6)}</Datum>
                  <Datum label="Precisión declarada">{formatAccuracy(selected.location.accuracy)}</Datum>
                  <Datum label="Fuente">Reportada por el navegador del cliente; el servidor no verifica el permiso.</Datum>
                </dl> : <p className={s.explanation}>No se recibió ubicación precisa. Estado de permiso reportado: {selected.locationPermission}. La IP no equivale a una dirección exacta.</p>}
                {selected.location && !canShowPoint(selected.location.accuracy) && <p className={s.accuracyWarning}>
                  {selected.location.accuracy === null
                    ? 'El navegador no informó un radio de precisión, así que no se puede representar esta lectura como un punto fiable.'
                    : 'Esta lectura es demasiado amplia para situar a la persona en un punto fiable del mapa.'}
                  {' '}Comprueba que el teléfono tenga activada la ubicación precisa y crea una solicitud nueva; este registro no puede corregirse retroactivamente.
                </p>}
                {selected.location && canShowPoint(selected.location.accuracy) && <>
                  <button type="button" className={s.copyButton} onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${selected.location!.latitude}, ${selected.location!.longitude}`);
                      setCopyMessage('Coordenadas copiadas. Puedes pegarlas en un mapa.');
                    } catch { setCopyMessage('No se pudieron copiar. Selecciona los valores de arriba.'); }
                  }}>Copiar coordenadas</button>
                  <button type="button" className={s.copyButton} onClick={() => setMapVisible(true)} disabled={mapVisible}>
                    {mapVisible ? 'Mapa mostrado' : 'Mostrar punto en el mapa'}
                  </button>
                  {copyMessage && <p className={s.note} role="status">{copyMessage}</p>}
                  {!mapVisible && <p className={s.note}>Al mostrar el mapa, las coordenadas se enviarán a OpenStreetMap para cargarlo.</p>}
                  {mapVisible && <div className={s.mapFrame}>
                    <iframe title="Mapa de las coordenadas recibidas" src={mapUrls(selected.location.latitude, selected.location.longitude).embed}
                      loading="lazy" referrerPolicy="no-referrer" />
                    <a href={mapUrls(selected.location.latitude, selected.location.longitude).page} target="_blank" rel="noopener noreferrer">Abrir mapa completo</a>
                  </div>}
                  <p className={s.note}>El punto debe interpretarse junto al radio de precisión; no confirma por sí mismo una dirección postal.</p>
                </>}
              </section>
              <section className={s.panel}>
                <h3>Metadatos de la foto</h3>
                <p className={s.explanation}>{selected.photo.exif.status === 'present' ? 'Se detectaron datos EXIF.' : selected.photo.exif.status === 'absent' ? 'No se encontraron datos EXIF.' : selected.photo.exif.status === 'not_jpeg' ? 'El formato recibido no contiene EXIF JPEG.' : 'No se pudieron leer los datos EXIF.'}</p>
                {selected.photo.exif.status === 'present' && <dl>
                  <Datum label="Cámara">{[selected.photo.exif.make, selected.photo.exif.model].filter(Boolean).join(' ') || 'No disponible'}</Datum>
                  <Datum label="Fecha EXIF">{selected.photo.exif.dateTime || 'No disponible'}</Datum>
                  <Datum label="GPS EXIF">{selected.photo.exif.gps ? `${selected.photo.exif.gps.latitude.toFixed(6)}, ${selected.photo.exif.gps.longitude.toFixed(6)}` : 'No incluido'}</Datum>
                </dl>}
                <p className={s.note}>La foto tomada desde la cámara web se genera como una imagen nueva; normalmente no conserva el EXIF original del dispositivo.</p>
              </section>
            </div>
          </>}
        </section>
      </div>
    </main>
  );
}
