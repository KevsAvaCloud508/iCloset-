import type { BodyPart, Garment } from '../services/api';

export type OutfitPart = {
  value: BodyPart;
  label: string;
};

export type OutfitSlot = {
  part: OutfitPart;
  garment: Garment | null;
};

/*
  Arma los 4 slots de la barra "Tu outfit": por cada zona del cuerpo
  busca en las prendas la que está seleccionada en esa zona. Si el id
  seleccionado ya no existe (se borró), el slot queda vacío.
*/
export function buildOutfitSlots(
  garments: Garment[],
  selectedIds: Record<BodyPart, number | null>,
  bodyParts: OutfitPart[]
): OutfitSlot[] {
  return bodyParts.map((part) => ({
    part,
    garment:
      garments.find((garment) => garment.id === selectedIds[part.value]) ?? null,
  }));
}

/* Cuenta cuántas zonas del outfit tienen prenda seleccionada (para n/4). */
export function countOutfitSlots(slots: OutfitSlot[]): number {
  return slots.filter((slot) => slot.garment !== null).length;
}

/*
  Recalcula la selección de cada zona tras cargar/recargar prendas:
  - Si el usuario quitó la zona con el ✕ (`clearedParts`), se respeta el
    vacío y NO se vuelve a auto-seleccionar.
  - Si la prenda seleccionada ya no existe (se borró), se elige la primera
    disponible o queda vacío.
  - Si sigue existiendo, se mantiene la selección actual.
*/
export function reconcileSelectedIds(
  garments: Garment[],
  selectedIds: Record<BodyPart, number | null>,
  clearedParts: ReadonlySet<BodyPart>,
  bodyParts: OutfitPart[]
): Record<BodyPart, number | null> {
  const next = { ...selectedIds };

  for (const part of bodyParts) {
    if (clearedParts.has(part.value)) {
      next[part.value] = null;
      continue;
    }

    const items = garments.filter((garment) => garment.bodyPart === part.value);
    const currentStillExists = items.some(
      (garment) => garment.id === selectedIds[part.value]
    );

    if (!currentStillExists) {
      next[part.value] = items[0]?.id ?? null;
    }
  }

  return next;
}
