// Nodo «Importar libros» (Importar libros desde CSV): lee el archivo del formulario, registra
// cada fila con las mismas reglas que la web y prepara la página de resultado.
import { apiLibros } from '../modelos/api-libros.js';
import { leerCsvLibros } from '../modelos/csv-libros.js';
import { importarFilas } from '../modelos/importacion.js';
import { paginaErrorArchivo, paginaImportacion } from '../vistas/pagina-importacion.js';

/** @param n8n.helpers funciones de n8n: leer el archivo subido y hacer peticiones HTTP */
export default async function importarLibros({ $, $input, helpers }) {
  const cfg = $('Configuración').first().json;
  const sinCuentas = { creados: 0, actualizados: 0, errores: 1 };

  const campo = Object.keys($input.first().binary ?? {})[0];
  if (!campo) return [{ json: { ...paginaErrorArchivo({}), ...sinCuentas } }];

  const csv = leerCsvLibros((await helpers.getBinaryDataBuffer(0, campo)).toString('utf8'));
  if (csv.faltan.length) return [{ json: { ...paginaErrorArchivo(csv), ...sinCuentas } }];

  const api = apiLibros((opciones) => helpers.httpRequest(opciones), cfg.apiUrl);
  const importacion = await importarFilas(csv.filas, api);
  const { creados, actualizados, errores } = importacion;
  return [{ json: { ...paginaImportacion(importacion), creados, actualizados, errores } }];
}
