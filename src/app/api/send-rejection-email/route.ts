import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      requestNumber,
      requesterEmail,
      requesterName,
      rejectionReason,
    } = body;

    await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: [requesterEmail],
      subject: `Solicitud ${requestNumber} rechazada`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Solicitud de código rechazada</h2>

          <p>Hola ${requesterName},</p>

          <p>
            La solicitud <strong>${requestNumber}</strong>
            ha sido rechazada.
          </p>

          <p>
            <strong>Motivo del rechazo:</strong>
          </p>

          <div style="
            background:#fef2f2;
            border:1px solid #fecaca;
            padding:12px;
            border-radius:8px;
            margin:12px 0;
          ">
            ${rejectionReason}
          </div>

          <p>
            Si consideras necesario, puedes generar una nueva solicitud
            incluyendo la información requerida.
          </p>

          <br>

          <p>
            Sistema CLAP
          </p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false },
      { status: 500 },
    );
  }
}