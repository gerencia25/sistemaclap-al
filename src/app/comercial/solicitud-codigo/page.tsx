import SolicitudCodigoForm from "@/components/codificacion/SolicitudCodigoForm";

export default function SolicitudCodigoComercialPage() {
  return (
    <SolicitudCodigoForm
      requesterArea="Dirección Comercial"
      contextLabel="DC · Dirección Comercial · Solicitud de código"
      description="Solicita la creación de códigos para productos nuevos requeridos durante el proceso comercial, antes de continuar con su cotización o venta."
    />
  );
}
