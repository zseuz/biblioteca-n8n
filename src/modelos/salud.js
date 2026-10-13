// Estado del servidor entre comprobaciones: decide cuándo avisar de una caída y de la recuperación.
//
// La memoria (datos estáticos del flujo) guarda: fallosSeguidos, avisado y caidoDesde.
//   - Avisa de la caída tras `fallosParaAvisar` comprobaciones fallidas seguidas (evita falsas alarmas).
//   - Avisa una sola vez por caída y otra vez cuando el servidor vuelve a responder.
import { minutosEntre } from './formato.js';

/**
 * Interpreta la respuesta del nodo HTTP (respuesta completa, sin lanzar error).
 * Funciona si responde 200 con `"status": "UP"`.
 */
export function evaluarSalud(respuesta) {
  if (respuesta.statusCode === 200 && respuesta.body?.status === 'UP') return { funciona: true };
  const { error } = respuesta;
  const motivo = error
    ? error.message ?? (typeof error === 'string' ? error : JSON.stringify(error))
    : `respondió ${respuesta.statusCode} con estado ${respuesta.body?.status ?? JSON.stringify(respuesta.body)}`;
  return { funciona: false, motivo };
}

/**
 * Actualiza la memoria con el resultado de esta comprobación.
 * @returns {null | { tipo: 'caida', desde, fallos, motivo } | { tipo: 'recuperacion', desde, hasta, minutos }}
 */
export function registrarComprobacion(memoria, { funciona, motivo }, { ahora, fallosParaAvisar }) {
  memoria.fallosSeguidos ??= 0;

  if (funciona) {
    const { avisado, caidoDesde } = memoria;
    memoria.fallosSeguidos = 0;
    memoria.avisado = false;
    memoria.caidoDesde = null;
    if (!avisado) return null;
    return { tipo: 'recuperacion', desde: caidoDesde, hasta: ahora, minutos: Math.max(1, minutosEntre(caidoDesde, ahora)) };
  }

  memoria.fallosSeguidos += 1;
  memoria.caidoDesde ??= ahora;
  if (memoria.avisado || memoria.fallosSeguidos < fallosParaAvisar) return null;
  memoria.avisado = true;
  return { tipo: 'caida', desde: memoria.caidoDesde, fallos: memoria.fallosSeguidos, motivo };
}
