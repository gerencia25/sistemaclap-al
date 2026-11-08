import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SiigoCity = {
  country_code: string;
  country_name: string;
  state_code: string;
  state_name: string;
  city_code: string;
  city_name: string;
};

export function normalizeSiigoLocation(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

export async function resolveSiigoCity(input: {
  country: string | null;
  state: string | null;
  city: string | null;
}): Promise<SiigoCity> {
  const countryKey =
    normalizeSiigoLocation(
      input.country || "Colombia",
    );

  const cityKey =
    normalizeSiigoLocation(
      input.city,
    );

  const stateKey =
    normalizeSiigoLocation(
      input.state,
    );

  if (!cityKey) {
    throw new Error(
      "El tercero no tiene ciudad y SIIGO exige un código de ciudad.",
    );
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("siigo_cities")
    .select(`
      country_code,
      country_name,
      state_code,
      state_name,
      city_code,
      city_name,
      state_key
    `)
    .eq(
      "country_key",
      countryKey,
    )
    .eq(
      "city_key",
      cityKey,
    );

  if (error) {
    throw new Error(
      `No se pudo consultar el catálogo de ciudades SIIGO: ${error.message}`,
    );
  }

  const matches =
    data ?? [];

  if (matches.length === 0) {
    throw new Error(
      `No encontramos "${input.city}" (${input.country || "Colombia"}) en el catálogo oficial de ciudades de SIIGO.`,
    );
  }

  if (matches.length === 1) {
    const city =
      matches[0];

    /*
     * Si CLAP trae departamento/estado, debe coincidir
     * también con el catálogo SIIGO.
     *
     * Evita casos como:
     * Ciudad = Bogotá
     * Departamento = Cundinamarca
     * cuando SIIGO define Bogotá como Bogotá D.C.
     */
    if (
      stateKey &&
      city.state_key !== stateKey
    ) {
      throw new Error(
        `La ciudad "${input.city}" pertenece a "${city.state_name}" en SIIGO, pero CLAP tiene "${input.state}". Corrige el departamento/estado antes de sincronizar.`,
      );
    }

    return {
      country_code:
        city.country_code,

      country_name:
        city.country_name,

      state_code:
        city.state_code,

      state_name:
        city.state_name,

      city_code:
        city.city_code,

      city_name:
        city.city_name,
    };
  }

  if (stateKey) {
    const stateMatches =
      matches.filter(
        (item) =>
          item.state_key ===
          stateKey,
      );

    if (
      stateMatches.length === 1
    ) {
      const city =
        stateMatches[0];

      return {
        country_code:
          city.country_code,

        country_name:
          city.country_name,

        state_code:
          city.state_code,

        state_name:
          city.state_name,

        city_code:
          city.city_code,

        city_name:
          city.city_name,
      };
    }
  }

  throw new Error(
    `La ciudad "${input.city}" aparece más de una vez en SIIGO. Se requiere departamento/estado exacto para identificarla.`,
  );
}
