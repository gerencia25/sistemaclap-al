import { Suspense } from "react";
import ProductosClient from "./ProductosClient";

export default function BaseDatosProductosPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-gray-500">Cargando productos...</div>
      }
    >
      <ProductosClient />
    </Suspense>
  );
}
