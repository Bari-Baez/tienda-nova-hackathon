# Producto: demostración de privacidad en formulario de reembolso

## Propósito

Mostrar durante un hackathon autorizado la diferencia entre la información que una persona cree compartir en un trámite breve y la información técnica que recibe un servidor. La interfaz pública simula una tienda que solicita nombre, teléfono, descripción y fotografía de un producto defectuoso. El presentador explica los hallazgos en vivo con un dashboard privado.

## Usuarios y recorrido

- **Participante:** completa un formulario corto y toma una foto con la cámara del dispositivo. Al abrir cámara y ubicación, el navegador solicita ambos permisos.
- **Presentador:** abre `/dashboard` con un token local y observa las solicitudes recibidas, la foto y la procedencia de cada dato.

No hay procesamiento de reembolsos ni conexión con una tienda real. El proyecto se opera en un entorno de demostración controlado.

## Información presentada

| Dato | Fuente y límite |
| --- | --- |
| Nombre, teléfono, descripción, fotografía | Envío explícito del formulario. |
| IP | Conexión TCP observada por el servidor; puede ser loopback o LAN y no identifica una ubicación física precisa. |
| `User-Agent`, `Accept-Language` | Encabezados HTTP recibidos. |
| Idioma, plataforma, pantalla, zona horaria | Valores reportados por el navegador; pueden ser modificados por el cliente. |
| Coordenadas y precisión | Geolocation API las reporta si la persona concede el permiso solicitado al pulsar **Abrir cámara y ubicación**. Se conserva la lectura con menor radio disponible en 25 segundos; la exactitud depende del dispositivo y del entorno. |
| EXIF | Lectura de bytes JPEG recibidos. GPS solo aparece si realmente está en el archivo. Canvas suele retirar estos metadatos. |

## Operación

El servidor Vite incluye `server/claims-api.mjs` en desarrollo y vista previa. Las solicitudes se validan y persisten en `.demo-data/`. El dashboard y las fotos requieren un token que no se incluye en el código público. La lectura usa sondeo periódico. El mapa de OpenStreetMap solo se ofrece para lecturas con radio de 100 m o menos, se carga por acción del presentador y comparte las coordenadas con ese servicio.

## Criterios de aceptación

- Formulario simple que captura una imagen de cámara y confirma el envío.
- El botón **Abrir cámara y ubicación** inicia ambas solicitudes de permiso; el envío funciona si se rechaza ubicación.
- Dashboard muestra únicamente datos recibidos y distingue fuente, ausencia y límite de cada dato.
- Foto y registros solo accesibles con token; datos locales excluidos de Git.
- API rechaza imágenes que superan los límites o cuya firma no es JPEG/PNG.
- Pruebas de API, tipos y compilación pasan en el estado final.

Consulte [README.md](README.md) para arranque, seguridad del contexto HTTPS y limpieza.
