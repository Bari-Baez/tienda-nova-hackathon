# Demostración de privacidad: solicitud de reembolso

Aplicación local para un hackathon autorizado. La pantalla pública simula un formulario breve de reembolso: nombre, teléfono, descripción del defecto y fotografía tomada con la cámara. Un dashboard del presentador muestra los datos que llegaron realmente al servidor. Los datos del formulario se guardan en el servidor local; el mapa externo solo se carga si el presentador elige mostrarlo.

## Ejecutar

Requiere Node.js 20 o posterior.

```powershell
npm install
npm run dev
```

Abra la dirección local que muestra Vite. El formulario está en `/` y el dashboard en `/dashboard`. El servidor imprime un token aleatorio para abrir el dashboard. Puede definir `DEMO_DASHBOARD_TOKEN` en el entorno antes de iniciar Vite para mantener un token fijo; no use una variable `VITE_`, porque esas variables pasan al código del navegador. Por ejemplo, en PowerShell:

```powershell
$env:DEMO_DASHBOARD_TOKEN = 'un-token-largo-y-aleatorio'
npm run dev
```

Para usar almacenamiento temporal fuera del repositorio, defina también `DEMO_DATA_DIR` como ruta absoluta antes de iniciar el servidor. Vite no carga automáticamente estas dos variables de servidor desde un archivo `.env`; deben estar en el entorno del proceso.

Para comprobar la compilación y ejecutar el servidor Node que sirve `dist` y la API bajo el mismo origen:

```powershell
npm run build
npm run start
```

El servidor escucha en `127.0.0.1:4173` por defecto. Puede ajustar `HOST` y `PORT` en el entorno, por ejemplo `$env:HOST='0.0.0.0'; $env:PORT='4173'; npm run start`. `npm run preview` también integra la API para QA local, pero use `npm run start` para operar la versión compilada. Los archivos estáticos de `dist` por sí solos **no** incluyen la API; no publique esta compilación como un sitio estático esperando que el formulario funcione. La configuración anterior de Netlify y Google Apps Script se retiró.

Para participantes con teléfonos, coloque un proxy inverso HTTPS de confianza delante de `npm run start` y use un certificado aceptado por esos dispositivos. El proxy debe reenviar formulario, dashboard y `/api/claims` al mismo origen. Limite el acceso a la red del evento y proteja el token del dashboard. El servidor registra la IP del socket que se conecta a Node: detrás de un proxy inverso, será la IP del proxy, no necesariamente la del participante. No se confía en `X-Forwarded-For`; si se necesita demostrar la IP de origen, debe configurarse y verificarse por separado un proxy de confianza antes de atribuir ese dato a una persona.

## Comprobar ubicación con un dispositivo propio

El formulario solicita los permisos de cámara y ubicación al pulsar **Abrir cámara y ubicación**. Para comprobar el permiso de ubicación por separado en un dispositivo propio:

1. En el teléfono, abra `/preparar-ubicacion` mediante una dirección **HTTPS confiable**. `http://127.0.0.1:4173` solo funciona en la computadora que ejecuta el servidor.
2. Pulse **Autorizar y comprobar ubicación** y conceda el permiso del navegador. Si usa iPhone, compruebe que Localización y Ubicación precisa estén activadas para Safari y que el sitio tenga acceso a ubicación.
3. Esa página mostrará las coordenadas y el radio de precisión en el propio dispositivo. No envía la lectura al servidor ni crea una solicitud en el dashboard.

Una ubicación de navegador es un punto con margen de precisión, no una dirección postal garantizada. Los registros anteriores no obtienen coordenadas retroactivamente. Si el dashboard muestra `127.0.0.1`, esa es la conexión local o del proxy que vio Node; no contiene la ubicación del teléfono. Una foto creada desde la cámara web mediante canvas tampoco conserva normalmente GPS EXIF.

Para comprobar el flujo completo, abre el formulario por HTTPS en el teléfono, pulsa **Abrir cámara y ubicación**, concede ambos permisos, toma la foto y envía la solicitud. El dashboard mostrará las coordenadas y el radio de precisión si el navegador obtuvo una lectura. Los avisos de permiso pueden aparecer uno detrás de otro aunque ambas solicitudes se inicien con el mismo clic.

