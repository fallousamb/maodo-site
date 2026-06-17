import type { PDFFont, RGB } from "pdf-lib";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 42;

type Reservation = {
  id: string;
  invoice_number?: string | null;
  pickup_datetime: string;
  duration_min?: number | string | null;
  invoice_issued_at?: string | null;
  created_at: string;
  estimated_price?: number | string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km?: number | string | null;
  promo_code?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
};

type Driver = {
  full_name?: string | null;
  phone?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;
  license_number?: string | null;
} | null;

type Company = {
  company_name?: string | null;
  legal_form?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  siret?: string | null;
  vat_number?: string | null;
  vat_rate?: number | string | null;
  vat_applicable?: boolean | null;
  iban?: string | null;
  bic?: string | null;
  legal_mention?: string | null;
} | null;

type InvoicePayload = {
  reservation: Reservation;
  driver: Driver;
  company: Company;
};

type TextOptions = { size?: number; font?: PDFFont; color?: RGB };

function value(v: unknown) {
  return v == null || v === "" ? "—" : String(v);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function sanitize(text: unknown) {
  return value(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/€/g, "EUR");
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["—"];
}

export async function createInvoicePdfBytes(payload: InvoicePayload) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const { reservation: r, driver, company } = payload;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0.08, 0.08, 0.08);
  const muted = rgb(0.42, 0.42, 0.42);
  const line = rgb(0.82, 0.82, 0.82);
  const accent = rgb(0.08, 0.24, 0.45);
  let y = pageHeight - margin;

  const text = (content: unknown, x: number, yy: number, options: TextOptions = {}) => {
    page.drawText(sanitize(content), {
      x,
      y: yy,
      size: options.size ?? 10,
      font: options.font ?? regular,
      color: options.color ?? black,
    });
  };

  const hLine = (yy: number) =>
    page.drawLine({
      start: { x: margin, y: yy },
      end: { x: pageWidth - margin, y: yy },
      thickness: 1,
      color: line,
    });

  const isInvoice = !!r.invoice_number;
  const pickup = new Date(r.pickup_datetime);
  const durationMin = r.duration_min != null ? Number(r.duration_min) : null;
  const arrival = durationMin != null ? new Date(pickup.getTime() + durationMin * 60_000) : null;
  const issued = r.invoice_issued_at ? new Date(r.invoice_issued_at) : null;
  const created = new Date(r.created_at);
  const total = Number(r.estimated_price ?? 0);
  const vatRate = Number(company?.vat_rate ?? 10);
  const vatApplicable = !!company?.vat_applicable;
  const ht = vatApplicable ? total / (1 + vatRate / 100) : total;
  const tva = vatApplicable ? total - ht : 0;

  text(company?.company_name || "Entreprise", margin, y, { size: 17, font: bold, color: accent });
  y -= 18;
  [
    company?.legal_form,
    company?.address,
    [company?.postal_code, company?.city].filter(Boolean).join(" "),
    company?.country,
    company?.phone ? `Tel : ${company.phone}` : null,
    company?.email,
    company?.siret ? `SIRET : ${company.siret}` : null,
    company?.vat_number ? `TVA : ${company.vat_number}` : null,
  ]
    .filter(Boolean)
    .forEach((row) => {
      text(row, margin, y, { size: 9, color: muted });
      y -= 12;
    });

  const title = isInvoice ? "FACTURE" : "BON DE COMMANDE";
  text(title, pageWidth - margin - bold.widthOfTextAtSize(title, 22), pageHeight - margin, {
    size: 22,
    font: bold,
    color: accent,
  });
  const ref = `${isInvoice ? "N°" : "Réf."} ${r.invoice_number || r.id.slice(0, 8).toUpperCase()}`;
  text(ref, pageWidth - margin - regular.widthOfTextAtSize(ref, 10), pageHeight - margin - 22, {
    size: 10,
    color: muted,
  });
  const issuedText = `Émis le ${formatShortDate(issued ?? created)}`;
  text(
    issuedText,
    pageWidth - margin - regular.widthOfTextAtSize(issuedText, 10),
    pageHeight - margin - 36,
    { size: 10, color: muted },
  );

  y = Math.min(y, pageHeight - 170);
  hLine(y);
  y -= 28;

  text("CLIENT", margin, y, { size: 9, font: bold, color: muted });
  text("CHAUFFEUR", pageWidth / 2 + 10, y, { size: 9, font: bold, color: muted });
  y -= 16;
  const leftY = y;
  text(r.customer_name, margin, y, { size: 11, font: bold });
  text(driver?.full_name ?? "—", pageWidth / 2 + 10, y, { size: 11, font: bold });
  y -= 14;
  text(r.customer_phone, margin, y, { size: 9, color: muted });
  text(driver?.phone ?? "—", pageWidth / 2 + 10, y, { size: 9, color: muted });
  y -= 12;
  text(r.customer_email, margin, y, { size: 9, color: muted });
  const vehicle = [driver?.vehicle_model, driver?.vehicle_plate].filter(Boolean).join(" · ");
  text(vehicle || "—", pageWidth / 2 + 10, y, { size: 9, color: muted });
  y -= 12;
  text(
    driver?.license_number ? `Licence VTC : ${driver.license_number}` : "",
    pageWidth / 2 + 10,
    y,
    { size: 9, color: muted },
  );
  y = leftY - 62;

  hLine(y);
  y -= 28;

  text("PRESTATION", margin, y, { size: 9, font: bold, color: muted });
  y -= 18;
  const rows: Array<[string, string]> = [
    ["Date", formatDate(pickup)],
    ["Heure de départ", formatTime(pickup)],
    ...(arrival ? [["Heure d'arrivée estimée", formatTime(arrival)] as [string, string]] : []),
    ["Lieu de prise en charge", r.pickup_address],
    ["Lieu de dépôt", r.dropoff_address],
    ...(r.distance_km != null
      ? [["Distance", `${Number(r.distance_km).toFixed(1)} km`] as [string, string]]
      : []),
    ...(durationMin != null
      ? [["Durée estimée", `${Math.round(durationMin)} min`] as [string, string]]
      : []),
    ...(r.promo_code ? [["Code promo", r.promo_code] as [string, string]] : []),
  ];

  rows.forEach(([label, rowValue]) => {
    const wrapped = wrapText(rowValue, pageWidth - margin * 2 - 165, regular, 10);
    text(label, margin, y, { size: 9, color: muted });
    wrapped.forEach((lineText, index) =>
      text(lineText, margin + 165, y - index * 12, { size: 10 }),
    );
    y -= Math.max(16, wrapped.length * 12 + 4);
  });

  y -= 8;
  hLine(y);
  y -= 28;

  const totalsX = pageWidth - margin - 190;
  const amountX = pageWidth - margin;
  const amount = (label: string, amountValue: string, yy: number, strong = false) => {
    text(label, totalsX, yy, { size: strong ? 11 : 10, font: strong ? bold : regular });
    text(
      amountValue,
      amountX - (strong ? bold : regular).widthOfTextAtSize(amountValue, strong ? 11 : 10),
      yy,
      { size: strong ? 11 : 10, font: strong ? bold : regular },
    );
  };
  if (vatApplicable) {
    amount("Total HT", `${ht.toFixed(2)} EUR`, y);
    y -= 16;
    amount(`TVA (${vatRate}%)`, `${tva.toFixed(2)} EUR`, y);
    y -= 18;
    page.drawLine({
      start: { x: totalsX, y: y + 8 },
      end: { x: amountX, y: y + 8 },
      thickness: 1,
      color: line,
    });
    amount("Total TTC", `${total.toFixed(2)} EUR`, y, true);
  } else {
    amount("Total", `${total.toFixed(2)} EUR`, y, true);
    y -= 18;
    text("TVA non applicable, art. 293 B du CGI.", totalsX, y, { size: 8, color: muted });
  }

  y -= 32;
  text(
    `Paiement : ${r.payment_method === "card" ? "Carte" : "Espèces"}${r.payment_status === "paid" ? " (payé)" : ""}`,
    totalsX,
    y,
    { size: 8, color: muted },
  );

  if ((company?.iban || company?.bic) && isInvoice) {
    y -= 34;
    text("Coordonnées bancaires", margin, y, { size: 9, font: bold, color: muted });
    y -= 14;
    if (company?.iban) {
      text(`IBAN : ${company.iban}`, margin, y, { size: 9 });
      y -= 12;
    }
    if (company?.bic) text(`BIC : ${company.bic}`, margin, y, { size: 9 });
  }

  if (company?.legal_mention) {
    const footerLines = wrapText(company.legal_mention, pageWidth - margin * 2, regular, 8);
    footerLines.slice(0, 3).forEach((footerLine, index) => {
      text(footerLine, margin, 34 - index * 10, { size: 8, color: muted });
    });
  }

  return pdf.save();
}
