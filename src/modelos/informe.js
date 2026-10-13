// Datos del informe semanal a partir de las respuestas de la API (sin nada de presentación).
import { sumarDias } from './formato.js';

/**
 * @param o.stats      respuesta de GET /stats
 * @param o.libros     respuesta de GET /books
 * @param o.vencidos   préstamos con status=OVERDUE
 * @param o.enPlazo    préstamos con status=ACTIVE ordenados por vencimiento
 * @param o.recientes  préstamos del más reciente al más antiguo
 * @param o.hoy        AAAA-MM-DD
 */
export function datosInforme({ stats, libros, vencidos, enPlazo, recientes, hoy }) {
  const inicioSemana = sumarDias(hoy, -6); // los últimos 7 días, hoy incluido
  const enUnaSemana = sumarDias(hoy, 7);
  const nuevos = recientes.filter((p) => p.loanDate >= inicioSemana && p.loanDate <= hoy);
  return {
    hoy,
    inicioSemana,
    vencidos,
    nuevos,
    proximos: enPlazo.filter((p) => p.dueDate <= enUnaSemana),
    agotados: libros.filter((l) => l.availableCopies === 0),
    masPrestados: stats.topBooks.slice(0, 5),
    porMes: stats.loansByMonth,
    indicadores: [
      { nombre: 'Libros', valor: stats.totalBooks },
      { nombre: 'Usuarios', valor: stats.totalMembers },
      { nombre: 'En plazo', valor: stats.activeLoans },
      { nombre: 'Vencidos', valor: stats.overdueLoans, alerta: true },
      { nombre: 'Nuevos (7 días)', valor: nuevos.length },
    ],
  };
}
