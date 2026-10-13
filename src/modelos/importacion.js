// Proceso de importación: recorre las filas del CSV en orden y registra cada libro.
// Un libro repetido dentro del mismo CSV se crea una vez y luego se le suman los ejemplares.
import { registrarLibro } from './api-libros.js';
import { validarFila } from './csv-libros.js';

/**
 * @param filas resultado de `leerCsvLibros(...).filas`
 * @param api   cliente de `apiLibros(...)` (o uno falso en las pruebas)
 * @returns {Promise<{ resultados: object[], creados, actualizados, errores }>}
 *   Cada resultado: { numero, titulo, ejemplares } más { accion: 'creado', otrosGeneros },
 *   { accion: 'sumado', totalCopies } o { accion: 'error', error }.
 */
export async function importarFilas(filas, api) {
  const resultados = [];
  for (const fila of filas) {
    const base = { numero: fila.numero, titulo: fila.libro.title, ejemplares: fila.ejemplares };
    const invalida = validarFila(fila);
    if (invalida) {
      resultados.push({ ...base, accion: 'error', error: invalida });
      continue;
    }
    try {
      resultados.push({ ...base, ...(await registrarLibro(api, fila.libro, fila.ejemplares)) });
    } catch (e) {
      resultados.push({ ...base, accion: 'error', error: e.message });
    }
  }
  const cuenta = (accion) => resultados.filter((r) => r.accion === accion).length;
  return { resultados, creados: cuenta('creado'), actualizados: cuenta('sumado'), errores: cuenta('error') };
}
