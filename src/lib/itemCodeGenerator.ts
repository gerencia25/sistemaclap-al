import { supabase } from "@/lib/supabase";

type GenerateItemCodeParams = {
  categoryId: string;
  groupId: string;
  subgroupId: string;
  classificationCode: string;
  familyName: string;
  referenceName: string;
  presentationName: string;
  weightName: string;
  colorName: string;
};

function normalize(value: string) {
  return value.trim().toUpperCase();
}

function padCode(number: number, length: number) {
  return String(number).padStart(length, "0");
}

async function getNextNumericCode(
  table: string,
  filters: Record<string, string | null>,
  length: number,
  startAt = 1
) {
  let query = supabase.from(table).select("code");

  Object.entries(filters).forEach(([key, value]) => {
    if (value) query = query.eq(key, value);
  });

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const maxCode = (data ?? []).reduce((max, row) => {
    const parsed = Number(row.code);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, startAt - 1);

  return padCode(maxCode + 1, length);
}

async function getOrCreateFamily(params: {
  categoryId: string;
  groupId: string;
  subgroupId: string;
  familyName: string;
}) {
  const name = normalize(params.familyName);

  const { data: existing } = await supabase
    .from("item_code_families")
    .select("*")
    .eq("subgroup_id", params.subgroupId)
    .eq("name", name)
    .maybeSingle();

  if (existing) return existing;

  const code = await getNextNumericCode(
    "item_code_families",
    { subgroup_id: params.subgroupId },
    2,
    10
  );

  const { data, error } = await supabase
    .from("item_code_families")
    .insert({
      category_id: params.categoryId,
      group_id: params.groupId,
      subgroup_id: params.subgroupId,
      code,
      name,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
}

async function getOrCreateReference(params: {
  categoryId: string;
  groupId: string;
  subgroupId: string;
  familyId: string;
  referenceName: string;
}) {
  const name = normalize(params.referenceName);

  const { data: existing } = await supabase
    .from("item_code_references")
    .select("*")
    .eq("subgroup_id", params.subgroupId)
    .eq("name", name)
    .maybeSingle();

  if (existing) return existing;

  const code = await getNextNumericCode(
    "item_code_references",
    { subgroup_id: params.subgroupId },
    4,
    1
  );

  const { data, error } = await supabase
    .from("item_code_references")
    .insert({
      category_id: params.categoryId,
      group_id: params.groupId,
      subgroup_id: params.subgroupId,
      family_id: params.familyId,
      code,
      name,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
}

async function getOrCreateSimpleCode(
  table: string,
  nameValue: string,
  length: number
) {
  if (table === "item_code_weights") {
    const numericWeight = Number(String(nameValue).replace(/\D/g, ""));

    if (!Number.isInteger(numericWeight) || numericWeight <= 0) {
      throw new Error("El peso debe ser un número entero mayor a 0.");
    }

    const code = padCode(numericWeight, length);
    const name = `${numericWeight} KG`;

    const { data: existing } = await supabase
      .from(table)
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
      .from(table)
      .insert({
        code,
        name,
        value: numericWeight,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return data;
  }

  const name = normalize(nameValue);

  const { data: existing } = await supabase
    .from(table)
    .select("*")
    .eq("name", name)
    .maybeSingle();

  if (existing) return existing;

  const code = await getNextNumericCode(table, {}, length, 1);

  const { data, error } = await supabase
    .from(table)
    .insert({
      code,
      name,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function generateIndustrialItemCode(
  params: GenerateItemCodeParams
) {
  const family = await getOrCreateFamily({
    categoryId: params.categoryId,
    groupId: params.groupId,
    subgroupId: params.subgroupId,
    familyName: params.familyName,
  });

  const reference = await getOrCreateReference({
    categoryId: params.categoryId,
    groupId: params.groupId,
    subgroupId: params.subgroupId,
    familyId: family.id,
    referenceName: params.referenceName,
  });

  const presentation = await getOrCreateSimpleCode(
    "item_code_presentations",
    params.presentationName,
    2
  );

  const weight = await getOrCreateSimpleCode(
    "item_code_weights",
    params.weightName,
    3
  );

  const color = await getOrCreateSimpleCode(
    "item_code_colors",
    params.colorName,
    2
  );

  const finalCode = `${params.classificationCode}-${family.code}${reference.code}${presentation.code}${weight.code}${color.code}`;

  return {
    finalCode,
    family,
    reference,
    presentation,
    weight,
    color,
  };
}