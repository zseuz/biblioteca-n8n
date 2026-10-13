// Nodo «Preparar avisos» (Recordatorios de préstamos): un correo por usuario con lo que toca avisar hoy.
import { avisosPendientes, limpiarMemoria, listaDeAvisos } from '../modelos/prestamos.js';
import { correoRecordatorio } from '../vistas/correo-recordatorio.js';

/**
 * @param n8n.$       acceso a los nodos anteriores
 * @param n8n.hoy     AAAA-MM-DD en la zona horaria del flujo
 * @param n8n.memoria datos estáticos del flujo (qué se avisó ya)
 */
export default function prepararAvisos({ $, hoy, memoria }) {
  const cfg = $('Configuración').first().json;
  const paginas = (nodo) => $(nodo).all().flatMap((i) => i.json.content ?? []);
  const vencidos = paginas('Préstamos vencidos');
  const enPlazo = paginas('Préstamos en plazo');

  limpiarMemoria(memoria, [...vencidos, ...enPlazo]);
  const pendientes = avisosPendientes({
    vencidos,
    enPlazo,
    usuarios: $('Usuarios').all().map((i) => i.json),
    memoria,
    hoy,
    diasAntesDeVencer: cfg.diasAntesDeVencer,
    repetirVencidosCadaDias: cfg.repetirVencidosCadaDias,
  });

  // Modo de pruebas: todo llega a `correoPruebas` y el asunto indica a quién iba dirigido.
  const enPruebas = Boolean(cfg.correoPruebas);
  return pendientes.map((avisos) => {
    const { usuario } = avisos;
    const { asunto, html, texto } = correoRecordatorio({ ...avisos, hoy, biblioteca: cfg.nombreBiblioteca });
    return {
      json: {
        para: enPruebas ? cfg.correoPruebas : usuario.email,
        asunto: enPruebas ? `[PRUEBA para ${usuario.email}] ${asunto}` : asunto,
        html,
        texto,
        usuario: usuario.name,
        correoUsuario: usuario.email,
        avisos: listaDeAvisos(avisos),
      },
    };
  });
}
