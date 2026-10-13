// Pruebas de los modelos: reglas sin n8n ni red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cuando, diasEntre, duracion, hace, mes, rangoFechas } from '../src/modelos/formato.js';
import { avisosPendientes, esRenovable, limpiarMemoria, listaDeAvisos, registrarEnvio } from '../src/modelos/prestamos.js';
import { datosInforme } from '../src/modelos/informe.js';
import { evaluarSalud, registrarComprobacion } from '../src/modelos/salud.js';
import { leerCsvLibros, validarFila } from '../src/modelos/csv-libros.js';
import { registrarLibro } from '../src/modelos/api-libros.js';
import { importarFilas } from '../src/modelos/importacion.js';

const HOY = '2026-10-13';
const prestamo = (id, memberId, dueDate, extra = {}) => ({ id, memberId, bookTitle: `Libro ${id}`, dueDate, renewableFrom: '2026-10-11', ...extra });
const USUARIOS = [{ id: 1, name: 'Ana', email: 'ana@x.test' }, { id: 2, name: 'Luis', email: 'luis@x.test' }, { id: 3, name: 'Sin correo', email: '' }];
const config = { usuarios: USUARIOS, hoy: HOY, diasAntesDeVencer: 3, repetirVencidosCadaDias: 7 };

// --- formato -------------------------------------------------------------------------------
test('formato: días, textos relativos, meses y rangos', () => {
  assert.equal(diasEntre('2026-10-07', HOY), 6);
  assert.equal(diasEntre(HOY, '2026-10-16'), 3);
  assert.deepEqual([cuando(0), cuando(1), cuando(3)], ['hoy', 'mañana', 'en 3 días']);
  assert.deepEqual([hace(1), hace(6)], ['ayer', 'hace 6 días']);
  assert.equal(mes('2026-05'), 'Mayo 2026');
  assert.equal(rangoFechas('2026-10-07', HOY), 'Del 7 al 13 de octubre de 2026');
  assert.equal(rangoFechas('2026-09-30', '2026-10-06'), 'Del 30 de septiembre al 6 de octubre de 2026');
  assert.deepEqual([duracion(1), duracion(45), duracion(75)], ['1 minuto', '45 minutos', '1 h 15 min']);
});

// --- recordatorios ---------------------------------------------------------------------------
test('recordatorios: avisa de vencidos y de los que vencen dentro del margen, agrupando por usuario', () => {
  const avisos = avisosPendientes({
    ...config,
    vencidos: [prestamo(1, 1, '2026-10-07')],
    enPlazo: [prestamo(2, 1, '2026-10-16'), prestamo(3, 2, '2026-10-17'), prestamo(4, 2, '2026-10-25')],
    memoria: {},
  });
  assert.equal(avisos.length, 1, 'Luis no tiene nada dentro del margen de 3 días');
  assert.equal(avisos[0].usuario.name, 'Ana');
  assert.deepEqual(avisos[0].vencidos.map((p) => p.id), [1]);
  assert.deepEqual(avisos[0].porVencer.map((p) => p.id), [2]);
  assert.deepEqual(listaDeAvisos(avisos[0]).map((a) => a.tipo), ['vencido', 'porVencer']);
});

test('recordatorios: no repite avisos ya enviados, salvo vencidos tras N días o fechas renovadas', () => {
  const memoria = {};
  const vencido = prestamo(1, 1, '2026-10-07');
  const porVencer = prestamo(2, 1, '2026-10-16');
  const [primero] = avisosPendientes({ ...config, vencidos: [vencido], enPlazo: [porVencer], memoria });
  registrarEnvio(memoria, listaDeAvisos(primero), HOY);

  assert.equal(avisosPendientes({ ...config, vencidos: [vencido], enPlazo: [porVencer], memoria }).length, 0, 'mismo día: nada');
  const semanaDespues = avisosPendientes({ ...config, hoy: '2026-10-20', vencidos: [vencido], enPlazo: [], memoria });
  assert.deepEqual(semanaDespues[0].vencidos.map((p) => p.id), [1], 'a los 7 días se repite el vencido');
  const renovado = { ...porVencer, dueDate: '2026-10-15' };
  assert.deepEqual(avisosPendientes({ ...config, vencidos: [], enPlazo: [renovado], memoria })[0].porVencer.map((p) => p.id), [2],
    'otra fecha límite: se vuelve a avisar');
});

