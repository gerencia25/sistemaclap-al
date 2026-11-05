"use client";

import { useParams } from "next/navigation";
import InventoryMovementDetail from "@/components/inventory/InventoryMovementDetail";

export default function Page() {
  const params =
    useParams<{
      id: string;
    }>();

  return (
    <InventoryMovementDetail
      kind="ajuste"
      id={params.id}
    />
  );
}
