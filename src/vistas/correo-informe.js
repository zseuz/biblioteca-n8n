// Vista del informe semanal que recibe el bibliotecario.
import { diasEntre, fecha, fechaCorta, mes, plural, rangoFechas } from '../modelos/formato.js';
import { esc } from './html.js';
import { COLOR, TONOS, correoHtml, pastilla, recuadro, seccion } from './plantilla-correo.js';

const th = (t, alinear = 'left') => `<th style="text-align:${alinear};padding:8px 10px;background:${COLOR.sutil};border-bottom:1px solid ${COLOR.borde};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:${COLOR.suave}">${t}</th>`;
const td = (t, alinear = 'left', extra = '') => `<td style="text-align:${alinear};padding:10px;border-bottom:1px solid ${COLOR.borde};font-size:14px;line-height:20px;color:${COLOR.texto};${extra}">${t}</td>`;
const tabla = (cabecera, filas) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid ${COLOR.borde};border-radius:10px">
<tr>${cabecera.join('')}</tr>${filas.map((f) => `<tr>${f.join('')}</tr>`).join('')}</table>`;
const vacio = (texto, tono = 'exito') => recuadro(tono === 'exito' ? `&#10003; ${esc(texto)}` : esc(texto), tono, '0');
const libro = (titulo) => `<strong style="font-weight:600">${esc(titulo)}</strong>`;

