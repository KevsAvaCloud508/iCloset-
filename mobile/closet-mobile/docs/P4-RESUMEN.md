# P4 — Resumen: errores, correcciones y trabajo hecho

Documento único de la rama `P4-outfit-bar`. Resume el alcance de **P4
(estilos, colores y cámara)**, los errores que se encontraron en el proyecto,
cuáles se corrigieron y qué se implementó.

- Rama: `P4-outfit-bar` (local, sin push).
- Base: `main` (commit `4a2fe37`).
- Fecha: 2026-09-28.

## 1. Resumen de estado

| Área | Estado |
|---|---|
| Tests (`npm test`) | 4 suites / **33 tests pasando** |
| Tipos (`npx tsc --noEmit`) | sin errores |
| Secretos en el repo | ninguno (Azure solo en user-secrets local) |
| Aislamiento | `main`, `Juanra-dev`, `closet-mobile` intactos |
| Errores de P4 corregidos | 10/10 |
| Fuera de alcance P4 (abiertos) | README, `cross-env`/Node, `tsconfig`, rotar AccountKey |

## 2. Lo que hicimos (funcionalidad entregada)

| Día P4 | Entregable | Resultado |
|---|---|---|
| 1 | Tema/paleta + pantalla base | Ya existía; se agregaron tokens `outfitBar*` |
| 2 | Estilos del carrusel + barra de outfit | Barra "Tu outfit" real + palomita de selección |
| 3 | Cámara en "agregar foto" | `expo-image-picker` + compresión + subida a Azure |
| 4 | Barra de outfit con datos reales | 4 slots con foto, contador n/4 y ✕ para quitar |
| 6 | Fluidez del carrusel | Fix de snap (`cardGap`) + `getItemLayout` + `initialScrollIndex` |

Además:

- `src/utils/outfit.ts`: lógica pura (`buildOutfitSlots`, `countOutfitSlots`,
  `reconcileSelectedIds`).
- `src/components/OutfitBar.tsx`: barra presentacional con `testID`s.
- Tests con `jest-expo` + React Native Testing Library.
- `.env.example` y scripts de npm que activan `EXPO_PUBLIC_USE_RN_FETCH`.

## 3. Errores encontrados y su estado

| # | Error / hallazgo | Estado |
|---|---|---|
| 1 | `fontsLoaded` sin usar: la UI se renderizaba antes de cargar Space Mono | Corregido |
| 2 | El ✕ del outfit no persistía: la auto-selección rellenaba la zona al recargar | Corregido |
| 3 | `API_URL` con `??`: un valor vacío rompía todas las peticiones | Corregido |
| 4 | Doble toque en "Tomar foto": podía abrir la cámara dos veces | Corregido |
| 5 | Timeout de 15 s podía cortar subidas lentas | Corregido (30 s) |
| 6 | `cross-env@10` exige Node ≥ 20 | Fuera de alcance P4 |
| 7 | `tsconfig "types": ["jest","node"]` limita los tipos globales automáticos | Fuera de alcance P4 (anotado) |
| 8 | Jitter visual: `borderWidth` 1→3 encogía la imagen al seleccionar | Corregido (borde constante 3px) |
| 9 | `ImageManipulator.manipulateAsync` deprecado en SDK 57 | Corregido (API nueva) |
| 10 | `app.json` sin el plugin de `expo-image-picker` | Corregido |
| 11 | Alert doble si fallaba la recarga tras guardar | Corregido (alert único) |
| 12 | Tarjetas sin `accessibilityLabel` | Corregido |
| 13 | `README.md` desactualizado (.NET 8, endpoints "faltantes") | Fuera de alcance P4 |
| 14 | Docs P4 desactualizados | Corregido (este documento) |
| 15 | AccountKey de Azure compartida en texto plano | Pendiente: rotar (acción del usuario) |

### El error más importante: "Unsupported FormDataPart implementation" al subir foto

**Síntoma:** al tomar una foto, la app mostraba `No se pudo guardar` con
`Unsupported FormDataPart implementation`.

**Causa raíz:** Expo SDK 57 instala su propio `fetch` cuando
`EXPO_PUBLIC_USE_RN_FETCH` no vale `1`/`true`. Ese fetch no soporta archivos
locales de React Native (`{ uri, name, type }`) en `FormData`
(`expo/src/winter/fetch/convertFormData.ts`) y lanza ese error. El `.env` que
lo activaba nunca se commiteó.

