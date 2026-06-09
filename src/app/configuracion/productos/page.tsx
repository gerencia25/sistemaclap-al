import { Suspense } from "react";
import ProductosClient from "./ProductosClient";

export default function ProductosPage() {
  return (
    <Suspense fallback={null}>
      <ProductosClient />
    </Suspense>
  );
}