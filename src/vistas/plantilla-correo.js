// Plantilla común de los correos: cabecera con degradado, tarjeta blanca, pie y piezas reutilizables.
// Usa los colores de la web de la biblioteca. Todo va con estilos en línea y tablas: es lo único
// que respetan por igual Gmail, Outlook y los clientes de móvil.
import { esc } from './html.js';

export const COLOR = {
  marca: '#4f46e5', marca2: '#7c3aed', marcaSuave: '#eef2ff',
  texto: '#0f172a', suave: '#64748b', borde: '#e2e8f0', fondo: '#f1f5f9', tarjeta: '#ffffff', sutil: '#f8fafc',
  peligro: '#dc2626', peligroSuave: '#fef2f2', peligroBorde: '#fecaca',
  aviso: '#b45309', avisoSuave: '#fffbeb', avisoBorde: '#fde68a',
  exito: '#047857', exitoSuave: '#ecfdf5', exitoBorde: '#a7f3d0',
};
/** Color vivo de las líneas laterales de tarjetas y recuadros. */
export const ACENTO = { peligro: '#ef4444', aviso: '#f59e0b', exito: '#10b981', marca: COLOR.marca, neutro: '#94a3b8' };
/** [texto, fondo, borde] de cada tono. */
export const TONOS = {
  peligro: [COLOR.peligro, COLOR.peligroSuave, COLOR.peligroBorde],
  aviso: [COLOR.aviso, COLOR.avisoSuave, COLOR.avisoBorde],
  exito: [COLOR.exito, COLOR.exitoSuave, COLOR.exitoBorde],
  marca: [COLOR.marca, COLOR.marcaSuave, '#c7d2fe'],
  neutro: [COLOR.suave, COLOR.sutil, COLOR.borde],
};
const FUENTE = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Etiqueta redondeada de estado («Vencido hace 6 días»). */
export const pastilla = (texto, tono = 'neutro') => {
  const [color, fondo, borde] = TONOS[tono];
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${fondo};border:1px solid ${borde};color:${color};font-size:12px;font-weight:600;line-height:18px;white-space:nowrap">${esc(texto)}</span>`;
};

/** Recuadro de color para mensajes importantes. */
export const recuadro = (html, tono = 'marca', margen = '20px 0 0') => {
  const [, fondo, borde] = TONOS[tono];
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:${margen}"><tr>
<td style="background:${fondo};border:1px solid ${borde};border-left:4px solid ${ACENTO[tono]};border-radius:8px;padding:12px 16px;font-size:14px;line-height:21px;color:${COLOR.texto}">${html}</td></tr></table>`;
};

/** Título de sección dentro del cuerpo, con contador opcional. */
export const seccion = (titulo, cantidad) => `<h2 style="margin:28px 0 10px;font-size:15px;line-height:22px;font-weight:700;color:${COLOR.texto}">${esc(titulo)}${
  cantidad === undefined ? '' : ` <span style="display:inline-block;margin-left:4px;padding:0 8px;border-radius:999px;background:${COLOR.marcaSuave};color:${COLOR.marca};font-size:12px;line-height:20px;vertical-align:1px">${cantidad}</span>`}</h2>`;

/**
 * Documento completo del correo.
 * @param o.etiqueta    texto pequeño sobre el título («RECORDATORIO DE PRÉSTAMOS»)
 * @param o.vistaPrevia texto que muestran los clientes de correo junto al asunto
 * @param o.cuerpo      HTML del contenido
 * @param o.pie         HTML del pie (ya escapado)
 * @param o.cabecera    color de la cabecera: 'marca' (índigo), 'peligro' (rojo) o 'exito' (verde)
 */
export function correoHtml({ biblioteca, etiqueta, titulo, subtitulo = '', vistaPrevia = '', cuerpo, pie, cabecera = 'marca' }) {
  const [desde, hasta, claro] = {
    marca: [COLOR.marca, COLOR.marca2, '#c7d2fe'],
    peligro: ['#dc2626', '#9f1239', '#fecaca'],
    exito: ['#059669', '#0f766e', '#a7f3d0'],
  }[cabecera];
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:${COLOR.fondo};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLOR.fondo}">${esc(vistaPrevia)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLOR.fondo}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;font-family:${FUENTE}">
<tr><td style="background:${desde};background-image:linear-gradient(135deg,${desde},${hasta});border-radius:14px 14px 0 0;padding:24px 28px">
  <table role="presentation" cellspacing="0" cellpadding="0"><tr>
    <td style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.18);text-align:center;font-size:19px;line-height:36px">&#128214;</td>
    <td style="padding-left:12px;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.2px">${esc(biblioteca)}</td>
  </tr></table>
  <div style="margin-top:20px;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${claro}">${esc(etiqueta)}</div>
  <div style="margin-top:4px;font-size:24px;line-height:31px;font-weight:700;color:#ffffff">${esc(titulo)}</div>
  ${subtitulo ? `<div style="margin-top:6px;font-size:14px;line-height:20px;color:#ffffff;opacity:0.9">${esc(subtitulo)}</div>` : ''}
</td></tr>
<tr><td style="background:${COLOR.tarjeta};border:1px solid ${COLOR.borde};border-top:0;border-radius:0 0 14px 14px;padding:28px;font-size:15px;line-height:23px;color:${COLOR.texto}">
${cuerpo}
</td></tr>
<tr><td style="padding:18px 28px 0;text-align:center;font-size:12px;line-height:18px;color:${COLOR.suave}">${pie}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
