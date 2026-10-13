// Nodo «¿Hay que avisar?» (Aviso si el servidor no responde): decide si se envía un aviso.
import { evaluarSalud, registrarComprobacion } from '../modelos/salud.js';
import { correoCaida, correoRecuperacion } from '../vistas/correo-servidor.js';

/**
 * @param n8n.$input  respuesta completa del nodo «Comprobar backend»
 * @param n8n.ahora   instante actual (ISO con zona horaria)
 * @param n8n.memoria datos estáticos del flujo (fallos seguidos, si ya se avisó y desde cuándo)
 */
export default function comprobarServidor({ $, $input, ahora, memoria }) {
  const cfg = $('Configuración').first().json;
  const aviso = registrarComprobacion(memoria, evaluarSalud($input.first().json), { ahora, fallosParaAvisar: cfg.fallosParaAvisar });
  if (!aviso) return [];
  const datos = { aviso, url: cfg.urlSalud, biblioteca: cfg.nombreBiblioteca };
  return [{ json: aviso.tipo === 'caida' ? correoCaida(datos) : correoRecuperacion(datos) }];
}
