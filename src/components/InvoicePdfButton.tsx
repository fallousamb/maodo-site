import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getInvoiceData } from "@/lib/billing.functions";
import { createInvoicePdfBytes } from "@/lib/invoice-pdf";

type InvoicePdfButtonProps = {
  reservationId: string;
  label?: string;
  iconOnly?: boolean;
};

export function InvoicePdfButton({
  reservationId,
  label = "Bon de commande",
  iconOnly = false,
}: InvoicePdfButtonProps) {
  const getInvoice = useServerFn(getInvoiceData);
  const [loading, setLoading] = useState(false);

  const openPdf = async () => {
    const pdfWindow = window.open("", "_blank");
    setLoading(true);
    try {
      const payload = await getInvoice({ data: { reservation_id: reservationId } });
      const bytes = await createInvoicePdfBytes(payload);
      const arrayBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(arrayBuffer).set(bytes);
      const blobUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: "application/pdf" }));

      if (pdfWindow) {
        pdfWindow.location.href = blobUrl;
      } else {
        window.location.href = blobUrl;
      }
    } catch (error: unknown) {
      pdfWindow?.close();
      toast.error(error instanceof Error ? error.message : "Impossible d'ouvrir le PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size={iconOnly ? "icon" : "sm"}
      variant={iconOnly ? "ghost" : "outline"}
      title="Ouvrir le PDF"
      disabled={loading}
      onClick={openPdf}
      className={iconOnly ? undefined : "gap-2"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className={iconOnly ? "h-4 w-4 text-primary" : "h-4 w-4"} />
      )}
      {!iconOnly && label}
    </Button>
  );
}
