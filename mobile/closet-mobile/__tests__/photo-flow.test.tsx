import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import App from '../App';
import * as ImagePicker from 'expo-image-picker';
import { useFonts } from '@expo-google-fonts/space-mono';
import { getGarments, uploadGarment, type Garment } from '../src/services/api';

const mockResize = jest.fn();
const mockRenderAsync = jest.fn();
const mockSaveAsync = jest.fn();
const mockManipulate = jest.fn();
const mockContext = { resize: mockResize, renderAsync: mockRenderAsync };

jest.mock('@expo-google-fonts/space-mono', () => ({
  useFonts: jest.fn(),
  SpaceMono_400Regular: 1,
  SpaceMono_700Bold: 2,
}));

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: (...args: unknown[]) => mockManipulate(...args),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('../src/services/api', () => ({
  API_URL: 'http://192.168.0.98:5005',
  getGarments: jest.fn(),
  uploadGarment: jest.fn(),
  deleteGarment: jest.fn(),
}));

const mockedPicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockedUseFonts = useFonts as jest.MockedFunction<typeof useFonts>;
const mockedGetGarments = getGarments as jest.MockedFunction<typeof getGarments>;
const mockedUploadGarment = uploadGarment as jest.MockedFunction<typeof uploadGarment>;

const grantedPermission = {
  granted: true,
  status: 'granted',
  canAskAgain: true,
  expires: 'never',
} as Awaited<ReturnType<typeof ImagePicker.requestCameraPermissionsAsync>>;

const deniedPermission = {
  granted: false,
  status: 'denied',
  canAskAgain: false,
  expires: 'never',
} as Awaited<ReturnType<typeof ImagePicker.requestCameraPermissionsAsync>>;

const canceledResult = {
  canceled: true,
  assets: null,
} as ImagePicker.ImagePickerResult;

const capturedPhoto = {
  canceled: false,
  assets: [{ uri: 'file:///tmp/original.jpg', width: 3000, height: 3750 }],
} as ImagePicker.ImagePickerResult;

const compressedPhoto = {
  uri: 'file:///tmp/prenda-min.jpg',
  width: 1200,
  height: 1500,
};

const torsoGarment: Garment = {
  id: 10,
  name: 'Playera',
  bodyPart: 'Torso',
  fileName: '10.jpg',
  createdAtUtc: '2026-09-28T00:00:00Z',
  imageUrl: null,
};

async function fillNameAndPress() {
  await fireEvent.changeText(
    screen.getByPlaceholderText('Nombre de la prenda'),
    'Playera'
  );
  await fireEvent.press(screen.getByTestId('add-photo-button'));
}

