# P4 — Revisión completa de la rama `P4-outfit-bar`

Revisión hecha sobre la rama `P4-outfit-bar`. Estado tras la corrección:
tests **33/33** OK, `tsc --noEmit` OK, sin secretos en archivos rastreados.
Este documento lista los hallazgos originales y, al final, el resultado de
la corrección con evidencia.

Fecha de la revisión: 2026-09-28.

## Resumen

| Área | Estado |
|---|---|
| Tests (`npm test`) | 33/33 pasando |
| Tipos (`npx tsc --noEmit`) | sin errores |
| Secretos en el repo | ninguno (Azure solo en user-secrets local) |
| Aislamiento de ramas | `main`, `Juanra-dev`, `closet-mobile` intactos |
| Puntos de P4 corregidos | 10/10 (ver "Resultado de la corrección") |
| Fuera de alcance P4 (abiertos) | README, `cross-env` Node, `tsconfig`, rotar Key de Azure |

## Errores / bugs reales

### 1. Fuente sin usar y sin bloquear el render
- **Dónde:** `mobile/closet-mobile/App.tsx:106`
- `const [fontsLoaded] = useFonts(...)` nunca se usa y la app renderiza antes
  de que cargue la fuente. Si falla la carga, `fontFamily: 'SpaceMono-*'` no
  existe y cae a la fuente del sistema (parpadeo / estilos inconsistentes).
- **Sugerencia:** usar `fontsLoaded` (no renderizar o aplicar fallback).

### 2. La auto-selección pisa el "quitar" del outfit
- **Dónde:** `mobile/closet-mobile/App.tsx:135-148`
- Si quitas una zona con el ✕ (`selectedIds[part] = null`) y luego ocurre
  cualquier recarga (`loadGarments`), se vuelve a seleccionar la primera
  prenda de esa zona. El "quitar" no persiste.
- **Sugerencia:** recordar las zonas descartadas o no auto-rellenar si el
  usuario ya interactuó con esa zona.

### 3. `API_URL` usa `??` en vez de `||`
- **Dónde:** `mobile/closet-mobile/src/services/api.ts:34`
- Si alguien define `EXPO_PUBLIC_API_URL=` (vacío), `'' ?? default` da `''` y
  todas las peticiones fallan con URL relativa.
- **Sugerencia:** usar `||` o validar que no venga vacío.

### 4. Doble toque en "Tomar foto"
- **Dónde:** `mobile/closet-mobile/App.tsx:176-201`
- `saving` se activa **después** de tomar la foto, así que dos toques rápidos
  pueden abrir la cámara dos veces.
- **Sugerencia:** `if (saving) return;` al inicio de `takePhotoAndUpload`.

## Riesgos / mejoras

### 5. Timeout de 15 s puede cortar subidas lentas
- **Dónde:** `mobile/closet-mobile/src/services/api.ts:41`
- En Wi-Fi mala + Azure, una subida legítima podría tardar más de 15 s.
- **Sugerencia:** subir a 20-30 s o diferenciar el timeout del upload.

### 6. `cross-env@10` exige Node ≥ 20
- **Dónde:** `mobile/closet-mobile/package.json` (`cross-env: ^10.1.0`)
- Compañeros con Node 18 fallarán al usar `npm start`.
- **Sugerencia:** pin a `cross-env@7` o documentar la versión de Node.

### 7. `tsconfig` limita los `types`
- **Dónde:** `mobile/closet-mobile/tsconfig.json` (`"types": ["jest", "node"]`)
- Se agregó para reconocer los globales de Jest, pero desactiva la inclusión
  automática de otros `@types`. Si se agrega `expo-env.d.ts` o tipos globales,
  no se cargarán.
- **Sugerencia:** dejar anotado / revisar al agregar tipos globales.

### 8. Jitter visual al seleccionar una tarjeta
- **Dónde:** `mobile/closet-mobile/App.tsx:544` (`selectedCard`)
- `borderWidth` pasa de 1 a 3, lo que encoge la imagen al seleccionar.
- **Sugerencia:** `borderWidth` constante y cambiar solo el color.

### 9. `manipulateAsync` está deprecado
- **Dónde:** `mobile/closet-mobile/App.tsx:205`
- Funciona en SDK 57, pero está reemplazado por `ImageManipulator.manipulate`.
- **Sugerencia:** migrar a la API nueva.

### 10. `app.json` sin el plugin de `expo-image-picker`
- **Dónde:** `mobile/closet-mobile/app.json`
- En Expo Go no afecta; en builds nativos (dev/standalone) puede faltar el
  permiso.
- **Sugerencia:** agregar el plugin.

### 11. Alert doble tras una subida exitosa
- **Dónde:** `mobile/closet-mobile/App.tsx:221-222`
- Si el `loadGarments()` posterior falla, se muestra "No se pudieron cargar
  las prendas" y además "Listo", lo cual confunde.
- **Sugerencia:** manejar el fallo del reload sin el doble mensaje.

### 12. Accesibilidad de las tarjetas
- **Dónde:** `mobile/closet-mobile/App.tsx` (tarjetas del carrusel)
- Solo tienen `testID`, sin `accessibilityLabel`.
- **Sugerencia:** agregar etiquetas descriptivas.

## Documentación desactualizada

