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
