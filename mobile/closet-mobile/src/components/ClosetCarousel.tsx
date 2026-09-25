import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, spacing } from '../theme/theme';
import { ClothingCategory, ClothingItem } from '../types';
import ClosetView from './ClosetView';
import OutfitBar from './OutfitBar';
 
const ZONE_TITLES: Record<string, string> = {
  head: 'Cabeza',
  torso: 'Torso',
  legs: 'Piernas',
  feet: 'Pies',
};
 
const ZONE_ITEMS: Record<string, ClothingItem[]> = {
  head: [
    { id: 'head-1', uri: require('../../assets/demo/head/head_1.png'), label: 'Cachuca' },
    { id: 'head-2', uri: require('../../assets/demo/head/head_2.png'), label: 'Sombrero' },
    { id: 'head-3', uri: require('../../assets/demo/head/head_3.png'), label: 'Gorro URSS' },
  ],
  torso: [
    { id: 'torso-1', uri: require('../../assets/demo/torso/torso_1.jpg'), label: 'Camisa' },
    { id: 'torso-2', uri: require('../../assets/demo/torso/torso_2.jpg'), label: 'Suéter' },
    { id: 'torso-3', uri: require('../../assets/demo/torso/torso_3.jpg'), label: 'Gymfit' },
  ],
  legs: [
    { id: 'legs-1', uri: require('../../assets/demo/legs/legs_1.png'), label: 'Pantalon' },
    { id: 'legs-2', uri: require('../../assets/demo/legs/legs_2.jpg'), label: 'Pants' },
    { id: 'legs-3', uri: require('../../assets/demo/legs/legs_3.png'), label: 'Pijama' },
  ],
  feet: [
    { id: 'feet-1', uri: require('../../assets/demo/feet/feet_1.png'), label: 'Zapatos' },
    { id: 'feet-2', uri: require('../../assets/demo/feet/feet_2.png'), label: 'Tenis' },
    { id: 'feet-3', uri: require('../../assets/demo/feet/feet_3.png'), label: 'Jordans' },
  ],
};
 
const categories: ClothingCategory[] = [
  { id: 'head', title: ZONE_TITLES.head, items: ZONE_ITEMS.head },
  { id: 'torso', title: ZONE_TITLES.torso, items: ZONE_ITEMS.torso },
  { id: 'legs', title: ZONE_TITLES.legs, items: ZONE_ITEMS.legs },
  { id: 'feet', title: ZONE_TITLES.feet, items: ZONE_ITEMS.feet },
];
 
const ClosetCarousel: React.FC = () => {
  const [selected, setSelected] = useState<Record<string, string | null>>({
    head: null,
    torso: null,
    legs: null,
    feet: null,
  });
 
  const handleSelect = (zone: string, itemId: string) => {
    setSelected((prev) => ({ ...prev, [zone]: itemId }));
  };
 
  const handleDelete = (zone: string, itemId: string) => {
    // Solo limpia la selección si la prenda borrada era la seleccionada.
    setSelected((prev) =>
      prev[zone] === itemId ? { ...prev, [zone]: null } : prev,
    );
  };
 
  return (
    <GestureHandlerRootView style={styles.container}>
      <ClosetView
        categories={categories}
        selected={selected}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />
      <OutfitBar
        categories={categories}
        selected={selected}
        onDelete={handleDelete}
      />
    </GestureHandlerRootView>
  );
};
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.wall,
  },
});
 
export default ClosetCarousel;