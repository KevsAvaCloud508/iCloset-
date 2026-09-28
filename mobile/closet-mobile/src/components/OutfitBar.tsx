import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../theme/theme';
import type { BodyPart } from '../services/api';
import type { OutfitSlot } from '../utils/outfit';

type OutfitBarProps = {
  slots: OutfitSlot[];
  count: number;
  bottomInset: number;
  onRemove: (part: BodyPart) => void;
};

const TOTAL_PARTS = 4;

/*
  Barra fija "Tu outfit": muestra la prenda elegida en cada zona del
  cuerpo, el contador n/4 y un ✕ por slot para quitar la selección.
  Es solo presentacional; el estado vive en App.tsx.
*/
export default function OutfitBar({ slots, count, bottomInset, onRemove }: OutfitBarProps) {
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(bottomInset, 12) }]}
      testID="outfit-bar"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Tu outfit</Text>
        <Text style={styles.count} testID="outfit-count">
          {count}/{TOTAL_PARTS}
        </Text>
      </View>

      <View style={styles.grid}>
        {slots.map(({ part, garment }) => (
          <View key={part.value} style={styles.slot} testID={`outfit-slot-${part.value}`}>
            {garment?.imageUrl ? (
              <Image
                source={{ uri: garment.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.placeholder]}>
                <Text style={styles.placeholderText}>
                  {garment ? 'Sin foto' : 'Sin prenda'}
                </Text>
              </View>
            )}

            {garment && (
              <TouchableOpacity
                onPress={() => onRemove(part.value)}
                style={styles.remove}
                testID={`outfit-remove-${part.value}`}
                accessibilityLabel={`Quitar prenda de ${part.label}`}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.slotLabel}>{part.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.outfitBarBg,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: colors.outfitBarText,
    fontFamily: 'SpaceMono-Bold',
    fontSize: 15,
    fontWeight: '700',
  },
  count: {
    color: colors.outfitBarTextMuted,
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: colors.wall,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.line,
  },
  placeholderText: {
    color: colors.outfitBarTextMuted,
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    textAlign: 'center',
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: colors.card,
    fontSize: 9,
    fontWeight: '700',
  },
  slotLabel: {
    color: colors.outfitBarTextMuted,
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
});
