export type LocationResult = {
  position: GeolocationPosition | null;
  permission: 'granted' | 'denied' | 'unavailable';
};

export function requestBestBrowserLocation(): Promise<LocationResult> {
  if (!window.isSecureContext || !navigator.geolocation) {
    return Promise.resolve({ position: null, permission: 'unavailable' });
  }

  return new Promise((resolve) => {
    let settled = false;
    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | undefined;
    const finish = (result: LocationResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(deadline);
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      resolve(result);
    };
    const deadline = window.setTimeout(() => finish({
      position: bestPosition,
      permission: bestPosition ? 'granted' : 'unavailable',
    }), 25000);
    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
              !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
              !Number.isFinite(accuracy) || accuracy < 0) return;
          if (!bestPosition || accuracy < bestPosition.coords.accuracy) bestPosition = position;
          if (accuracy <= 50) finish({ position: bestPosition, permission: 'granted' });
        },
        (error) => {
          if (error.code === 1) finish({ position: null, permission: 'denied' });
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
      );
    } catch {
      finish({ position: null, permission: 'unavailable' });
    }
  });
}
