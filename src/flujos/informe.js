// Flujo «Informe semanal»: cada lunes, un resumen en HTML para el bibliotecario.
import { Y, configuracion, consulta, correo, flujo, nodoCodigo, programa, x } from './nodos.js';

export default flujo({
  id: 'bibInformeSemana',
  nombre: 'Biblioteca · Informe semanal',
  nota: {
    position: [x(0) - 20, 40],
    ancho: 1780,
    alto: 200,
    texto: `## Informe semanal
Cada lunes a las 8:00 envía a \`correoBibliotecario\` un resumen en HTML: indicadores, **préstamos vencidos** (con enlace para escribir al usuario), los que **vencen en 7 días**, los **préstamos de la semana**, **libros agotados**, los **más prestados** y la evolución **por mes**.

Edita los valores en **Configuración**. Para recibirlo ahora, pulsa *Execute workflow*.`,
  },
  nodos: [
    programa('Cada lunes a las 8:00', { field: 'weeks', triggerAtDay: [1], triggerAtHour: 8 }, [x(0), Y]),
    configuracion({
      apiUrl: 'http://localhost:8080/api',
      nombreBiblioteca: 'Biblioteca',
      correoRemitente: 'biblioteca@example.com',
      correoBibliotecario: 'tu-correo@example.com',
    }, [x(1), Y]),
    consulta('Estadísticas', '/stats', [], [x(2), Y]),
    consulta('Libros', '/books', [], [x(3), Y], { siempre: true }),
    consulta('Usuarios', '/members', [], [x(4), Y], { siempre: true }),
    consulta('Préstamos vencidos', '/loans', [['status', 'OVERDUE'], ['sort', 'dueDate'], ['direction', 'asc'], ['size', '100']], [x(5), Y], { paginar: true }),
    consulta('Préstamos en plazo', '/loans', [['status', 'ACTIVE'], ['sort', 'dueDate'], ['direction', 'asc'], ['size', '100']], [x(6), Y], {
      paginar: true,
      fin: "($response.body.content.at(-1)?.dueDate ?? '') > $today.plus({ days: 7 }).toISODate()",
    }),
    consulta('Préstamos recientes', '/loans', [['size', '100']], [x(7), Y], {
      paginar: true,
      // sin «sort» la API los devuelve del más reciente al más antiguo
      fin: "($response.body.content.at(-1)?.loanDate ?? '9999') < $today.minus({ days: 6 }).toISODate()",
    }),
    nodoCodigo('Componer informe', 'informe-componer', [x(8), Y]),
    correo('Enviar informe', [x(9), Y]),
  ],
  conexiones: [
    ['Cada lunes a las 8:00', 'Configuración'],
    ['Configuración', 'Estadísticas'],
    ['Estadísticas', 'Libros'],
    ['Libros', 'Usuarios'],
    ['Usuarios', 'Préstamos vencidos'],
    ['Préstamos vencidos', 'Préstamos en plazo'],
    ['Préstamos en plazo', 'Préstamos recientes'],
    ['Préstamos recientes', 'Componer informe'],
    ['Componer informe', 'Enviar informe'],
  ],
});
