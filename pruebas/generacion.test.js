// Pruebas de la generación: el código de cada nodo es válido y workflows/ está al día con src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DateTime } from 'luxon';
import { FLUJOS, generarFlujos } from '../scripts/generar.mjs';

const generados = await generarFlujos();
const codigos = Object.entries(generados).flatMap(([archivo, json]) => JSON.parse(json).nodes
  .filter((n) => n.type === 'n8n-nodes-base.code')
  .map((n) => ({ archivo, nodo: n.name, codigo: n.parameters.jsCode })));

test('cada nodo Code es JavaScript válido, sin import/export', () => {
  assert.equal(codigos.length, 6);
  const AsyncFunction = (async () => {}).constructor;
  for (const { archivo, nodo, codigo } of codigos) {
    assert.doesNotMatch(codigo, /^\s*(import|export)\s/m, `${archivo} › ${nodo}`);
    assert.doesNotThrow(() => new AsyncFunction('$', '$input', '$today', '$now', '$getWorkflowStaticData', 'DateTime', codigo), `${archivo} › ${nodo}`);
  }
});

test('el código empaquetado funciona igual que n8n lo ejecutaría', async () => {
  const { codigo } = codigos.find((c) => c.nodo === '¿Hay que avisar?');
  const AsyncFunction = (async () => {}).constructor;
  const ejecutar = new AsyncFunction('$', '$input', '$today', '$now', '$getWorkflowStaticData', 'DateTime', codigo);
  const memoria = {};
  const $ = () => ({ first: () => ({ json: { nombreBiblioteca: 'Biblio', urlSalud: 'http://x', fallosParaAvisar: 1 } }) });
  const $input = { first: () => ({ json: { error: { message: 'ECONNREFUSED' } } }) };
  const ahora = DateTime.fromISO('2026-10-13T10:00:00-05:00', { setZone: true });
  const salida = await ejecutar.call({ helpers: {} }, $, $input, ahora.startOf('day'), ahora, () => memoria, DateTime);
  assert.equal(salida[0].json.asunto, 'Biblio: el servidor no responde');
  assert.equal(memoria.avisado, true);
});

test('workflows/ está al día (ejecuta «npm run generar» si falla)', () => {
  for (const archivo of Object.keys(FLUJOS)) {
    const actual = readFileSync(new URL(`../workflows/${archivo}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(actual, generados[archivo], `workflows/${archivo} no coincide con src/`);
  }
});
