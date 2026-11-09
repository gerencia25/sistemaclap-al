import { createClient } from "@supabase/supabase-js";

const APPLY =
  process.argv.includes("--apply");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const DEFINITIONS = [
  {
    product_code: "305-0002-0200-03",
    exception_type: "LEGACY_NO_RECODIFICAR",
    reason:
      "Producto histórico inicial (PVC 110ZR BLANCO). El cliente confirmó que no se volverá a utilizar y no requiere recodificación.",
    canonical_product_code: null,
  },
  {
    product_code: "305-0002-0200-02",
    exception_type: "LEGACY_NO_RECODIFICAR",
    reason:
      "Producto histórico inicial (PVC 110ZR CRISTAL). El cliente confirmó que no se volverá a utilizar y no requiere recodificación.",
    canonical_product_code: null,
  },
  {
    product_code: "106-0001-0102-05",
    exception_type: "LEGACY_NO_RECODIFICAR",
    reason:
      "CADENA PLÁSTICA PLUS confirmada como PTC. El cliente autorizó conservar el código legacy sin recodificar.",
    canonical_product_code: null,
  },
  {
    product_code: "109-0300-1002-03",
    exception_type: "LEGACY_NO_RECODIFICAR",
    reason:
      "TAPÓN BOCA 38 mm TRANSPARENTE PEBD confirmado como PTF. El cliente autorizó conservar el código legacy sin recodificar.",
    canonical_product_code: null,
  },
  {
    product_code: "PRODUCTOGENERICONUBE",
    exception_type: "TECNICA_SIIGO",
    reason:
      "Producto genérico técnico de SIIGO Nube. No corresponde a un artículo operativo sujeto a codificación canónica CLAP.",
    canonical_product_code: null,
  },
  {
    product_code: "110111",
    exception_type: "DUPLICADO_HISTORICO",
    reason:
      "ARRIENDO PROBADOR DE FUGAS corresponde a ALQ-MC-PF. Se documenta como duplicado histórico del producto canónico existente; no se fusiona ni altera en esta fase.",
    canonical_product_code:
      "ALQ-MC-PF-1010400100101",
  },
];

function norm(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

/*
 * IMPORTANTE:
 * No usamos .in("final_code", [...]) porque PostgREST compara texto
 * con igualdad sensible a mayúsculas/minúsculas.
 *
 * En producción PRODUCTOGENERICONUBE está almacenado como
 * "productogenericonube". Leemos los 86 productos SIIGO y resolvemos
 * localmente mediante norm().
 */
const { data: products, error: pe } =
  await supabase
    .from("products")
    .select(
      "id,final_code,name,siigo_product_id,classification_code",
    )
    .not("siigo_product_id", "is", null);

if (pe) throw pe;

const byCode =
  new Map(
    (products ?? [])
      .filter(p => p.final_code)
      .map(
        p => [
          norm(p.final_code),
          p,
        ],
      ),
  );

const errors = [];
const items = [];

for (const definition of DEFINITIONS) {
  const product =
    byCode.get(
      norm(definition.product_code),
    );

  if (!product) {
    errors.push(
      `No existe ${definition.product_code}.`,
    );
    continue;
  }

  let canonical = null;

  if (definition.canonical_product_code) {
    canonical =
      byCode.get(
        norm(definition.canonical_product_code),
      );

    if (!canonical) {
      errors.push(
        `No existe producto canónico ${definition.canonical_product_code}.`,
      );
      continue;
    }

    if (canonical.id === product.id) {
      errors.push(
        `${definition.product_code}: producto canónico apunta al mismo registro.`,
      );
      continue;
    }
  }

  items.push({
    product_id:
      product.id,
    // Enviamos el valor REAL almacenado en DB.
    product_code:
      product.final_code,
    product_name:
      product.name,
    exception_type:
      definition.exception_type,
    reason:
      definition.reason,
    canonical_product_id:
      canonical?.id ?? null,
    canonical_product_code:
      canonical?.final_code ?? null,
    source:
      "Cierre adopción matriz SIIGO → CLAP · Fase 2E",
  });
}

console.log(
  "\n==============================================",
);
console.log(
  APPLY
    ? "FASE 2E · APLICAR EXCEPCIONES DE CODIFICACIÓN"
    : "FASE 2E · DRY-RUN EXCEPCIONES DE CODIFICACIÓN",
);
console.log(
  "==============================================\n",
);

console.table(
  items.map(
    x => ({
      codigo: x.product_code,
      producto: x.product_name,
      tipo: x.exception_type,
      canonico:
        x.canonical_product_code ?? "",
    }),
  ),
);

console.table({
  "Objetivo": DEFINITIONS.length,
  "Encontradas": items.length,
  "Errores": errors.length,
});

if (errors.length) {
  for (const error of errors) {
    console.log(`- ${error}`);
  }

  throw new Error(
    "Fase 2E bloqueada. No se modificó Supabase.",
  );
}

if (!APPLY) {
  console.log(
    "\n✅ DRY-RUN FASE 2E APROBADO.",
  );
  console.log(
    "✅ Se registrarían 6 excepciones.",
  );
  console.log(
    "✅ No se modificarían products, códigos, aliases ni SIIGO.",
  );
  process.exit(0);
}

const { data, error } =
  await supabase.rpc(
    "apply_product_code_exceptions",
    {
      p_items: items,
    },
  );

if (error) {
  throw new Error(
    `RPC apply_product_code_exceptions: ${error.message}`,
  );
}

console.log(
  "\n===== RESULTADO RPC =====",
);

console.dir(
  data,
  { depth: null },
);

console.log(
  "\n✅ FASE 2E APLICADA.",
);
console.log(
  "✅ Las 6 excepciones quedaron registradas formalmente.",
);
console.log(
  "✅ No se modificaron productos, códigos, aliases ni SIIGO.",
);
