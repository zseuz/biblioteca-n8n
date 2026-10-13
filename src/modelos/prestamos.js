// Reglas de los recordatorios: a quién avisar, de qué, y cómo recordar lo ya avisado.
//
// La «memoria» son los datos estáticos del flujo en n8n (solo se guardan con el flujo activado):
//   memoria.porVencer[idPrestamo] = fecha límite de la que ya se avisó
//   memoria.vencidos[idPrestamo]  = día del último aviso de vencido (AAAA-MM-DD)
import { diasEntre } from './formato.js';

/** Prepara la memoria la primera vez y olvida los préstamos que ya no están pendientes. */
export function limpiarMemoria(memoria, pendientes) {
  memoria.porVencer ??= {};
  memoria.vencidos ??= {};
  const vigentes = new Set(pendientes.map((p) => String(p.id)));
  for (const lista of [memoria.porVencer, memoria.vencidos]) {
    for (const id of Object.keys(lista)) if (!vigentes.has(id)) delete lista[id];
  }
  return memoria;
}

/**
 * Préstamos que toca avisar hoy, agrupados por usuario.
 *   - vencido: si nunca se avisó, o si el último aviso fue hace `repetirVencidosCadaDias` días o más
 *   - por vencer: si faltan `diasAntesDeVencer` días o menos y no se avisó de esa fecha límite
 *     (si se renueva, la fecha cambia y se vuelve a avisar cuando toque)
 * Los usuarios sin correo se descartan.
 * @returns {{ usuario, vencidos: object[], porVencer: object[] }[]}
 */
export function avisosPendientes({ vencidos, enPlazo, usuarios, memoria, hoy, diasAntesDeVencer, repetirVencidosCadaDias }) {
  const porUsuario = new Map();
  const anotar = (p, tipo) => {
    if (!porUsuario.has(p.memberId)) porUsuario.set(p.memberId, { vencidos: [], porVencer: [] });
    porUsuario.get(p.memberId)[tipo].push(p);
  };

  for (const p of vencidos) {
    const ultimo = memoria.vencidos?.[p.id];
    if (!ultimo || diasEntre(ultimo, hoy) >= repetirVencidosCadaDias) anotar(p, 'vencidos');
  }
  for (const p of enPlazo) {
    if (diasEntre(hoy, p.dueDate) <= diasAntesDeVencer && memoria.porVencer?.[p.id] !== p.dueDate) anotar(p, 'porVencer');
  }

  const fichas = new Map(usuarios.map((u) => [u.id, u]));
  return [...porUsuario]
    .map(([id, avisos]) => ({ usuario: fichas.get(id), ...avisos }))
    .filter((a) => a.usuario?.email);
}

/** Lista plana de los avisos de un usuario, para guardarla junto al correo. */
export const listaDeAvisos = ({ vencidos, porVencer }) => [
  ...vencidos.map((p) => ({ prestamo: p.id, tipo: 'vencido', libro: p.bookTitle, vence: p.dueDate })),
  ...porVencer.map((p) => ({ prestamo: p.id, tipo: 'porVencer', libro: p.bookTitle, vence: p.dueDate })),
];

/** Apunta en la memoria los avisos de un correo que se envió bien. */
export function registrarEnvio(memoria, avisos, hoy) {
  memoria.porVencer ??= {};
  memoria.vencidos ??= {};
  for (const aviso of avisos) {
    if (aviso.tipo === 'vencido') memoria.vencidos[aviso.prestamo] = hoy;
    else memoria.porVencer[aviso.prestamo] = aviso.vence;
  }
  return memoria;
}

/** ¿Se puede renovar ya? (la API indica desde qué día: `renewableFrom`). */
export const esRenovable = (prestamo, hoy) => Boolean(prestamo.renewableFrom && prestamo.renewableFrom <= hoy);
