import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from './src/theme/theme';
import ClosetCarousel from './src/components/ClosetCarousel';
 
const Tab = createBottomTabNavigator();
 
export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.rail,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.line,
            height: 60,
          },
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTitleStyle: {
            fontWeight: '700',
            color: colors.ink,
          },
        }}
      >
        <Tab.Screen
          name="Closet"
          component={ClosetCarousel}
          options={{ headerTitle: 'Mi Clóset' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}