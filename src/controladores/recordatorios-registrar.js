// Nodo «Registrar envíos» (Recordatorios de préstamos): apunta en la memoria los avisos enviados.
// Los correos que fallan salen por la otra rama («No enviados») y, como no se apuntan aquí,
// se vuelven a intentar en la siguiente ejecución.
import { registrarEnvio } from '../modelos/prestamos.js';

export default function registrarEnvios({ $, $input, hoy, memoria }) {
  return $input.all().map((_, i) => {
    const correo = $('Preparar avisos').itemMatching(i).json;
    registrarEnvio(memoria, correo.avisos, hoy);
    return { json: { usuario: correo.usuario, para: correo.para, asunto: correo.asunto, avisos: correo.avisos.length } };
  });
}
