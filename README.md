# Web de Montajes Eléctricos Garrido (MEG)

Web estática (HTML, CSS y un poco de JavaScript, sin WordPress ni base de datos) que sustituye a la web actual de montajeselectricosgarrido.es. Se puede alojar gratis en Netlify, Cloudflare Pages o GitHub Pages.

## Dónde está publicada

Versión de pruebas: https://web-meg.pages.dev (Cloudflare Pages, proyecto `web-meg`). Cada fusión en `main` se publica sola en un minuto.

Si Cloudflare avisa de que el proyecto está desconectado de GitHub, revisa en https://github.com/settings/installations que la app **Cloudflare Workers and Pages** tenga acceso a `web-meg`. Ojo: "Retry deployment" vuelve a publicar el mismo commit, no el último.

## Ver la web en tu ordenador

Abre `index.html` con el navegador. No hace falta instalar nada.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio: servicios, quiénes somos, trabajos, zona de trabajo |
| `instalaciones-electricas.html` | Viviendas, industria, centros de transformación, pozos |
| `placas-solares.html` | Placas solares: ventajas, proceso, excedentes, preguntas |
| `puntos-de-carga.html` | Cargadores para coche eléctrico |
| `contacto.html` | Datos, horario, cómo llegar y formulario de presupuesto |
| `aviso-legal.html`, `privacidad.html`, `cookies.html` | Textos legales |
| `404.html` | Página de error |
| `assets/css/styles.css` | Estilos. Los colores están arriba del todo (`--granate`, etc.) |
| `assets/js/main.js` | Menú del móvil y envío del formulario |
| `assets/img/logo.svg` | **Logo provisional** (ver abajo) |
| `assets/img/trabajos/` | Carpeta para las fotos de trabajos |
| `sitemap.xml`, `robots.txt` | Para Google |
| `_redirects` | Redirige las direcciones antiguas que cambian de nombre (Cloudflare Pages / Netlify). No añadas reglas de una página a sí misma con `.html`: Cloudflare ya quita el `.html` y se forma un bucle |

## Tareas pendientes antes de publicar

En el código están marcadas con `PENDIENTE` (búscalo con Ctrl+F).

1. **Logo**: sustituye `assets/img/logo.svg` por el logo original con el mismo nombre. Si es PNG, guárdalo como `assets/img/logo.png` y cambia `logo.svg` por `logo.png` en todos los `.html` (buscar y reemplazar).
2. **Media o alta tensión**: la web dice "baja y media tensión" (el lema actual). Si es "alta", busca `media tensión` y cámbialo.
3. **Años de experiencia**: la portada dice "Más de 15 años". Cámbialo en `index.html`.
4. **WhatsApp**: usa el 653 204 609. Si es otro número, busca `wa.me/34653204609` y cámbialo.
5. **Fotos de trabajos**: guarda las fotos en `assets/img/trabajos/` y en `index.html`, sección "Trabajos realizados", cambia cada `<div class="trabajo__foto">…</div>` por:
   ```html
   <img class="trabajo__foto" src="assets/img/trabajos/foto1.jpg" alt="Qué se ve en la foto" loading="lazy" width="800" height="600">
   ```
   Mejor en JPG de unos 1200 px de ancho y menos de 300 KB.
6. **Titular y NIF**: completa `[TITULAR]` y `[NIF]` en `aviso-legal.html` y `privacidad.html`.
7. **Formulario**: ver la sección siguiente.

## Activar el formulario de presupuesto (Web3Forms, gratis)

1. Entra en https://web3forms.com, escribe el email donde quieres recibir los presupuestos y te llegará una clave (Access Key).
2. En `contacto.html`, busca `PON-AQUI-TU-CLAVE-DE-WEB3FORMS` y pon tu clave.

Mientras no esté la clave, el formulario avisa al cliente de que llame o escriba por WhatsApp. El plan gratuito permite 250 envíos al mes.

## Publicar gratis

**Cloudflare Pages o Netlify (recomendado, respetan `_redirects`):**
1. Crea una cuenta y elige "Importar desde GitHub".
2. Selecciona este repositorio. No hay comando de compilación; la carpeta de publicación es la raíz (`/`).
3. Añade el dominio `montajeselectricosgarrido.es` en los ajustes del sitio y cambia los DNS donde esté registrado el dominio (pide a Sevilla Systems el código de transferencia si el dominio está a su nombre).

**GitHub Pages:** Settings → Pages → rama `main`, carpeta `/`. No usa `_redirects`.

## SEO incluido

- Título y descripción propios en cada página, enlaces canónicos y etiquetas para compartir en redes.
- Datos estructurados `Electrician` (LocalBusiness) con dirección, horario y zona, más migas de pan y preguntas frecuentes.
- `sitemap.xml` y `robots.txt`. Cuando esté publicada, da de alta la web en Google Search Console y envía el sitemap.
- Recomendado: crear o reclamar la ficha de Google Business Profile con los mismos datos.

## Privacidad

La web no usa cookies, ni Google Fonts, ni analítica: por eso no necesita aviso de cookies. Los mapas son enlaces a Google Maps, no mapas incrustados.
