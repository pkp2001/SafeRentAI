export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  current_address: string;
  employment_status: string;
  income_source: string;
  monthly_income: number;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  listing_url: string;
  property_address: string;
  rent_amount: number;
  bedrooms: number;
  status: "pending" | "shortlisted" | "successful" | "rejected";
  cover_letter: string;
  submitted_at: string;
}

export interface SavedListing {
  id: string;
  user_id: string;
  listing_url: string;
  property_address: string;
  rent_amount: number;
  bedrooms: number;
  bathrooms: number;
  image_url: string;
  scam_score: number;
  scam_flags: string[];
  saved_at: string;
  property_type?: string;
  parking?: number;
  pet_friendly?: boolean;
  furnished?: boolean;
  lat?: number;
  lng?: number;
  suburb?: string;
  distance_cbd?: number;
}

export interface Reference {
  name: string;
  email: string;
  phone: string;
  relationship: string;
}

export interface ScamResult {
  scamScore: number;
  flags: string[];
  isSafe: boolean;
  analysisDate: Date;
}

export interface FilterState {
  location: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: string;
  propertyType: string[];
  petFriendly: boolean;
  furnished: boolean;
  parking: boolean;
  scamFreeOnly: boolean;
}

