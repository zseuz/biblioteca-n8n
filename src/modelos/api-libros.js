// Acceso a la API de libros del backend y la regla de importación (la misma que aplica la web).

/**
 * Cliente de la API. `httpRequest` es la función de n8n (`this.helpers.httpRequest`); en las
 * pruebas se sustituye por una falsa.
 */
export function apiLibros(httpRequest, apiUrl) {
  const base = apiUrl.replace(/\/+$/, '');
  const llamar = async (method, ruta, opciones = {}) => {
    const r = await httpRequest({
      method, url: `${base}${ruta}`, json: true, returnFullResponse: true, ignoreHttpStatusErrors: true, ...opciones,
    });
    if (r.statusCode >= 400) {
      const cuerpo = r.body ?? {};
      const campos = cuerpo.fields ? Object.values(cuerpo.fields).join('; ') : '';
      throw new Error(campos || cuerpo.message || `La API respondió ${r.statusCode}`);
    }
    return r.body;
  };
  return {
    /** GET /books/duplicates → { sameBook, differentGenre } */
    buscarDuplicado: (libro) => llamar('GET', '/books/duplicates', { qs: libro }),
    /** POST /books/{id}/copies → libro actualizado */
    sumarEjemplares: (id, cantidad) => llamar('POST', `/books/${id}/copies`, { body: { quantity: cantidad } }),
    /** POST /books → libro creado */
    crear: (libro, ejemplares) => llamar('POST', '/books', { body: { ...libro, totalCopies: ejemplares } }),
  };
}

/**
 * Registra un libro: si ya existe (mismo título, autor y género) le suma los ejemplares;
 * si no, lo crea, avisando si había uno igual con otro género.
 * @returns {{ accion: 'sumado', totalCopies } | { accion: 'creado', otrosGeneros: string[] }}
 */
export async function registrarLibro(api, libro, ejemplares) {
  const duplicado = await api.buscarDuplicado(libro);
  if (duplicado.sameBook) {
    const actualizado = await api.sumarEjemplares(duplicado.sameBook.id, ejemplares);
    return { accion: 'sumado', totalCopies: actualizado.totalCopies };
  }
  await api.crear(libro, ejemplares);
  return { accion: 'creado', otrosGeneros: (duplicado.differentGenre ?? []).map((l) => l.genre) };
}
