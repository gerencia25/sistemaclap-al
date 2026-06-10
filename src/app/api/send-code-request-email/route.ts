import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const requestNumber = body.requestNumber || "N/A";
    const requester =
      body.requester ||
      body.requesterName ||
      body.requester_name ||
      "No informado";
      
    const area =
      body.area ||
      body.requesterArea ||
      body.requester_area ||
      "No informada";

    const classification =
      body.classification ||
      body.classificationCode ||
      body.classification_code ||
      "No informada";

    await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: ["legal@almultiformas.com"],
      subject: `Nueva solicitud de código ${requestNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Nueva solicitud de código</h2>

          <p><strong>Consecutivo:</strong> ${requestNumber}</p>
          <p><strong>Solicitante:</strong> ${requester}</p>
          <p><strong>Área:</strong> ${area}</p>
          <p><strong>Clasificación:</strong> ${classification}</p>

          <br />

          <p>Ingrese al Sistema CLAP para gestionar la solicitud.</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);

    return Response.json({ success: false }, { status: 500 });
  }
}