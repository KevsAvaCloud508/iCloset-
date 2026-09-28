import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import App from '../App';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getGarments, uploadGarment } from '../src/services/api';

jest.mock('@expo-google-fonts/space-mono', () => ({
  useFonts: () => [true],
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
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('../src/services/api', () => ({
  API_URL: 'http://192.168.0.98:5005',
  getGarments: jest.fn(),
  uploadGarment: jest.fn(),
  deleteGarment: jest.fn(),
}));

const mockedPicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockedManipulator = ImageManipulator as jest.Mocked<typeof ImageManipulator>;
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
} as Awaited<ReturnType<typeof ImageManipulator.manipulateAsync>>;

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
    mockedGetGarments.mockResolvedValue([]);
    mockedUploadGarment.mockResolvedValue(undefined);
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
    expect(mockedManipulator.manipulateAsync).not.toHaveBeenCalled();
    expect(mockedUploadGarment).not.toHaveBeenCalled();
  });

  it('comprime la foto y la sube con la forma correcta', async () => {
    mockedPicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
    mockedPicker.launchCameraAsync.mockResolvedValue(capturedPhoto);
    mockedManipulator.manipulateAsync.mockResolvedValue(compressedPhoto);

    await render(<App />);
    await fillNameAndPress();

    await waitFor(() => expect(mockedUploadGarment).toHaveBeenCalled());

    expect(mockedManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file:///tmp/original.jpg',
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: 'jpeg' }
    );
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
    mockedManipulator.manipulateAsync.mockResolvedValue(compressedPhoto);
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
});