test('recordatorios: descarta usuarios sin correo y olvida préstamos devueltos', () => {
  assert.equal(avisosPendientes({ ...config, vencidos: [prestamo(9, 3, '2026-10-01')], enPlazo: [], memoria: {} }).length, 0);
  const memoria = { vencidos: { 1: HOY, 5: HOY }, porVencer: { 2: '2026-10-16' } };
  limpiarMemoria(memoria, [{ id: 1 }]);
  assert.deepEqual(memoria, { vencidos: { 1: HOY }, porVencer: {} });
  assert.equal(esRenovable(prestamo(1, 1, '2026-10-16'), HOY), true);
  assert.equal(esRenovable(prestamo(1, 1, '2026-10-30', { renewableFrom: '2026-10-25' }), HOY), false);
});

// --- informe ---------------------------------------------------------------------------------
test('informe: préstamos de la semana, próximos 7 días, agotados e indicadores', () => {
  const datos = datosInforme({
    stats: { totalBooks: 5, totalMembers: 2, activeLoans: 3, overdueLoans: 1, topBooks: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `L${n}`, count: n })), loansByMonth: [] },
    libros: [{ title: 'A', availableCopies: 0 }, { title: 'B', availableCopies: 2 }],
    vencidos: [prestamo(1, 1, '2026-10-01')],
    enPlazo: [prestamo(2, 1, '2026-10-20'), prestamo(3, 1, '2026-10-21')],
    recientes: [{ loanDate: HOY }, { loanDate: '2026-10-07' }, { loanDate: '2026-10-06' }],
    hoy: HOY,
  });
  assert.equal(datos.inicioSemana, '2026-10-07');
  assert.equal(datos.nuevos.length, 2, 'del 7 al 13 incluidos');
  assert.deepEqual(datos.proximos.map((p) => p.id), [2], 'hasta el 20 incluido');
  assert.deepEqual(datos.agotados.map((l) => l.title), ['A']);
  assert.equal(datos.masPrestados.length, 5);
  assert.deepEqual(datos.indicadores.map((i) => i.valor), [5, 2, 3, 1, 2]);
});

// --- salud del servidor ----------------------------------------------------------------------
test('salud: interpreta la respuesta del nodo HTTP', () => {
  assert.deepEqual(evaluarSalud({ statusCode: 200, body: { status: 'UP' } }), { funciona: true });
  assert.equal(evaluarSalud({ statusCode: 503, body: { status: 'DOWN' } }).motivo, 'respondió 503 con estado DOWN');
  assert.equal(evaluarSalud({ error: { message: 'connect ECONNREFUSED' } }).motivo, 'connect ECONNREFUSED');
});

test('salud: avisa una vez tras N fallos seguidos y otra al recuperarse', () => {
  const memoria = {};
  const opciones = (minuto) => ({ ahora: `2026-10-13T10:${String(minuto).padStart(2, '0')}:00.000-05:00`, fallosParaAvisar: 2 });
  const cae = { funciona: false, motivo: 'sin conexión' };
  assert.equal(registrarComprobacion(memoria, { funciona: true }, opciones(0)), null, 'funcionando: nada');
  assert.equal(registrarComprobacion(memoria, cae, opciones(5)), null, 'un fallo: todavía nada');
  assert.deepEqual(registrarComprobacion(memoria, cae, opciones(10)),
    { tipo: 'caida', desde: opciones(5).ahora, fallos: 2, motivo: 'sin conexión' });
  assert.equal(registrarComprobacion(memoria, cae, opciones(15)), null, 'ya avisado: no se repite');
  assert.deepEqual(registrarComprobacion(memoria, { funciona: true }, opciones(35)),
    { tipo: 'recuperacion', desde: opciones(5).ahora, hasta: opciones(35).ahora, minutos: 30 });
  assert.equal(registrarComprobacion(memoria, { funciona: true }, opciones(40)), null);
});