### 13. `README.md`
- Línea 17 y 36: dice **.NET 8**; el proyecto es **net10.0**.
- Línea 97: dice **"Falta implementar los endpoints reales..."**; ya existen
  `GET/POST/DELETE /api/garments`.

### 14. `mobile/closet-mobile/docs/P4-CAMBIOS.md`
- Indica probar con `npx expo start` sin mencionar los scripts de npm ni el
  `.env` nuevos (drift con `P4-TESTING.md`).

## Seguridad

### 15. Rotar la AccountKey de Azure
- La cadena de conexión de Azure se compartió en texto plano (chat). No quedó
  en ningún archivo rastreado (verificado con `git grep`) y está solo en
  user-secrets local, pero **conviene rotar la AccountKey** al terminar.

## Lo que está bien

- Snap corregido (`cardStep`), safe-area, barra "Tu outfit" con datos reales,
  palomita de selección, timeout con `AbortController` y errores del backend
  visibles.
- Aislamiento correcto: `main`, `origin/Juanra-dev` y `origin/closet-mobile`
  intactos; `.env` ignorado y `.env.example` versionado sin secretos.
- Backend verificado: arranca y crea SQLite con la connection string en
  user-secrets.

## Plan de corrección sugerido

1. **Rápidos (bugs 1-4 + 8):** gate de `fontsLoaded`, guard de doble tap,
   `API_URL` con `||`, persistir el "quitar" de zona, `borderWidth` estable.
2. **Medios (5-7, 9-11):** timeout a 30 s, pin `cross-env@7`, migrar
   `manipulateAsync`, plugin de `expo-image-picker`, evitar alert doble.
3. **Docs (13-14):** actualizar `README.md` (net10, endpoints) y
   `P4-CAMBIOS.md`.
4. **Aparte:** rotar la AccountKey de Azure.

## Resultado de la corrección (2026-09-28)

Se corrigieron los 10 puntos del alcance P4. Commits:

- `99abcf8` — `fix(mobile): gate de fuentes, doble tap, ✕ persistente, manipulator y accesibilidad`
- `b543941` — `fix(mobile): timeout 30s, API_URL robusta y plugin de image-picker`
- Commit de docs — actualización de `P4-CAMBIOS.md`, `P4-TESTING.md` y este archivo.

| # | Punto | Estado | Cómo se verificó |
|---|---|---|---|
| 1 | Gate de fuentes | Corregido | Test "no renderiza la app hasta que cargan las fuentes" |
| 2 | ✕ persistente (no se rellena al recargar) | Corregido | Tests de `reconcileSelectedIds` |
| 3 | `API_URL` con `\|\|` | Corregido | Cambio directo; cubierto por tests de `getGarments` |
| 4 | Doble toque en cámara | Corregido | Test "ignora un segundo toque mientras la cámara está abierta" |
| 5 | Timeout 30 s | Corregido | Test de timeout (`advanceTimersByTimeAsync(30000)`) |
| 6 | `cross-env@10` / Node ≥ 20 | **Fuera de alcance P4** | Pendiente para quien mantiene tooling |
| 7 | `tsconfig "types"` | **Fuera de alcance P4** | Anotado |
| 8 | Jitter de `borderWidth` | Corregido | **Manual:** borde constante 3px; falta confirmar en celular |
| 9 | `manipulateAsync` deprecado | Corregido | Test verifica `ImageManipulator.manipulate().resize().renderAsync().saveAsync()` |
| 10 | Plugin `expo-image-picker` | Corregido | `npx expo config --type public`: plugin aplicado y sin `RECORD_AUDIO` |
| 11 | Alert doble | Corregido | Test "si falla la recarga tras guardar, muestra un solo mensaje" |
| 12 | Accesibilidad de tarjetas | Corregido | Test `findByLabelText('Torso: prenda Playera')` |
| 13 | `README.md` desactualizado | **Fuera de alcance P4** | Pendiente |
| 14 | `P4-CAMBIOS.md` drifteado | Corregido | Actualizado a scripts/`.env` y enlaces |
| 15 | Rotar AccountKey de Azure | **Pendiente (acción del usuario)** | No es código |

### Evidencia

```text
Test Suites: 4 passed, 4 total
Tests:       33 passed, 33 total
```

`npx tsc --noEmit` sin errores.

`npx expo config --type public` (resumen):
- `plugins`: `expo-font` + `expo-image-picker` (con `microphonePermission: false`).
- Android `permissions`: `CAMERA`, `READ_MEDIA_IMAGES` (sin `RECORD_AUDIO`).
- iOS: `NSCameraUsageDescription` y `NSPhotoLibraryUsageDescription`.

### Verificación manual pendiente (celular)

No es automatizable con Jest; queda para probar en dispositivo:

1. Tomar una foto y guardar: debe decir "La prenda se guardó" en 2-5 s.
2. Quitar una zona con el ✕ y recargar (subir/borrar otra prenda): la zona
   debe seguir "Sin prenda".
3. Tocar dos veces rápido "Tomar foto": la cámara debe abrir una sola vez.
4. Seleccionar una tarjeta: no debe haber salto visual del contenido.
5. TalkBack/VoiceOver: las tarjetas deben anunciarse como
   "Zona: prenda Nombre".

