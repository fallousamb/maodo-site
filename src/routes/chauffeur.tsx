import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Mail, ArrowLeft, Zap, BatteryCharging, ShieldCheck, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import teslaHero from "@/assets/tesla-hero.jpg";
import teslaInterior from "@/assets/tesla-interior.jpg";
import teslaSide from "@/assets/tesla-side.jpg";
import teslaRear from "@/assets/tesla-rear.jpg";

export const Route = createFileRoute("/chauffeur")({
  head: () => ({
    meta: [
      { title: "Chauffeur Tesla Model Y 2026 — VTC Royal Prestige Charente-Maritime" },
      {
        name: "description",
        content:
          "Découvrez la Tesla Model Y 2026 de votre chauffeur VTC en Charente-Maritime, Vendée, Charente & Deux-Sèvres. Photos détaillées et prise de contact directe.",
      },
      { property: "og:title", content: "Chauffeur Tesla Model Y 2026 — VTC Royal Prestige" },
      {
        property: "og:description",
        content: "Tesla Model Y 2026 : élégance, silence, sécurité. Contactez votre chauffeur.",
      },
      { property: "og:image", content: teslaHero },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChauffeurPage,
});

const photos = [
  { src: teslaHero, alt: "Tesla Model Y 2026 — vue avant", label: "Vue avant" },
  { src: teslaSide, alt: "Tesla Model Y 2026 — profil", label: "Profil" },
  { src: teslaRear, alt: "Tesla Model Y 2026 — vue arrière", label: "Vue arrière" },
  { src: teslaInterior, alt: "Tesla Model Y 2026 — intérieur premium", label: "Intérieur" },
];

const specs = [
  { icon: Zap, label: "0 à 100 km/h", value: "5,0 s" },
  { icon: BatteryCharging, label: "Autonomie", value: "≈ 600 km" },
  { icon: ShieldCheck, label: "Sécurité", value: "5 étoiles Euro NCAP" },
  { icon: Leaf, label: "Émissions", value: "0 g CO₂ / km" },
];

function ChauffeurPage() {
  return (
    <div className="min-h-screen bg-background">
      <WhatsAppButton />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-hero-gradient text-primary-foreground shadow-soft">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="tracking-tight">VTC ROYAL PRESTIGE</span>
          </Link>
          <Link to="/" className="hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground md:inline-flex">
            <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
          </Link>
          <a href="tel:0749545183">
            <Button size="sm" className="gap-2">
              <Phone className="h-4 w-4" /> 07 49 54 51 83
            </Button>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Votre chauffeur · Tesla Model Y 2026
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Tesla Model Y 2026
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Voyagez à bord d'une berline électrique haut de gamme : silence absolu, confort
            spacieux et conduite tout en douceur. Découvrez le véhicule sous toutes ses coutures.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contact">
              <Button size="lg" className="gap-2">
                <Mail className="h-4 w-4" /> Prendre contact
              </Button>
            </a>
            <a href="tel:0749545183">
              <Button size="lg" variant="outline" className="gap-2">
                <Phone className="h-4 w-4" /> Appeler maintenant
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Photos */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Photos du véhicule</h2>
        <p className="mt-2 text-muted-foreground">
          Quatre angles pour vous projeter à bord de la Tesla Model Y 2026.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {photos.map((p) => (
            <figure
              key={p.label}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft"
            >
              <img
                src={p.src}
                alt={p.alt}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <figcaption className="absolute bottom-3 left-3 rounded-full bg-background/85 px-3 py-1 text-xs font-medium backdrop-blur">
                {p.label}
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Specs */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {specs.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-border/60 bg-card p-5 shadow-soft"
            >
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm text-muted-foreground">{label}</div>
              <div className="mt-1 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Prêt à réserver votre course ?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Disponible 7j/7 — 24h/24 en Charente-Maritime, Vendée, Charente & Deux-Sèvres. Contactez-moi pour toute
            demande personnalisée ou réservation.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="tel:0749545183">
              <Button size="lg" className="gap-2">
                <Phone className="h-4 w-4" /> 07 49 54 51 83
              </Button>
            </a>
            <a href="mailto:contact@vtcroyalprestige.com">
              <Button size="lg" variant="outline" className="gap-2">
                <Mail className="h-4 w-4" /> Envoyer un email
              </Button>
            </a>
            <Link to="/">
              <Button size="lg" variant="ghost" className="gap-2">
                Réserver en ligne
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
