// Lectura del CSV de libros: separador, comillas, cabeceras con alias y validación de cada fila.

/** Columnas reconocidas y sus nombres alternativos (sin tildes ni mayúsculas). */
export const ALIAS_COLUMNAS = {
  title: ['titulo', 'title', 'libro'],
  author: ['autor', 'autora', 'author'],
  genre: ['genero', 'genre', 'categoria'],
  copies: ['ejemplares', 'copias', 'cantidad', 'unidades', 'copies', 'totalcopies'],
};
const OBLIGATORIAS = { title: 'titulo', author: 'autor', genre: 'genero' };

/** Excel en español guarda los CSV con «;»; el resto, con «,». Se decide por la cabecera. */
export function detectarSeparador(texto) {
  const primeraLinea = texto.split(/\r?\n/, 1)[0];
  const cuenta = (c) => primeraLinea.split(c).length - 1;
  return cuenta(';') > cuenta(',') ? ';' : ',';
}

/** Convierte el texto en filas de celdas, respetando comillas («"a, b"» y «""» dentro). */
export function filasCsv(texto, separador) {
  const filas = [];
  let fila = [], valor = '', entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { valor += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else valor += c;
    } else if (c === '"') entreComillas = true;
    else if (c === separador) { fila.push(valor); valor = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(valor); filas.push(fila); fila = []; valor = '';
    } else valor += c;
  }
  if (valor !== '' || fila.length) { fila.push(valor); filas.push(fila); }
  return filas;
}

const normalizar = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

/** Posición de cada columna conocida y las obligatorias que faltan. */
export function columnasCsv(cabecera) {
  const posicion = {};
  cabecera.forEach((nombre, i) => {
    const n = normalizar(nombre);
    for (const [clave, alias] of Object.entries(ALIAS_COLUMNAS)) {
      if (alias.includes(n) && posicion[clave] === undefined) posicion[clave] = i;
    }
  });
  const faltan = Object.keys(OBLIGATORIAS).filter((c) => posicion[c] === undefined).map((c) => OBLIGATORIAS[c]);
  return { posicion, faltan };
}

/**
 * Lee el CSV completo.
 * @returns {{ separador, cabecera: string[], faltan: string[], filas: { numero, libro, ejemplares, textoEjemplares }[] }}
 *   `numero` es la fila tal como la cuenta una hoja de cálculo (la cabecera es la 1). Las filas vacías se omiten.
 */
export function leerCsvLibros(texto) {
  const limpio = texto.replace(/^\uFEFF/, '');
  const separador = detectarSeparador(limpio);
  const [cabecera = [], ...resto] = filasCsv(limpio, separador);
  const { posicion, faltan } = columnasCsv(cabecera);
  const filas = [];
  resto.forEach((celdas, i) => {
    const celda = (clave) => (posicion[clave] === undefined ? '' : (celdas[posicion[clave]] ?? '').trim());
    const libro = { title: celda('title'), author: celda('author'), genre: celda('genre') };
    if (!libro.title && !libro.author && !libro.genre) return;
    const textoEjemplares = celda('copies');
    filas.push({ numero: i + 2, libro, textoEjemplares, ejemplares: textoEjemplares === '' ? 1 : Number(textoEjemplares) });
  });
  return { separador, cabecera, faltan, filas };
}

/** Error de la fila antes de llamar a la API, o null si se puede enviar. */
export function validarFila({ libro, ejemplares, textoEjemplares }) {
  if (!Number.isInteger(ejemplares) || ejemplares < 1 || ejemplares > 1000) {
    return `«${textoEjemplares}» no es un número de ejemplares válido (de 1 a 1000)`;
  }
  if (!libro.title || !libro.author || !libro.genre) return 'faltan el título, el autor o el género';
  return null;
}
