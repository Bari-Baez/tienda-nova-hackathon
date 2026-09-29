import { useEffect, useRef, useState } from 'react';
import { requestBestBrowserLocation, type LocationResult } from './lib/geolocation';
import s from './App.module.css';

type ClaimResponse = { id: string; receivedAt?: string };

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function cameraError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Permite el acceso a la cámara para tomar la foto.';
    if (error.name === 'NotFoundError') return 'No encontramos una cámara disponible.';
    if (error.name === 'NotReadableError') return 'La cámara está ocupada. Cierra otras aplicaciones e inténtalo de nuevo.';
  }
  return 'No se pudo abrir la cámara. Comprueba los permisos e inténtalo de nuevo.';
}

async function capture(video: HTMLVideoElement): Promise<Blob> {
  if (!video.videoWidth || !video.videoHeight) throw new Error('La cámara aún no está lista.');
  const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la fotografía.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  if (!blob) throw new Error('No se pudo guardar la fotografía.');
  return blob;
}

function deviceDetails() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const locationResultRef = useRef<Promise<LocationResult> | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  useEffect(() => () => {
    stopStream(streamRef.current);
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => {
        stopStream(streamRef.current);
        streamRef.current = null;
        setCameraActive(false);
        setError('No se pudo iniciar la cámara.');
      });
    }
  }, [cameraActive]);

  async function openCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('La cámara requiere un navegador compatible y una conexión segura (HTTPS).');
      return;
    }
    setCameraLoading(true);
    locationResultRef.current ??= requestBestBrowserLocation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: 'environment' } },
      });
      stopStream(streamRef.current);
      streamRef.current = stream;
      setCameraActive(true);
    } catch (cause) {
      setError(cameraError(cause));
    } finally {
      setCameraLoading(false);
    }
  }

  async function takePhoto() {
    if (!videoRef.current) return;
    setError('');
    try {
      const image = await capture(videoRef.current);
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      const url = URL.createObjectURL(image);
      photoUrlRef.current = url;
      setPhoto(image);
      setPhotoUrl(url);
      stopStream(streamRef.current);
      streamRef.current = null;
      setCameraActive(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo tomar la foto.');
    }
  }

  function retakePhoto() {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    setPhoto(null);
    setPhotoUrl(null);
    void openCamera();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!photo) {
      setError('Toma una foto del producto para continuar.');
      return;
    }
    if (!name.trim() || !phone.trim() || !description.trim()) {
      setError('Completa tu nombre, teléfono y la descripción del problema.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError('Introduce un número de teléfono válido.');
      return;
    }
    setStatus('sending');
    try {
      const payload = new FormData();
      payload.set('name', name.trim());
      payload.set('phone', phone.trim());
      payload.set('description', description.trim());
      payload.set('photo', photo, 'producto.jpg');
      payload.set('device', JSON.stringify(deviceDetails()));
      const location = await locationResultRef.current;
      payload.set('locationPermission', location?.permission ?? 'unavailable');
      if (location?.position) {
        payload.set('latitude', String(location.position.coords.latitude));
        payload.set('longitude', String(location.position.coords.longitude));
        payload.set('accuracy', String(location.position.coords.accuracy));
      }
      const response = await fetch('/api/claims', { method: 'POST', body: payload });
      if (!response.ok) throw new Error('No se pudo enviar la solicitud. Inténtalo de nuevo.');
      const result = await response.json() as ClaimResponse;
      if (!result.id) throw new Error('El servidor no confirmó la solicitud. Inténtalo de nuevo.');
      setStatus('sent');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo enviar la solicitud.');
      setStatus('idle');
    }
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.brand}><span className={s.brandMark} aria-hidden="true">◼</span> Tienda Nova</div>
        <span className={s.headerLabel}>Atención al cliente</span>
      </header>
      <main className={s.main}>
        {status === 'sent' ? (
          <section className={s.card} aria-live="polite">
            <span className={s.eyebrow}>Solicitud recibida</span>
            <h1>Gracias por contactarnos.</h1>
            <p className={s.intro}>Hemos recibido la información de tu producto. Nuestro equipo revisará tu solicitud.</p>
          </section>
        ) : (
          <section className={s.card}>
            <span className={s.eyebrow}>Ayuda con tu pedido</span>
            <h1>Solicitar reembolso</h1>
            <p className={s.intro}>Cuéntanos qué ocurrió y toma una foto del producto para que podamos revisar tu caso.</p>
            <form onSubmit={submit} className={s.form}>
              <div className={s.field}>
                <label htmlFor="customer-name">Nombre</label>
                <input id="customer-name" name="name" type="text" autoComplete="name" required maxLength={100}
                  value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" />
              </div>
              <div className={s.field}>
                <label htmlFor="customer-phone">Número de teléfono</label>
                <input id="customer-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={24}
                  value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Tu número de contacto" />
              </div>
              <div className={s.field}>
                <label htmlFor="problem-description">¿Qué problema tiene el producto?</label>
                <textarea id="problem-description" name="description" required maxLength={2000} rows={4}
                  value={description} onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe brevemente lo que ocurrió" />
              </div>
              <div className={s.field}>
                <span className={s.fieldLabel}>Foto del producto</span>
                {photoUrl ? (
                  <div className={s.photoFrame}>
                    <img src={photoUrl} alt="Foto tomada del producto" />
                    <button className={s.secondaryButton} type="button" onClick={retakePhoto}>Tomar otra foto</button>
                  </div>
                ) : cameraActive ? (
                  <div className={s.cameraFrame}>
                    <video ref={videoRef} autoPlay playsInline muted aria-label="Vista de la cámara" />
                    <button className={s.captureButton} type="button" onClick={takePhoto}>Tomar foto</button>
                  </div>
                ) : (
                  <button className={s.cameraButton} type="button" onClick={() => void openCamera()} disabled={cameraLoading}>
                    <span className={s.cameraIcon} aria-hidden="true">▣</span>
                    {cameraLoading ? 'Abriendo cámara' : 'Abrir cámara '}
                  </button>
                )}
              </div>
              {error && <p className={s.error} role="alert">{error}</p>}
              <button className={s.submitButton} type="submit" disabled={status === 'sending' || !photo}>
                {status === 'sending' ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
