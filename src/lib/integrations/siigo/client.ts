const SIIGO_AUTH_URL =
  "https://api.siigo.com/auth";

type SiigoAuthResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null =
  null;

function getRequiredEnv(
  name: string,
) {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Falta configurar la variable ${name}.`,
    );
  }

  return value;
}

export function getSiigoPartnerId() {
  return getRequiredEnv(
    "SIIGO_PARTNER_ID",
  );
}

export async function getSiigoAccessToken() {
  const now =
    Date.now();

  /*
   * Reutilizamos el token mientras le queden
   * al menos 60 segundos de vigencia.
   */
  if (
    cachedToken &&
    cachedToken.expiresAt >
      now + 60_000
  ) {
    return cachedToken.accessToken;
  }

  const username =
    getRequiredEnv(
      "SIIGO_API_USERNAME",
    );

  const accessKey =
    getRequiredEnv(
      "SIIGO_API_ACCESS_KEY",
    );

  const partnerId =
    getSiigoPartnerId();

  const response =
    await fetch(
      SIIGO_AUTH_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Partner-Id":
            partnerId,
        },

        body:
          JSON.stringify({
            username,

            access_key:
              accessKey,
          }),

        cache:
          "no-store",
      },
    );

  const raw =
    await response.text();

  let payload:
    | SiigoAuthResponse
    | Record<string, unknown>
    | null = null;

  try {
    payload =
      raw
        ? JSON.parse(raw)
        : null;
  } catch {
    payload =
      null;
  }

  if (!response.ok) {
    throw new Error(
      `SIIGO rechazó la autenticación (${response.status} ${response.statusText}).`,
    );
  }

  const accessToken =
    typeof payload === "object" &&
    payload &&
    "access_token" in payload &&
    typeof payload.access_token ===
      "string"
      ? payload.access_token
      : null;

  if (!accessToken) {
    throw new Error(
      "SIIGO respondió correctamente, pero no entregó access_token.",
    );
  }

  const expiresInRaw =
    typeof payload === "object" &&
    payload &&
    "expires_in" in payload
      ? Number(
          payload.expires_in,
        )
      : 3600;

  const expiresIn =
    Number.isFinite(
      expiresInRaw,
    ) &&
    expiresInRaw > 0
      ? expiresInRaw
      : 3600;

  cachedToken = {
    accessToken,

    expiresAt:
      now +
      expiresIn * 1000,
  };

  return accessToken;
}

export async function siigoRequest(
  url: string,
  init: RequestInit = {},
) {
  const accessToken =
    await getSiigoAccessToken();

  const partnerId =
    getSiigoPartnerId();

  const headers =
    new Headers(
      init.headers,
    );

  headers.set(
    "Authorization",
    `Bearer ${accessToken}`,
  );

  headers.set(
    "Partner-Id",
    partnerId,
  );

  if (
    init.body &&
    !headers.has(
      "Content-Type",
    )
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  return fetch(
    url,
    {
      ...init,
      headers,
      cache:
        "no-store",
    },
  );
}
