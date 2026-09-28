# Cambios P4 — Barra "Tu outfit", selección y fluidez

Documento de la rama `P4-outfit-bar`. Registra todo lo que se agregó en la
app móvil para completar el alcance de **P4 (estilos, colores y cámara)** que
faltaba en `main`.

## Rama y base

- Rama: `P4-outfit-bar` (solo local, sin push).
- Base: `main` (commit `4a2fe37`).
- No se toca el backend ni el flujo de subida a Azure Blob.

## Alcance

De los 5 entregables de P4, ya existían el tema base y los estilos del
carrusel. En esta rama se completan los que faltaban:

| Día | Entregable | Estado |
|---|---|---|
| 1 | Tema/paleta + pantalla base | Ya existía; se agregaron tokens `outfitBar*` |
| 2 | Estilos del carrusel + inicio de barra de outfit | Se completó la barra y la palomita |
| 3 | Cámara en "agregar foto" | Cubierto con `expo-image-picker` (decisión abajo) |
| 4 | Barra de outfit con datos reales | Implementada en esta rama |
| 6 | Fluidez del carrusel | Corregida en esta rama |

## Cambios por commit

### `feat(mobile): palomita de selección y tokens de la barra`

**`src/theme/theme.ts`**
- Se agregaron los tokens de la barra de outfit, sin renombrar los existentes:
  - `outfitBarBg` → fondo de la barra.
  - `outfitBarText` → texto principal (título y contador).
  - `outfitBarTextMuted` → textos secundarios (zona y placeholders).

**`App.tsx`**
- Palomita `✓` superpuesta en la esquina de la tarjeta centrada/seleccionada
  (`checkBadge` / `checkMark`), además del borde de selección que ya existía.

### `feat(mobile): barra "Tu outfit" con datos reales`

**`App.tsx`**
- `outfitSlots`: por cada `BODY_PART`, busca en `garments` la prenda
  seleccionada en `selectedIds` y arma los 4 slots.
- `outfitCount`: contador de zonas con prenda (`n/4`).
- La barra inferior ahora muestra:
  - Encabezado "Tu outfit" + contador `n/4`.
  - Miniatura de la prenda real (`imageUrl` de la API) o "Sin prenda".
  - Etiqueta de zona debajo de cada miniatura.
  - Botón `✕` que deselecciona la zona (`selectedIds[part] = null`).
- Se conserva `paddingBottom: Math.max(insets.bottom, 12)` para la safe-area.

### `perf(mobile): fluidez del carrusel y fix de snap`

**`App.tsx`**
- **Bug corregido:** `cardStep` era `cardWidth + 12` pero el separador del
  `FlatList` medía `14`, así que el snap y el cálculo de la tarjeta centrada
  se desfasaban. Ahora ambos usan `cardGap = 14`.
- Se agregó `getItemLayout` al `FlatList` para que el snap y el scroll sean
  exactos sin medir cada tarjeta.
- Se agregó `initialScrollIndex` con el índice de la prenda seleccionada,
  para que cada carrusel abra centrado en la selección actual.

## Decisiones tomadas

1. **Cámara:** se mantiene `expo-image-picker` (`launchCameraAsync`) que ya
   existía. No se migra a `expo-camera`; el criterio de aceptación del Día 3
   ("abre la cámara y la foto subida se ve") ya se cumple. `expo-camera` queda
   fuera de esta rama.
2. **Nombres del tema:** no se renombran `wall/ink/muted/line/rail`; solo se
   agregaron los tokens que faltaban (`outfitBar*`).
3. **Datos reales:** la barra se alimenta de `garments` + `selectedIds`, que
   vienen de `GET /api/garments`. No se usa mock ni datos demo.
4. **Descartar selección:** el `✕` limpia la zona y la deja vacía; las
   recargas ya **no** la vuelven a llenar (`clearedParts` +
   `reconcileSelectedIds`). La zona se rellena solo si el usuario elige una
   prenda de nuevo.

## Criterios de aceptación (PLAN-P4.md)

- La barra muestra la prenda seleccionada real de cada zona. ✅
- El carrusel desliza fluido y la tarjeta centrada queda seleccionada sin
  desfase. ✅
- Cambiar colores del tema se refleja en la app. ✅

## Cómo probar

```bash
cd mobile/closet-mobile
npm install
npm start -- --clear   # los scripts ya activan EXPO_PUBLIC_USE_RN_FETCH
```

Con el backend corriendo y el celular en la misma red Wi-Fi:

1. Tocar una tarjeta en cualquier carrusel: aparece la palomita y la barra
   "Tu outfit" actualiza esa zona.
2. Deslizar un carrusel: la prenda centrada queda seleccionada, con snap
   exacto (sin desfase).
3. Tocar el `✕` de un slot: la zona queda "Sin prenda", el contador baja y
   no se rellena al recargar.
4. Cambiar un color en `src/theme/theme.ts`: se refleja al recargar la app.

> Si el backend no responde, revisa `EXPO_PUBLIC_API_URL` en `.env` (tu IP
> local) y que ambos estén en la misma Wi-Fi. Ver `P4-TESTING.md` para el
> diagnóstico completo.

## Pendiente / fuera de alcance

- Cámara propia con `expo-camera` (preview usar/repetir, flash, voltear).
- Guardar outfits como entidad en el backend.

Los hallazgos de la revisión quedaron resueltos y documentados en
`P4-REVISION.md` (con estado y evidencia de cada punto).
