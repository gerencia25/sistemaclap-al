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
      employeeFullName,
      area,
      position,
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
      subject: `Solicitud creación de personal rechazada ${requestNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="color: #991b1b;">Solicitud creación de personal rechazada</h2>

          <p>Hola ${requesterName},</p>

          <p>
            Tu solicitud de creación de personal fue rechazada en el Sistema CLAP.
          </p>

          <ul>
            <li><strong>Consecutivo:</strong> ${requestNumber}</li>
            <li><strong>Empleado solicitado:</strong> ${employeeFullName}</li>
            <li><strong>Área:</strong> ${area}</li>
            <li><strong>Cargo:</strong> ${position}</li>
          </ul>

          <h3>Motivo del rechazo</h3>
          <p>${rejectionReason}</p>
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
