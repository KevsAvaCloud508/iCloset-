import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme/theme';
import { ClothingCategory, SelectedClothing } from '../types';
 
interface OutfitBarProps {
  categories: ClothingCategory[];
  selected: SelectedClothing;
  onDelete: (zone: string, itemId: string) => void;
}
 
const OutfitBar: React.FC<OutfitBarProps> = ({ categories, selected, onDelete }) => {
  const zones = categories.map((category) => ({
    id: category.id,
    title: category.title,
    items: category.items,
  }));
 
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tu outfit</Text>
        <Text style={styles.headerSubtitle}>
          {Object.values(selected).filter(Boolean).length}/4
        </Text>
      </View>
      <View style={styles.grid}>
        {zones.map((zone) => {
          const itemId = selected[zone.id];
          const item = zone.items.find((i) => i.id === itemId) ?? null;
          return (
            <View key={zone.id} style={styles.card}>
              {item ? (
                <Image source={item.uri} style={styles.image} />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>Sin prenda</Text>
                </View>
              )}
              <Text style={styles.label}>{zone.title}</Text>
              {item && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onDelete(zone.id, item.id)}
                >
                  <Text style={styles.deleteIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};
 
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    padding: spacing.md,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.wall,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    minWidth: 0,
  },
  image: {
    width: '100%',
    maxWidth: 48,
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    maxWidth: 48,
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.card,
  },
});
 
export default OutfitBar;