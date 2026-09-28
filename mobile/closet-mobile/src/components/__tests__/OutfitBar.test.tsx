import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import OutfitBar from '../OutfitBar';
import type { OutfitSlot } from '../../utils/outfit';

const slots: OutfitSlot[] = [
  {
    part: { value: 'Head', label: 'Cabeza' },
    garment: {
      id: 1,
      name: 'Gorra',
      bodyPart: 'Head',
      fileName: '1.jpg',
      createdAtUtc: '2026-09-28T00:00:00Z',
      imageUrl: 'https://blob.example/1.jpg?sas',
    },
  },
  { part: { value: 'Torso', label: 'Torso' }, garment: null },
  {
    part: { value: 'Legs', label: 'Piernas' },
    garment: {
      id: 3,
      name: 'Pantalón',
      bodyPart: 'Legs',
      fileName: '3.jpg',
      createdAtUtc: '2026-09-28T00:00:00Z',
      imageUrl: null,
    },
  },
  { part: { value: 'Feet', label: 'Pies' }, garment: null },
];

function renderBar(overrides: Partial<React.ComponentProps<typeof OutfitBar>> = {}) {
  const onRemove = jest.fn();

  return render(
    <OutfitBar
      slots={slots}
      count={1}
      bottomInset={0}
      onRemove={onRemove}
      {...overrides}
    />
  ).then(() => ({ onRemove }));
}

describe('OutfitBar', () => {
  it('muestra el título y el contador n/4', async () => {
    await renderBar({ count: 2 });

    expect(screen.getByText('Tu outfit')).toBeTruthy();
    expect(screen.getByTestId('outfit-count')).toHaveTextContent('2/4');
  });

  it('muestra los 4 slots con su etiqueta de zona', async () => {
    await renderBar();

    expect(screen.getByTestId('outfit-slot-Head')).toBeTruthy();
    expect(screen.getByTestId('outfit-slot-Torso')).toBeTruthy();
    expect(screen.getByTestId('outfit-slot-Legs')).toBeTruthy();
    expect(screen.getByTestId('outfit-slot-Feet')).toBeTruthy();
    expect(screen.getAllByText(/Cabeza|Torso|Piernas|Pies/)).toHaveLength(4);
  });

  it('muestra "Sin prenda" cuando la zona está vacía', async () => {
    await renderBar();

    expect(screen.getAllByText('Sin prenda')).toHaveLength(2);
  });

  it('muestra "Sin foto" cuando la prenda no tiene imagen', async () => {
    await renderBar();

    expect(screen.getByText('Sin foto')).toBeTruthy();
  });

  it('solo muestra el ✕ en slots con prenda', async () => {
    await renderBar();

    expect(screen.getByTestId('outfit-remove-Head')).toBeTruthy();
    expect(screen.queryByTestId('outfit-remove-Torso')).toBeNull();
  });

  it('llama onRemove con la zona al presionar el ✕', async () => {
    const { onRemove } = await renderBar();

    await fireEvent.press(screen.getByTestId('outfit-remove-Head'));

    expect(onRemove).toHaveBeenCalledWith('Head');
  });
});
