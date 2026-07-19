"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setErrorMessage("");

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Error iniciando sesión con Google:", error);
      setErrorMessage("No fue posible iniciar sesión con Google.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Sistema CLAP
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#07076b]">
            Iniciar sesión
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Ingresa con tu correo corporativo de Google. El acceso depende de
            que tu usuario esté creado y activo en CLAP.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{errorMessage}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#07076b]/30 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base font-bold text-[#07076b]">
            G
          </span>

          {loading ? "Conectando con Google..." : "Continuar con Google"}
        </button>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs leading-5 text-slate-500">
            Si tu correo no está registrado como usuario activo en el ERP, el
            sistema bloqueará el acceso automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
