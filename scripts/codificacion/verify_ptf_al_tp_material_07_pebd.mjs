import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: templates, error: te } =
  await supabase
    .from("item_classification_templates")
    .select("id,status")
    .eq("category_code", "PTF")
    .eq("group_code", "AL")
    .eq("subgroup_code", "TP");

if (te) throw te;

const active = templates.filter(
  t => t.status === "Activo"
);

if (templates.length !== 1 || active.length !== 1) {
  throw new Error(
    `PTF-AL-TP: plantillas=${templates.length}, activas=${active.length}`
  );
}

const template = active[0];

const { data: option, error: oe } =
  await supabase
    .from("item_classification_field_options")
    .select("code,name,status")
    .eq("template_id", template.id)
    .eq("field_key", "material")
    .eq("code", "07")
    .single();

if (oe) throw oe;

console.table([option]);

if (
  option.code !== "07" ||
  option.name !== "PEBD" ||
  option.status !== "Activo"
) {
  throw new Error(
    `Resultado inesperado: 07=${option.name} (${option.status})`
  );
}

console.log(
  "\n✅ PTF-AL-TP / material / 07 = PEBD verificado."
);
console.log(
  "✅ Solo lectura. No se modificó Supabase."
);
