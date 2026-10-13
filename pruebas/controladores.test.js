// Pruebas de los controladores con un n8n simulado (nodos anteriores, memoria y helpers falsos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import prepararAvisos from '../src/controladores/recordatorios-preparar.js';
import registrarEnvios from '../src/controladores/recordatorios-registrar.js';
import comprobarServidor from '../src/controladores/servidor-comprobar.js';
import importarLibros from '../src/controladores/importar-libros.js';

/** Imita `$('Nodo')` de n8n a partir de { nodo: [json, ...] }. */
const nodos = (datos) => (nombre) => {
  const items = (datos[nombre] ?? []).map((json) => ({ json }));
  return { first: () => items[0], all: () => items, itemMatching: (i) => items[i] };
};
const entrada = (items) => ({ first: () => items[0], all: () => items });

test('Preparar avisos y Registrar envíos: modo de pruebas y memoria', () => {
  const memoria = {};
  const $ = nodos({
    Configuración: [{ nombreBiblioteca: 'Biblio', correoPruebas: 'yo@x.test', diasAntesDeVencer: 3, repetirVencidosCadaDias: 7 }],
    Usuarios: [{ id: 1, name: 'Ana', email: 'ana@x.test' }],
    'Préstamos vencidos': [{ content: [{ id: 1, memberId: 1, bookTitle: 'Rayuela', dueDate: '2026-10-07', renewableFrom: '2026-10-02' }] }],
    'Préstamos en plazo': [{ content: [] }],
  });
  const correos = prepararAvisos({ $, hoy: '2026-10-13', memoria });
  assert.equal(correos.length, 1);
  assert.equal(correos[0].json.para, 'yo@x.test');
  assert.equal(correos[0].json.asunto, '[PRUEBA para ana@x.test] Tienes 1 préstamo vencido');

  const $tras = (nombre) => (nombre === 'Preparar avisos' ? nodos({ 'Preparar avisos': correos.map((c) => c.json) })(nombre) : $(nombre));
  registrarEnvios({ $: $tras, $input: entrada([{ json: {} }]), hoy: '2026-10-13', memoria });
  assert.deepEqual(memoria.vencidos, { 1: '2026-10-13' });
  assert.equal(prepararAvisos({ $, hoy: '2026-10-13', memoria }).length, 0, 'no se repite el mismo día');
});

test('¿Hay que avisar?: devuelve el correo de caída en el segundo fallo', () => {
  const memoria = {};
  const $ = nodos({ Configuración: [{ nombreBiblioteca: 'Biblio', urlSalud: 'http://x/health', fallosParaAvisar: 2 }] });
  const fallo = entrada([{ json: { statusCode: 503, body: { status: 'DOWN' } } }]);
  const ahora = '2026-10-13T10:00:00.000-05:00';
  assert.deepEqual(comprobarServidor({ $, $input: fallo, ahora, memoria }), []);
  const [aviso] = comprobarServidor({ $, $input: fallo, ahora, memoria });
  assert.equal(aviso.json.asunto, 'Biblio: el servidor no responde');
});

test('Importar libros: lee el binario y llama a la API mediante los helpers de n8n', async () => {
  const peticiones = [];
  const helpers = {
    getBinaryDataBuffer: async () => Buffer.from('titulo;autor;genero\nDune;Frank Herbert;Novela\n'),
    async httpRequest(opciones) {
      assert.equal(this, helpers, 'se llama como método de helpers');
      peticiones.push(`${opciones.method} ${opciones.url}`);
      if (opciones.url.endsWith('/duplicates')) return { statusCode: 200, body: { sameBook: null, differentGenre: [] } };
      return { statusCode: 201, body: { id: 1, totalCopies: 1 } };
    },
  };
  const $ = nodos({ Configuración: [{ apiUrl: 'http://api/' }] });
  const [resultado] = await importarLibros({ $, $input: entrada([{ json: {}, binary: { Archivo_CSV: {} } }]), helpers });
  assert.deepEqual(peticiones, ['GET http://api/books/duplicates', 'POST http://api/books']);
  assert.equal(resultado.json.resumen, '1 libro nuevo · 0 con ejemplares sumados · 0 filas con error');
  assert.equal(resultado.json.creados, 1);
});
