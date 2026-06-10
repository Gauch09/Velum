import { Resend } from 'resend'

const TIPO_LABEL: Record<string, string> = {
  sin_actividad:   'Sin actividad en la etapa',
  riesgo_entrega:  'Riesgo de entrega',
  ambas:           'Sin actividad + riesgo de entrega',
}

type AlertaInfo = {
  ordenNombre: string
  etapaNombre: string
  tipo: string
}

export async function enviarAlertaRoja(
  destinatarios: string[],
  alerta: AlertaInfo
): Promise<void> {
  if (!process.env.RESEND_API_KEY || destinatarios.length === 0) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const tipoTexto = TIPO_LABEL[alerta.tipo] ?? alerta.tipo
  const from = process.env.EMAIL_FROM ?? 'VELUM <alertas@velum.com.ar>'

  try {
    await resend.emails.send({
      from,
      to: destinatarios,
      subject: `🔴 Alerta crítica — ${alerta.ordenNombre} · ${alerta.etapaNombre}`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid #1f1f1f;overflow:hidden;">

        <!-- header -->
        <tr>
          <td style="background:#7f1d1d;padding:20px 28px;">
            <p style="margin:0;color:#fca5a5;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">VELUM · Alerta crítica</p>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 6px;color:#f87171;font-size:20px;font-weight:700;">
              🔴 ${alerta.ordenNombre}
            </p>
            <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;">
              Etapa: <strong style="color:#e5e7eb;">${alerta.etapaNombre}</strong>
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f1f1f;border-radius:8px;padding:16px;">
              <tr>
                <td style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding-bottom:8px;">
                  Motivo
                </td>
              </tr>
              <tr>
                <td style="color:#e5e7eb;font-size:14px;">${tipoTexto}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;color:#4b5563;font-size:12px;">
              Revisá el dashboard de planta para tomar acción.
            </p>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="border-top:1px solid #1f1f1f;padding:16px 28px;">
            <p style="margin:0;color:#374151;font-size:11px;">VELUM · Sistema de gestión de producción</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
  } catch {
    // Email failure must not break the dashboard load
  }
}
