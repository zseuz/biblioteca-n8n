// Flujo «Aviso si el servidor no responde»: comprueba el backend cada 5 minutos.
import { CFG, Y, configuracion, correo, flujo, nodoCodigo, programa, x } from './nodos.js';

export default flujo({
  id: 'bibAvisoDeCaida1',
  nombre: 'Biblioteca · Aviso si el servidor no responde',
  nota: {
    position: [x(0) - 20, 40],
    ancho: 1120,
    alto: 200,
    texto: `## Aviso si el servidor no responde
Cada 5 minutos consulta \`/actuator/health\` del backend. Si falla \`fallosParaAvisar\` veces seguidas, envía **un** correo a \`correoBibliotecario\`; cuando vuelve a funcionar, envía otro con el tiempo que estuvo caído.

Necesita estar **activado** para recordar el estado entre comprobaciones. Edita los valores en **Configuración**.`,
  },
  nodos: [
    programa('Cada 5 minutos', { field: 'minutes', minutesInterval: 5 }, [x(0), Y]),
    configuracion({
      urlSalud: 'http://localhost:8080/actuator/health',
      nombreBiblioteca: 'Biblioteca',
      correoRemitente: 'biblioteca@example.com',
      correoBibliotecario: 'tu-correo@example.com',
      fallosParaAvisar: 2,
    }, [x(1), Y]),
    {
      name: 'Comprobar backend',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [x(2), Y],
      // Si no hay conexión, sigue con el error como dato para que el controlador lo cuente como fallo.
      onError: 'continueRegularOutput',
      parameters: {
        url: `={{ ${CFG}.urlSalud }}`,
        options: { response: { response: { fullResponse: true, neverError: true } }, timeout: 10000 },
      },
    },
    nodoCodigo('¿Hay que avisar?', 'servidor-comprobar', [x(3), Y]),
    correo('Enviar aviso', [x(4), Y], { para: `={{ ${CFG}.correoBibliotecario }}` }),
  ],
  conexiones: [
    ['Cada 5 minutos', 'Configuración'],
    ['Configuración', 'Comprobar backend'],
    ['Comprobar backend', '¿Hay que avisar?'],
    ['¿Hay que avisar?', 'Enviar aviso'],
  ],
});
