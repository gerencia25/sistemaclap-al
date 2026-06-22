"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("Ingresa correo y contraseña.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage("Correo o contraseña incorrectos.");
      return;
    }

    setLoading(false);
    router.replace("/");
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
            Sistema CLAP
          </p>

          <h1 className="mt-3 text-3xl font-bold text-[#07076b]">
            Iniciar sesión
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Ingresa con tu correo y contraseña para acceder al ERP.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              placeholder="usuario@almultiformas.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#07076b]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#07076b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05054f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
