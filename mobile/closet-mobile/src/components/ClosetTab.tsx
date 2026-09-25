import React, { useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, spacing } from '../theme/theme';
import { ClothingItem } from '../types';
import ClothingCard from './ClothingCard';

interface ClosetTabProps {
  title: string;
  items: ClothingItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const CARD_WIDTH = 100;
const CARD_GAP = spacing.md;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

const ClosetTab: React.FC<ClosetTabProps> = ({
  title,
  items,
  selectedId,
  onSelect,
  onDelete,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<ClothingItem>>(null);
  const sidePadding = (screenWidth - CARD_WIDTH) / 2;

  // Centra la tarjeta indicada respetando el snap (offset = índice * intervalo).
  const centerItem = (index: number) => {
    listRef.current?.scrollToOffset({
      offset: index * SNAP_INTERVAL,
      animated: true,
    });
  };

  // Al soltar el dedo, la prenda que quedó en el centro queda seleccionada.
  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    const clamped = Math.min(Math.max(index, 0), items.length - 1);
    const item = items[clamped];
    if (item && item.id !== selectedId) {
      onSelect(item.id);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        ref={listRef}
        data={items}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: sidePadding }]}
        renderItem={({ item, index }) => (
          <ClothingCard
            item={item}
            isSelected={selectedId === item.id}
            onSelect={() => {
              onSelect(item.id);
              centerItem(index);
            }}
            onDelete={() => onDelete(item.id)}
            style={styles.card}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    paddingHorizontal: spacing.xs,
  },
  listContent: {
    gap: CARD_GAP,
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
  },
});

export default ClosetTab;
