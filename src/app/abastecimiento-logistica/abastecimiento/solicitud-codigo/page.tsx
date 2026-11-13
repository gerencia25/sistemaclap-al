import SolicitudCodigoForm from "@/components/codificacion/SolicitudCodigoForm";

export default function SolicitudCodigoAbastecimientoPage() {
  return (
    <SolicitudCodigoForm
      requesterArea="Abastecimiento y Logística"
      contextLabel="AL · Abastecimiento · Solicitud de código"
      description="Solicita la creación o desactivación de códigos para materias primas, insumos, productos y demás elementos administrados en el maestro oficial de CLAP."
    />
  );
}
