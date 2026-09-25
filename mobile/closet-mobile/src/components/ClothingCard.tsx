import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme/theme';
import { ClothingItem } from '../types';
 
interface ClothingCardProps {
  item: ClothingItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  style?: StyleProp<ViewStyle>;
}
 
const ClothingCard: React.FC<ClothingCardProps> = ({
  item,
  isSelected,
  onSelect,
  onDelete,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, style, isSelected && styles.containerSelected]}
      onPress={onSelect}
      onLongPress={onDelete}
    >
      <Image source={ item.uri } style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.label}>{item.label}</Text>
        {isSelected && <Text style={styles.badge}>Seleccionada</Text>}
      </View>
    </TouchableOpacity>
  );
};
 
const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    elevation: 3,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  containerSelected: {
    borderColor: colors.rail,
    backgroundColor: '#FFF8F0',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.card,
    resizeMode: 'contain',
  },
  content: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.rail,
    marginTop: 4,
  },
});
 
export default ClothingCard;