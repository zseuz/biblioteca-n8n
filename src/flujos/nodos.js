// Piezas para construir los flujos de n8n (nodos y conexiones) sin escribir el JSON a mano.
import { createHash } from 'node:crypto';

/** UUID estable a partir de un texto: regenerar no cambia los ids de los nodos. */
export const uuid = (texto) => {
  const h = createHash('md5').update(texto).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

/** Expresión de n8n que lee el nodo «Configuración» del flujo. */
export const CFG = "$('Configuración').first().json";

/** Credencial SMTP que crea `npm run preparar`. */
const SMTP = { smtp: { id: 'bibSmtpCorreo001', name: 'SMTP Biblioteca' } };

/** Posición horizontal del paso `i` en el lienzo y altura de la fila principal. */
export const x = (i) => i * 220;
export const Y = 300;

/**
 * Flujo completo.
 * @param conexiones lista de [desde, hacia, salida]; la salida 1 es la de error de los nodos
 *                   con «continueErrorOutput».
 */
export function flujo({ id, nombre, nodos, conexiones, nota }) {
  const nodes = nodos.map((n) => ({ id: uuid(`${id}/${n.name}`), ...n }));
  if (nota) {
    nodes.unshift({
      id: uuid(`${id}/nota`),
      name: 'Nota',
      type: 'n8n-nodes-base.stickyNote',
      typeVersion: 1,
      position: nota.position,
      parameters: { content: nota.texto, height: nota.alto, width: nota.ancho, color: 7 },
    });
  }
  const connections = {};
  for (const [desde, hacia, salida = 0] of conexiones) {
    connections[desde] ??= { main: [] };
    while (connections[desde].main.length <= salida) connections[desde].main.push([]);
    connections[desde].main[salida].push({ node: hacia, type: 'main', index: 0 });
  }
  return {
    id,
    name: nombre,
    active: false,
    nodes,
    connections,
    settings: { executionOrder: 'v1', timezone: 'America/Bogota', saveManualExecutions: true },
    staticData: null,
    pinData: {},
    tags: [],
  };
}

/** Disparador programado (`regla` con el formato del nodo Schedule Trigger). */
export const programa = (name, regla, posicion) => ({
  name,
  type: 'n8n-nodes-base.scheduleTrigger',
  typeVersion: 1.2,
  position: posicion,
  parameters: { rule: { interval: [regla] } },
});

/** Nodo «Configuración»: los valores que `npm run preparar` rellena desde config.json. */
export const configuracion = (campos, posicion, extra = {}) => ({
  name: 'Configuración',
  type: 'n8n-nodes-base.set',
  typeVersion: 3.4,
  position: posicion,
  parameters: {
    assignments: {
      assignments: Object.entries(campos).map(([name, value]) => ({
        id: uuid(`campo/${name}`),
        name,
        value,
        type: typeof value === 'number' ? 'number' : 'string',
      })),
    },
    ...extra,
    options: extra.options ?? {},
  },
});

/**
 * Petición GET a la API de la biblioteca (una sola vez, aunque lleguen varios elementos).
 * @param o.paginar recorre las páginas del historial de préstamos (page/totalPages)
 * @param o.fin     condición extra para dejar de pedir páginas
 * @param o.siempre sigue el flujo aunque la respuesta sea una lista vacía
 */
export const consulta = (name, ruta, query, posicion, { paginar, fin, siempre } = {}) => ({
  name,
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: posicion,
  executeOnce: true,
  ...(siempre ? { alwaysOutputData: true } : {}),
  parameters: {
    url: `={{ ${CFG}.apiUrl }}${ruta}`,
    ...(query.length
      ? { sendQuery: true, queryParameters: { parameters: query.map(([n, v]) => ({ name: n, value: v })) } }
      : {}),
    options: paginar
      ? {
          pagination: {
            pagination: {
              paginationMode: 'updateAParameterInEachRequest',
              parameters: { parameters: [{ type: 'qs', name: 'page', value: '={{ $pageCount }}' }] },
              paginationCompleteWhen: 'other',
              completeExpression: `={{ $response.body.page + 1 >= $response.body.totalPages${fin ? ` || ${fin}` : ''} }}`,
              limitPagesFetched: true,
              maxRequests: 100,
            },
          },
        }
      : {},
  },
});

/**
 * Envío de correo por SMTP con la versión HTML y la de texto de `$json`.
 * @param o.para          expresión del destinatario (por defecto, `$json.para`)
 * @param o.alErrorSeguir los correos que fallan salen por una segunda salida en vez de parar el flujo
 */
export const correo = (name, posicion, { para = '={{ $json.para }}', alErrorSeguir = false } = {}) => ({
  name,
  type: 'n8n-nodes-base.emailSend',
  typeVersion: 2.1,
  position: posicion,
  webhookId: uuid(`webhook/${name}/${posicion}`),
  ...(alErrorSeguir ? { onError: 'continueErrorOutput' } : {}),
  credentials: SMTP,
  parameters: {
    fromEmail: `={{ ${CFG}.nombreBiblioteca }} <{{ ${CFG}.correoRemitente }}>`,
    toEmail: para,
    subject: '={{ $json.asunto }}',
    emailFormat: 'both',
    text: '={{ $json.texto }}',
    html: '={{ $json.html }}',
    options: { appendAttribution: false },
  },
});

/**
 * Nodo Code cuyo código sale de un controlador de src/controladores.
 * `npm run generar` sustituye `controlador` por el código empaquetado.
 */
export const nodoCodigo = (name, controlador, posicion) => ({
  name,
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: posicion,
  parameters: { jsCode: null },
  controlador,
});
