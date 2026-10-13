// Vista del recordatorio que recibe cada usuario: sus préstamos vencidos y los que vencen pronto.
import { cuando, diasEntre, fecha, hace, mayuscula, plural } from '../modelos/formato.js';
import { esRenovable } from '../modelos/prestamos.js';
import { esc } from './html.js';
import { ACENTO, COLOR, correoHtml, pastilla, recuadro, seccion } from './plantilla-correo.js';

/** Tarjeta de un préstamo: título, etiqueta de estado, fecha límite y una nota opcional. */
const tarjetaPrestamo = (p, { tono, estado, nota }) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px"><tr>
<td style="border:1px solid ${COLOR.borde};border-left:4px solid ${ACENTO[tono]};border-radius:10px;padding:14px 16px;background:${COLOR.tarjeta}">
<div style="font-size:16px;line-height:22px;font-weight:700;color:${COLOR.texto}">${esc(p.bookTitle)}</div>
<div style="margin-top:8px;line-height:26px">${pastilla(estado, tono)}<span style="padding-left:8px;font-size:13px;color:${COLOR.suave};white-space:nowrap">Fecha límite: ${fecha(p.dueDate)}</span></div>
${nota ? `<div style="margin-top:8px;font-size:13px;line-height:19px;color:${nota.color}">${nota.html}</div>` : ''}
</td></tr></table>`;

/**
 * @param o.usuario    { name, email }
 * @param o.vencidos   préstamos vencidos de los que toca avisar
 * @param o.porVencer  préstamos que vencen pronto de los que toca avisar
 * @param o.hoy        AAAA-MM-DD
 * @param o.biblioteca nombre de la biblioteca
 * @returns {{ asunto, html, texto }}
 */
export function correoRecordatorio({ usuario, vencidos: v, porVencer: pv, hoy, biblioteca }) {
  const quedan = (p) => diasEntre(hoy, p.dueDate); // negativo si ya venció
  const renovar = (p) => (esRenovable(p, hoy)
    ? 'Ya se puede renovar si lo necesitas más tiempo.'
    : `Podrás renovarlo a partir del ${fecha(p.renewableFrom)}.`);

  const titulo = v.length
    ? `Tienes ${plural(v.length, 'préstamo vencido', 'préstamos vencidos')}`
    : pv.length === 1 ? 'Tu préstamo vence pronto' : `Tienes ${pv.length} préstamos que vencen pronto`;
  const asunto = v.length || pv.length > 1 ? titulo : `«${pv[0].bookTitle}» vence ${cuando(quedan(pv[0]))}`;

  // --- HTML ---
  const cuerpo = [`<p style="margin:0 0 16px">Hola, <strong>${esc(usuario.name)}</strong>:</p>`];
  if (v.length) {
    cuerpo.push(
      `<p style="margin:0 0 16px">${v.length === 1 ? 'Este libro ya debería haberse devuelto' : 'Estos libros ya deberían haberse devuelto'}. Por favor, ${v.length === 1 ? 'devuélvelo' : 'devuélvelos'} cuanto antes.</p>`,
      ...v.map((p) => tarjetaPrestamo(p, { tono: 'peligro', estado: mayuscula(`vencido ${hace(-quedan(p))}`) })),
      recuadro('Mientras tengas préstamos vencidos <strong>no podrás llevarte otros libros</strong>.', 'peligro'),
    );
  }
  if (pv.length) {
    if (v.length) cuerpo.push(seccion(pv.length === 1 ? 'Además, vence pronto' : 'Además, vencen pronto', pv.length));
    else cuerpo.push(`<p style="margin:0 0 16px">${pv.length === 1 ? 'Te recordamos que este préstamo vence pronto' : 'Te recordamos que estos préstamos vencen pronto'}:</p>`);
    cuerpo.push(...pv.map((p) => tarjetaPrestamo(p, {
      tono: 'aviso',
      estado: mayuscula(`vence ${cuando(quedan(p))}`),
      nota: esRenovable(p, hoy)
        ? { color: COLOR.exito, html: `&#10003; ${renovar(p)}` }
        : { color: COLOR.suave, html: renovar(p) },
    })));
  }
  cuerpo.push(`<p style="margin:24px 0 0">Un saludo,<br><strong>${esc(biblioteca)}</strong></p>`);

  const primero = v[0] ?? pv[0];
  const html = correoHtml({
    biblioteca,
    etiqueta: 'Recordatorio de préstamos',
    titulo,
    vistaPrevia: v.length
      ? `«${primero.bookTitle}» venció el ${fecha(primero.dueDate)}. Devuélvelo cuanto antes.`
      : `«${primero.bookTitle}» vence el ${fecha(primero.dueDate)}.`,
    cuerpo: cuerpo.join('\n'),
    pie: `Mensaje automático de ${esc(biblioteca)}.<br>Si ya devolviste ${v.length + pv.length === 1 ? 'el libro' : 'los libros'}, no tengas en cuenta este aviso.`,
  });

  // --- Texto plano (clientes que no muestran HTML) ---
  const texto = [`Hola, ${usuario.name}:`, ''];
  if (v.length) {
    texto.push(v.length === 1 ? 'Este libro ya debería haberse devuelto:' : 'Estos libros ya deberían haberse devuelto:',
      ...v.map((p) => `- «${p.bookTitle}»: venció el ${fecha(p.dueDate)} (${hace(-quedan(p))}).`), '',
      `Por favor, ${v.length === 1 ? 'devuélvelo' : 'devuélvelos'} cuanto antes. Mientras tengas préstamos vencidos no podrás llevarte otros libros.`, '');
  }
  if (pv.length) {
    const frase = pv.length === 1 ? 'este préstamo vence pronto:' : 'estos préstamos vencen pronto:';
    texto.push(v.length ? `Además, ${frase}` : mayuscula(frase),
      ...pv.map((p) => `- «${p.bookTitle}»: vence ${cuando(quedan(p))}, el ${fecha(p.dueDate)}. ${renovar(p)}`), '');
  }
  texto.push('Un saludo,', biblioteca);

  return { asunto, html, texto: texto.join('\n') };
}
