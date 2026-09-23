import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './src/theme/theme';


export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mi clóset</Text>
      <Text style={styles.text}>¡Bienvenido!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.wall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 24, fontWeight: '700', color: colors.ink },
});
