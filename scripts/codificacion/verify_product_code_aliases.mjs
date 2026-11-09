import { createClient } from "@supabase/supabase-js";

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

console.log(
  "\n==============================================",
);
console.log(
  "VERIFICACIÓN · PRODUCT_CODE_ALIASES",
);
console.log(
  "==============================================\n",
);

// La tabla debe existir y ser consultable por service role.
const {
  data: aliases,
  error: aliasError,
} =
  await supabase
    .from("product_code_aliases")
    .select("id,product_id,alias_code,alias_type,status,created_at")
    .limit(5);

if (aliasError) {
  throw new Error(
    `product_code_aliases: ${aliasError.message}`,
  );
}

// La RPC debe existir.
const {
  data: rpcEmpty,
  error: rpcError,
} =
  await supabase.rpc(
    "resolve_product_by_code",
    { p_code: "__CODIGO_INEXISTENTE_CLAP__" },
  );

if (rpcError) {
  throw new Error(
    `resolve_product_by_code: ${rpcError.message}`,
  );
}

if (!Array.isArray(rpcEmpty)) {
  throw new Error(
    "La RPC no devolvió una colección.",
  );
}

// Confirmar que la RPC resuelve un producto vigente real.
const {
  data: sample,
  error: sampleError,
} =
  await supabase
    .from("products")
    .select("id,final_code")
    .not("final_code", "is", null)
    .limit(1)
    .single();

if (sampleError) throw sampleError;

const {
  data: resolved,
  error: resolveError,
} =
  await supabase.rpc(
    "resolve_product_by_code",
    { p_code: sample.final_code },
  );

if (resolveError) throw resolveError;

if (
  !Array.isArray(resolved) ||
  resolved.length !== 1 ||
  resolved[0].product_id !== sample.id ||
  resolved[0].match_type !== "CURRENT"
) {
  throw new Error(
    "La RPC no resolvió correctamente un código vigente.",
  );
}

console.table({
  "Tabla product_code_aliases":
    "OK",
  "Aliases actuales":
    aliases?.length ?? 0,
  "RPC resolve_product_by_code":
    "OK",
  "Resolución CURRENT":
    "OK",
});

console.log(
  "\n✅ Infraestructura de alias históricos verificada.",
);
console.log(
  "✅ No se modificó ningún producto ni SIIGO.",
);
