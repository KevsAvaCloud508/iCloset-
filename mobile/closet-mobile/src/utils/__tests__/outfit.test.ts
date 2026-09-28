import {
  buildOutfitSlots,
  countOutfitSlots,
  reconcileSelectedIds,
  type OutfitPart,
} from '../outfit';
import type { BodyPart, Garment } from '../../services/api';

const BODY_PARTS: OutfitPart[] = [
  { value: 'Head', label: 'Cabeza' },
  { value: 'Torso', label: 'Torso' },
  { value: 'Legs', label: 'Piernas' },
  { value: 'Feet', label: 'Pies' },
];

function makeGarment(id: number, bodyPart: BodyPart): Garment {
  return {
    id,
    name: `Prenda ${id}`,
    bodyPart,
    fileName: `${id}.jpg`,
    createdAtUtc: '2026-09-28T00:00:00Z',
    imageUrl: `https://blob.example/${id}.jpg?sas`,
  };
}

const EMPTY = { Head: null, Torso: null, Legs: null, Feet: null } as Record<
  BodyPart,
  number | null
>;

describe('buildOutfitSlots', () => {
  it('coloca la prenda seleccionada en su zona', () => {
    const garments = [makeGarment(1, 'Head'), makeGarment(2, 'Torso')];
    const slots = buildOutfitSlots(garments, { ...EMPTY, Head: 1 }, BODY_PARTS);

    expect(slots).toHaveLength(4);
    expect(slots[0].part.value).toBe('Head');
    expect(slots[0].garment?.id).toBe(1);
    expect(slots[1].garment).toBeNull();
    expect(slots[2].garment).toBeNull();
    expect(slots[3].garment).toBeNull();
  });

  it('deja el slot vacío si el id seleccionado ya no existe', () => {
    const slots = buildOutfitSlots([], { ...EMPTY, Torso: 42 }, BODY_PARTS);

    expect(slots[1].garment).toBeNull();
  });
});

describe('countOutfitSlots', () => {
  it('cuenta solo las zonas con prenda', () => {
    const garments = [makeGarment(1, 'Head'), makeGarment(2, 'Legs')];
    const slots = buildOutfitSlots(garments, { ...EMPTY, Head: 1, Legs: 2 }, BODY_PARTS);

    expect(countOutfitSlots(slots)).toBe(2);
  });

  it('devuelve 0 con el outfit vacío', () => {
    expect(countOutfitSlots(buildOutfitSlots([], EMPTY, BODY_PARTS))).toBe(0);
  });
});

describe('reconcileSelectedIds', () => {
  it('respeta las zonas que el usuario quitó con el ✕', () => {
    const garments = [makeGarment(1, 'Torso')];
    const cleared = new Set<BodyPart>(['Torso']);

    const result = reconcileSelectedIds(garments, EMPTY, cleared, BODY_PARTS);

    expect(result.Torso).toBeNull();
  });

  it('auto-selecciona la primera prenda si no había selección', () => {
    const garments = [makeGarment(5, 'Head'), makeGarment(6, 'Head')];

    const result = reconcileSelectedIds(garments, EMPTY, new Set(), BODY_PARTS);

    expect(result.Head).toBe(5);
    expect(result.Torso).toBeNull();
  });

  it('mantiene la selección actual si la prenda sigue existiendo', () => {
    const garments = [makeGarment(5, 'Head'), makeGarment(6, 'Head')];

    const result = reconcileSelectedIds(
      garments,
      { ...EMPTY, Head: 6 },
      new Set(),
      BODY_PARTS
    );

    expect(result.Head).toBe(6);
  });

  it('reemplaza la selección si la prenda fue borrada', () => {
    const garments = [makeGarment(7, 'Legs')];

    const result = reconcileSelectedIds(
      garments,
      { ...EMPTY, Legs: 99 },
      new Set(),
      BODY_PARTS
    );

    expect(result.Legs).toBe(7);
  });

  it('deja vacío si la zona no tiene prendas', () => {
    const result = reconcileSelectedIds([], EMPTY, new Set(), BODY_PARTS);

    expect(result).toEqual(EMPTY);
  });
});