// --- CSV e importación -----------------------------------------------------------------------
test('CSV: punto y coma con BOM, tildes en la cabecera, comillas y filas vacías', () => {
  const csv = leerCsvLibros('\uFEFFTítulo;Autor;Género;Ejemplares\r\n"Dune";Frank Herbert;Novela;2\r\nPedro Páramo;Juan Rulfo;Novela;\r\n;;;\r\n');
  assert.equal(csv.separador, ';');
  assert.deepEqual(csv.faltan, []);
  assert.deepEqual(csv.filas.map((f) => [f.numero, f.libro.title, f.ejemplares]), [[2, 'Dune', 2], [3, 'Pedro Páramo', 1]]);
});

test('CSV: comas con un título entrecomillado que contiene una coma', () => {
  const csv = leerCsvLibros('titulo,autor,genero\n"Crónica, edición especial",Gabriel García Márquez,Novela\n');
  assert.equal(csv.separador, ',');
  assert.equal(csv.filas[0].libro.title, 'Crónica, edición especial');
});

test('CSV: indica las columnas obligatorias que faltan y valida cada fila', () => {
  assert.deepEqual(leerCsvLibros('nombre,escritor\nx,y\n').faltan, ['titulo', 'autor', 'genero']);
  assert.match(validarFila({ libro: { title: 'A', author: 'B', genre: 'C' }, ejemplares: NaN, textoEjemplares: 'cero' }), /no es un número/);
  assert.match(validarFila({ libro: { title: 'A', author: '', genre: 'C' }, ejemplares: 1, textoEjemplares: '' }), /faltan/);
  assert.equal(validarFila({ libro: { title: 'A', author: 'B', genre: 'C' }, ejemplares: 3, textoEjemplares: '3' }), null);
});

/** API falsa en memoria con las mismas reglas de duplicados que el backend. */
function apiFalsa(libros = []) {
  let id = 100;
  return {
    libros,
    buscarDuplicado: async ({ title, author, genre }) => ({
      sameBook: libros.find((l) => l.title === title && l.author === author && l.genre === genre) ?? null,
      differentGenre: libros.filter((l) => l.title === title && l.author === author && l.genre !== genre),
    }),
    sumarEjemplares: async (libroId, cantidad) => {
      const libro = libros.find((l) => l.id === libroId);
      libro.totalCopies += cantidad;
      return libro;
    },
    crear: async (libro, ejemplares) => {
      if (libro.author.length < 3) throw new Error('El autor debe tener entre 3 y 150 caracteres');
      const nuevo = { id: ++id, ...libro, totalCopies: ejemplares };
      libros.push(nuevo);
      return nuevo;
    },
  };
}

test('importación: suma a los existentes, crea los nuevos, avisa de otro género y sigue tras un error', async () => {
  const api = apiFalsa([{ id: 1, title: 'Dune', author: 'Frank Herbert', genre: 'Ciencia ficción', totalCopies: 2 }]);
  assert.deepEqual(await registrarLibro(api, { title: 'Dune', author: 'Frank Herbert', genre: 'Ciencia ficción' }, 3),
    { accion: 'sumado', totalCopies: 5 });

  const csv = leerCsvLibros([
    'titulo,autor,genero,ejemplares',
    'Dune,Frank Herbert,Novela,1',
    'Rayuela,Julio Cortázar,Novela,2',
    'Rayuela,Julio Cortázar,Novela,1',
    'El Aleph,JL,Cuento,1',
    'Ficciones,Jorge Luis Borges,Cuento,cero',
  ].join('\n'));
  const r = await importarFilas(csv.filas, api);
  assert.deepEqual(r.resultados.map((x) => x.accion), ['creado', 'creado', 'sumado', 'error', 'error']);
  assert.deepEqual(r.resultados[0].otrosGeneros, ['Ciencia ficción']);
  assert.equal(r.resultados[2].totalCopies, 3, 'el repetido dentro del CSV se suma al recién creado');
  assert.match(r.resultados[3].error, /autor/);
  assert.deepEqual([r.creados, r.actualizados, r.errores], [2, 1, 2]);
});
