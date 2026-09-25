import { ImageSourcePropType } from 'react-native';

export interface ClothingItem {
  id: string;
  uri: ImageSourcePropType;
  label: string;
}
 
export interface ClothingCategory {
  id: string;
  title: string;
  items: ClothingItem[];
}
 
export interface SelectedClothing {
  [key: string]: string | null;
}