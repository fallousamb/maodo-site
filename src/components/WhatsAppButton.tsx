import { MessageCircle } from "lucide-react";

const PHONE = "33749545183"; // wa.me international format, no '+'

export function WhatsAppButton() {
  const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(
    "Bonjour, je souhaite réserver une course VTC Royal Prestige.",
  )}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter sur WhatsApp"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366]"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
