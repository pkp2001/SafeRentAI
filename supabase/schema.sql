-- SafeRent AI - Complete Database Schema
-- Run this in the Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  current_address TEXT,
  employment_status TEXT,
  income_source TEXT,
  monthly_income NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- REFERENCES TABLE (for rental applications)
-- ============================================================
CREATE TABLE public.references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS TABLE (for uploaded files)
-- ============================================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'id', 'income', 'rental_history', 'other'
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SAVED LISTINGS TABLE
-- ============================================================
CREATE TABLE public.saved_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_url TEXT NOT NULL,
  listing_id TEXT, -- External ID from Domain/REA
  property_address TEXT NOT NULL,
  suburb TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'NSW',
  postcode TEXT,
  rent_amount NUMERIC NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking INTEGER,
  property_type TEXT,
  image_url TEXT,
  scam_score NUMERIC,
  scam_flags TEXT[],
  safety_score NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  distance_cbd NUMERIC,
  pet_friendly BOOLEAN DEFAULT false,
  furnished BOOLEAN DEFAULT false,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- APPLICATIONS TABLE
-- ============================================================
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES saved_listings(id),
  listing_url TEXT NOT NULL,
  property_address TEXT NOT NULL,
  rent_amount NUMERIC NOT NULL,
  bedrooms INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending', 'shortlisted', 'successful', 'rejected', 'draft'
  cover_letter TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOG (for dashboard recent activity)
-- ============================================================
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'scan', 'save', 'apply', 'view', 'profile_update'
  description TEXT,
  activity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SCAM SCAN HISTORY (for tracking scam scans)
-- ============================================================
CREATE TABLE public.scam_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_url TEXT NOT NULL,
  scam_score NUMERIC,
  is_safe BOOLEAN,
  flags TEXT[],
  analysis TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scam_scans ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- References
CREATE POLICY "Users can view own references" ON public.references
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own references" ON public.references
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own references" ON public.references
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own references" ON public.references
  FOR DELETE USING (auth.uid() = user_id);

-- Documents
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Saved Listings
CREATE POLICY "Users can view own saved listings" ON public.saved_listings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved listings" ON public.saved_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved listings" ON public.saved_listings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved listings" ON public.saved_listings
  FOR DELETE USING (auth.uid() = user_id);

-- Applications
CREATE POLICY "Users can view own applications" ON public.applications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applications" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own applications" ON public.applications
  FOR DELETE USING (auth.uid() = user_id);

-- Activity Log
CREATE POLICY "Users can view own activity" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scam Scans
CREATE POLICY "Users can view own scans" ON public.scam_scans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scans" ON public.scam_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET FOR DOCUMENTS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

