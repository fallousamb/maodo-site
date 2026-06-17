import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyDocuments,
  upsertMyDocument,
  deleteMyDocument,
  getDocumentSignedUrl,
  DOCUMENT_TYPES,
  DOCUMENT_LABELS,
  type DocumentType,
} from "@/lib/driver-documents.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  Trash2,
} from "lucide-react";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

export function DriverDocumentsSection({ driverId }: { driverId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyDocuments);
  const upsertFn = useServerFn(upsertMyDocument);
  const delFn = useServerFn(deleteMyDocument);
  const signedFn = useServerFn(getDocumentSignedUrl);

  const docsQ = useQuery({
    queryKey: ["my-documents"],
    queryFn: () => listFn(),
  });

  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Document supprimé");
      qc.invalidateQueries({ queryKey: ["my-documents"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const docsByType = new Map<DocumentType, any>(
    (docsQ.data?.documents ?? []).map((d: any) => [d.document_type, d]),
  );

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
      <h2 className="text-xl font-semibold">Mes documents</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Déposez vos pièces justificatives (photo ou PDF, 10 Mo max). Elles seront vérifiées
        par l'administrateur.
      </p>

      {docsQ.isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {DOCUMENT_TYPES.map((type) => (
          <DocumentRow
            key={type}
            type={type}
            driverId={driverId}
            doc={docsByType.get(type)}
            onUploaded={() => qc.invalidateQueries({ queryKey: ["my-documents"] })}
            onDelete={(id) => {
              if (confirm("Supprimer ce document ?")) delM.mutate(id);
            }}
            onPreview={async (id) => {
              try {
                const res = await signedFn({ data: { id } });
                window.open(res.url, "_blank", "noopener,noreferrer");
              } catch (e: any) {
                toast.error(e?.message ?? "Erreur");
              }
            }}
            uploadFn={async (file) => {
              const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
              const path = `${driverId}/${type}-${Date.now()}.${ext}`;
              const { error: upErr } = await supabase.storage
                .from("driver-documents")
                .upload(path, file, { upsert: true, contentType: file.type });
              if (upErr) throw new Error(upErr.message);
              // Si un ancien fichier existait, supprimer son fichier obsolète
              const existing = docsByType.get(type);
              if (existing && existing.file_path !== path) {
                await supabase.storage
                  .from("driver-documents")
                  .remove([existing.file_path]);
              }
              await upsertFn({
                data: { document_type: type, file_path: path, mime_type: file.type },
              });
            }}
          />
        ))}
      </div>
    </section>
  );
}

function DocumentRow({
  type,
  doc,
  uploadFn,
  onUploaded,
  onDelete,
  onPreview,
}: {
  type: DocumentType;
  driverId: string;
  doc?: any;
  uploadFn: (file: File) => Promise<void>;
  onUploaded: () => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (max 10 Mo)");
      return;
    }
    setBusy(true);
    try {
      await uploadFn(file);
      toast.success("Document envoyé");
      onUploaded();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur upload");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <div className="text-sm font-medium">{DOCUMENT_LABELS[type]}</div>
            {doc ? <StatusBadge doc={doc} /> : (
              <div className="mt-1 text-xs text-muted-foreground">Non envoyé</div>
            )}
          </div>
        </div>
      </div>

      {doc?.rejection_reason && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-900">
          Motif : {doc.rejection_reason}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="gap-1"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {doc ? "Remplacer" : "Envoyer"}
        </Button>
        {doc && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPreview(doc.id)}
              className="gap-1"
            >
              <Eye className="h-3.5 w-3.5" /> Voir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(doc.id)}
              className="gap-1 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
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
