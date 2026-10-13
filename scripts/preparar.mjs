// Carga en n8n la credencial SMTP y los flujos de la carpeta workflows/, con los valores de config.json.
//
//   npm run preparar
//
// Ejecútalo con n8n detenido. Si ya habías importado los flujos, se sustituyen por los de la carpeta
// (los cambios hechos en el editor se pierden; descárgalos antes desde el editor si quieres conservarlos).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaConfig = join(raiz, 'config.json');
const n8n = join(raiz, 'node_modules', 'n8n', 'bin', 'n8n');

function salir(mensaje) {
  console.error(`\n✖ ${mensaje}\n`);
  process.exit(1);
}

if (!existsSync(n8n)) salir('No encuentro n8n. Ejecuta primero «npm install».');
if (!existsSync(rutaConfig)) salir('Falta config.json. Copia config.example.json como config.json y rellena tus datos.');

let config;
try {
  config = JSON.parse(readFileSync(rutaConfig, 'utf8'));
} catch (e) {
  salir(`config.json no es un JSON válido: ${e.message}`);
}

const { correo = {}, smtp = {}, recordatorios = {}, avisoCaida = {} } = config;
const faltan = [
  ['api', config.api],
  ['correo.remitente', correo.remitente],
  ['correo.bibliotecario', correo.bibliotecario],
  ['smtp.host', smtp.host],
].filter(([, valor]) => !valor).map(([clave]) => clave);
if (faltan.length) salir(`Faltan valores en config.json: ${faltan.join(', ')}`);

const api = config.api.replace(/\/+$/, '');
// Valores que se escriben en el nodo «Configuración» de cada flujo (solo los campos que ese flujo usa).
const valores = {
  apiUrl: `${api}/api`,
  urlSalud: `${api}/actuator/health`,
  nombreBiblioteca: config.nombreBiblioteca ?? 'Biblioteca',
  correoRemitente: correo.remitente,
  correoBibliotecario: correo.bibliotecario,
  correoPruebas: correo.pruebas ?? '',
  diasAntesDeVencer: recordatorios.diasAntesDeVencer ?? 3,
  repetirVencidosCadaDias: recordatorios.repetirVencidosCadaDias ?? 7,
  fallosParaAvisar: avisoCaida.fallosParaAvisar ?? 2,
};

function ejecutarN8n(...args) {
  const r = spawnSync(process.execPath, [n8n, ...args], { stdio: 'inherit', cwd: raiz });
  if (r.status !== 0) salir(`Falló «n8n ${args.join(' ')}». ¿Está n8n en marcha? Detenlo y vuelve a intentarlo.`);
}

const temporal = mkdtempSync(join(tmpdir(), 'biblioteca-n8n-'));
try {
  // 1. Credencial SMTP (n8n la cifra al importarla; el archivo temporal se borra al terminar).
  const credencial = join(temporal, 'credenciales.json');
  writeFileSync(credencial, JSON.stringify([{
    id: 'bibSmtpCorreo001',
    name: 'SMTP Biblioteca',
    type: 'smtp',
    data: {
      host: smtp.host,
      port: smtp.port ?? 465,
      secure: smtp.secure ?? true,
      user: smtp.user ?? '',
      password: smtp.password ?? '',
      disableStartTls: smtp.disableStartTls ?? false,
    },
  }]));
  console.log('→ Importando la credencial «SMTP Biblioteca»…');
  ejecutarN8n('import:credentials', `--input=${credencial}`);

  // 2. Flujos con la configuración aplicada.
  const carpetaFlujos = join(temporal, 'flujos');
  mkdirSync(carpetaFlujos);
  const archivos = readdirSync(join(raiz, 'workflows')).filter((f) => f.endsWith('.json'));
  for (const archivo of archivos) {
    const flujo = JSON.parse(readFileSync(join(raiz, 'workflows', archivo), 'utf8'));
    const nodo = flujo.nodes.find((n) => n.name === 'Configuración');
    for (const campo of nodo?.parameters.assignments.assignments ?? []) {
      if (campo.name in valores) campo.value = valores[campo.name];
    }
    if (config.zonaHoraria) flujo.settings = { ...flujo.settings, timezone: config.zonaHoraria };
    writeFileSync(join(carpetaFlujos, archivo), JSON.stringify(flujo));
  }
  console.log(`→ Importando ${archivos.length} flujos…`);
  ejecutarN8n('import:workflow', '--separate', `--input=${carpetaFlujos}`);
} finally {
  rmSync(temporal, { recursive: true, force: true });
}

console.log(`
✔ Listo. Arranca n8n con «npm start», abre http://localhost:5678 y activa los flujos que quieras usar.
  ${valores.correoPruebas
    ? `Modo de pruebas: los recordatorios llegarán a ${valores.correoPruebas}, no a los usuarios.`
    : 'Los recordatorios se enviarán a los correos reales de los usuarios.'}
`);
