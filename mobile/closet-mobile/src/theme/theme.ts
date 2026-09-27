/*
  Paleta MONOCROMA (negro y blanco) de toda la app:
  wall   → fondo general (blanco roto)
  card   → tarjetas, input, barra inferior (blanco puro)
  ink    → texto principal y botón "Tomar foto" (negro)
  muted  → textos secundarios/hint (gris)
  rail   → color de selección: borde de tarjeta elegida y botón
           de parte del cuerpo activo (negro, antes era dorado)
  line   → bordes y separadores (gris claro)
  danger → reservado para acciones destructivas
*/
export const colors = {
  wall: '#F4F4F4',
  card: '#FFFFFF',
  ink: '#111111',
  muted: '#8A8A8A',
  rail: '#111111',
  line: '#E0E0E0',
  danger: '#B3402F',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 };
