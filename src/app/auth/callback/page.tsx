"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Validando acceso con Google...");

  useEffect(() => {
    async function handleCallback() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const errorDescription = searchParams.get("error_description");
        const code = searchParams.get("code");

        if (errorDescription) {
          setMessage("No fue posible iniciar sesión con Google.");
          setTimeout(() => router.replace("/login"), 1200);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Error validando sesión:", error);
            setMessage("No fue posible validar la sesión.");
            setTimeout(() => router.replace("/login"), 1200);
            return;
          }
        }

        router.replace("/");
      } catch (error) {
        console.error("Error en callback de Google:", error);
        setMessage("Ocurrió un error validando el acceso.");
        setTimeout(() => router.replace("/login"), 1200);
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Sistema CLAP
        </p>

        <h1 className="mt-3 text-2xl font-semibold text-[#07076b]">
          Iniciando sesión
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
      </div>
    </div>
  );
}
