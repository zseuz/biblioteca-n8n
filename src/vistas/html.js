// Utilidades HTML comunes a todas las vistas.

/** Escapa un texto para insertarlo en HTML (nombres y títulos vienen de la base de datos). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
