import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function resolveCodificationClassification(
  templateId: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("item_classification_templates")
    .select("full_code")
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar la clasificación: ${error.message}`,
    );
  }

  if (!data?.full_code) {
    throw new Error(
      "La plantilla no tiene una clasificación válida.",
    );
  }

  return data.full_code;
}
