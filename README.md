# SafeRent AI 🛡️

An AI-powered platform that protects Australian renters from rental scams, provides live property listings, crime data analysis, and streamlines the rental application process.

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Vite](https://img.shields.io/badge/Vite-7-purple) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-teal) ![Supabase](https://img.shields.io/badge/Supabase-Auth_&_DB-green)

## Features

### Scam Detection
- Paste any rental listing URL and get an instant AI-powered scam risk analysis
- Fetches live page content via CORS proxy and analyses it with AI
- Detailed risk breakdown with categories, red flags, and recommendations
- If a scam is detected, shows verified safer alternatives in the same area with links to trusted platforms (realestate.com.au, domain.com.au)

### Live Property Search
- Real Australian rental listings from the **Realty-in-AU API** (via RapidAPI)
- Search by suburb, price range, bedrooms, and property type
- Property detail pages with images, features, and crime data
- Save favourite listings to your dashboard

### AI Chatbot (RentBot)
- Natural language property search — e.g. *"2 bed apartment near UTS under $500/week"*
- Understands context across messages (follow-up queries carry criteria forward)
- Recognises Australian landmarks, universities, and train stations and maps them to suburbs
- Displays interactive property cards with click-through to details
- Strict client-side price and bedroom filtering
- Chat history persisted in localStorage

### Crime Data
- AI-analysed crime statistics for any Australian suburb
- Safety scores and ratings displayed on listing cards and detail pages

### Applications
- AI-generated cover letters tailored to each listing and your profile
- Application wizard with document upload
- Track application status from your dashboard
- Delete applications when no longer needed

### AI Provider Resilience
- Centralised AI provider with automatic fallback: **Google Gemini → OpenRouter → OpenAI**
- Retry logic with exponential backoff for rate limits (429 errors)
- Robust JSON parsing that handles truncated or malformed AI responses

### Other
- Supabase authentication (email/password + demo mode)
- Dark mode / light mode toggle
- Fully responsive design (mobile-first)
- Animated page transitions (Framer Motion)
- Interactive map view with Leaflet

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| UI Components | Radix UI primitives + custom components |
| State & Data | React Query (TanStack Query) |
| Routing | React Router v6 |
| Auth & Database | Supabase (PostgreSQL + Auth + Storage) |
| Property Data | Realty-in-AU API (RapidAPI) |
| AI / LLM | Google Gemini, OpenRouter, OpenAI (fallback chain) |
| Geocoding | Nominatim (OpenStreetMap) — no API key needed |
| Animations | Framer Motion |
| Maps | Leaflet + React Leaflet |
| Forms | React Hook Form + Zod validation |

---

## Prerequisites

- **Node.js** >= 18
- **npm** or **yarn**
- A **Supabase** project (free tier works)
- A **RapidAPI** account with a subscription to [Realty-in-AU](https://rapidapi.com/s.developer" target="_blank) (free tier: 500 requests/month)
- At least one AI API key (any of the following):
  - [Google Gemini API key](https://aistudio.google.com/apikey) (recommended — most generous free tier)
  - [OpenRouter API key](https://openrouter.ai/keys) (free models available)
  - [OpenAI API key](https://platform.openai.com/api-keys)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/SafeRentAI.git
cd SafeRentAI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# RapidAPI - Realty-in-AU (property listings)
VITE_RAPIDAPI_KEY=your_rapidapi_key
VITE_RAPIDAPI_HOST=realty-in-au.p.rapidapi.com

# AI Providers (add at least one)
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

### 4. Set up the Supabase database

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open the **SQL Editor**
3. Copy and paste the contents of `supabase/schema.sql`
4. Click **Run** to create all tables, RLS policies, storage buckets, and triggers

### 5. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 6. (Optional) Demo mode

You can sign in without a real Supabase account using the demo credentials:

- **Email:** `demo@saferent.ai`
- **Password:** `Demo123!`

---

## Project Structure

```
SafeRentAI/
├── public/                     # Static assets
├── supabase/
│   └── schema.sql              # Database schema (tables, RLS, triggers)
├── src/
│   ├── components/
│   │   ├── features/           # Feature components
│   │   │   ├── PropertyChatbot.tsx    # AI chatbot UI
│   │   │   ├── ScamScanner.tsx        # Scam detection scanner
│   │   │   ├── ListingCard.tsx        # Property listing card
│   │   │   ├── ApplicationWizard.tsx  # Application form wizard
│   │   │   ├── ApplicationTracker.tsx # Application status tracker
│   │   │   ├── CrimeDetailsPanel.tsx  # Crime data display
│   │   │   ├── MapView.tsx            # Leaflet map view
│   │   │   └── AffordabilityCalculator.tsx
│   │   ├── layout/             # Layout components (Navbar, Footer, Sidebar)
│   │   ├── shared/             # Shared components (EmptyState, LoadingSkeleton)
│   │   └── ui/                 # Base UI primitives (Button, Input, etc.)
│   ├── context/
│   │   ├── AuthContext.tsx      # Supabase auth provider
│   │   └── ThemeContext.tsx     # Dark/light mode provider
│   ├── hooks/
│   │   ├── useListings.ts      # Property listing data + Supabase saved listings
│   │   ├── useApplications.ts  # Application CRUD + cover letter generation
│   │   ├── useCrimeData.ts     # Crime data fetching hook
│   │   ├── useAuth.ts          # Auth context consumer
│   │   └── useTheme.ts         # Theme context consumer
│   ├── lib/
│   │   ├── aiProvider.ts       # Centralised AI provider (Gemini/OpenRouter/OpenAI)
│   │   ├── chatbotAI.ts        # Chatbot intent parsing + property search logic
│   │   ├── openai.ts           # Scam detection + cover letter generation
│   │   ├── crimeData.ts        # AI-powered crime data analysis
│   │   ├── realtyApi.ts        # Realty-in-AU API client
│   │   ├── geocoding.ts        # Nominatim geocoding (no API key)
│   │   ├── supabase.ts         # Supabase client init
│   │   ├── supabaseDb.ts       # Database operations (CRUD)
│   │   └── utils.ts            # Utility functions
│   ├── pages/
│   │   ├── Home.tsx            # Landing page with hero + scam scanner
│   │   ├── Search.tsx          # Property search with filters
│   │   ├── ListingDetail.tsx   # Full listing detail page
│   │   ├── Dashboard.tsx       # User dashboard (saved, applications, activity)
│   │   ├── Apply.tsx           # Application submission page
│   │   ├── Profile.tsx         # User profile management
│   │   ├── Resources.tsx       # Renting resources and guides
│   │   ├── Login.tsx           # Sign in page
│   │   └── Signup.tsx          # Sign up page
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── App.tsx                 # Root component with routing
│   └── main.tsx                # Entry point
├── .env.example                # Environment variable template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 5173 |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## API Keys Setup Guide

### Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** to find your project URL and anon key
3. Run `supabase/schema.sql` in the SQL Editor

### Realty-in-AU (RapidAPI)
1. Sign up at [rapidapi.com](https://rapidapi.com)
2. Subscribe to the [Realty-in-AU API](https://rapidapi.com/s.developer/api/realty-in-au) (free tier)
3. Copy your API key from the dashboard

### Google Gemini (Recommended AI provider)
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key (free tier: 15 requests/minute, 1M tokens/day)
3. Add as `VITE_GEMINI_API_KEY`

### OpenRouter (Backup AI provider)
1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Create an API key at [openrouter.ai/keys](https://openrouter.ai/keys)
3. Free models are available (e.g. `google/gemma-3-4b-it:free`)
4. Add as `VITE_OPENROUTER_API_KEY`

### OpenAI (Optional)
1. Get an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Add as `VITE_OPENAI_API_KEY`

> **Note:** You only need **one** AI provider key. The app automatically falls back through Gemini → OpenRouter → OpenAI.

---

## How It Works

### Scam Scanner Flow
1. User pastes a listing URL
2. App fetches the page content via a CORS proxy (`allorigins.win`)
3. HTML is stripped to plain text and sent to the AI provider
4. AI analyses for red flags (price anomalies, contact info, platform credibility, etc.)
5. Returns a risk score (0–100), flags, risk categories, and recommendations
6. If scam detected → shows safer alternatives from verified sources

### Chatbot Flow
1. User types a natural language query
2. AI extracts structured search criteria (suburb, bedrooms, price, proximity)
3. Criteria are merged with the active search context (for follow-up queries)
4. Properties are fetched from Realty-in-AU API
5. Client-side strict filters enforce price and bedroom constraints
6. AI generates a conversational response
7. Properties are displayed as interactive cards in the chat

### AI Provider Fallback
```
Request → Gemini (try gemini-2.5-flash → 2.0-flash → 1.5-flash)
            ↓ (on failure)
        OpenRouter (try gemma-3-4b-it:free → mistral-small:free)
            ↓ (on failure)
        OpenAI (gpt-4o-mini)
            ↓ (all failed)
        Error with detailed diagnostics
```

---

## License

This project was built for a hackathon. Feel free to use and modify.
