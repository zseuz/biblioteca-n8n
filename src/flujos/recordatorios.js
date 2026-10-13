// Flujo «Recordatorios de préstamos»: cada día, un correo por usuario con lo pendiente.
import { CFG, Y, configuracion, consulta, correo, flujo, nodoCodigo, programa, x } from './nodos.js';

export default flujo({
  id: 'bibRecordatorios',
  nombre: 'Biblioteca · Recordatorios de préstamos',
  nota: {
    position: [x(0) - 20, 20],
    ancho: 1340,
    alto: 220,
    texto: `## Recordatorios de préstamos
Cada día a las 9:00 envía **un correo por usuario** con sus préstamos **vencidos** y los que **vencen pronto** (\`diasAntesDeVencer\`), indicando si ya se pueden renovar.

- Si un correo falla, aparece en **No enviados** y se reintenta en la siguiente ejecución.
- No repite avisos: «vence pronto» se envía una vez por fecha límite; «vencido», una vez y luego cada \`repetirVencidosCadaDias\` días. *(Esta memoria solo se guarda con el flujo activado; al probar desde el editor siempre salen todos.)*
- **Modo de pruebas:** mientras \`correoPruebas\` tenga una dirección, todos los correos llegan ahí (el asunto dice a quién iban). Déjalo vacío para enviarlos a los usuarios.
- Edita los valores en **Configuración**.`,
  },
  nodos: [
    programa('Cada día a las 9:00', { field: 'days', triggerAtHour: 9 }, [x(0), Y]),
    configuracion({
      apiUrl: 'http://localhost:8080/api',
      nombreBiblioteca: 'Biblioteca',
      correoRemitente: 'biblioteca@example.com',
      correoPruebas: 'tu-correo@example.com',
      diasAntesDeVencer: 3,
      repetirVencidosCadaDias: 7,
    }, [x(1), Y]),
    consulta('Usuarios', '/members', [], [x(2), Y], { siempre: true }),
    consulta('Préstamos vencidos', '/loans', [['status', 'OVERDUE'], ['size', '100']], [x(3), Y], { paginar: true }),
    consulta('Préstamos en plazo', '/loans', [['status', 'ACTIVE'], ['sort', 'dueDate'], ['direction', 'asc'], ['size', '100']], [x(4), Y], {
      paginar: true,
      // ordenados por vencimiento: en cuanto una página pasa del margen de aviso, no hace falta seguir
      fin: `($response.body.content.at(-1)?.dueDate ?? '') > $today.plus({ days: ${CFG}.diasAntesDeVencer }).toISODate()`,
    }),
    nodoCodigo('Preparar avisos', 'recordatorios-preparar', [x(5), Y]),
    correo('Enviar correo', [x(6), Y], { alErrorSeguir: true }),
    nodoCodigo('Registrar envíos', 'recordatorios-registrar', [x(7), Y - 100]),
    nodoCodigo('No enviados', 'recordatorios-fallidos', [x(7), Y + 100]),
  ],
  conexiones: [
    ['Cada día a las 9:00', 'Configuración'],
    ['Configuración', 'Usuarios'],
    ['Usuarios', 'Préstamos vencidos'],
    ['Préstamos vencidos', 'Préstamos en plazo'],
    ['Préstamos en plazo', 'Preparar avisos'],
    ['Preparar avisos', 'Enviar correo'],
    ['Enviar correo', 'Registrar envíos'],
    ['Enviar correo', 'No enviados', 1],
  ],
});
