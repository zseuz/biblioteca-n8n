// Junta un controlador con los módulos que importa (modelos y vistas) en un solo script para el
// nodo Code de n8n, que no admite `import`.
//
// - Recorre los `import` relativos y coloca cada módulo una sola vez, antes de quien lo usa.
// - Quita las líneas `import` y la palabra `export`.
// - `luxon` no se copia: n8n ya ofrece `DateTime` en el nodo Code.
// - Falla si dos módulos declaran el mismo nombre (en el nodo comparten ámbito).
// - Termina llamando al controlador con el contexto de n8n.
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const IMPORT = /^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?[ \t]*\r?\n/gm;
const DECLARACION = /^(?:async\s+)?function\s+([\w$]+)|^(?:const|let|var|class)\s+([\w$]+)/gm;
const EXPORT_DEFAULT = /^export\s+default\s+(?:async\s+)?function\s+([\w$]+)/m;
/** Lo que n8n ofrece de serie en el nodo Code y se puede importar en src/ para las pruebas. */
const EXTERNOS_PERMITIDOS = { luxon: ['DateTime'] };

/** Contexto que recibe cada controlador (ver src/controladores). */
const CONTEXTO = "{ $, $input, hoy: $today.toISODate(), ahora: $now.toISO(), memoria: $getWorkflowStaticData('global'), helpers: this.helpers }";

/**
 * @param rutaControlador ruta absoluta del controlador
 * @param raiz            carpeta src/, para mostrar rutas cortas en los comentarios
 */
export function empaquetar(rutaControlador, raiz) {
  const modulos = [];
  const visitados = new Set();
  const visitar = (ruta) => {
    if (visitados.has(ruta)) return;
    visitados.add(ruta);
    const fuente = readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n');
    for (const [, nombres, origen] of fuente.matchAll(IMPORT)) {
      if (origen.startsWith('.')) {
        visitar(resolve(dirname(ruta), origen));
      } else if (!EXTERNOS_PERMITIDOS[origen]) {
        throw new Error(`${relative(raiz, ruta)}: n8n no permite importar «${origen}» en un nodo Code.`);
      } else if (!/^\{\s*[\w\s,]+\}$/.test(nombres) || nombres.replace(/[{}\s]/g, '').split(',').some((n) => !EXTERNOS_PERMITIDOS[origen].includes(n))) {
        throw new Error(`${relative(raiz, ruta)}: de «${origen}» solo se puede importar ${EXTERNOS_PERMITIDOS[origen].join(', ')}.`);
      }
    }
    modulos.push({ ruta, fuente });
  };
  visitar(rutaControlador);

  const funcion = modulos.at(-1).fuente.match(EXPORT_DEFAULT)?.[1];
  if (!funcion) throw new Error(`${relative(raiz, rutaControlador)}: debe exportar por defecto una función con nombre.`);

  const declarados = new Map();
  const partes = modulos.map(({ ruta, fuente }) => {
    const corta = relative(raiz, ruta).replace(/\\/g, '/');
    for (const [, fn, variable] of fuente.matchAll(DECLARACION)) {
      const nombre = fn ?? variable;
      if (declarados.has(nombre)) throw new Error(`«${nombre}» está declarado en ${declarados.get(nombre)} y en ${corta}: cambia uno de los dos nombres.`);
      declarados.set(nombre, corta);
    }
    const codigo = fuente.replace(IMPORT, '').replace(/^export\s+default\s+/m, '').replace(/^export\s+/gm, '').trim();
    return `// ─── ${corta} ${'─'.repeat(Math.max(3, 88 - corta.length))}\n${codigo}`;
  });

  const origen = relative(raiz, rutaControlador).replace(/\\/g, '/');
  return [
    `// Generado con «npm run generar» a partir de src/${origen} y los módulos que usa.`,
    '// Para cambiarlo, edita src/ y vuelve a generar: lo que se cambie aquí se pierde al regenerar.',
    '',
    ...partes.flatMap((p) => [p, '']),
    `return await ${funcion}(${CONTEXTO});`,
    '',
  ].join('\n');
}
