import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Star, Check, X, Trash2, RotateCcw } from "lucide-react";
import {
  adminListReviews,
  adminUpdateReviewStatus,
  adminDeleteReview,
} from "@/lib/reviews.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Publié",
  rejected: "Refusé",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function AdminReviewsPanel() {
  const list = useServerFn(adminListReviews);
  const updateStatus = useServerFn(adminUpdateReviewStatus);
  const remove = useServerFn(adminDeleteReview);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => list(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    qc.invalidateQueries({ queryKey: ["reviews", "approved"] });
  };

  const mStatus = useMutation({
    mutationFn: (v: { id: string; status: "pending" | "approved" | "rejected" }) =>
      updateStatus({ data: v }),
    onSuccess: () => {
      toast.success("Avis mis à jour");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const mDelete = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Avis supprimé");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  if (q.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const reviews = (q.data?.reviews ?? []) as any[];
  const pending = reviews.filter((r) => r.status === "pending");
  const rest = reviews.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          À modérer <Badge variant="secondary">{pending.length}</Badge>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun avis en attente.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <ReviewCard
                key={r.id}
                r={r}
                onApprove={() => mStatus.mutate({ id: r.id, status: "approved" })}
                onReject={() => mStatus.mutate({ id: r.id, status: "rejected" })}
                onDelete={() => mDelete.mutate(r.id)}
                busy={mStatus.isPending || mDelete.isPending}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          Historique <Badge variant="secondary">{rest.length}</Badge>
        </h2>
        {rest.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun avis traité.</p>
        ) : (
          <div className="space-y-3">
            {rest.map((r) => (
              <ReviewCard
                key={r.id}
                r={r}
                onApprove={() => mStatus.mutate({ id: r.id, status: "approved" })}
                onReject={() => mStatus.mutate({ id: r.id, status: "rejected" })}
                onReset={() => mStatus.mutate({ id: r.id, status: "pending" })}
                onDelete={() => mDelete.mutate(r.id)}
                busy={mStatus.isPending || mDelete.isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewCard({
  r,
  onApprove,
  onReject,
  onReset,
  onDelete,
  busy,
}: {
  r: any;
  onApprove: () => void;
  onReject: () => void;
  onReset?: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <article className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{r.name}</span>
            {r.city && <span className="text-xs text-muted-foreground">· {r.city}</span>}
            <Badge className={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
              />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleString("fr-FR")}
            </span>
          </div>
          {r.email && (
            <div className="mt-1 text-xs text-muted-foreground">{r.email}</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {r.status !== "approved" && (
            <Button size="sm" onClick={onApprove} disabled={busy} className="gap-1">
              <Check className="h-3.5 w-3.5" /> Publier
            </Button>
          )}
          {r.status !== "rejected" && (
            <Button size="sm" variant="outline" onClick={onReject} disabled={busy} className="gap-1">
              <X className="h-3.5 w-3.5" /> Refuser
            </Button>
          )}
          {onReset && r.status !== "pending" && (
            <Button size="sm" variant="ghost" onClick={onReset} disabled={busy} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Supprimer cet avis définitivement ?")) onDelete();
            }}
            disabled={busy}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground/90">{r.text}</p>
    </article>
  );
}
