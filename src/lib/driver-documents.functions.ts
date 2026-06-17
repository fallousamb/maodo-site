import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DOCUMENT_TYPES = [
  "id_card",
  "passport",
  "driving_license",
  "vtc_card",
  "vehicle_insurance",
  "civil_liability",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  id_card: "Pièce d'identité",
  passport: "Passeport",
  driving_license: "Permis de conduire",
  vtc_card: "Carte professionnelle VTC",
  vehicle_insurance: "Assurance véhicule (titre onéreux)",
  civil_liability: "Responsabilité civile",
};

const DocTypeSchema = z.enum(DOCUMENT_TYPES);

// Liste les documents du chauffeur connecté
export const listMyDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!driver) return { documents: [], driverId: null };
    const { data, error } = await supabase
      .from("driver_documents")
      .select("*")
      .eq("driver_id", driver.id)
      .order("uploaded_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { documents: data ?? [], driverId: driver.id as string };
  });

const UpsertSchema = z.object({
  document_type: DocTypeSchema,
  file_path: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(100),
});

// Enregistre la métadonnée après upload du fichier
export const upsertMyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpsertSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: driver, error: dErr } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!driver) throw new Error("Profil chauffeur introuvable");

    const { data: row, error } = await supabase
      .from("driver_documents")
      .upsert(
        {
          driver_id: driver.id,
          document_type: data.document_type,
          file_path: data.file_path,
          mime_type: data.mime_type,
          verified: false,
          verified_at: null,
          verified_by: null,
          rejection_reason: null,
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: "driver_id,document_type" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { document: row };
  });

export const deleteMyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!driver) throw new Error("Profil chauffeur introuvable");

    const { data: doc, error: gErr } = await supabase
      .from("driver_documents")
      .select("file_path, driver_id")
      .eq("id", data.id)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!doc || doc.driver_id !== driver.id) throw new Error("Document introuvable");

    await supabase.storage.from("driver-documents").remove([doc.file_path]);
    const { error } = await supabase.from("driver_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// URL signée temporaire (pour preview / téléchargement)
export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: doc, error } = await supabase
      .from("driver_documents")
      .select("file_path")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: signed, error: sErr } = await supabase.storage
      .from("driver-documents")
      .createSignedUrl(doc.file_path, 60 * 10); // 10 minutes
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl };
  });

// Met à jour les détails véhicule du chauffeur
const VehicleSchema = z.object({
  vehicle_type: z.string().max(60).optional().nullable(),
  vehicle_brand: z.string().max(60).optional().nullable(),
  vehicle_model: z.string().max(120).optional().nullable(),
  vehicle_year: z.coerce.number().int().min(1980).max(2100).optional().nullable(),
  vehicle_color: z.string().max(40).optional().nullable(),
  vehicle_plate: z.string().max(20).optional().nullable(),
});

export const updateMyVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VehicleSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("drivers").update(data).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ==================== ADMIN ====================

export const adminListDriverDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ driver_id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Unauthorized: Admin role required");

    const { data: docs, error } = await supabase
      .from("driver_documents")
      .select("*")
      .eq("driver_id", data.driver_id)
      .order("document_type", { ascending: true });
    if (error) throw new Error(error.message);

    // Signed URLs pour chaque doc
    const withUrls = await Promise.all(
      (docs ?? []).map(async (d) => {
        const { data: signed } = await supabase.storage
          .from("driver-documents")
          .createSignedUrl(d.file_path as string, 60 * 15);
        return { ...d, signed_url: signed?.signedUrl ?? null };
      }),
    );
    return { documents: withUrls };
  });

const VerifySchema = z.object({
  id: z.string().uuid(),
  verified: z.boolean(),
  rejection_reason: z.string().max(500).optional().nullable(),
});

export const adminVerifyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerifySchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Unauthorized: Admin role required");

    const { error } = await supabase
      .from("driver_documents")
      .update({
        verified: data.verified,
        verified_at: data.verified ? new Date().toISOString() : null,
        verified_by: data.verified ? userId : null,
        rejection_reason: data.verified ? null : (data.rejection_reason ?? null),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
