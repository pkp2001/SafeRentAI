import { supabase } from "./supabase";
import type { SavedListing, Application, Profile } from "@/types";

// ────────────────────────────────────────────────
// Profiles
// ────────────────────────────────────────────────

export async function getProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("getProfile error:", error);
    return null;
  }
  return data;
}

export async function upsertProfile(
  profileData: Partial<Profile>
): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...profileData }, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ────────────────────────────────────────────────
// Saved Listings
// ────────────────────────────────────────────────

export async function getSavedListings(): Promise<SavedListing[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_listings")
    .select("*")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    console.error("getSavedListings error:", error);
    return [];
  }

  // Map Supabase rows to our SavedListing type
  return (data || []).map(mapDbListing);
}

export async function saveListing(
  listing: Omit<SavedListing, "id" | "user_id" | "saved_at">
): Promise<SavedListing | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("saved_listings")
    .insert({
      user_id: user.id,
      listing_url: listing.listing_url,
      property_address: listing.property_address,
      suburb: listing.suburb || "",
      state: "NSW",
      postcode: listing.postcode || "",
      rent_amount: listing.rent_amount,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      parking: listing.parking,
      property_type: listing.property_type,
      image_url: listing.image_url,
      scam_score: listing.scam_score,
      scam_flags: listing.scam_flags,
      safety_score: listing.safety_score,
      latitude: listing.lat,
      longitude: listing.lng,
      distance_cbd: listing.distance_cbd,
      pet_friendly: listing.pet_friendly,
      furnished: listing.furnished,
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logActivity("save", `Saved listing at ${listing.property_address}`);

  return data ? mapDbListing(data) : null;
}

export async function deleteSavedListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("id", listingId);

  if (error) throw error;
}

// ────────────────────────────────────────────────
// Applications
// ────────────────────────────────────────────────

export async function getApplications(): Promise<Application[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("getApplications error:", error);
    return [];
  }

  return (data || []).map(mapDbApplication);
}

export async function submitApplication(
  app: Omit<Application, "id" | "submitted_at">
): Promise<Application | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      listing_url: app.listing_url,
      property_address: app.property_address,
      rent_amount: app.rent_amount,
      bedrooms: app.bedrooms,
      status: app.status || "pending",
      cover_letter: app.cover_letter,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity("apply", `Applied to ${app.property_address}`);

  return data ? mapDbApplication(data) : null;
}

export async function updateApplication(
  id: string,
  updates: Partial<Application>
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ────────────────────────────────────────────────
// Documents
// ────────────────────────────────────────────────

export interface DocumentRecord {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

export async function getDocuments(): Promise<DocumentRecord[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("getDocuments error:", error);
    return [];
  }
  return data || [];
}

export async function uploadDocument(
  file: File,
  documentType: string
): Promise<DocumentRecord | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const filePath = `${user.id}/${Date.now()}_${file.name}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Save metadata to DB
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      document_type: documentType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDocument(doc: DocumentRecord): Promise<void> {
  // Remove from storage
  await supabase.storage.from("documents").remove([doc.file_path]);
  // Remove metadata
  await supabase.from("documents").delete().eq("id", doc.id);
}

// ────────────────────────────────────────────────
// Activity Log
// ────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string;
  activity_type: string;
  description: string | null;
  activity_data: Record<string, unknown> | null;
  created_at: string;
}

export async function getActivityLog(
  limit = 10
): Promise<ActivityLogEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getActivityLog error:", error);
    return [];
  }
  return data || [];
}

export async function logActivity(
  type: string,
  description?: string,
  data?: Record<string, unknown>
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: type,
    description,
    activity_data: data || null,
  });
}

// ────────────────────────────────────────────────
// Scam Scans
// ────────────────────────────────────────────────

export async function getScamScanCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("scam_scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) return 0;
  return count || 0;
}

export async function saveScamScan(scan: {
  listing_url: string;
  scam_score: number;
  is_safe: boolean;
  flags: string[];
  analysis?: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("scam_scans").insert({
    user_id: user.id,
    ...scan,
  });

  await logActivity("scan", `Scanned listing: ${scan.listing_url}`);
}

// ────────────────────────────────────────────────
// DB Row → App type mappers
// ────────────────────────────────────────────────

function mapDbListing(row: any): SavedListing {
  return {
    id: row.id,
    user_id: row.user_id,
    listing_url: row.listing_url,
    property_address: row.property_address,
    rent_amount: Number(row.rent_amount),
    bedrooms: row.bedrooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    image_url: row.image_url || "",
    scam_score: Number(row.scam_score ?? 0),
    scam_flags: row.scam_flags || [],
    saved_at: row.saved_at,
    property_type: row.property_type,
    parking: row.parking,
    pet_friendly: row.pet_friendly,
    furnished: row.furnished,
    lat: row.latitude ? Number(row.latitude) : undefined,
    lng: row.longitude ? Number(row.longitude) : undefined,
    suburb: row.suburb,
    distance_cbd: row.distance_cbd ? Number(row.distance_cbd) : undefined,
    safety_score: row.safety_score ? Number(row.safety_score) : undefined,
    postcode: row.postcode,
  };
}

function mapDbApplication(row: any): Application {
  return {
    id: row.id,
    user_id: row.user_id,
    listing_url: row.listing_url,
    property_address: row.property_address,
    rent_amount: Number(row.rent_amount),
    bedrooms: row.bedrooms ?? 0,
    status: row.status,
    cover_letter: row.cover_letter || "",
    submitted_at: row.submitted_at,
  };
}