/** Barra horizontal proporcional (para «más prestados» y «por mes»). */
const barra = (valor, maximo) => {
  const ancho = Math.max(4, Math.round((valor / Math.max(1, maximo)) * 100));
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td width="${ancho}%" style="height:10px;border-radius:999px;background:${COLOR.marca};background-image:linear-gradient(90deg,${COLOR.marca},${COLOR.marca2});font-size:0;line-height:0">&nbsp;</td>
<td style="font-size:0;line-height:0">&nbsp;</td></tr></table>`;
};

/** Indicadores: bloques que se recolocan solos en pantallas estrechas. */
const tarjetasIndicadores = (indicadores) => `<div style="text-align:center;font-size:0;margin:0 -4px">${indicadores.map(({ nombre, valor, alerta }) => {
  const tono = !alerta ? 'marca' : valor > 0 ? 'peligro' : 'exito';
  const color = tono === 'marca' ? COLOR.texto : TONOS[tono][0];
  const fondo = tono === 'marca' ? COLOR.sutil : TONOS[tono][1];
  const borde = tono === 'marca' ? COLOR.borde : TONOS[tono][2];
  // 5 × (86 + 8 de relleno + 2 de borde + 8 de margen) = 520 px: caben en una fila del correo (548 px útiles)
  return `<div style="display:inline-block;vertical-align:top;width:86px;margin:4px;padding:12px 4px;border:1px solid ${borde};border-radius:10px;background:${fondo};text-align:center">
<div style="font-size:24px;line-height:30px;font-weight:700;color:${color}">${valor}</div>
<div style="font-size:12px;line-height:16px;color:${COLOR.suave}">${nombre}</div></div>`;
}).join('')}</div>`;

/**
 * @param o.datos      resultado de `datosInforme` (modelos/informe.js)
 * @param o.usuarios   respuesta de GET /members (para enlazar el correo de cada usuario)
 * @param o.biblioteca nombre de la biblioteca
 * @returns {{ asunto, html, texto }}
 */
export function correoInforme({ datos, usuarios, biblioteca }) {
  const { hoy, inicioSemana, vencidos, proximos, nuevos, agotados, masPrestados, porMes, indicadores } = datos;
  const correos = new Map(usuarios.map((u) => [u.id, u.email]));
  const contacto = (memberId, nombre) => (correos.get(memberId)
    ? `<a href="mailto:${esc(correos.get(memberId))}" style="color:${COLOR.marca};text-decoration:none">${esc(nombre)}</a>`
    : esc(nombre));
  const rango = rangoFechas(inicioSemana, hoy);
  const maxLibro = Math.max(1, ...masPrestados.map((e) => e.count));
  const maxMes = Math.max(1, ...porMes.map((m) => m.count));

  const cuerpo = [
    tarjetasIndicadores(indicadores),

    seccion('Préstamos vencidos', vencidos.length),
    vencidos.length
      ? tabla([th('Libro'), th('Usuario'), th('Retraso', 'right')],
        vencidos.map((p) => [
          td(`${libro(p.bookTitle)}<div style="font-size:12px;color:${COLOR.suave}">Venció el ${fecha(p.dueDate)}</div>`),
          td(contacto(p.memberId, p.memberName)),
          td(pastilla(`${diasEntre(p.dueDate, hoy)} días`, 'peligro'), 'right'),
        ]))
      : vacio('No hay préstamos vencidos.'),

    seccion('Vencen en los próximos 7 días', proximos.length),
    proximos.length
      ? tabla([th('Libro'), th('Usuario'), th('Vence', 'right')],
        proximos.map((p) => {
          const dias = diasEntre(hoy, p.dueDate);
          return [td(libro(p.bookTitle)), td(contacto(p.memberId, p.memberName)),
            td(pastilla(dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : fechaCorta(p.dueDate), 'aviso'), 'right')];
        }))
      : vacio('Ningún préstamo vence esta semana.'),

    seccion('Préstamos de esta semana', nuevos.length),
    nuevos.length
      ? tabla([th('Libro'), th('Usuario'), th('Fecha', 'right')],
        nuevos.map((p) => [td(libro(p.bookTitle)), td(esc(p.memberName)), td(fechaCorta(p.loanDate), 'right', `color:${COLOR.suave};white-space:nowrap`)]))
      : vacio('No se registraron préstamos esta semana.', 'neutro'),

    seccion('Libros agotados', agotados.length),
    agotados.length
      ? tabla([th('Libro'), th('Ejemplares', 'right')],
        agotados.map((l) => [td(`${libro(l.title)}<div style="font-size:12px;color:${COLOR.suave}">${esc(l.author)}</div>`),
          td(pastilla(`0 de ${l.totalCopies}`, 'aviso'), 'right')]))
      : vacio('Todos los libros tienen ejemplares disponibles.'),

    seccion('Los más prestados'),
    masPrestados.length
      ? tabla([th('Libro'), th(''), th('Préstamos', 'right')],
        masPrestados.map((e, i) => [
          td(`<span style="color:${COLOR.suave};padding-right:6px">${i + 1}.</span>${libro(e.label)}`),
          td(barra(e.count, maxLibro), 'left', 'width:30%'),
          td(String(e.count), 'right', 'font-weight:600'),
        ]))
      : vacio('Todavía no hay préstamos.', 'neutro'),

    seccion('Préstamos por mes'),
    tabla([th('Mes'), th(''), th('Préstamos', 'right')],
      porMes.map((m) => [td(mes(m.label), 'left', 'white-space:nowrap'), td(barra(m.count, maxMes), 'left', 'width:50%'),
        td(String(m.count), 'right', 'font-weight:600')])),
  ].join('\n');

  const resumen = [
    vencidos.length ? plural(vencidos.length, 'préstamo vencido', 'préstamos vencidos') : 'Sin préstamos vencidos',
    plural(nuevos.length, 'préstamo nuevo', 'préstamos nuevos'),
  ].join(' · ');

  const html = correoHtml({
    biblioteca,
    etiqueta: 'Informe semanal',
    titulo: rango,
    subtitulo: resumen,
    vistaPrevia: `${resumen}. ${proximos.length} vencen en los próximos 7 días.`,
    cuerpo,
    pie: `Generado automáticamente por n8n con los datos de ${esc(biblioteca)}.`,
  });

  // --- Versión en texto plano ---
  const lista = (items, linea) => (items.length ? items.map(linea) : ['  Ninguno.']);
  const texto = [
    `Informe semanal · ${biblioteca}`,
    rango,
    '',
    ...indicadores.map(({ nombre, valor }) => `${nombre}: ${valor}`),
    '',
    `PRÉSTAMOS VENCIDOS (${vencidos.length})`,
    ...lista(vencidos, (p) => `  - «${p.bookTitle}», ${p.memberName}: venció el ${fecha(p.dueDate)} (${diasEntre(p.dueDate, hoy)} días)`),
    '',
    `VENCEN EN LOS PRÓXIMOS 7 DÍAS (${proximos.length})`,
    ...lista(proximos, (p) => `  - «${p.bookTitle}», ${p.memberName}: vence el ${fecha(p.dueDate)}`),
    '',
    `PRÉSTAMOS DE ESTA SEMANA (${nuevos.length})`,
    ...lista(nuevos, (p) => `  - «${p.bookTitle}», ${p.memberName} (${fecha(p.loanDate)})`),
    '',
    `LIBROS AGOTADOS (${agotados.length})`,
    ...lista(agotados, (l) => `  - «${l.title}», ${l.author}`),
  ].join('\n');

  return { asunto: `Informe semanal de ${biblioteca}: ${resumen.toLowerCase()}`, html, texto };
}
