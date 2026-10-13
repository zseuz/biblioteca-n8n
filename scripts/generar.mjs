// Genera workflows/*.json (los flujos que se importan en n8n) a partir de src/.
//
//   npm run generar
//
// Cada nodo Code recibe el código de su controlador empaquetado con sus modelos y vistas.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { empaquetar } from './empaquetar.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(raiz, 'src');

/** Archivo de salida → definición del flujo en src/flujos. */
export const FLUJOS = {
  '1-recordatorios-prestamos.json': 'recordatorios.js',
  '2-informe-semanal.json': 'informe.js',
  '3-importar-libros-csv.json': 'importar-libros.js',
  '4-aviso-servidor-caido.json': 'aviso-servidor.js',
};

/** Devuelve { archivo: contenido JSON } sin escribir nada (lo usan también las pruebas). */
export async function generarFlujos() {
  const resultado = {};
  for (const [archivo, definicion] of Object.entries(FLUJOS)) {
    const { default: flujo } = await import(pathToFileURL(join(src, 'flujos', definicion)).href);
    const copia = structuredClone(flujo);
    for (const nodo of copia.nodes) {
      if (!nodo.controlador) continue;
      nodo.parameters.jsCode = empaquetar(join(src, 'controladores', `${nodo.controlador}.js`), src);
      delete nodo.controlador;
    }
    resultado[archivo] = `${JSON.stringify(copia, null, 2)}\n`;
  }
  return resultado;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const destino = process.argv[2] ?? join(raiz, 'workflows');
  mkdirSync(destino, { recursive: true });
  for (const [archivo, contenido] of Object.entries(await generarFlujos())) {
    writeFileSync(join(destino, archivo), contenido);
    console.log(`generado ${relative(raiz, join(destino, archivo)).replace(/\\/g, '/')}`);
  }
}
