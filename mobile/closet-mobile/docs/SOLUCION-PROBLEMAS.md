# Solución de problemas — iCloset

Guía rápida para cuando algo falla al levantar el backend o la app. Si tu
problema no está aquí, revisa `P4-RESUMEN.md` y avisa al equipo.

## Requisitos antes de empezar

| Herramienta | Versión | Cómo verificar |
|---|---|---|
| Node.js | **≥ 20.19.4** (probado con 22 y 26) | `node -v` |
| SDK de .NET | **10** (el backend es `net10.0`) | `dotnet --list-sdks` |
| Expo Go | última de la tienda | — |

En la carpeta `mobile/closet-mobile` hay un `.nvmrc` con `22`. Si usas
nvm/fnm: `nvm use` o `fnm use`.

---

## 1. `npm start` falla o `expo` no arranca

**Causa:** Node viejo. React Native 0.86.3 exige
`^20.19.4 || ^22.13.0 || ^24.3.0 || >=25`.

**Arreglo:**
```bash
node -v            # si es < 20.19.4, actualiza
nvm install 22 && nvm use 22
# o con fnm:
fnm install 22 && fnm use 22
```
Después:
```bash
cd mobile/closet-mobile
rm -rf node_modules
npm install
npm start
```

---

## 2. `dotnet run` dice `Falta ConnectionStrings:BlobStorage`

**Causa:** nadie configuró la cadena de Azure en tu máquina. Es un secreto y
**no** está en el repo.

**Arreglo** (pide la cadena a quien la tenga, con `AccountKey`, no una SAS):
```bash
cd backend/Closet.Api
dotnet user-secrets set "ConnectionStrings:BlobStorage" "DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
dotnet run
```
Si la cuenta de Azure expiró, `dotnet run` fallará al conectar; hay que
renovarla o pedir una nueva.

---

## 3. `dotnet run` falla por la versión del SDK

**Causa:** el proyecto es **.NET 10** (`net10.0`) y solo tienes el SDK 8.

**Arreglo:** instala el SDK de .NET 10 y verifica:
```bash
dotnet --list-sdks   # debe aparecer 10.x
```

---

## 4. Al guardar la foto: `Unsupported FormDataPart implementation`

**Causa:** la app no está usando el fetch nativo de React Native. Pasa cuando
se arranca con `npx expo start` sin la variable `EXPO_PUBLIC_USE_RN_FETCH=1`.

**Arreglo:**
- Usa `npm start` (los scripts ya activan la variable con `cross-env`), **o**
- Si quieres usar `npx expo start` directo:
  ```bash
  cd mobile/closet-mobile
  cp .env.example .env
  npx expo start --clear
  ```
  El `--clear` es obligatorio la primera vez: la variable se inlinea al
  compilar y con caché vieja de Metro no se aplica.

---

## 5. La app se queda "Guardando…" o `Network request failed`

**Causa:** el celular no encuentra el backend (IP equivocada, backend
apagado, otra Wi-Fi o firewall). Ahora la petición falla con mensaje a los
30 s en lugar de colgarse.

**Diagnóstico:**
1. Mira la IP real de la PC que corre el backend:
   ```bash
   # macOS
   ipconfig getifaddr en0
   # Windows
   ipconfig
   ```
2. Debe coincidir con `EXPO_PUBLIC_API_URL` en `mobile/closet-mobile/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://TU_IP:5005
   ```
3. Desde el navegador del **celular**, abre `http://TU_IP:5005/swagger`.
   - Si **no** abre: es red. Confirma misma Wi-Fi, backend corriendo en
     `http://0.0.0.0:5005` y firewall permitiendo el puerto 5005.
   - Si **sí** abre: el problema es la app; revisa que reiniciaste con
     `--clear`.
4. Si el request llega al backend y ahí se queda, el cuello de botella es
   Azure Blob (cuenta/credencial/red).

---

## 6. Tests o instalación de dependencias

```bash
cd mobile/closet-mobile
npm install          # requiere Node ≥ 20.19.4
npm test             # 33 tests, 4 suites
npx tsc --noEmit     # chequeo de tipos
```
Si `npm install` falla por versiones, verifica el paso 1 y borra
`node_modules` + `package-lock.json` solo como último recurso (el lock está
versionado; no lo borres sin avisar).

---

## 7. Antes de tocar el repo del profe (`ISC09UPA/ISC09A`)

El repo del profesor tiene un **scaffold vacío en .NET 10**. Nuestro código
real reemplaza ese scaffold (no se "agrega" encima). Coordina con **P5**
(encargado del repo) antes de subirlo, porque cambia la base para todo el
equipo. El backend coincide en .NET 10, así que no hay que bajar de versión.

---

## Comandos de referencia

```bash
# Backend
cd backend/Closet.Api && dotnet run          # http://0.0.0.0:5005

# Mobile
cd mobile/closet-mobile
npm install
npm start -- --clear                         # primera vez
npm test
npx expo config --type public                # ver plugins/permisos
```
