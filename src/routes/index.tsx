import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Mail, Leaf, Zap, ShieldCheck, Star, BatteryCharging, Car, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingModule } from "@/components/BookingModule";
import { MobileNav } from "@/components/MobileNav";
import { Testimonials } from "@/components/Testimonials";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import teslaHero from "@/assets/tesla-hero.jpg";
import teslaInterior from "@/assets/tesla-interior.jpg";
import teslaSide from "@/assets/tesla-side.jpg";
import teslaRear from "@/assets/tesla-rear.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VTC Royal Prestige — Élégance assurée | Chauffeur Tesla en Charente-Maritime, Vendée, Charente & Deux-Sèvres" },
      {
        name: "description",
        content:
          "VTC Royal Prestige en Charente-Maritime, Vendée, Charente & Deux-Sèvres · 7j/7 — 24h/24. Chauffeur en Tesla Model Y. Réservation en ligne et estimation instantanée.",
      },
      { property: "og:title", content: "VTC Royal Prestige — Élégance assurée" },
      {
        property: "og:description",
        content: "Votre bien-être est notre priorité, un agréable voyage est garanti.",
      },
      { property: "og:image", content: teslaHero },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <WhatsAppButton />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a href="#top" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-hero-gradient text-primary-foreground shadow-soft">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="tracking-tight">VTC ROYAL PRESTIGE</span>
          </a>
          <nav className="hidden gap-7 text-sm text-muted-foreground md:flex">
            <a href="#vehicule" className="hover:text-foreground">Le véhicule</a>
            <Link to="/services" className="hover:text-foreground">Services</Link>
            <a href="#reserver" className="hover:text-foreground">Réserver</a>
            <a href="#avis" className="hover:text-foreground">Avis</a>
            <a href="#contact" className="hover:text-foreground">Contact</a>
            <Link to="/espace-client" className="hover:text-foreground">Espace client</Link>
            <Link to="/chauffeur" className="hover:text-foreground">Chauffeur</Link>
            <Link to="/espace-chauffeur" className="hover:text-foreground">Espace chauffeur</Link>
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

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={teslaHero}
            alt="Tesla Model Y blanche du chauffeur VTC en Charente-Maritime, Vendée, Charente & Deux-Sèvres"
            width={1920}
            height={1280}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:py-28 lg:grid-cols-2 lg:py-36">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Clock className="h-3.5 w-3.5" /> Charente-Maritime, Vendée, Charente & Deux-Sèvres · 7j/7 — 24h/24
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              VTC Royal Prestige —{" "}
              <span className="bg-hero-gradient bg-clip-text text-transparent">
                Élégance assurée
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Votre bien-être est notre priorité, un agréable voyage est garanti. Réservation en
              ligne et estimation instantanée de votre course.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#reserver">
                <Button size="lg" className="shadow-soft">Réserver une course</Button>
              </a>
              <a href="tel:0749545183">
                <Button size="lg" variant="outline" className="gap-2">
                  <Phone className="h-4 w-4" /> Appeler
                </Button>
              </a>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                { icon: Star, label: "Service premium" },
                { icon: ShieldCheck, label: "Chauffeur agréé" },
                { icon: BatteryCharging, label: "100% électrique" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-xl bg-card/70 p-3 text-center shadow-card backdrop-blur">
                  <Icon className="mx-auto h-5 w-5 text-primary" />
                  <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Véhicule */}
      <section id="vehicule" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Le véhicule</span>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Tesla Model Y 2026</h2>
          <p className="mt-3 text-muted-foreground">
            Premium · Berline · Confort absolu · Technologie de pointe.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 overflow-hidden rounded-2xl shadow-card">
            <img src={teslaSide} alt="Profil de la Tesla Model Y blanche" width={1600} height={1067} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-2xl shadow-card">
            <img src={teslaInterior} alt="Intérieur épuré de la Tesla Model Y" width={1600} height={1067} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-2xl shadow-card md:col-span-3">
            <img src={teslaRear} alt="Vue arrière de la Tesla Model Y au crépuscule" width={1920} height={1080} loading="lazy" className="h-72 w-full object-cover sm:h-96" />
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          {[
            { icon: Car, t: "5 places", d: "Spacieux et confortable" },
            { icon: Zap, t: "Autopilot", d: "Sécurité avancée" },
            { icon: BatteryCharging, t: "0 émission", d: "Tesla 100% électrique" },
            { icon: Leaf, t: "Silencieux", d: "Trajet apaisant" },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold">{t}</div>
              <div className="text-sm text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Réservation */}
      <section id="reserver" className="bg-soft-gradient">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Réservation</span>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Calculez & réservez en ligne</h2>
            <p className="mt-3 text-muted-foreground">
              Indiquez votre départ, vos étapes éventuelles et votre arrivée. Le tarif est calculé
              automatiquement.
            </p>
          </div>
          <div className="mt-10">
            <BookingModule />
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <Testimonials />

      {/* Contact */}
      <section id="contact" className="bg-hero-gradient text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Une question ? Un trajet immédiat ?</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">
            Contactez-moi directement, je vous réponds rapidement pour organiser votre déplacement.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="tel:0749545183">
              <Button size="lg" variant="secondary" className="gap-2">
                <Phone className="h-4 w-4" />
                <span>07 49 54 51 83</span>
              </Button>
            </a>
            <a href="mailto:domao.milk@gmail.com">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Mail className="h-4 w-4" />
                <span>domao.milk@gmail.com</span>
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
