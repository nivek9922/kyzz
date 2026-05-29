/**
 * Departamentos de Colombia (32 + Bogotá D.C.).
 * Usado en el formulario de dirección para garantizar datos limpios que las
 * transportadoras puedan procesar (requieren departamento + ciudad).
 */
export const COLOMBIA_DEPARTAMENTOS = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bogotá D.C.',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada',
] as const;

export type ColombiaDepartamento = (typeof COLOMBIA_DEPARTAMENTOS)[number];
