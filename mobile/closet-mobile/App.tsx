import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';



import { colors } from './src/theme/theme';
import {
  deleteGarment,
  getGarments,
  uploadGarment,
  type BodyPart,
  type Garment,
} from './src/services/api';

import { useFonts, SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';


  


/*
  ============================================================
  CONFIGURACIÓN GLOBAL
  ============================================================
  - API_URL: IP local de la PC donde corre el backend .NET
    (dotnet run --urls=http://0.0.0.0:5005). El celular la
    alcanza porque ambos están en la misma red Wi-Fi.
  - BODY_PARTS: partes del cuerpo que acepta el backend (enum).
    El orden importa: el backend a veces devuelve la parte como
    número (0=Head, 1=Torso, 2=Legs, 3=Feet).
  - EMPTY_SELECTION: prenda seleccionada por parte del cuerpo
    (null = todavía no se eligió ninguna).
*/
const API_URL = 'http://192.168.0.98:5005';

const BODY_PARTS: { value: BodyPart; label: string }[] = [
  { value: 'Head', label: 'Cabeza' },
  { value: 'Torso', label: 'Torso' },
  { value: 'Legs', label: 'Piernas' },
  { value: 'Feet', label: 'Pies' },
];

const EMPTY_SELECTION: Record<BodyPart, number | null> = {
  Head: null,
  Torso: null,
  Legs: null,
  Feet: null,
};

/*
  ============================================================
  PANTALLA PRINCIPAL
  ============================================================
  - useSafeAreaInsets: dice cuánto ocupan el notch (arriba) y
    la barra de gestos (abajo) en CADA teléfono. Con eso el
    contenido nunca queda tapado, sin importar el modelo.
  - Tamaños proporcionales: la tarjeta mide 42% del ancho
    (máx. 170px) y la foto sigue la misma proporción, así el
    diseño escala bien en pantallas grandes y chicas.
*/
function ClosetApp() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // cardStep = salto exacto entre inicios de tarjeta: se usa
  // para el efecto "snap" del carrusel y para saber qué
  // tarjeta quedó centrada al terminar el scroll.
  const cardWidth = Math.min(170, width * 0.42);
  const cardStep = cardWidth + 12;
  const imageHeight = Math.round(cardWidth * 0.95);

  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedPart, setSelectedPart] = useState<BodyPart>('Torso');
  const [selectedIds, setSelectedIds] = useState<Record<BodyPart, number | null>>(EMPTY_SELECTION);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /*
    FUENTE: Space Mono (monoespaciada, estilo moderno que casa
    con el tema blanco/negro). Se carga en runtime con expo-font
    y los estilos la referencian como 'SpaceMono-Regular' y
    'SpaceMono-Bold'.
  */
  const [fontsLoaded] = useFonts({
    'SpaceMono-Regular': SpaceMono_400Regular,
    'SpaceMono-Bold': SpaceMono_700Bold,
  });

  /*
    CARGA DE PRENDAS (GET /api/garments)
    1. Pide la lista completa al backend.
    2. Normaliza bodyPart: si llega como número (enum 0..3) lo
       convierte a 'Head'/'Torso'/'Legs'/'Feet' para que la UI
       siempre trabaje con el nombre.
    3. Auto-selección: por cada carrusel, si la prenda que
       estaba seleccionada ya no existe (ej. fue borrada),
       selecciona la primera disponible o deja vacío.
  */
  const loadGarments = useCallback(async () => {
    try {
      const data = await getGarments(API_URL);

      const partNames: BodyPart[] = ['Head', 'Torso', 'Legs', 'Feet'];
      const normalized = data.map((item) => {
        const rawPart = item.bodyPart as unknown;
        const bodyPart = typeof rawPart === 'number' ? partNames[rawPart] : rawPart;

        return { ...item, bodyPart: bodyPart as BodyPart };
      });

      setGarments(normalized);

      setSelectedIds((previous) => {
        const next = { ...previous };

        for (const part of BODY_PARTS) {
          const items = normalized.filter((garment) => garment.bodyPart === part.value);
          const currentStillExists = items.some((garment) => garment.id === previous[part.value]);

          if (!currentStillExists) {
            next[part.value] = items[0]?.id ?? null;
          }
        }

        return next;
      });
    } catch (error) {
      Alert.alert(
        'No se pudieron cargar las prendas',
        error instanceof Error ? error.message : 'Revisa la conexión con la API.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGarments();
  }, [loadGarments]);

  /*
    FLUJO "TOMAR FOTO Y AGREGAR" (POST /api/garments)
    1. Valida que haya nombre para la prenda.
    2. Pide permiso de cámara y abre la cámara (recorte 4:5).
    3. ImageManipulator achica la foto a 1200px y la comprime a
      JPEG 80%: pesa menos y la subida es más rápida.
    4. uploadGarment la envía como multipart/form-data.

    NOTA CLAVE: esto depende del .env (EXPO_PUBLIC_USE_RN_FETCH=1).
    Sin esa variable, Expo usa su fetch propio que NO soporta
    archivos locales en FormData y falla con
    "Unsupported FormDataPart implementation". Ver api.ts.
  */
  async function takePhotoAndUpload() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Falta el nombre', 'Escribe un nombre para la prenda.');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Permite el acceso a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      setSaving(true);

      const asset = result.assets[0];

      const jpeg = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      await uploadGarment(trimmedName, selectedPart, API_URL, {
        uri: jpeg.uri,
        fileName: `prenda-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });

      setName('');
      await loadGarments();
      Alert.alert('Listo', 'La prenda se guardó.');
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error ? error.message : 'Revisa la conexión con la API.'
      );
    } finally {
      setSaving(false);
    }
  }

  /*
    ELIMINAR PRENDA: se activa con presión larga sobre una
    tarjeta. Pide confirmación y borra el registro y su foto
    en Azure (DELETE /api/garments/{id}).
  */
  function confirmDelete(garment: Garment) {
    Alert.alert('Eliminar prenda', `¿Quieres eliminar "${garment.name}" y su foto?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGarment(garment.id, API_URL);
            await loadGarments();
          } catch (error) {
            Alert.alert(
              'No se pudo eliminar',
              error instanceof Error ? error.message : 'Intenta otra vez.'
            );
          }
        },
      },
    ]);
  }

  /*
    CARRUSEL POR PARTE DEL CUERPO
    - snapToInterval + decelerationRate "fast": al soltar, la
      tira se acomoda tarjeta por tarjeta (efecto snap).
    - onMomentumScrollEnd: cuando el scroll termina, calcula
      qué tarjeta quedó centrada (posición / cardStep) y la
      marca como la seleccionada de esa parte del cuerpo.
    - onPress: selecciona directo. onLongPress: borrar.
    - paddingHorizontal dinámico: agrega medio ancho de tarjeta
      a los costados para que la primera y la última también
      puedan quedar centradas.
    - Las tarjetas muestran SOLO la foto, sin nombre encima.
  */
  function renderCarousel(part: { value: BodyPart; label: string }) {
    const items = garments.filter((garment) => garment.bodyPart === part.value);

    return (
      <View key={part.value} style={styles.section}>
        <Text style={styles.sectionTitle}>{part.label}</Text>

        {items.length === 0 ? (
          <View style={[styles.emptyCard, { width: cardWidth, height: imageHeight + 18 }]}>
            <Text style={styles.muted}>Todavía no hay prendas aquí</Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={items}
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardStep}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: Math.max((width - cardWidth) / 2, 16),
            }}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / cardStep);
              const centeredItem = items[index];

              if (centeredItem) {
                setSelectedIds((previous) => ({
                  ...previous,
                  [part.value]: centeredItem.id,
                }));
              }
            }}
            renderItem={({ item }) => {
              const selected = selectedIds[part.value] === item.id;

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    setSelectedIds((previous) => ({
                      ...previous,
                      [part.value]: item.id,
                    }))
                  }
                  onLongPress={() => confirmDelete(item)}
                  style={[
                    styles.garmentCard,
                    { width: cardWidth },
                    selected && styles.selectedCard,
                  ]}
                >
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={[styles.garmentImage, { height: imageHeight }]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.garmentImage, styles.noImage, { height: imageHeight }]}>
                      <Text style={styles.muted}>Sin foto</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <Text style={styles.title}>iCloset</Text>

      <View style={styles.form}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nombre de la prenda"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <View style={styles.partButtons}>
          {BODY_PARTS.map((part) => (
            <TouchableOpacity
              key={part.value}
              onPress={() => setSelectedPart(part.value)}
              style={[styles.partButton, selectedPart === part.value && styles.activePartButton]}
            >
              <Text
                style={[
                  styles.partButtonText,
                  selectedPart === part.value && styles.activePartButtonText,
                ]}
              >
                {part.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={takePhotoAndUpload} disabled={saving} style={styles.addButton}>
          <Text style={styles.addButtonText}>
            {saving ? 'Guardando…' : 'Tomar foto y agregar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading ? (
          <Text style={styles.muted}>Cargando prendas…</Text>
        ) : (
          BODY_PARTS.map(renderCarousel)
        )}
      </ScrollView>

      {/* BARRA INFERIOR: título centrado; paddingBottom usa el
          inset seguro para apoyarse justo sobre la barra de
          gestos del teléfono, sin flotar ni quedar tapada. */}
      <View style={[styles.outfitBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Text style={styles.outfitTitle}>iCloset</Text>
      </View>
    </View>
  );
}

/*
  SafeAreaProvider habilita useSafeAreaInsets dentro de la app.
  Es el punto de entrada real que registra Expo (index.ts).
*/
export default function App() {
  return (
    <SafeAreaProvider>
      <ClosetApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.wall,
  },
  title: {
    color: colors.ink,
    marginTop: 6,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  form: {
    paddingHorizontal: 18,
    gap: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'SpaceMono-Regular',
  },
  partButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  partButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 8,
  },
  activePartButton: {
    backgroundColor: colors.rail,
  },
  partButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'SpaceMono-Regular',
  },
  activePartButtonText: {
    color: '#FFFFFF',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 11,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 8,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    paddingHorizontal: 18,
    marginBottom: 6,
  },
  garmentCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
  },
  selectedCard: {
    borderColor: colors.rail,
    borderWidth: 3,
  },
  garmentImage: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: colors.wall,
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'SpaceMono-Regular',
  },
  emptyCard: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
  },
  outfitBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitTitle: {
    color: colors.ink,
    fontFamily: 'SpaceMono-Bold',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
