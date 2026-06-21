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

    const category = body.category || "No informada";
    const requestType = body.requestType || body.request_type || "No informado";

    await resend.emails.send({
      from: "Sistema CLAP <notificaciones@mail.almultiformas.com>",
      to: ["administrador@almultiformas.com"],
      subject: `Nueva solicitud de tercero ${requestNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Nueva solicitud de tercero</h2>

          <p><strong>Consecutivo:</strong> ${requestNumber}</p>
          <p><strong>Solicitante:</strong> ${requester}</p>
          <p><strong>Área:</strong> ${area}</p>
          <p><strong>Tipo de solicitud:</strong> ${requestType}</p>
          <p><strong>Categoría:</strong> ${category}</p>

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