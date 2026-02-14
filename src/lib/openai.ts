import type { Profile, ScamResult, SavedListing } from "@/types";
import axios from "axios";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_BASE = "https://api.openai.com/v1";

// ────────────────────────────────────────────────
// Scam detection – REAL-TIME page scraping + AI
// ────────────────────────────────────────────────

/**
 * Fetch the actual text content of a listing page via a CORS proxy.
 * Tries multiple proxies to maximise availability.
 */
async function fetchListingContent(url: string): Promise<string | null> {
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];

  for (const buildProxyUrl of proxies) {
    try {
      const proxyUrl = buildProxyUrl(url);
      console.log("🌐 Fetching listing via proxy:", proxyUrl.slice(0, 80));
      const response = await axios.get(proxyUrl, { timeout: 12000 });
      const html: string =
        typeof response.data === "string" ? response.data : response.data?.contents || "";
      if (html.length > 200) {
        return extractTextFromHtml(html);
      }
    } catch (err) {
      console.warn("Proxy fetch failed, trying next:", (err as Error).message);
    }
  }
  return null;
}

/** Strip HTML tags and collapse whitespace to extract readable text. */
function extractTextFromHtml(html: string): string {
  // Remove script / style blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  // Remove tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  // Limit to first ~6000 chars to stay within token limits
  return text.slice(0, 6000);
}

/**
 * Analyse a rental listing for scam indicators.
 *
 * 1. Fetches the **real page content** from the supplied URL.
 * 2. Sends the content + URL to GPT-4o-mini for deep analysis.
 * 3. If the page cannot be fetched, analyses the URL alone.
 * 4. If no OpenAI key is set, returns an error result (no dummy data).
 */
export async function scanListing(
  url: string,
  description?: string
): Promise<ScamResult> {
  if (!OPENAI_API_KEY) {
    return {
      scamScore: 0,
      flags: [],
      isSafe: false,
      analysisDate: new Date(),
      analysis:
        "OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file to enable real-time scam scanning.",
      recommendations: [
        "Add your OpenAI API key to the .env file",
        "Restart the development server after updating .env",
      ],
      riskCategories: [],
      source: "no-api-key",
    };
  }

  // Step 1: Try to fetch real page content
  let pageContent: string | null = null;
  try {
    pageContent = await fetchListingContent(url);
    if (pageContent) {
      console.log(
        `✅ Fetched ${pageContent.length} chars of listing content`
      );
    }
  } catch {
    console.warn("Could not fetch listing page, analysing URL only");
  }

  // Step 2: AI analysis with whatever content we have
  return await aiScanListing(url, pageContent, description);
}

async function aiScanListing(
  url: string,
  pageContent: string | null,
  description?: string
): Promise<ScamResult> {
  const hasContent = !!pageContent && pageContent.length > 100;
  const source: ScamResult["source"] = hasContent
    ? "live-scrape"
    : "ai-url-analysis";

  const contentBlock = hasContent
    ? `\n\n--- LISTING PAGE CONTENT (scraped live) ---\n${pageContent}\n--- END CONTENT ---`
    : "";

  const prompt = `You are an expert Australian rental scam detective. Analyse this listing IN DETAIL.

URL: ${url}
${description ? `Provided description: ${description}` : ""}${contentBlock}

${
  hasContent
    ? "I have provided the actual scraped content of the listing page above. Analyse it thoroughly."
    : "I could not fetch the page content. Analyse based on the URL structure, platform reputation, and any visible patterns. Be transparent that the full content was not available."
}

Perform a comprehensive analysis covering these categories:
1. **Platform Credibility** — Is this from a trusted platform (domain.com.au, realestate.com.au) or a risky one (gumtree, facebook marketplace, craigslist)?
2. **Price Analysis** — Is the price suspiciously low for the area? Any price red flags?
3. **Contact & Payment** — Any requests for upfront payment, unusual payment methods, overseas landlord?
4. **Listing Quality** — Grammar, spelling, stock photos, missing details, vague descriptions?
5. **Urgency Tactics** — Pressure to act fast, limited time offers, "won't last"?
6. **Verification** — Is there a real estate agent? ABN? Proper contact details? Inspection available?

Respond ONLY with valid JSON:
{
  "scamScore": <number 0-100, where 0=definitely safe and 100=definitely a scam>,
  "isSafe": <boolean>,
  "flags": ["specific flag 1", "specific flag 2"],
  "analysis": "<2-4 sentence summary of findings>",
  "recommendations": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "riskCategories": [
    {"category": "Platform Credibility", "severity": "low|medium|high", "detail": "explanation"},
    {"category": "Price Analysis", "severity": "low|medium|high", "detail": "explanation"},
    {"category": "Contact & Payment", "severity": "low|medium|high", "detail": "explanation"},
    {"category": "Listing Quality", "severity": "low|medium|high", "detail": "explanation"},
    {"category": "Urgency Tactics", "severity": "low|medium|high", "detail": "explanation"},
    {"category": "Verification", "severity": "low|medium|high", "detail": "explanation"}
  ]
}`;

  // Retry with exponential backoff for rate limits (429)
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Rate limited — retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, delay));
      }

      const response = await axios.post(
        `${OPENAI_BASE}/chat/completions`,
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an expert at detecting rental scams in Australia. You perform thorough, honest analysis. When real listing content is provided, analyse it deeply. When only a URL is available, be transparent about the limitations. Never invent data. Respond only with valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 1200,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const raw = response.data.choices[0].message.content;
      const parsed = JSON.parse(raw);

      return {
        scamScore: Math.min(100, Math.max(0, parsed.scamScore ?? 0)),
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        isSafe: parsed.isSafe ?? (parsed.scamScore ?? 0) < 30,
        analysisDate: new Date(),
        analysis: parsed.analysis || "",
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [],
        riskCategories: Array.isArray(parsed.riskCategories)
          ? parsed.riskCategories.map(
              (rc: { category?: string; severity?: string; detail?: string }) => ({
                category: rc.category || "General",
                severity: (["low", "medium", "high"].includes(rc.severity || "")
                  ? rc.severity
                  : "medium") as "low" | "medium" | "high",
                detail: rc.detail || "",
              })
            )
          : [],
        source,
      };
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 429) {
        // Not a rate limit error — don't retry
        break;
      }
    }
  }

  // All retries exhausted or non-429 error
  const errorMsg =
    lastError instanceof Error ? lastError.message : "OpenAI API request failed";
  throw new Error(`Scan failed: ${errorMsg}. Please wait a moment and try again.`);
}

