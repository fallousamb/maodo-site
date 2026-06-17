import { useState } from "react";
import { Star, Quote, MessageSquarePlus, Loader2, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listApprovedReviews, submitReview } from "@/lib/reviews.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const FALLBACK = [
  { name: "Sophie L.", city: "Rochefort", text: "Chauffeur ponctuel, voiture impeccable. Trajet vers La Rochelle parfait, je recommande !", rating: 5 },
  { name: "Marc D.", city: "Tonnay-Charente", text: "Service très professionnel, conduite souple et silencieuse en Tesla. Une vraie classe.", rating: 5 },
  { name: "Camille R.", city: "Fouras", text: "Réservé pour l'aéroport, à l'heure pile. Très courtois, je rappellerai.", rating: 5 },
  { name: "Julien P.", city: "Échillais", text: "Confort top, intérieur d'une propreté irréprochable. Tarif honnête.", rating: 5 },
  { name: "Anne-Claire B.", city: "Rochefort", text: "Trajet de nuit en toute sérénité. Chauffeur très rassurant.", rating: 5 },
  { name: "Thomas G.", city: "Soubise", text: "Pratique pour mes déplacements pros. Toujours dispo, toujours pro.", rating: 5 },
  { name: "Léa M.", city: "Saint-Agnant", text: "On sent que le client est la priorité. Vraiment agréable.", rating: 5 },
  { name: "Patrick V.", city: "Rochefort", text: "Tesla silencieuse, je suis arrivé reposé à mon rendez-vous.", rating: 5 },
  { name: "Élodie F.", city: "La Rochelle", text: "Excellent rapport qualité/prix, accueil parfait. Bravo !", rating: 5 },
];

export function Testimonials() {
  const list = useServerFn(listApprovedReviews);
  const submit = useServerFn(submitReview);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["reviews", "approved"],
    queryFn: () => list(),
  });

  const reviews = q.data?.reviews ?? [];
  const items = reviews.length > 0
    ? reviews.map((r) => ({ name: r.name, city: r.city ?? "", text: r.text, rating: r.rating }))
    : FALLBACK;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", email: "", rating: 5, text: "" });

  const m = useMutation({
    mutationFn: async () => submit({ data: form }),
    onSuccess: () => {
      toast.success("Merci ! Votre avis a été envoyé et sera publié après modération.");
      setOpen(false);
      setForm({ name: "", city: "", email: "", rating: 5, text: "" });
      qc.invalidateQueries({ queryKey: ["reviews", "approved"] });
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Une erreur est survenue. Vérifiez les champs.");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error("Votre nom est requis (2 caractères min).");
    if (form.text.trim().length < 10) return toast.error("Votre avis doit faire au moins 10 caractères.");
    if (form.rating < 1 || form.rating > 5) return toast.error("Note invalide.");
    m.mutate();
  };

  return (
    <section id="avis" className="bg-soft-gradient">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Avis clients</span>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Ils nous font confiance</h2>
          <p className="mt-3 text-muted-foreground">
            Plus de 500 courses réalisées dans la Charente-Maritime, Vendée, Charente & Deux-Sèvres.
          </p>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="mt-6 gap-2">
                <MessageSquarePlus className="h-4 w-4" />
                Laisser un avis
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Partagez votre expérience</DialogTitle>
                <DialogDescription>
                  Votre avis sera publié après une rapide vérification. Merci de votre confiance !
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rv-name">Nom *</Label>
                    <Input id="rv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder="Sophie L." required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rv-city">Ville</Label>
                    <Input id="rv-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} placeholder="Rochefort" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rv-email">Email (facultatif, non publié)</Label>
                  <Input id="rv-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} placeholder="vous@exemple.com" />
                </div>
                <div className="space-y-2">
                  <Label>Note *</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setForm({ ...form, rating: n })}
                        className="p-1 transition-transform hover:scale-110"
                        aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                      >
                        <Star className={`h-7 w-7 ${n <= form.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rv-text">Votre avis *</Label>
                  <Textarea
                    id="rv-text"
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    maxLength={1000}
                    minLength={10}
                    rows={5}
                    placeholder="Racontez-nous votre expérience…"
                    required
                  />
                  <p className="text-xs text-muted-foreground">{form.text.length} / 1000</p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={m.isPending} className="gap-2">
                    {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Envoyer mon avis
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <article key={i} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <Quote className="h-6 w-6 text-primary/40" />
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.text}"</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  {t.city && <div className="text-xs text-muted-foreground">{t.city}</div>}
                </div>
                <div className="flex">
                  {Array.from({ length: t.rating }).map((_, k) => (
                    <Star key={k} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
