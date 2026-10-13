// Nodo «No enviados» (Recordatorios de préstamos): correos que el servidor SMTP no aceptó.
// No se apuntan como enviados, así que se reintentan en la próxima ejecución.
// Aquí se ve el motivo (credenciales, dirección inexistente...).
export default function correosNoEnviados({ $, $input }) {
  return $input.all().map((item, i) => {
    const correo = $('Preparar avisos').itemMatching(i).json;
    const { error } = item.json;
    return {
      json: {
        usuario: correo.usuario,
        para: correo.para,
        asunto: correo.asunto,
        motivo: error?.message ?? (typeof error === 'string' ? error : JSON.stringify(item.json)),
      },
    };
  });
}
