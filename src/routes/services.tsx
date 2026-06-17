import { createFileRoute, Link } from "@tanstack/react-router";
import { Plane, Train, Briefcase, PartyPopper, Stethoscope, Clock, Phone, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { MobileNav } from "@/components/MobileNav";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Nos services VTC — Transferts, événements & mise à disposition" },
      {
        name: "description",
        content:
          "Découvrez nos services VTC en Tesla Model Y : transferts aéroports et gares, trajets professionnels, événements, rendez-vous médicaux et mise à disposition.",
      },
      { property: "og:title", content: "Nos services VTC — Élégance assurée" },
      {
        property: "og:description",
        content:
          "Transferts aéroports et gares, trajets pro, événements, rendez-vous médicaux et mise à disposition en Charente-Maritime, Vendée, Charente & Deux-Sèvres.",
      },
    ],
  }),
  component: ServicesPage,
});

const services = [
  {
    icon: Plane,
    title: "Transferts aéroport",
    description:
      "Nantes, La Rochelle, Bordeaux et tous les aéroports de France. Suivi de vol, accueil personnalisé et bagages pris en charge.",
    items: ["Nantes Atlantique", "La Rochelle – Île de Ré", "Bordeaux Mérignac", "Tous les aéroports de France"],
  },
  {
    icon: Train,
    title: "Gares & stations",
    description:
      "Transferts vers et depuis toutes les gares SNCF et stations TGV. Ponctualité garantie pour ne jamais manquer votre train.",
  },
  {
    icon: Briefcase,
    title: "Trajets professionnels",
    description:
      "Déplacements d'affaires, rendez-vous clients, séminaires. Discrétion, confort et Wi-Fi à bord pour travailler sereinement.",
  },
  {
    icon: PartyPopper,
    title: "Événements & occasions spéciales",
    description:
      "Mariages, soirées, concerts, anniversaires. Une Tesla Model Y élégante pour vos moments les plus importants.",
    items: ["Mariages", "Soirées privées", "Concerts & spectacles", "Occasions spéciales"],
  },
  {
    icon: Stethoscope,
    title: "Rendez-vous médicaux",
    description:
      "Transport attentionné vers vos consultations, examens ou hospitalisations. Aide à la mobilité et patience garanties.",
  },
  {
    icon: Clock,
    title: "Mise à disposition",
    description:
      "Chauffeur dédié à l'heure ou à la journée, selon vos différents besoins. Une flexibilité totale pour vos déplacements multiples.",
  },
];

function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <WhatsAppButton />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-hero-gradient text-primary-foreground shadow-soft">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="tracking-tight">VTC ROYAL PRESTIGE</span>
          </Link>
          <nav className="hidden gap-7 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">Accueil</Link>
            <Link to="/services" className="font-medium text-foreground">Services</Link>
            <Link to="/" hash="reserver" className="hover:text-foreground">Réserver</Link>
            <Link to="/" hash="contact" className="hover:text-foreground">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <a href="tel:0749545183" className="hidden sm:block">
              <Button size="sm" className="gap-2">
                <Phone className="h-4 w-4" /> 07 49 54 51 83
              </Button>
            </a>
            <MobileNav />
          </div>
        </div>
      </header>

      <section className="bg-soft-gradient">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Nos services
            </span>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Une prestation VTC sur mesure
            </h1>
            <p className="mt-4 text-muted-foreground">
              Quel que soit votre besoin, profitez d'un service premium en Tesla Model Y avec un
              chauffeur attentionné, 7j/7 — 24h/24.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon: Icon, title, description, items }) => (
            <article
              key={title}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-soft"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              {items && (
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {items.map((it) => (
                    <li key={it} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {it}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="bg-hero-gradient text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Prêt à réserver votre course ?</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">
            Estimation instantanée et réservation en ligne, ou contactez-nous directement.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" hash="reserver">
              <Button size="lg" variant="secondary">Réserver une course</Button>
            </Link>
            <a href="tel:0749545183">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Phone className="h-4 w-4" /> 07 49 54 51 83
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} VTC Royal Prestige — Élégance assurée</div>
          <div className="flex items-center gap-1">
            <Leaf className="h-3.5 w-3.5 text-primary" /> Charente-Maritime, Vendée, Charente & Deux-Sèvres · 7j/7 — 24h/24
          </div>
        </div>
      </footer>
    </div>
  );
}
