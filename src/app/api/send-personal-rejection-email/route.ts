import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      to,
      requestNumber,
      requesterName,
      requestReason,
      area,
      position,
      requestedQuantity,
      requiredDate,
      rejectionReason,
    } = body;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY no está configurada." },
        { status: 500 }
      );
    }

    if (!to) {
      return NextResponse.json(
        { error: "No se recibió correo del solicitante." },
        { status: 400 }
      );
    }

    const { error } = await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: [to],
      subject: `Solicitud de personal rechazada ${requestNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="color: #991b1b;">Solicitud de personal rechazada</h2>

          <p>Hola ${requesterName},</p>

          <p>
            Talento Humano ha rechazado la solicitud de personal registrada
            en el Sistema CLAP.
          </p>

          <h3>Información de la solicitud</h3>

          <ul>
            <li><strong>Consecutivo:</strong> ${requestNumber}</li>
            <li><strong>Motivo:</strong> ${requestReason || "No definido"}</li>
            <li><strong>Área requerida:</strong> ${area}</li>
            <li><strong>Cargo requerido:</strong> ${position}</li>
            <li><strong>Cantidad:</strong> ${requestedQuantity || 1}</li>
            <li><strong>Fecha requerida:</strong> ${requiredDate || "No definida"}</li>
          </ul>

          <h3>Motivo del rechazo</h3>

          <p>
            ${rejectionReason || "No se registró un motivo de rechazo."}
          </p>

          <p style="margin-top: 24px;">
            Consulta el Sistema CLAP para revisar el detalle de la solicitud.
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error enviando correo de rechazo de personal.",
      },
      { status: 500 }
    );
  }
}