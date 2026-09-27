export type BodyPart = 'Head' | 'Torso' | 'Legs' | 'Feet';

export type Garment = {
    id: number;
    name: string;
    bodyPart: BodyPart;
    fileName: string | null;
    createdAtUtc: string;
    imageUrl: string | null;
};

export function withApiUrl(url: string) {
  return {
    getGarments: () => getGarments(url),
    uploadGarment: (name: string, bodyPart: BodyPart, asset: { uri: string; fileName?: string | null; mimeType?: string | null }) => uploadGarment(name, bodyPart, url, asset),
    deleteGarment: (id: number) => deleteGarment(id, url),
  };
}

export async function getGarments(url: string = 'http://192.168.0.98:5005'): Promise<Garment[]> {
    const response = await fetch(`${url}/api/garments`);

    if (!response.ok) {
        throw new Error(`Error al cargar prendas: ${response.status}`);
    }

    return response.json();
}

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
        throw new Error(`Error al subir prenda: ${response.status}`);
    }
}

export async function deleteGarment(id: number, url: string = 'http://192.168.0.98:5005'): Promise<void> {
    const response = await fetch(`${url}/api/garments/${id}`, {
        method: 'DELETE',
    } as RequestInit);

    if (!response.ok) {
        throw new Error(`Error al borrar prenda: ${response.status}`);
    }
}
