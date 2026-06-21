import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const requestNumber = body.requestNumber || "N/A";
    const requesterEmail = body.requesterEmail;
    const requesterName = body.requesterName || "No informado";
    const rejectionReason = body.rejectionReason || "No informado";

    if (!requesterEmail) {
      return Response.json({ success: false }, { status: 400 });
    }

    await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: [requesterEmail],
      subject: `Solicitud de tercero rechazada ${requestNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Solicitud de tercero rechazada</h2>

          <p>Hola ${requesterName},</p>

          <p>Tu solicitud de tercero fue rechazada.</p>

          <p><strong>Consecutivo:</strong> ${requestNumber}</p>

          <p><strong>Motivo del rechazo:</strong></p>
          <p>${rejectionReason}</p>

          <br />

          <p>Por favor revisa la observación y realiza una nueva solicitud si corresponde.</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false }, { status: 500 });
  }
}