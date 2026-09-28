/*
  ============================================================
  CLIENTE DE LA API (backend .NET + Azure Blob Storage)
  ============================================================
  POR QUÉ FUNCIONA LA SUBIDA DE FOTOS (fix importante):
  Expo SDK 57 reemplaza el fetch global por uno propio
  (WinterCG) que NO soporta archivos locales en FormData y lanza
  "Unsupported FormDataPart implementation" /
  "Cannot read property 'prototype' of undefined".

  Solución: el .env de este proyecto define
      EXPO_PUBLIC_USE_RN_FETCH=1
  Con eso Expo deja instalado su fetch y usa el NATIVO de React
  Native, que sí construye bien las partes { uri, name, type }.
  Si el .env desaparece o se corre "expo start" sin --clear,
  la subida de fotos vuelve a fallar.
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
export async function getGarments(url: string = 'http://192.168.0.98:5005'): Promise<Garment[]> {
    const response = await fetch(`${url}/api/garments`);

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
    url: string = 'http://192.168.0.98:5005',
    asset: { uri: string; fileName?: string | null; mimeType?: string | null }
): Promise<void> {
    const photo = buildPhotoAsset(asset);
    const form = new FormData();
    form.append('name', name);
    form.append('bodyPart', bodyPart);
    form.append('photo', photo as unknown as string);

    const response = await fetch(`${url}/api/garments`, {
        method: 'POST',
        body: form,
    });

    if (!response.ok) {
        throw await buildError(response, 'Error al subir prenda');
    }
}

/* DELETE /api/garments/{id} — borra el registro y su foto en Azure. */
export async function deleteGarment(id: number, url: string = 'http://192.168.0.98:5005'): Promise<void> {
    const response = await fetch(`${url}/api/garments/${id}`, {
        method: 'DELETE',
    } as RequestInit);

    if (!response.ok) {
        throw await buildError(response, 'Error al borrar prenda');
    }
}
