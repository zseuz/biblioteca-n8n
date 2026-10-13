// Flujo «Importar libros desde CSV»: formulario web que registra los libros de un CSV.
import { Y, configuracion, flujo, nodoCodigo, uuid, x } from './nodos.js';

export default flujo({
  id: 'bibImportaLibros',
  nombre: 'Biblioteca · Importar libros desde CSV',
  nota: {
    position: [x(0) - 20, 40],
    ancho: 900,
    alto: 200,
    texto: `## Importar libros desde CSV
Formulario web para subir un CSV con las columnas **titulo, autor, genero, ejemplares** (separadas por \`,\` o \`;\`; *ejemplares* es opcional y vale 1 si falta).

Aplica las mismas reglas que la web: si el libro ya existe (mismo título, autor y género) **suma los ejemplares**; si no, lo **crea**. Al terminar muestra el resultado fila por fila.

Con el flujo activado, el formulario está en **http://localhost:5678/form/importar-libros**.`,
  },
  nodos: [
    {
      name: 'Formulario',
      type: 'n8n-nodes-base.formTrigger',
      typeVersion: 2.3,
      position: [x(0), Y],
      webhookId: uuid('webhook/importar-libros'),
      parameters: {
        formTitle: 'Importar libros',
        formDescription: 'Sube un archivo CSV con las columnas titulo, autor, genero y ejemplares (la primera fila es la cabecera). Si un libro ya existe, se le suman los ejemplares.',
        formFields: {
          values: [{ fieldLabel: 'Archivo CSV', fieldType: 'file', multipleFiles: false, acceptFileTypes: '.csv', requiredField: true }],
        },
        responseMode: 'lastNode',
        options: { path: 'importar-libros', buttonLabel: 'Importar', appendAttribution: false },
      },
    },
    // Deja pasar el archivo (binario) al nodo siguiente.
    configuracion({ apiUrl: 'http://localhost:8080/api' }, [x(1), Y], {
      includeOtherFields: true,
      options: { stripBinary: false },
    }),
    nodoCodigo('Importar libros', 'importar-libros', [x(2), Y]),
    {
      name: 'Resultado',
      type: 'n8n-nodes-base.form',
      typeVersion: 2.3,
      position: [x(3), Y],
      webhookId: uuid('webhook/importar-libros-resultado'),
      parameters: {
        operation: 'completion',
        respondWith: 'showText',
        responseText: '={{ $json.pagina }}',
      },
    },
  ],
  conexiones: [
    ['Formulario', 'Configuración'],
    ['Configuración', 'Importar libros'],
    ['Importar libros', 'Resultado'],
  ],
});
