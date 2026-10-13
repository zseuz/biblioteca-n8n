// Pruebas de las vistas: textos, singular/plural y escapado de HTML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correoRecordatorio } from '../src/vistas/correo-recordatorio.js';
import { correoInforme } from '../src/vistas/correo-informe.js';
import { correoCaida, correoRecuperacion } from '../src/vistas/correo-servidor.js';
import { paginaErrorArchivo, paginaImportacion } from '../src/vistas/pagina-importacion.js';
import { datosInforme } from '../src/modelos/informe.js';

const HOY = '2026-10-13';
const usuario = { name: 'Ana <b>', email: 'ana@x.test' };
const vencido = { id: 1, bookTitle: 'Rayuela', dueDate: '2026-10-07', renewableFrom: '2026-10-02' };
const porVencer = { id: 2, bookTitle: 'Cumbres & Co', dueDate: '2026-10-16', renewableFrom: '2026-10-11' };

test('recordatorio: solo un préstamo que vence pronto (singular, renovable)', () => {
  const c = correoRecordatorio({ usuario, vencidos: [], porVencer: [porVencer], hoy: HOY, biblioteca: 'Biblio' });
  assert.equal(c.asunto, '«Cumbres & Co» vence en 3 días');
  assert.match(c.texto, /^Hola, Ana <b>:\n\nEste préstamo vence pronto:\n- «Cumbres & Co»: vence en 3 días, el 16\/10\/2026\. Ya se puede renovar/);
  assert.match(c.html, /Cumbres &amp; Co/, 'escapa el título');
  assert.match(c.html, /Ana &lt;b&gt;/, 'escapa el nombre');
  assert.doesNotMatch(c.html, /no podrás llevarte otros libros/);
});

test('recordatorio: vencido más uno que vence pronto', () => {
  const c = correoRecordatorio({ usuario, vencidos: [vencido], porVencer: [porVencer], hoy: HOY, biblioteca: 'Biblio' });
  assert.equal(c.asunto, 'Tienes 1 préstamo vencido');
  assert.match(c.html, /Vencido hace 6 días/);
  assert.match(c.html, /no podrás llevarte otros libros/);
  assert.match(c.html, /Además, vence pronto/);
  assert.match(c.html, /Si ya devolviste los libros/);
  assert.match(c.texto, /Por favor, devuélvelo cuanto antes/);
  assert.match(c.texto, /Además, este préstamo vence pronto:/);
});

test('recordatorio: varios vencidos en plural', () => {
  const c = correoRecordatorio({ usuario, vencidos: [vencido, { ...vencido, id: 3, bookTitle: 'Dune' }], porVencer: [], hoy: HOY, biblioteca: 'Biblio' });
  assert.equal(c.asunto, 'Tienes 2 préstamos vencidos');
  assert.match(c.texto, /Estos libros ya deberían haberse devuelto:/);
  assert.match(c.texto, /devuélvelos/);
});

test('informe: resumen, rango de fechas y secciones vacías', () => {
  const datos = datosInforme({
    stats: { totalBooks: 1, totalMembers: 1, activeLoans: 0, overdueLoans: 0, topBooks: [], loansByMonth: [{ label: '2026-10', count: 0 }] },
    libros: [], vencidos: [], enPlazo: [], recientes: [], hoy: HOY,
  });
  const c = correoInforme({ datos, usuarios: [], biblioteca: 'Biblio' });
  assert.equal(c.asunto, 'Informe semanal de Biblio: sin préstamos vencidos · 0 préstamos nuevos');
  assert.match(c.html, /Del 7 al 13 de octubre de 2026/);
  assert.match(c.html, /No hay préstamos vencidos/);
  assert.match(c.html, /Octubre 2026/);
  assert.match(c.texto, /PRÉSTAMOS VENCIDOS \(0\)\n {2}Ninguno\./);
});

test('avisos del servidor: caída y recuperación', () => {
  const caida = correoCaida({ aviso: { desde: '2026-10-13T10:56:00.000-05:00', fallos: 2, motivo: '<503>' }, url: 'http://x/health', biblioteca: 'Biblio' });
  assert.equal(caida.asunto, 'Biblio: el servidor no responde');
  assert.match(caida.html, /13\/10\/2026 a las 10:56/);
  assert.match(caida.html, /&lt;503&gt;/);
  const vuelta = correoRecuperacion({ aviso: { desde: '2026-10-13T10:56:00.000-05:00', hasta: '2026-10-13T12:11:00.000-05:00', minutos: 75 }, url: 'http://x/health', biblioteca: 'Biblio' });
  assert.match(vuelta.texto, /aproximadamente 1 h 15 min/);
});

test('página de importación: líneas por fila y errores del archivo', () => {
  const p = paginaImportacion({
    resultados: [
      { numero: 2, titulo: 'A', ejemplares: 1, accion: 'creado', otrosGeneros: ['Novela'] },
      { numero: 3, titulo: 'B', ejemplares: 1, accion: 'sumado', totalCopies: 4 },
      { numero: 4, titulo: '', ejemplares: 1, accion: 'error', error: 'falta algo' },
    ],
    creados: 1, actualizados: 1, errores: 1,
  });
  assert.equal(p.resumen, '1 libro nuevo · 1 con ejemplares sumados · 1 fila con error');
  assert.equal(p.detalle, [
    'Fila 2: «A» creado con 1 ejemplar. Ojo: ya existía con otro género (Novela).',
    'Fila 3: «B» ya existía; se sumó 1 ejemplar (ahora tiene 4).',
    'Fila 4: ERROR en «(sin título)»: falta algo',
  ].join('\n'));
  assert.equal(paginaErrorArchivo({}).resumen, 'No se recibió ningún archivo.');
  assert.match(paginaErrorArchivo({ faltan: ['autor'], cabecera: ['titulo'], separador: ';' }).detalle, /titulo;autor;genero;ejemplares/);
});
