// Fechas y textos que comparten todos los flujos. Las fechas viajan como texto ISO
// (AAAA-MM-DD o fecha y hora con zona) para que las funciones sean fáciles de probar.
import { DateTime } from 'luxon';

/** 2026-10-07 → «07/10/2026». */
export const fecha = (iso) => DateTime.fromISO(iso).toFormat('dd/MM/yyyy');

/** 2026-10-07 → «7 de oct». */
export const fechaCorta = (iso) => DateTime.fromISO(iso).setLocale('es').toFormat("d 'de' LLL");

/** Fecha y hora conservando la zona horaria con la que se guardó: «13/10/2026 a las 10:56». */
export const fechaHora = (iso) => DateTime.fromISO(iso, { setZone: true }).setLocale('es').toFormat("dd/MM/yyyy 'a las' HH:mm");

/** Días enteros entre dos fechas ISO (negativo si `hasta` es anterior). */
export const diasEntre = (desde, hasta) => Math.round(DateTime.fromISO(hasta).diff(DateTime.fromISO(desde), 'days').days);

/** Suma (o resta) días a una fecha ISO. */
export const sumarDias = (iso, dias) => DateTime.fromISO(iso).plus({ days: dias }).toISODate();

/** Minutos enteros entre dos instantes ISO. */
export const minutosEntre = (desde, hasta) => Math.round(DateTime.fromISO(hasta).diff(DateTime.fromISO(desde), 'minutes').minutes);

/** «2026-05» → «Mayo 2026». */
export const mes = (aaaaMm) => mayuscula(DateTime.fromISO(`${aaaaMm}-01`).setLocale('es').toFormat('LLLL yyyy'));

/** «Del 7 al 13 de octubre de 2026» o «Del 30 de septiembre al 6 de octubre de 2026». */
export function rangoFechas(inicioIso, finIso) {
  const a = DateTime.fromISO(inicioIso).setLocale('es');
  const b = DateTime.fromISO(finIso).setLocale('es');
  const inicio = a.month === b.month && a.year === b.year ? a.toFormat('d')
    : a.year === b.year ? a.toFormat("d 'de' LLLL")
      : a.toFormat("d 'de' LLLL 'de' yyyy");
  return `Del ${inicio} al ${b.toFormat("d 'de' LLLL 'de' yyyy")}`;
}

/** 0 → «hoy», 1 → «mañana», 3 → «en 3 días». */
export const cuando = (dias) => (dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`);

/** 1 → «ayer», 6 → «hace 6 días». */
export const hace = (dias) => (dias === 1 ? 'ayer' : `hace ${dias} días`);

/** 1 → «1 préstamo», 3 → «3 préstamos». */
export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/** Primera letra en mayúscula. */
export const mayuscula = (s) => s[0].toUpperCase() + s.slice(1);

/** 75 → «1 h 15 min», 1 → «1 minuto». */
export const duracion = (minutos) => (minutos < 60
  ? plural(minutos, 'minuto', 'minutos')
  : `${Math.floor(minutos / 60)} h ${minutos % 60} min`);
