"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const menuItems = [
  { label: "Inicio", href: "/" },
  { label: "Comercial", href: "/comercial" },
  { label: "Abastecimiento y Logística", href: "/abastecimiento-logistica" },
  { label: "Operaciones", href: "/operaciones" },
  { label: "Financiera", href: "/financiera" },
  { label: "Gestión Humana", href: "/gestion-humana" },
  { label: "Diseño y Desarrollo", href: "/diseno-desarrollo" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 transition hover:opacity-80">
          <Image
            src="/logo.png"
            alt="AL Multiformas"
            width={56}
            height={56}
            className="h-auto w-12"
            priority
          />

          <div className="leading-tight">
            <p className="text-sm font-bold text-[#07076b]">Sistema CLAP</p>
            <p className="text-xs text-gray-500">A&L Multiformas</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {menuItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`border-b-2 pb-1 text-sm font-medium transition-all duration-200 ${
                index === 0
                  ? "border-[#07076b] text-[#07076b]"
                  : "border-transparent text-gray-500 hover:border-[#07076b] hover:text-[#07076b]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Link
            href="/login"
            className="inline-flex rounded-2xl bg-[#07076b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:opacity-95 active:translate-y-0"
          >
            Iniciar Sesión
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#07076b] transition hover:bg-gray-100 lg:hidden"
          aria-label="Abrir menú"
        >
          <span className="text-3xl leading-none">{open ? "×" : "≡"}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white/95 shadow-lg backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-6 py-4">
            {menuItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`border-b border-gray-100 py-4 text-base font-medium transition ${
                  index === 0
                    ? "text-[#07076b] underline underline-offset-8"
                    : "text-gray-500 hover:text-[#07076b]"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-5 rounded-2xl bg-[#07076b] px-5 py-4 text-center text-base font-semibold text-white shadow-sm transition hover:shadow-md"
            >
              Iniciar Sesión
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}