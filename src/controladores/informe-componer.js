// Nodo «Componer informe» (Informe semanal): reúne las respuestas de la API y compone el correo.
import { datosInforme } from '../modelos/informe.js';
import { correoInforme } from '../vistas/correo-informe.js';

export default function componerInforme({ $, hoy }) {
  const cfg = $('Configuración').first().json;
  const paginas = (nodo) => $(nodo).all().flatMap((i) => i.json.content ?? []);
  const datos = datosInforme({
    stats: $('Estadísticas').first().json,
    libros: $('Libros').all().map((i) => i.json),
    vencidos: paginas('Préstamos vencidos'),
    enPlazo: paginas('Préstamos en plazo'),
    recientes: paginas('Préstamos recientes'),
    hoy,
  });
  const correo = correoInforme({ datos, usuarios: $('Usuarios').all().map((i) => i.json), biblioteca: cfg.nombreBiblioteca });
  return [{ json: { para: cfg.correoBibliotecario, ...correo } }];
}
