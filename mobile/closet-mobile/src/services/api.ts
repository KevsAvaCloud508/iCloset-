/*
  ============================================================
  CLIENTE DE LA API (backend .NET + Azure Blob Storage)
  ============================================================
  POR QUÉ FUNCIONA LA SUBIDA DE FOTOS (fix importante):
  Expo SDK 57 reemplaza el fetch global por uno propio
  (WinterCG) que NO soporta archivos locales en FormData y lanza
  "Unsupported FormDataPart implementation" /
  "Cannot read property 'prototype' of undefined".

  Solución: la variable EXPO_PUBLIC_USE_RN_FETCH=1. Los scripts de
  npm (start/android/ios) ya la activan con cross-env, así que basta
  "npm start". Si arrancas con "npx expo start" directo, copia
  .env.example a .env y usa --clear.
*/

export type BodyPart = 'Head' | 'Torso' | 'Legs' | 'Feet';

export type Garment = {
    id: number;
    name: string;
    bodyPart: BodyPart;
    fileName: string | null;
    createdAtUtc: string;
    imageUrl: string | null;
};

/*
  URL del backend. Por defecto la IP local histórica del equipo, pero
  se puede sobreescribir con EXPO_PUBLIC_API_URL (por ejemplo en .env):
      EXPO_PUBLIC_API_URL=http://10.0.0.5:5005
  Así no hay que editar el código cada vez que cambia la IP de la PC.
*/
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.98:5005';

/*
  Tiempo máximo por petición. Si el backend no responde (IP equivocada,
  apagado o en otra red) abortamos rápido con un mensaje claro, en vez
  de esperar el timeout TCP del sistema (30-75 s) con la app "colgada".
*/
const REQUEST_TIMEOUT_MS = 15000;

/*
  fetch con timeout usando AbortController. Si se cumple el límite,
  devolvemos un Error entendible para el usuario.
*/
async function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error(
                `La conexión tardó más de ${REQUEST_TIMEOUT_MS / 1000} s. Revisa que el backend esté corriendo y que la IP (EXPO_PUBLIC_API_URL) sea correcta.`
            );
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

/*
  Todas las funciones aceptan la URL del backend como parámetro
  (por defecto la IP local de la PC). withApiUrl devuelve un
  helper con la URL fija, por si se prefiere configurar una
  sola vez (App.tsx hoy usa las funciones directas).
*/
export function withApiUrl(url: string) {
  return {
    getGarments: () => getGarments(url),
    uploadGarment: (name: string, bodyPart: BodyPart, asset: { uri: string; fileName?: string | null; mimeType?: string | null }) => uploadGarment(name, bodyPart, url, asset),
    deleteGarment: (id: number) => deleteGarment(id, url),
  };
}

/*
  Construye el error leyendo el mensaje que devuelve el backend
  (texto plano, por ejemplo "La foto debe pesar entre 1 byte y 5 MB").
  Si no se puede leer, usa el mensaje con el status HTTP.
*/
async function buildError(response: Response, fallback: string): Promise<Error> {
    let detail = '';

    try {
        detail = (await response.text()).trim();
    } catch {
        detail = '';
    }

    return new Error(detail || `${fallback}: ${response.status}`);
}

/* GET /api/garments — devuelve todas las prendas con su URL de foto en Azure. */
export async function getGarments(url: string = API_URL): Promise<Garment[]> {
    const response = await fetchWithTimeout(`${url}/api/garments`);

    if (!response.ok) {
        throw await buildError(response, 'Error al cargar prendas');
    }

    return response.json();
}

/*
  Convierte el asset que viene del ImagePicker/ImageManipulator
  al formato que React Native espera para ARCHIVOS en FormData:
  { uri: ruta local de la foto, name: nombre de archivo,
    type: tipo MIME }. El backend recibe estos tres campos como
  el IFormFile "photo" y con eso guarda el blob en Azure.
*/
function buildPhotoAsset(
    asset: { uri: string; fileName?: string | null; mimeType?: string | null }
) {
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const extension =
        mimeType === 'image/png' ? 'png'
            : mimeType === 'image/webp' ? 'webp'
            : 'jpg';

    return {
        uri: asset.uri ?? '',
        name: asset.fileName ?? `prenda-${Date.now()}.${extension}`,
        type: mimeType,
    };
}

/*
  POST /api/garments — multipart/form-data con:
    name     → nombre de la prenda
    bodyPart → parte del cuerpo ('Head' | 'Torso' | 'Legs' | 'Feet')
    photo    → archivo { uri, name, type } (ver buildPhotoAsset)
  Devuelve 201 del backend; la foto ya quedó en Azure y la BD
  guarda su URL pública.
*/
export async function uploadGarment(
    name: string,
    bodyPart: BodyPart,
    url: string = API_URL,
    asset: { uri: string; fileName?: string | null; mimeType?: string | null }
): Promise<void> {
    const photo = buildPhotoAsset(asset);
    const form = new FormData();
    form.append('name', name);
    form.append('bodyPart', bodyPart);
    form.append('photo', photo as unknown as string);

    const response = await fetchWithTimeout(`${url}/api/garments`, {
        method: 'POST',
        body: form,
    });

    if (!response.ok) {
        throw await buildError(response, 'Error al subir prenda');
    }
}

/* DELETE /api/garments/{id} — borra el registro y su foto en Azure. */
export async function deleteGarment(id: number, url: string = API_URL): Promise<void> {
    const response = await fetchWithTimeout(`${url}/api/garments/${id}`, {
        method: 'DELETE',
    } as RequestInit);

    if (!response.ok) {
        throw await buildError(response, 'Error al borrar prenda');
    }
}