Si el radio informado es grande (por ejemplo, 50 km), el punto central no representa una dirección concreta. En Android, comprueba el permiso de ubicación tanto de Chrome como del sitio, y activa **Usar ubicación precisa** para el navegador; Google explica estos controles en su [guía de permisos](https://support.google.com/android/answer/6179507). En iPhone, comprueba **Ubicación precisa** para el navegador en los [ajustes de localización](https://support.apple.com/en-bh/guide/iphone/iph3dd5f9be/ios). El GPS puede tardar más o degradarse en interiores y entre edificios.

## Flujo de datos

1. El navegador solicita acceso a la cámara por la interacción del participante. Nombre, teléfono, descripción y foto viajan al mismo origen como `multipart/form-data` a `POST /api/claims`.
2. El formulario añade datos básicos declarados por el navegador (idioma, plataforma, tamaño de pantalla, zona horaria). Al pulsar **Abrir cámara y ubicación**, inicia `getUserMedia` y Geolocation API. El navegador controla los permisos por separado. La solicitud se puede enviar sin coordenadas si el permiso de ubicación se rechaza o no se obtiene una lectura.
3. El servidor valida tamaño y firma JPEG/PNG, asigna un UUID, registra la dirección IP observada en la conexión, `User-Agent` y `Accept-Language`, inspecciona metadatos EXIF de archivos JPEG y guarda foto y registro localmente.
4. El dashboard consulta `GET /api/claims` periódicamente con `Authorization: Bearer <token>` y obtiene fotos mediante `GET /api/claims/:id/photo` con el mismo encabezado. El token no va en una URL ni en el bundle.

Los registros se guardan en `.demo-data/claims.jsonl` y las imágenes en `.demo-data/photos/`. Esta carpeta está excluida de Git. Los registros son datos reales del ensayo: limite el acceso físico al equipo y elimínelos al terminar la presentación.

## Alcance y límites de la demostración

- La IP es la dirección vista por el socket del servidor. En localhost puede ser `127.0.0.1`; en una red local suele ser una IP privada. No permite deducir una ubicación exacta. No se confían encabezados `X-Forwarded-For`.
- El formulario observa nuevas lecturas de Geolocation API durante un máximo de 25 segundos, conserva la de menor radio de precisión y termina antes si alcanza 50 m o menos. El servidor no puede verificar por sí mismo la exactitud de esos valores ni forzar GPS. La primera lectura aproximada ya no se acepta inmediatamente.
- El dashboard solo permite poner un punto en OpenStreetMap cuando el radio informado es de 100 m o menos. Una lectura más amplia sigue visible como dato, pero no genera un marcador engañoso. Cargar el mapa comparte esas coordenadas con OpenStreetMap.
- El lector EXIF indica `present`, `absent`, `unreadable` o `not_jpeg`. Solo muestra GPS si esos metadatos existen realmente. La captura que pasa por canvas normalmente elimina EXIF; una foto sin GPS es un resultado válido de la demostración.
- Cámara y Geolocation API requieren un contexto seguro. `localhost` es adecuado para probar en el mismo equipo. Para usar un teléfono en la LAN, sirva la aplicación mediante HTTPS confiable para ese dispositivo; abrir `http://<IP-LAN>` puede impedir la cámara y la página separada de diagnóstico de ubicación.
- El límite del cuerpo es 12 MiB y el de la foto 8 MiB. Se aceptan JPEG y PNG. El token restringe la lectura del dashboard y las fotos; el endpoint público de envío permanece abierto para los participantes en el entorno controlado.

## Verificación y limpieza

```powershell
npm run typecheck
npm run build
npm run test:api
```

Para borrar los datos del ensayo después de detener el servidor, desde la raíz de este proyecto:

```powershell
Remove-Item -LiteralPath '.demo-data' -Recurse -Force
```

La eliminación es permanente. Verifique que está en la carpeta correcta y que ya no necesita las fotografías para la presentación.
