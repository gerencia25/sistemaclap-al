import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getNextQuoteNumber() {
  const year = Number(new Date().getFullYear().toString().slice(-2));

  // Buscar consecutivo actual
  const { data, error } = await supabaseAdmin
    .from("document_sequences")
    .select("*")
    .eq("document_type", "COT")
    .eq("year", year)
    .single();

  if (error || !data) {
    throw new Error("No se encontró consecutivo de cotizaciones");
  }

  const nextNumber = data.current_number + 1;

  // Actualizar consecutivo
  const { error: updateError } = await supabaseAdmin
    .from("document_sequences")
    .update({
      current_number: nextNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (updateError) {
    throw new Error("Error actualizando consecutivo");
  }

  // Formato: COT-26001
  const formattedNumber = String(nextNumber).padStart(3, "0");

  return `COT-${year}${formattedNumber}`;
}
