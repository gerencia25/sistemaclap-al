import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PAGE_SIZE = 1000;

export async function fetchAllActiveClassificationOptions() {
  const rows: Array<{
    id: string;
    template_id: string;
    field_key: string;
    code: string;
    name: string;
  }> = [];

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {
    const { data, error } =
      await supabaseAdmin
        .from(
          "item_classification_field_options",
        )
        .select(`
          id,
          template_id,
          field_key,
          code,
          name
        `)
        .eq("status", "Activo")
        .order("code", {
          ascending: true,
        })
        .order("template_id", {
          ascending: true,
        })
        .order("field_key", {
          ascending: true,
        })
        .order("id", {
          ascending: true,
        })
        .range(
          from,
          from + PAGE_SIZE - 1,
        );

    if (error) {
      return {
        data: null,
        error,
      };
    }

    const page = data ?? [];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return {
    data: rows,
    error: null,
  };
}

export async function fetchAllActiveOptionCatalogValues() {
  const rows: Array<{
    id: string;
    catalog_id: string;
    code: string;
    name: string;
  }> = [];

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {
    const { data, error } =
      await supabaseAdmin
        .from(
          "item_option_catalog_values",
        )
        .select(`
          id,
          catalog_id,
          code,
          name
        `)
        .eq("status", "Activo")
        .order("code", {
          ascending: true,
        })
        .order("catalog_id", {
          ascending: true,
        })
        .order("id", {
          ascending: true,
        })
        .range(
          from,
          from + PAGE_SIZE - 1,
        );

    if (error) {
      return {
        data: null,
        error,
      };
    }

    const page = data ?? [];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return {
    data: rows,
    error: null,
  };
}
