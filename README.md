# ICloset

Aplicación móvil para organizar prendas por zona del cuerpo y crear outfits.

## Estructura del proyecto

```text
ICloset/
├── backend/
│   └── Closet.Api/       # API .NET, SQLite y conexión con Azure Blob
└── mobile/
    └── closet-mobile/    # Aplicación React Native con Expo
```

## Tecnologías

- API: .NET 10 (ASP.NET Core Minimal APIs + Swagger)
- Base de datos: SQLite, archivo local `closet.db`
- Fotos: Azure Blob Storage, contenedor `garments`
- App móvil: React Native y Expo (SDK 57)
- Pruebas: Jest + React Native Testing Library

## Datos de una prenda

La API usa el modelo `Garment` con estos campos:

- `Id`
- `Name`
- `BodyPart`: `Head`, `Torso`, `Legs` o `Feet`
- `FileName`: nombre del archivo de imagen almacenado en Blob
- `CreatedAtUtc`: fecha de creación en UTC

SQLite guarda los datos de la prenda y el nombre de su imagen. Azure Blob almacena el archivo de imagen.

## Requisitos

- SDK de .NET 10
- Node.js ≥ 20.19.4 (lo exige React Native 0.86.3) y npm
- Expo Go para probar la app en un celular
- Una cuenta de Azure Storage con un contenedor privado llamado `garments`

## Ejecutar el backend

Desde la carpeta del proyecto de la API:

```bash
cd backend/Closet.Api
dotnet restore
dotnet run
```

La primera ejecución crea el archivo SQLite y un registro de prueba si la tabla está vacía. La dirección y el puerto aparecen en la terminal. Abre `/swagger` en esa dirección para consultar la documentación de la API.

Por ejemplo, si la terminal indica el puerto `5005`:

```text
http://localhost:5005/swagger
```

### Configurar Azure Blob localmente

El backend lee la cadena de conexión de Azure desde .NET User Secrets. Desde `backend/Closet.Api`, ejecuta una vez:

```bash
dotnet user-secrets init
```

Luego guarda la cadena de conexión:

```bash
dotnet user-secrets set "ConnectionStrings:BlobStorage" "PEGA_AQUI_LA_CADENA_DE_CONEXION"
```

Reemplaza el texto de ejemplo por la cadena de conexión de Azure. No la agregues a `appsettings.json`, al código ni al repositorio.

La configuración de SQLite está en `appsettings.json`. No compartas el archivo `closet.db` como sustituto de Azure Blob: contiene datos locales de desarrollo.

## Ejecutar la app móvil

Desde la carpeta del proyecto Expo:

```bash
cd mobile/closet-mobile
npm install
npm start
```

`npm start` (y `npm run ios` / `npm run android`) ya activan la variable
`EXPO_PUBLIC_USE_RN_FETCH=1`, necesaria para que la subida de fotos funcione.
Si prefieres `npx expo start` directo, copia `.env.example` a `.env` y usa
`--clear` la primera vez.

Escanea el código QR con Expo Go. La app y el backend se ejecutan por separado.

Para que un celular pueda comunicarse con el backend, ambos deben estar en la
misma red Wi-Fi. Define la IP local de la computadora que ejecuta la API en
`mobile/closet-mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:5005
```

### Pruebas

```bash
cd mobile/closet-mobile
npm test          # 4 suites, 33 tests
npx tsc --noEmit  # chequeo de tipos
```

Si algo falla, revisa `mobile/closet-mobile/docs/SOLUCION-PROBLEMAS.md`.

## Estado actual

- El backend crea SQLite, un registro de prueba y el contenedor `garments`.
- Endpoints reales: `GET /api/garments`, `POST /api/garments` (foto multipart)
  y `DELETE /api/garments/{id}` con `GET /api/test` de diagnóstico.
- La app móvil lista las prendas en 4 carruseles por zona, permite tomar foto
  y subirla, borrar con presión larga, ver la palomita de selección y armar el
  outfit en la barra "Tu outfit".
- Tests de la app: 4 suites / 33 tests.
- Pendiente: cámara propia con `expo-camera` y guardar outfits como entidad.

## Documentación

- `mobile/closet-mobile/docs/P4-RESUMEN.md`: errores encontrados, correcciones
  y funcionalidad de P4.
- `mobile/closet-mobile/docs/SOLUCION-PROBLEMAS.md`: guía de fallos comunes
  (Node, .NET, Azure, red, FormData).

## Trabajo en equipo

- Ejecuta una sola instancia del backend cuando el equipo quiera probar con la misma base SQLite.
- Los demás dispositivos se conectan a la IP local de esa computadora.
- No subas `node_modules`, `.expo`, `bin`, `obj`, bases de datos locales ni secretos de Azure. El `.gitignore` de la raíz debe excluirlos.
