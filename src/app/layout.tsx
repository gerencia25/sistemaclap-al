import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "ERP Interno",
  description: "Sistema interno tipo ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <AuthProvider>
          <Header />

          <main className="mx-auto min-h-[calc(100vh-7rem)] max-w-7xl px-6 py-8">
            {children}
          </main>

          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
