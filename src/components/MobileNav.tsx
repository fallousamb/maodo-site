import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  Plane,
  Train,
  Briefcase,
  PartyPopper,
  Stethoscope,
  Clock,
  Phone,
  Mail,
  Car,
  UserCog,
  Home,
  Star,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const prestations = [
  { icon: Plane, label: "Transferts aéroport" },
  { icon: Train, label: "Gares & stations" },
  { icon: Briefcase, label: "Trajets professionnels" },
  { icon: PartyPopper, label: "Événements" },
  { icon: Stethoscope, label: "Rendez-vous médicaux" },
  { icon: Clock, label: "Mise à disposition" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85%] overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>VTC Royal Prestige</SheetTitle>
        </SheetHeader>

        <nav className="mt-6 flex flex-col gap-1">
          <Link
            to="/"
            onClick={close}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            <Home className="h-4 w-4 text-primary" /> Accueil
          </Link>
          <Link
            to="/services"
            onClick={close}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            <Car className="h-4 w-4 text-primary" /> Tous les services
          </Link>
        </nav>

        <div className="mt-6">
          <div className="px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Prestations
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {prestations.map(({ icon: Icon, label }) => (
              <Link
                key={label}
                to="/services"
                onClick={close}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Navigation
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <a
              href="/#reserver"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Clock className="h-4 w-4 text-primary" /> Réserver
            </a>
            <a
              href="/#avis"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Star className="h-4 w-4 text-primary" /> Avis
            </a>
            <a
              href="/#contact"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Mail className="h-4 w-4 text-primary" /> Contact
            </a>
          </div>
        </div>

        <div className="mt-6">
          <div className="px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Espace pro
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <Link
              to="/espace-client"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <User className="h-4 w-4 text-primary" /> Espace client
            </Link>
            <Link
              to="/chauffeur"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <UserCog className="h-4 w-4 text-primary" /> Chauffeur
            </Link>
            <Link
              to="/espace-chauffeur"
              onClick={close}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Car className="h-4 w-4 text-primary" /> Espace chauffeur
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-4">
          <a href="tel:0749545183" onClick={close}>
            <Button className="w-full gap-2">
              <Phone className="h-4 w-4" /> 07 49 54 51 83
            </Button>
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
