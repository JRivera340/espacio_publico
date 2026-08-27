// Identidades de prueba compartidas entre el seed y el minter de tokens.
// Mismos ids y emails en los dos lados para que el gestor de prueba vea en
// /actividades/mine exactamente lo que el seed le creo.
export const TEST_IDENTITIES = {
  GESTOR_ESPACIO_PUBLICO: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'gestor.prueba@ejemplo.com',
  },
  VALIDADOR_ESPACIO_PUBLICO: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'validador.prueba@ejemplo.com',
  },
  ADMIN: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'admin.prueba@ejemplo.com',
  },
} as const;

export type TestRole = keyof typeof TEST_IDENTITIES;
