import { Suspense } from "react";
import PersonalBaseDatosClient from "./PersonalBaseDatosClient";

export default function BaseDatosPersonalPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-gray-500">Cargando personal...</div>
      }
    >
      <PersonalBaseDatosClient />
    </Suspense>
  );
}
