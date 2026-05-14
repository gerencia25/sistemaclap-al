import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getNextOrderNumber() {
  const year = Number(new Date().getFullYear().toString().slice(-2));

  const { data, error } = await supabaseAdmin
    .from("document_sequences")
    .select("*")
    .eq("document_type", "PED")
    .eq("year", year)
    .single();

  if (error || !data) {
    throw new Error("No se encontró consecutivo de pedidos");
  }

  const nextNumber = data.current_number + 1;

  const { error: updateError } = await supabaseAdmin
    .from("document_sequences")
    .update({
      current_number: nextNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (updateError) {
    throw new Error("Error actualizando consecutivo de pedidos");
  }

  const formattedNumber = String(nextNumber).padStart(3, "0");

  return `PED-${year}${formattedNumber}`;
}