describe('flujo de tomar foto y agregar', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');

    mockedUseFonts.mockReset();
    mockedUseFonts.mockReturnValue([true, null]);

    mockedGetGarments.mockReset();
    mockedGetGarments.mockResolvedValue([]);

    mockedUploadGarment.mockReset();
    mockedUploadGarment.mockResolvedValue(undefined);

    mockedPicker.requestCameraPermissionsAsync.mockReset();
    mockedPicker.launchCameraAsync.mockReset();

    mockManipulate.mockReset();
    mockManipulate.mockReturnValue(mockContext);
    mockResize.mockReset();
    mockResize.mockReturnValue(mockContext);
    mockRenderAsync.mockReset();
    mockRenderAsync.mockResolvedValue({ saveAsync: mockSaveAsync });
    mockSaveAsync.mockReset();
    mockSaveAsync.mockResolvedValue(compressedPhoto);
  });

  it('no renderiza la app hasta que cargan las fuentes', async () => {
    mockedUseFonts.mockReturnValue([false, null]);

    await render(<App />);

    expect(screen.queryByText('Tu outfit')).toBeNull();
  });

  it('pide permiso y no abre la cámara si está denegado', async () => {
    mockedPicker.requestCameraPermissionsAsync.mockResolvedValue(deniedPermission);

    await render(<App />);
    await fillNameAndPress();

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Permiso necesario',
        'Permite el acceso a la cámara.'
      )
    );
    expect(mockedPicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(mockedUploadGarment).not.toHaveBeenCalled();
  });

  it('no sube nada si el usuario cancela la cámara', async () => {
    mockedPicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
    mockedPicker.launchCameraAsync.mockResolvedValue(canceledResult);

    await render(<App />);
    await fillNameAndPress();

    await waitFor(() => expect(mockedPicker.launchCameraAsync).toHaveBeenCalled());
    expect(mockManipulate).not.toHaveBeenCalled();
    expect(mockedUploadGarment).not.toHaveBeenCalled();
  });

  it('ignora un segundo toque mientras la cámara está abierta', async () => {
    mockedPicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);

    let resolveCamera: (value: ImagePicker.ImagePickerResult) => void = () => {};
    mockedPicker.launchCameraAsync.mockImplementation(
      () =>
        new Promise<ImagePicker.ImagePickerResult>((resolve) => {
          resolveCamera = resolve;
        })
    );

    await render(<App />);
    await fireEvent.changeText(
      screen.getByPlaceholderText('Nombre de la prenda'),
      'Playera'
    );

    // No se espera el primer press: fireEvent propaga la promesa del handler
    // y esta queda pendiente hasta que "cerremos" la cámara.
    const firstPress = fireEvent.press(screen.getByTestId('add-photo-button'));
    await waitFor(() => expect(mockedPicker.launchCameraAsync).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getByTestId('add-photo-button'));
    expect(mockedPicker.launchCameraAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCamera(canceledResult);
    });
    await firstPress;
  });

  it('comprime la foto y la sube con la forma correcta', async () => {
    mockedPicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
    mockedPicker.launchCameraAsync.mockResolvedValue(capturedPhoto);

    await render(<App />);
    await fillNameAndPress();

    await waitFor(() => expect(mockedUploadGarment).toHaveBeenCalled());

    expect(mockManipulate).toHaveBeenCalledWith('file:///tmp/original.jpg');
    expect(mockResize).toHaveBeenCalledWith({ width: 1200 });
    expect(mockRenderAsync).toHaveBeenCalled();
    expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.8, format: 'jpeg' });
    expect(mockedUploadGarment).toHaveBeenCalledWith(
      'Playera',
      'Torso',
      'http://192.168.0.98:5005',
      {
        uri: 'file:///tmp/prenda-min.jpg',
        fileName: expect.stringMatching(/^prenda-\d+\.jpg$/),
        mimeType: 'image/jpeg',
      }
    );

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Listo', 'La prenda se guardó.')
    );
    // Carga inicial + recarga después de guardar.
    expect(mockedGetGarments).toHaveBeenCalledTimes(2);
  });

  it('muestra el mensaje del backend si la subida falla', async () => {
    mockedPicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
    mockedPicker.launchCameraAsync.mockResolvedValue(capturedPhoto);
    mockedUploadGarment.mockRejectedValue(
      new Error('La foto debe pesar entre 1 byte y 5 MB.')
    );

    await render(<App />);
    await fillNameAndPress();

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudo guardar',
        'La foto debe pesar entre 1 byte y 5 MB.'
      )
    );
  });

  it('si falla la recarga tras guardar, muestra un solo mensaje', async () => {
    mockedPicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
    mockedPicker.launchCameraAsync.mockResolvedValue(capturedPhoto);
    mockedGetGarments
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('falló la red'));

    await render(<App />);
    await fillNameAndPress();

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Listo',
        'La prenda se guardó, pero no se pudo refrescar la lista.'
      )
    );

    expect(alertSpy).not.toHaveBeenCalledWith(
      'No se pudieron cargar las prendas',
      expect.anything()
    );
    expect(alertSpy).not.toHaveBeenCalledWith('Listo', 'La prenda se guardó.');
  });

  it('expone las tarjetas con etiqueta accesible', async () => {
    mockedGetGarments.mockResolvedValue([torsoGarment]);

    await render(<App />);

    expect(await screen.findByLabelText('Torso: prenda Playera')).toBeTruthy();
  });
});
