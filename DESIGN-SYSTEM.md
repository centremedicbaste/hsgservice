# HSG Design System

Lenguaje de diseño humanista-clínico: retícula, escala tipográfica y patrones de
componente inspirados en Philips Healthcare, con la identidad cromática de HSG.
No se usan activos de marca de Philips.

**Archivo único:** `src/assets/css/ds.css` (22 KB, sin dependencias ni build).

## Tokens

| Rol | Token | Valor |
|---|---|---|
| Texto | `--c-ink` | `#15191E` |
| Texto secundario | `--c-ink-soft` | `#46525D` |
| Texto apagado | `--c-ink-mute` | `#6B7883` |
| Línea | `--c-line` | `#E4E9EC` |
| Superficie | `--c-surface` | `#F6F8F9` |
| Navy de marca | `--c-deep` | `#013763` |
| Azul interactivo | `--c-primary` | `#0A6ABF` |
| Cian (uso puntual) | `--c-accent` | `#00CDDA` |

Todas las combinaciones de texto verificadas en **WCAG AA** (mínimo 4,5:1).

- **Tipografía:** Source Sans 3 (variable 300–800), sustituto libre de Neue Frutiger World.
- **Escala:** display / h1 / h2 / h3 / h4 con `clamp()`, cuerpo 17 px, interlineado 1,6.
- **Retícula:** contenedor 1366 px, gutter 24 px, prosa 72ch.
- **Secciones:** `--section-y` = `clamp(64px, 7vw, 120px)`.
- **Radios:** píldora 999 px (botones), 12 px (tarjetas), 6 px (campos).

## Componentes

`.btn` (relleno, sin borde) · `.btn--ghost` (transparente, con borde) · `.btn--light`
`.card` / `.card--outline` con `.arrow-dot` · `.eyebrow` · `.section-head`
`.hero` (degradado navy) · `.stats` · `.logo-wall` · `.accordion` · `.list-check` / `.list-cross`
`.post-card` · `.tag` · `.crumbs` · `.prose` · `.form-card` · `.site-header` · `.site-footer`

## Reglas aplicadas

- Botones rellenos sin borde; borde solo en los transparentes.
- Un acento principal (azul) y uno secundario (cian), resto neutros.
- Fondo de color siempre a bloque completo, nunca a titulares sueltos.
- Menú de 7 entradas; se colapsa por debajo de 1080 px.
- Un solo H1 por página; jerarquía título > subtítulo > ítem > descripción.
- `prefers-reduced-motion` respetado; foco visible; enlace de salto al contenido.

## Cómo trabajar con él

Edita solo `src/assets/css/ds.css`. No hay Sass que compilar para el diseño:
el antiguo `style.scss` y holygrailcss ya no se cargan.

```bash
npx @11ty/eleventy --serve    # desarrollo
npx @11ty/eleventy            # build a public/
```
