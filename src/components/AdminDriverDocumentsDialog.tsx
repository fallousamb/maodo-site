import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListDriverDocuments,
  adminVerifyDocument,
  DOCUMENT_LABELS,
  DOCUMENT_TYPES,
  type DocumentType,
} from "@/lib/driver-documents.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  ShieldCheck,
} from "lucide-react";

export function AdminDriverDocumentsButton({
  driverId,
  driverName,
}: {
  driverId: string;
  driverName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <FileText className="h-3.5 w-3.5" /> Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Documents de {driverName}
          </DialogTitle>
          <DialogDescription>
            Vérifiez chaque pièce. Un document validé apparaît côté chauffeur comme accepté.
          </DialogDescription>
        </DialogHeader>
        {open && <DocsList driverId={driverId} />}
      </DialogContent>
    </Dialog>
  );
}

function DocsList({ driverId }: { driverId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListDriverDocuments);
  const verifyFn = useServerFn(adminVerifyDocument);

  const docsQ = useQuery({
    queryKey: ["admin-driver-docs", driverId],
    queryFn: () => listFn({ data: { driver_id: driverId } }),
  });

  const verifyM = useMutation({
    mutationFn: (vars: { id: string; verified: boolean; rejection_reason?: string | null }) =>
      verifyFn({ data: vars }),
    onSuccess: () => {
      toast.success("Document mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-driver-docs", driverId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  if (docsQ.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const byType = new Map<DocumentType, any>(
    (docsQ.data?.documents ?? []).map((d: any) => [d.document_type, d]),
  );

  return (
    <div className="space-y-3">
      {DOCUMENT_TYPES.map((type) => {
        const doc = byType.get(type);
        return (
          <div key={type} className="rounded-lg border border-border/60 bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium">{DOCUMENT_LABELS[type]}</div>
                {doc ? (
                  <StatusBadge doc={doc} />
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">Non fourni</div>
                )}
              </div>
              {doc?.signed_url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={() => window.open(doc.signed_url, "_blank", "noopener,noreferrer")}
                >
                  <Eye className="h-3.5 w-3.5" /> Voir
                </Button>
              )}
            </div>
            {doc?.rejection_reason && (
              <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-900">
                Motif refus : {doc.rejection_reason}
              </p>
            )}
            {doc && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!doc.verified && (
                  <Button
                    size="sm"
                    className="h-8 gap-1 bg-green-600 hover:bg-green-700"
                    disabled={verifyM.isPending}
                    onClick={() => verifyM.mutate({ id: doc.id, verified: true })}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                  </Button>
                )}
                {doc.verified && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    disabled={verifyM.isPending}
                    onClick={() => verifyM.mutate({ id: doc.id, verified: false })}
                  >
                    Réinitialiser
                  </Button>
                )}
                <RejectInline
                  onSubmit={(reason) =>
                    verifyM.mutate({ id: doc.id, verified: false, rejection_reason: reason })
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RejectInline({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 text-destructive"
        onClick={() => setOpen(true)}
      >
        <XCircle className="h-3.5 w-3.5" /> Refuser
      </Button>
    );
  }
  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <Input
        placeholder="Motif (obligatoire)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-8 text-xs"
      />
      <Button
        size="sm"
        variant="destructive"
        className="h-8"
        disabled={!reason.trim()}
        onClick={() => {
          onSubmit(reason.trim());
          setOpen(false);
          setReason("");
        }}
      >
        OK
      </Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={() => setOpen(false)}>
        ✕
      </Button>
    </div>
  );
}

function StatusBadge({ doc }: { doc: any }) {
  if (doc.verified) {
    return (
      <Badge className="mt-1 bg-green-100 text-green-800">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Validé
      </Badge>
    );
  }
  if (doc.rejection_reason) {
    return (
      <Badge className="mt-1 bg-red-100 text-red-800">
        <XCircle className="mr-1 h-3 w-3" /> Refusé
      </Badge>
    );
  }
  return (
    <Badge className="mt-1 bg-yellow-100 text-yellow-800">
      <Clock className="mr-1 h-3 w-3" /> En attente
    </Badge>
  );
}