**Fix:** los scripts de npm (`start`/`android`/`ios`) activan la variable con
`cross-env`, y `.env.example` la documenta para quien arranque con
`npx expo start` directo (usar `--clear` la primera vez).

**Relacionado:** si la app se quedaba "Guardando…" 30 s o más, era la IP del
backend. Ahora `API_URL` es configurable con `EXPO_PUBLIC_API_URL` y todas las
peticiones fallan con mensaje claro a los 30 s.

## 4. Correcciones por commit

| Commit | Qué corrigió |
|---|---|
| `beb60c0` | `API_URL` configurable por `EXPO_PUBLIC_API_URL` + timeout de peticiones |
| `60af65d` | Forzar `EXPO_PUBLIC_USE_RN_FETCH` en los scripts de npm |
| `088f933` | Documentar `.env` + mostrar el mensaje real del backend |
| `b543941` | Timeout 30 s, `API_URL` con `\|\|`, plugin `expo-image-picker` |
| `99abcf8` | Gate de fuentes, doble tap, ✕ persistente, API nueva de manipulator, accesibilidad |
| `14443ab` | Barra "Tu outfit" con datos reales |
| `5751008` | Fix de snap y fluidez del carrusel |
| `7eea353` | Palomita de selección y tokens `outfitBar*` |

## 5. Cómo probar

```bash
# Terminal 1 — backend (requiere la connection string en user-secrets)
cd backend/Closet.Api && dotnet run

# Terminal 2 — app
cd mobile/closet-mobile
npm install
npm start -- --clear   # los scripts ya activan EXPO_PUBLIC_USE_RN_FETCH
```

`.env` (opcional si se usa `npm start`):

```env
EXPO_PUBLIC_USE_RN_FETCH=1
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:5005   # ipconfig getifaddr en0
```

Checklist en celular:

1. Tomar una foto y guardar: debe decir "La prenda se guardó" en 2-5 s.
2. Tocar una tarjeta: aparece la palomita y la barra "Tu outfit" actualiza.
3. Deslizar el carrusel: la prenda centrada queda seleccionada, sin desfase.
4. Tocar `✕`: la zona queda "Sin prenda", el contador baja y no se rellena al
   recargar.
5. Tocar dos veces rápido "Tomar foto": la cámara abre una sola vez.
6. Sin salto visual al seleccionar una tarjeta.

Diagnóstico si falla:

- ¿No abre `http://TU_IP:5005/swagger` en el navegador del celular? Es red
  (IP equivocada, backend apagado, otra Wi-Fi o firewall), no código.
- Si el request llega al backend y se queda, el cuello de botella es Azure.

## 6. Tests

- Stack: `jest-expo@~57`, `@testing-library/react-native@14`, `@types/jest`.
- Correr: `npm test` (o `npm run test:watch`).
- Cobertura:
  - `src/services/__tests__/api.test.ts`: GET/POST/DELETE, forma
    `{ uri, name, type }` del `photo` (regresión del bug de FormData),
    mensajes del backend, timeout 30 s.
  - `src/utils/__tests__/outfit.test.ts`: slots, contador y
    `reconcileSelectedIds`.
  - `src/components/__tests__/OutfitBar.test.tsx`: barra y ✕.
  - `__tests__/photo-flow.test.tsx`: gate de fuentes, permisos, cancelar,
    doble toque, éxito, fallo y alert único.

```
Test Suites: 4 passed, 4 total
Tests:       33 passed, 33 total
```

`npx tsc --noEmit`: sin errores.
`npx expo config --type public`: plugin aplicado; Android `CAMERA` y
`READ_MEDIA_IMAGES` (sin `RECORD_AUDIO`); iOS con permisos de cámara/galería.

## 7. Verificación manual (verificada en celular)

Probado en celular físico por el equipo:

- Tomar foto y guardar: la prenda se guarda correctamente.
- Quitar una zona con el ✕: la zona queda vacía y no se rellena al recargar.
- Tocar dos veces rápido "Tomar foto": la cámara abre una sola vez.
- Seleccionar una tarjeta: sin salto visual ni parpadeo de fuente.

Pendiente opcional: probar con TalkBack/VoiceOver que las tarjetas se
anuncien como "Zona: prenda Nombre".

## 8. Fuera de alcance / pendientes

- Actualizar `README.md` (.NET 8 → net10, endpoints ya existen).
- Revisar `cross-env@10` (Node ≥ 20) y `tsconfig "types"`.
- Rotar la AccountKey de Azure (se compartió en texto plano).
- Cámara propia con `expo-camera` y guardar outfits como entidad (futuro).
