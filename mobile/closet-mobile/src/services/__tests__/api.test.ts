import {
  deleteGarment,
  getGarments,
  uploadGarment,
  withApiUrl,
  type Garment,
} from '../api';

const API = 'http://192.168.0.98:5005';

const garment: Garment = {
  id: 1,
  name: 'Playera',
  bodyPart: 'Torso',
  fileName: 'foto.jpg',
  createdAtUtc: '2026-09-28T00:00:00Z',
  imageUrl: 'https://blob.example/foto.jpg?sas',
};

function mockResponse(ok: boolean, body: unknown = '', status = ok ? 200 : 400) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);

  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(text),
  } as unknown as Response;
}

describe('api de prendas', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('getGarments', () => {
    it('devuelve las prendas que responde el backend', async () => {
      fetchMock.mockResolvedValue(mockResponse(true, [garment]));

      await expect(getGarments(API)).resolves.toEqual([garment]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(`${API}/api/garments`);
    });

    it('propaga el mensaje de error del backend', async () => {
      fetchMock.mockResolvedValue(mockResponse(false, 'No se pudo leer', 500));

      await expect(getGarments(API)).rejects.toThrow('No se pudo leer');
    });

    it('usa el status cuando el backend no manda mensaje', async () => {
      fetchMock.mockResolvedValue(mockResponse(false, '', 503));

      await expect(getGarments(API)).rejects.toThrow('Error al cargar prendas: 503');
    });

    it('aborta y avisa si el backend no responde (timeout)', async () => {
      jest.useFakeTimers();
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          })
      );

      try {
        const request = getGarments(API);
        const assertion = expect(request).rejects.toThrow(/tardó más de 15 s/);

        await jest.advanceTimersByTimeAsync(15000);
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('uploadGarment', () => {
    it('envía name, bodyPart y photo con la forma { uri, name, type }', async () => {
      const appendSpy = jest.spyOn(FormData.prototype, 'append');
      fetchMock.mockResolvedValue(mockResponse(true, '', 201));

      await uploadGarment('Playera', 'Torso', API, {
        uri: 'file:///tmp/prenda.jpg',
        fileName: 'prenda.jpg',
        mimeType: 'image/jpeg',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(`${API}/api/garments`);
      expect(options.method).toBe('POST');
      expect(options.body).toBeInstanceOf(FormData);

      expect(appendSpy).toHaveBeenCalledWith('name', 'Playera');
      expect(appendSpy).toHaveBeenCalledWith('bodyPart', 'Torso');
      // Forma obligatoria para el fetch nativo de RN. Si se cambia a Blob o
      // string con el fetch de Expo, la subida falla con
      // "Unsupported FormDataPart implementation".
      expect(appendSpy).toHaveBeenCalledWith('photo', {
        uri: 'file:///tmp/prenda.jpg',
        name: 'prenda.jpg',
        type: 'image/jpeg',
      });

      appendSpy.mockRestore();
    });

    it('genera nombre y MIME por defecto si el asset no los trae', async () => {
      const appendSpy = jest.spyOn(FormData.prototype, 'append');
      fetchMock.mockResolvedValue(mockResponse(true, '', 201));

      await uploadGarment('Playera', 'Torso', API, { uri: 'file:///tmp/x.jpg' });

      expect(appendSpy).toHaveBeenCalledWith('photo', {
        uri: 'file:///tmp/x.jpg',
        name: expect.stringMatching(/^prenda-\d+\.jpg$/),
        type: 'image/jpeg',
      });

      appendSpy.mockRestore();
    });

    it('propaga el mensaje de validación del backend', async () => {
      fetchMock.mockResolvedValue(
        mockResponse(false, 'La foto debe pesar entre 1 byte y 5 MB.', 400)
      );

      await expect(
        uploadGarment('Playera', 'Torso', API, { uri: 'file:///tmp/x.jpg' })
      ).rejects.toThrow('La foto debe pesar entre 1 byte y 5 MB.');
    });
  });

  describe('deleteGarment', () => {
    it('borra la prenda con DELETE y su id', async () => {
      fetchMock.mockResolvedValue(mockResponse(true, '', 204));

      await deleteGarment(7, API);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API}/api/garments/7`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('propaga el mensaje si no existe la prenda', async () => {
      fetchMock.mockResolvedValue(mockResponse(false, 'No se encontró la prenda.', 404));

      await expect(deleteGarment(99, API)).rejects.toThrow('No se encontró la prenda.');
    });
  });

  describe('withApiUrl', () => {
    it('fija la URL del backend en las tres operaciones', async () => {
      fetchMock.mockResolvedValue(mockResponse(true, [garment]));
      const client = withApiUrl(API);

      await client.getGarments();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(`${API}/api/garments`);
    });
  });
});
