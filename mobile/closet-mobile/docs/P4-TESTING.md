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

## 2. IP del backend configurable y timeout

**Síntoma relacionado:** la app se queda "Guardando…" 30 s o más. No es que
tarde en comprimir/subir: es que el celular intenta llegar a una IP que ya no
existe y espera el timeout TCP del sistema (30-75 s).

**Cambios:**

- `API_URL` ahora vive en `src/services/api.ts` y se puede sobreescribir con
  `EXPO_PUBLIC_API_URL` (badge en `.env`):
  ```bash
  # obtener la IP actual de la PC (macOS)
  ipconfig getifaddr en0
  # en .env
  EXPO_PUBLIC_API_URL=http://TU_IP:5005
  ```
  Si no se define, usa el default `http://192.168.0.98:5005`. Así ya no hay
  que editar código cuando cambia la red.
- Todas las peticiones usan `fetchWithTimeout` (30 s, `AbortController`). Si
  el backend no responde, falla rápido con un mensaje claro en vez de dejar
  la app colgada.

**Cómo diagnosticar un "se queda guardando":**

1. Compara la IP del celular/backend: `ipconfig getifaddr en0` contra
   `EXPO_PUBLIC_API_URL`.
2. Abre en el navegador del celular `http://TU_IP:5005/swagger`. Si no abre,
   es red (IP equivocada, backend apagado, u otra Wi-Fi/firewall), no código.
3. Si el request sí llega al backend y se queda, el cuello de botella es
   Azure Blob (credencial/red).

## 3. Problemas secundarios detectados

| Problema | Estado |
|---|---|
| `api.ts` ocultaba el mensaje del backend | Corregido (`buildError`) |
| `app.json` no lista el plugin de `expo-image-picker` | Pendiente; en Expo Go no afecta, en build nativo puede faltar permiso |
| `ImageManipulator.manipulateAsync` está deprecado en SDK 57 | Funciona; pendiente migrar a `ImageManipulator.manipulate`/`useImageManipulator` |
| Falta `.env` documentado | Corregido con `.env.example` |
| IP del backend hardcodeada | Corregido con `EXPO_PUBLIC_API_URL` |
| Peticiones sin timeout (app colgada) | Corregido con `fetchWithTimeout` (30 s) |

## 4. Tests

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
| `src/services/__tests__/api.test.ts` | GET/POST/DELETE, URL y método, forma `{ uri, name, type }` del `photo` (regresión del bug de FormData), mensajes de error del backend, timeout 30 s (`AbortController`), `withApiUrl` |
| `src/utils/__tests__/outfit.test.ts` | `buildOutfitSlots` (prenda por zona, id inexistente), `countOutfitSlots` (n/4) y `reconcileSelectedIds` (zona descartada, prenda borrada, mantener selección) |
| `src/components/__tests__/OutfitBar.test.tsx` | Título, contador, "Sin prenda"/"Sin foto", ✕ solo con prenda, callback `onRemove` |
| `__tests__/photo-flow.test.tsx` | Gate de fuentes, permiso denegado, cancelar, doble toque (solo abre la cámara una vez), éxito (comprime con la API nueva, sube y recarga), fallo con mensaje del backend, recarga fallida con un solo alert, etiqueta accesible de las tarjetas |

### Resultado

```text
Test Suites: 4 passed, 4 total
Tests:       33 passed, 33 total
```

Verificación de tipos: `npx tsc --noEmit` sin errores.

## 5. Refactor para testear

Para poder testear sin depender del componente gigante:

- `src/utils/outfit.ts`: `buildOutfitSlots`, `countOutfitSlots`,
  `reconcileSelectedIds` (lógica pura).
- `src/components/OutfitBar.tsx`: barra "Tu outfit" presentacional con
  `testID`s (`outfit-bar`, `outfit-count`, `outfit-slot-*`,
  `outfit-remove-*`).
- `App.tsx`: usa ambos y agrega `testID`s en las tarjetas
  (`garment-card-*`, `garment-check-*`) y en el botón de foto
  (`add-photo-button`).

## 6. Pendientes

- Considerar un test que corra en dispositivo/CI con el `.env` real (los
  tests actuales mockean `fetch`, por eso no cubren el bug de Expo fetch).
- Verificación manual en celular de lo que no es automatizable (guardado real,
  jitter visual, plugin en build nativo). Ver `P4-REVISION.md`.
