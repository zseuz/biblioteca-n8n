// Vistas de los avisos del servidor: caída (cabecera roja) y recuperación (cabecera verde).
import { duracion, fechaHora } from '../modelos/formato.js';
import { esc } from './html.js';
import { COLOR, correoHtml, recuadro } from './plantilla-correo.js';

/** Tabla de datos «etiqueta: valor» del aviso. */
const tablaDatos = (filas) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;border-collapse:collapse">
${filas.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid ${COLOR.borde};font-size:13px;color:${COLOR.suave};width:40%;vertical-align:top">${k}</td>
<td style="padding:9px 0;border-bottom:1px solid ${COLOR.borde};font-size:14px;color:${COLOR.texto};word-break:break-word">${v}</td></tr>`).join('')}
</table>`;
const enlace = (url) => `<a href="${esc(url)}" style="color:${COLOR.marca};text-decoration:none">${esc(url)}</a>`;
const PIE_SERVIDOR = 'Aviso automático de n8n. Se comprueba cada pocos minutos.';

/**
 * @param o.aviso      { desde, fallos, motivo } (modelos/salud.js)
 * @param o.url        dirección que se comprueba
 * @returns {{ asunto, html, texto }}
 */
export function correoCaida({ aviso, url, biblioteca }) {
  const { desde, fallos, motivo } = aviso;
  return {
    asunto: `${biblioteca}: el servidor no responde`,
    html: correoHtml({
      biblioteca,
      cabecera: 'peligro',
      etiqueta: 'Estado del servidor',
      titulo: 'El servidor no responde',
      subtitulo: `Desde el ${fechaHora(desde)}.`,
      vistaPrevia: `El backend no responde: ${motivo}`,
      cuerpo: recuadro(`El backend de <strong>${esc(biblioteca)}</strong> no responde. Mientras tanto, la web no puede consultar ni registrar préstamos.`, 'peligro', '0')
        + tablaDatos([
          ['Sin servicio desde', fechaHora(desde)],
          ['Comprobaciones fallidas', String(fallos)],
          ['Motivo', `<code style="font-family:Consolas,Menlo,monospace;font-size:13px;background:${COLOR.sutil};padding:1px 4px;border-radius:4px">${esc(motivo)}</code>`],
          ['Comprobación', enlace(url)],
        ])
        + `<p style="margin:20px 0 0;font-size:14px;color:${COLOR.suave}">Te avisaremos de nuevo cuando vuelva a funcionar.</p>`,
      pie: PIE_SERVIDOR,
    }),
    texto: `El backend de ${biblioteca} no responde desde el ${fechaHora(desde)} `
      + `(${fallos} comprobaciones fallidas seguidas).\n\n`
      + `Motivo: ${motivo}\nComprobación: ${url}\n\n`
      + 'Te avisaremos de nuevo cuando vuelva a funcionar.',
  };
}

/**
 * @param o.aviso { desde, hasta, minutos } (modelos/salud.js)
 * @returns {{ asunto, html, texto }}
 */
export function correoRecuperacion({ aviso, url, biblioteca }) {
  const { desde, hasta, minutos } = aviso;
  const tiempo = duracion(minutos);
  return {
    asunto: `${biblioteca}: el servidor vuelve a funcionar`,
    html: correoHtml({
      biblioteca,
      cabecera: 'exito',
      etiqueta: 'Estado del servidor',
      titulo: 'El servidor vuelve a funcionar',
      subtitulo: `Estuvo sin servicio aproximadamente ${tiempo}.`,
      vistaPrevia: `El backend vuelve a responder tras ${tiempo} sin servicio.`,
      cuerpo: recuadro(`&#10003; El backend de <strong>${esc(biblioteca)}</strong> vuelve a responder con normalidad.`, 'exito', '0')
        + tablaDatos([
          ['Sin servicio desde', fechaHora(desde)],
          ['Recuperado', fechaHora(hasta)],
          ['Duración', `aproximadamente ${tiempo}`],
          ['Comprobación', enlace(url)],
        ]),
      pie: PIE_SERVIDOR,
    }),
    texto: `El backend de ${biblioteca} vuelve a responder (${fechaHora(hasta)}).\n`
      + `Estuvo sin servicio aproximadamente ${tiempo}, desde el ${fechaHora(desde)}.\n\nComprobación: ${url}`,
  };
}
