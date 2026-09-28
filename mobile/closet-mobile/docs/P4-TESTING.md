# P4 — Testing y diagnóstico del error al tomar foto

Documento de la rama `P4-outfit-bar`. Explica la causa del error al subir
fotos, el fix aplicado y cómo correr los tests de la app móvil.

## 1. Diagnóstico: error al tomar/subir foto

**Síntoma:** al tomar una foto y presionar "Tomar foto y agregar" la app
muestra `No se pudo guardar` y el mensaje
`Unsupported FormDataPart implementation` (o `Network request failed` si la
IP del backend no es la correcta).

**Causa raíz confirmada:** falta el archivo `.env` con
`EXPO_PUBLIC_USE_RN_FETCH=1`.

Evidencia (código de las dependencias instaladas):

- `expo/src/winter/runtime.native.ts:40-51`: si `EXPO_PUBLIC_USE_RN_FETCH`
  no vale `1`/`true`, Expo **reemplaza `fetch` global** por el suyo.
- `expo/src/winter/fetch/convertFormData.ts:68-70`: ese fetch solo soporta
  partes `string`, `Blob` o con `bytes()`. Un archivo local de React Native
  (`{ uri, name, type }`) cae al `else` y lanza
  `Unsupported FormDataPart implementation`.
- `.env` está en `.gitignore` y **nunca se commiteó**; no había
  `.env.example`, así que cualquier clon nuevo reproduce el error.

**Fix aplicado:**

1. Los scripts de npm fuerzan la variable con `cross-env`, así no depende
   de que cada quien cree un `.env`:
   ```json
   "start":   "cross-env EXPO_PUBLIC_USE_RN_FETCH=1 expo start",
   "android": "cross-env EXPO_PUBLIC_USE_RN_FETCH=1 expo start --android",
   "ios":     "cross-env EXPO_PUBLIC_USE_RN_FETCH=1 expo start --ios"
   ```
   Con esto basta `npm start` (o `npm run ios` / `npm run android`).
2. `mobile/closet-mobile/.env.example` documenta la variable para quien
   arranque con `npx expo start` directo (fuera de npm):
   ```bash
   cd mobile/closet-mobile
   cp .env.example .env
   npx expo start --clear
   ```
   El `--clear` es importante la primera vez: la variable se inlinea al
   compilar y con caché vieja de Metro no se toma.
3. `src/services/api.ts`: los errores ahora leen el cuerpo de la respuesta
   del backend, así se ve el mensaje real (por ejemplo
   `La foto debe pesar entre 1 byte y 5 MB.`) en lugar de solo el status.

## 2. Problemas secundarios detectados

| Problema | Estado |
|---|---|
| `api.ts` ocultaba el mensaje del backend | Corregido (`buildError`) |
| `app.json` no lista el plugin de `expo-image-picker` | Pendiente; en Expo Go no afecta, en build nativo puede faltar permiso |
| `ImageManipulator.manipulateAsync` está deprecado en SDK 57 | Funciona; pendiente migrar a `ImageManipulator.manipulate`/`useImageManipulator` |
| Falta `.env` documentado | Corregido con `.env.example` |

## 3. Tests

### Setup

- `jest-expo@~57` (mismo SDK que Expo), `@testing-library/react-native@14`
  y `@types/jest`.
- Configuración en `jest.config.js` (`preset: 'jest-expo'`) y script:
  ```bash
  npm test          # corre toda la suite
  npm run test:watch
  ```
- `tsconfig.json` declara `"types": ["jest", "node"]` para que TypeScript
  reconozca los globales de Jest y Node.

> Nota: React Native Testing Library v14 tiene API asíncrona. `render` y
> `fireEvent.*` devuelven Promises, por eso en los tests se usa
> `await render(...)` y `await fireEvent.press(...)`.

### Cobertura

| Archivo | Qué prueba |
|---|---|
| `src/services/__tests__/api.test.ts` | GET/POST/DELETE, URL y método, forma `{ uri, name, type }` del `photo` (regresión del bug de FormData), mensajes de error del backend, `withApiUrl` |
| `src/utils/__tests__/outfit.test.ts` | `buildOutfitSlots` (prenda por zona, id inexistente) y `countOutfitSlots` (n/4) |
| `src/components/__tests__/OutfitBar.test.tsx` | Título, contador, "Sin prenda"/"Sin foto", ✕ solo con prenda, callback `onRemove` |
| `__tests__/photo-flow.test.tsx` | Flujo completo con mocks de `expo-image-picker`/`expo-image-manipulator`: permiso denegado, cancelar, éxito (comprime, sube y recarga) y fallo con mensaje del backend |

### Resultado

```text
Test Suites: 4 passed, 4 total
Tests:       23 passed, 23 total
```

Verificación de tipos: `npx tsc --noEmit` sin errores.

## 4. Refactor para testear

Para poder testear sin depender del componente gigante:

- `src/utils/outfit.ts`: `buildOutfitSlots`, `countOutfitSlots` (lógica pura).
- `src/components/OutfitBar.tsx`: barra "Tu outfit" presentacional con
  `testID`s (`outfit-bar`, `outfit-count`, `outfit-slot-*`,
  `outfit-remove-*`).
- `App.tsx`: usa ambos y agrega `testID`s en las tarjetas
  (`garment-card-*`, `garment-check-*`) y en el botón de foto
  (`add-photo-button`).

## 5. Pendientes

- Migrar `manipulateAsync` a la API nueva de `expo-image-manipulator`.
- Agregar el plugin de `expo-image-picker` a `app.json` para builds nativos.
- Considerar un test que corra en dispositivo/CI con el `.env` real (los
  tests actuales mockean `fetch`, por eso no cubren el bug de Expo fetch).
