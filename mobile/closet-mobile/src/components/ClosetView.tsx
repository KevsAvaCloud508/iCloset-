import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { spacing } from '../theme/theme';
import { ClothingCategory } from '../types';
import ClosetTab from './ClosetTab';
 
interface ClosetViewProps {
  categories: ClothingCategory[];
  selected: Record<string, string | null>;
  onSelect: (zone: string, itemId: string) => void;
  onDelete: (zone: string, itemId: string) => void;
}
 
const ClosetView: React.FC<ClosetViewProps> = ({
  categories,
  selected,
  onSelect,
  onDelete,
}) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {categories.map((category) => (
        <ClosetTab
          key={category.id}
          title={category.title}
          items={category.items}
          selectedId={selected[category.id]}
          onSelect={(itemId) => onSelect(category.id, itemId)}
          onDelete={(itemId) => onDelete(category.id, itemId)}
        />
      ))}
    </ScrollView>
  );
};
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
});
 
export default ClosetView;