// ────────────────────────────────────────────────
// Cover letter generation
// ────────────────────────────────────────────────

/** All context available for generating a cover letter. */
export interface CoverLetterContext {
  profile: Partial<Profile>;
  listing?: Partial<SavedListing>;
}

/**
 * Generate a personalised cover letter using real profile + listing data.
 *
 * 1. If a listing URL is available, fetches the **real page content** for context.
 * 2. Sends everything to GPT-4o-mini for a tailored, property-specific letter.
 * 3. Falls back to a sensible template if OpenAI is unavailable.
 */
export async function generateCoverLetter(
  ctx: CoverLetterContext
): Promise<string> {
  if (OPENAI_API_KEY) {
    try {
      return await aiGenerateCoverLetter(ctx);
    } catch (error) {
      console.error("OpenAI cover letter failed, using fallback:", error);
    }
  }
  return templateCoverLetter(ctx);
}

async function aiGenerateCoverLetter(ctx: CoverLetterContext): Promise<string> {
  const { profile, listing } = ctx;

  // Step 1: Fetch real listing page content for richer context
  let pageContent: string | null = null;
  if (listing?.listing_url) {
    try {
      pageContent = await fetchListingContent(listing.listing_url);
      if (pageContent) {
        console.log(
          `✅ Fetched ${pageContent.length} chars of listing for cover letter`
        );
      }
    } catch {
      console.warn("Could not fetch listing page for cover letter context");
    }
  }

  // Step 2: Build rich context from all available data
  const applicantSection = [
    `Name: ${profile.full_name || "Not provided"}`,
    profile.email ? `Email: ${profile.email}` : null,
    profile.phone ? `Phone: ${profile.phone}` : null,
    profile.current_address
      ? `Current address: ${profile.current_address}`
      : null,
    profile.employment_status
      ? `Employment: ${profile.employment_status}`
      : null,
    profile.income_source ? `Income source: ${profile.income_source}` : null,
    profile.monthly_income
      ? `Monthly income: $${profile.monthly_income.toLocaleString()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const propertySection = [
    listing?.property_address
      ? `Address: ${listing.property_address}`
      : null,
    listing?.suburb && listing?.state
      ? `Suburb: ${listing.suburb}, ${listing.state} ${listing.postcode || ""}`
      : listing?.suburb
        ? `Suburb: ${listing.suburb}`
        : null,
    listing?.rent_amount
      ? `Rent: $${listing.rent_amount}/week`
      : null,
    listing?.property_type ? `Type: ${listing.property_type}` : null,
    listing?.bedrooms ? `Bedrooms: ${listing.bedrooms}` : null,
    listing?.bathrooms ? `Bathrooms: ${listing.bathrooms}` : null,
    listing?.parking ? `Parking: ${listing.parking}` : null,
    listing?.pet_friendly ? "Pet friendly: Yes" : null,
    listing?.furnished ? "Furnished: Yes" : null,
    listing?.dateAvailable
      ? `Available from: ${listing.dateAvailable}`
      : null,
    listing?.agent?.name ? `Agent: ${listing.agent.name}` : null,
    listing?.agent?.agency ? `Agency: ${listing.agent.agency}` : null,
    listing?.description
      ? `Listing description: ${listing.description.slice(0, 1500)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const pageContentBlock =
    pageContent && pageContent.length > 100
      ? `\n\n--- LIVE LISTING PAGE CONTENT ---\n${pageContent.slice(0, 4000)}\n--- END ---`
      : "";

  const prompt = `Write a professional, personalised rental application cover letter.

=== APPLICANT DETAILS ===
${applicantSection}

=== PROPERTY DETAILS ===
${propertySection}${pageContentBlock}

INSTRUCTIONS:
- Address the letter to the agent by name if known, otherwise "Dear Property Manager"
- Reference SPECIFIC details about the property (suburb, features, type) to show genuine interest
- Tailor the tone to the applicant's situation:
  ${profile.employment_status?.toLowerCase().includes("student") ? "• Student: emphasise study commitment, routine, and responsibility" : ""}
  ${profile.income_source?.toLowerCase().includes("centrelink") || profile.income_source?.toLowerCase().includes("jobseeker") ? "• Government support recipient: emphasise reliability of income, commitment to tenancy obligations, and responsible financial management. Frame positively." : ""}
  ${profile.employment_status?.toLowerCase().includes("full") || profile.employment_status?.toLowerCase().includes("part") ? "• Employed: emphasise stable income and professional reliability" : ""}
- Mention specific amenities or features from the listing that appeal to the applicant
- Include affordability fit: compare rent to income if available
- Mention willingness to provide references, documentation, and attend inspections
- Professional but warm Australian English tone
- 250-350 words
- Do NOT include subject lines or email headers — just the letter body
- Sign off with the applicant's name and contact details`;

  // Retry with exponential backoff for rate limits
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log(
          `⏳ Cover letter rate limited — retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((r) => setTimeout(r, delay));
      }

      const response = await axios.post(
        `${OPENAI_BASE}/chat/completions`,
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You write outstanding rental application cover letters for Australian tenants. Your letters are personalised, genuine, and reference specific property details. You adapt your tone based on the applicant's circumstances — supportive for students and government benefit recipients, professional for employed applicants. You never fabricate details not provided. Australian English only.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 800,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0].message.content?.trim() || "";
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status !== 429) break;
    }
  }

  throw lastError;
}

function templateCoverLetter(ctx: CoverLetterContext): string {
  const { profile, listing } = ctx;
  const name = profile.full_name || "Applicant";
  const employment = profile.employment_status || "employed individual";
  const income = profile.income_source || "regular employment";
  const monthlyIncome = profile.monthly_income || 0;
  const address = listing?.property_address || "the property";
  const rent = listing?.rent_amount || 0;
  const agentName = listing?.agent?.name;

  const greeting = agentName
    ? `Dear ${agentName},`
    : "Dear Property Manager,";

  let employmentDetail = "";
  if (employment.toLowerCase().includes("student")) {
    employmentDetail =
      "As a dedicated student, I am seeking stable accommodation that supports my studies. I maintain a consistent routine and take pride in keeping my living space clean and well-maintained.";
  } else if (
    employment.toLowerCase().includes("centrelink") ||
    income.toLowerCase().includes("centrelink") ||
    income.toLowerCase().includes("jobseeker")
  ) {
    employmentDetail =
      "I receive government support which provides reliable and consistent income. I am committed to being a responsible tenant and have a strong track record of meeting my financial obligations on time.";
  } else {
    employmentDetail = `As a ${employment} with ${income}, I have a stable financial foundation with a monthly income of $${monthlyIncome.toLocaleString()}. I am well-positioned to comfortably meet the rental obligations for this property.`;
  }

  const propertyDetails = [
    listing?.property_type
      ? `This ${listing.property_type.toLowerCase()}`
      : "This property",
    listing?.bedrooms ? `with ${listing.bedrooms} bedroom${listing.bedrooms > 1 ? "s" : ""}` : "",
    listing?.suburb ? `in ${listing.suburb}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `${greeting}

I am writing to express my sincere interest in ${address}${rent ? `, listed at $${rent} per week` : ""}. ${propertyDetails} is an ideal fit for my needs.

${employmentDetail}

I pride myself on being a respectful, quiet, and responsible tenant. I understand the importance of maintaining a property in excellent condition and have always received positive feedback from previous landlords and property managers.

Key qualities I bring as a tenant:
• Reliable and timely rent payments
• Excellent property maintenance
• Respectful of neighbours and community
• Strong references available upon request

I would welcome the opportunity to inspect the property and discuss my application further. I am flexible with viewing times and can provide all necessary documentation promptly.

Thank you for considering my application. I look forward to hearing from you.

Kind regards,
${name}
Phone: ${profile.phone || "Available on request"}
Email: ${profile.email || "Available on request"}`;
}
