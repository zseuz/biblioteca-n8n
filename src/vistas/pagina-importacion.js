// Vista del resultado de la importación: la página que ve quien sube el CSV.
// n8n la inserta dentro de su propia página de cierre, así que es un fragmento con estilos en línea.
import { plural } from '../modelos/formato.js';
import { esc } from './html.js';

const COLOR_LINEA = { ok: '#1f2937', nota: '#92400e', error: '#b91c1c' };

/** Texto de cada fila importada. */
function lineaResultado(r) {
  if (r.accion === 'error') return { tipo: 'error', texto: `Fila ${r.numero}: ERROR en «${r.titulo || '(sin título)'}»: ${r.error}` };
  if (r.accion === 'sumado') {
    const sumados = r.ejemplares === 1 ? 'se sumó 1 ejemplar' : `se sumaron ${r.ejemplares} ejemplares`;
    return { tipo: 'ok', texto: `Fila ${r.numero}: «${r.titulo}» ya existía; ${sumados} (ahora tiene ${r.totalCopies}).` };
  }
  const nota = r.otrosGeneros.length ? ` Ojo: ya existía con otro género (${r.otrosGeneros.join(', ')}).` : '';
  return {
    tipo: nota ? 'nota' : 'ok',
    texto: `Fila ${r.numero}: «${r.titulo}» creado con ${plural(r.ejemplares, 'ejemplar', 'ejemplares')}.${nota}`,
  };
}

/** Página con un resumen y una línea por fila. */
function pagina(resumen, lineas) {
  return `<div style="padding:24px 16px">
<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #dbdfe7;border-radius:8px;padding:24px;font-size:14px">
<h1 style="font-size:20px;font-weight:600;margin:0 0 8px;color:#1f2937">Importación terminada</h1>
<p style="font-size:15px;margin:0 0 16px;color:#1e3a8a"><strong>${esc(resumen)}</strong></p>
<ul style="padding-left:18px;margin:0">${lineas.map((l) => `<li style="margin:6px 0;color:${COLOR_LINEA[l.tipo]}">${esc(l.texto)}</li>`).join('')}</ul>
<p style="margin:20px 0 0"><a href="/form/importar-libros" style="color:#1e3a8a">Importar otro archivo</a></p>
</div></div>`;
}

/**
 * Resultado de una importación completa.
 * @param importacion resultado de `importarFilas` (modelos/importacion.js)
 * @returns {{ resumen, detalle, pagina }}
 */
export function paginaImportacion({ resultados, creados, actualizados, errores }) {
  const lineas = resultados.map(lineaResultado);
  const resumen = lineas.length
    ? [plural(creados, 'libro nuevo', 'libros nuevos'), `${actualizados} con ejemplares sumados`,
      plural(errores, 'fila con error', 'filas con error')].join(' · ')
    : 'El archivo no tiene filas con libros.';
  return { resumen, detalle: lineas.map((l) => l.texto).join('\n'), pagina: pagina(resumen, lineas) };
}

/** El archivo no se puede importar (no llegó o le faltan columnas). */
export function paginaErrorArchivo({ faltan, cabecera = [], separador = ',' }) {
  const resumen = faltan
    ? `Al archivo le faltan columnas obligatorias: ${faltan.join(', ')}.`
    : 'No se recibió ningún archivo.';
  const lineas = faltan
    ? [`Cabecera encontrada: ${cabecera.join(' | ') || '(vacía)'}`,
      `La primera fila debe ser: titulo${separador}autor${separador}genero${separador}ejemplares`].map((texto) => ({ tipo: 'error', texto }))
    : [];
  return { resumen, detalle: lineas.map((l) => l.texto).join('\n'), pagina: pagina(resumen, lineas) };
}
