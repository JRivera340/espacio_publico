// URL del hub. Este modulo se entra y se sale de ahi: no tiene login propio
// ni un panel al que volver.
export const HUB_URL = import.meta.env.VITE_HUB_URL || 'https://bogotaneidapp.com';

// El hub y este modulo viven en origenes distintos, asi que cada uno tiene su
// propio sessionStorage: limpiar el de aca no cierra la sesion del hub. Sin
// avisarle, el hub ve su sesion viva, saltea el login y rebota al handoff con
// un token que puede estar vencido. `logout=1` le dice que cierre la suya.
export const HUB_LOGIN_URL = `${HUB_URL}/login?logout=1`;

// `replace` y no `href`: con `href`, el boton atras devuelve a una pantalla
// del modulo con la sesion ya limpiada.
export function irAlLoginDelHub(): void {
  window.location.replace(HUB_LOGIN_URL);
}
