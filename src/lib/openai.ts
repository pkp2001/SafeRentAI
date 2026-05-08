import type { Profile, ScamResult, SavedListing } from "@/types";
import axios from "axios";
import { chatCompletion, hasAnyAIKey } from "@/lib/aiProvider";

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
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, 6000);
}

/**
 * Robustly parse a JSON string from an AI model.
 * Handles: markdown code fences, trailing commas, truncated output.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParseJson(raw: string): any {
  // 1. Strip markdown code fences
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // 2. Ensure we start from the first { and end at the last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // 3. Try parsing directly
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue to repair attempts
  }

  // 4. Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // 5. Truncated output — try to close open structures
  //    Remove the last incomplete value (after last complete key-value pair)
  const repaired = repairTruncatedJson(cleaned);
  try {
    return JSON.parse(repaired);
  } catch {
    // continue
  }

  // 6. Last resort — extract whatever we can with regex
  console.warn("⚠️ Could not parse AI JSON, extracting fields manually");
  return {
    scamScore: extractNumber(raw, "scamScore") ?? 50,
    isSafe: raw.includes('"isSafe": true') || raw.includes('"isSafe":true'),
    flags: extractArray(raw, "flags"),
    analysis: extractString(raw, "analysis") || "Analysis could not be fully parsed.",
    recommendations: extractArray(raw, "recommendations"),
    riskCategories: [],
  };
}

/** Attempt to close unclosed braces/brackets in truncated JSON. */
function repairTruncatedJson(json: string): string {
  // Remove the last incomplete string literal (unterminated)
  // Find the last complete key-value pair by removing from the last unmatched quote
  let s = json;

  // Count open braces / brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const prev = i > 0 ? s[i - 1] : "";

    if (c === '"' && prev !== "\\") {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (c === "{") openBraces++;
    if (c === "}") openBraces--;
    if (c === "[") openBrackets++;
    if (c === "]") openBrackets--;
  }

  // If we're inside a string, truncate to before it started
  if (inString) {
    // Find the last opening quote and trim there
    const lastQuote = s.lastIndexOf('"');
    if (lastQuote > 0) {
      s = s.slice(0, lastQuote);
      // Remove trailing key name or comma
      s = s.replace(/,?\s*"?[^"]*$/, "");
    }
  }

  // Remove trailing comma
  s = s.replace(/,\s*$/, "");

  // Close open structures
  for (let i = 0; i < openBrackets; i++) s += "]";
  for (let i = 0; i < openBraces; i++) s += "}";

  return s;
}

function extractNumber(text: string, key: string): number | null {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`));
  return m ? parseInt(m[1]) : null;
}

function extractString(text: string, key: string): string | null {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)`));
  return m ? m[1] : null;
}

function extractArray(text: string, key: string): string[] {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]?`));
  if (!m) return [];
  const items = m[1].match(/"([^"]*)"/g);
  return items ? items.map((s) => s.replace(/"/g, "")) : [];
}

/**
 * Analyse a rental listing for scam indicators.
 *
 * 1. Fetches the **real page content** from the supplied URL.
 * 2. Sends the content + URL to the AI provider chain for deep analysis.
 * 3. If the page cannot be fetched, analyses the URL alone.
 * 4. If no AI key is set, returns an error result (no dummy data).
 */
export async function scanListing(
  url: string,
  description?: string
): Promise<ScamResult> {
  if (!hasAnyAIKey()) {
    return {
      scamScore: 0,
      flags: [],
      isSafe: false,
      analysisDate: new Date(),
      analysis:
        "No AI API key is configured. Add VITE_GEMINI_API_KEY to your .env file. Get a free key at https://aistudio.google.com/apikey",
      recommendations: [
        "Add VITE_GEMINI_API_KEY to the .env file",
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

  const userPrompt = `You are an expert Australian rental scam detective. Analyse this listing IN DETAIL.

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

  const { content: raw, provider } = await chatCompletion({
    messages: [
      {
        role: "system",
        content:
          "You are an expert at detecting rental scams in Australia. You perform thorough, honest analysis. When real listing content is provided, analyse it deeply. When only a URL is available, be transparent about the limitations. Never invent data. Respond only with valid JSON.",
      },
      { role: "user", content: userPrompt },
    ],
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 2000,
  });

  console.log(`✅ Scam scan completed via ${provider}`);

  const parsed = safeParseJson(raw);

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
 * 2. Sends everything to the AI provider chain for a tailored letter.
 * 3. Falls back to a sensible template if all AI providers fail.
 */
export async function generateCoverLetter(
  ctx: CoverLetterContext
): Promise<string> {
  if (hasAnyAIKey()) {
    try {
      return await aiGenerateCoverLetter(ctx);
    } catch (error) {
      console.error("AI cover letter failed, using template fallback:", error);
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

  const userPrompt = `Write a professional, personalised rental application cover letter.

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

  const { content, provider } = await chatCompletion({
    messages: [
      {
        role: "system",
        content:
          "You write outstanding rental application cover letters for Australian tenants. Your letters are personalised, genuine, and reference specific property details. You adapt your tone based on the applicant's circumstances — supportive for students and government benefit recipients, professional for employed applicants. You never fabricate details not provided. Australian English only.",
      },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 800,
  });

  console.log(`✅ Cover letter generated via ${provider}`);
  return content.trim();
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
