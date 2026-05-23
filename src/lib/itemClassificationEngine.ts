import { supabase } from "@/lib/supabase";

export type ClassificationOption = {
  id: string;
  template_id: string;
  field_key: string;
  code: string;
  name: string;
};

function normalize(value: string) {
  return value.trim().toUpperCase();
}

function padCode(value: number, length: number) {
  return String(value).padStart(length, "0");
}

export async function createClassificationOption(params: {
  templateId: string;
  fieldKey: string;
  name: string;
  codeLength: number;
}) {
  const name = normalize(params.name);

  if (!name) {
    throw new Error("Debes ingresar un nombre válido.");
  }

  const { data: existingByName } = await supabase
    .from("item_classification_field_options")
    .select("*")
    .eq("template_id", params.templateId)
    .eq("field_key", params.fieldKey)
    .eq("name", name)
    .maybeSingle();

  if (existingByName) return existingByName as ClassificationOption;

  const { data: existingOptions, error: optionsError } = await supabase
    .from("item_classification_field_options")
    .select("code")
    .eq("template_id", params.templateId)
    .eq("field_key", params.fieldKey);

  if (optionsError) {
    throw new Error(optionsError.message);
  }

  const maxCode = (existingOptions ?? []).reduce((max, option) => {
    const parsed = Number(option.code);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);

  const nextCode = padCode(maxCode + 1, params.codeLength);

  const { data, error } = await supabase
    .from("item_classification_field_options")
    .insert({
      template_id: params.templateId,
      field_key: params.fieldKey,
      code: nextCode,
      name,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ClassificationOption;
}