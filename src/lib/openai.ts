import type { Profile, ScamResult } from "@/types";

const suspiciousPatterns = [
  "gumtree.com.au",
  "facebook.com/marketplace",
  "craigslist",
  "locanto",
];

const redFlags = [
  "Price 40% below market average",
  "Requests payment before viewing",
  "Landlord claims to be overseas",
  "Listing images found on multiple sites",
  "No property inspection available",
  "Suspicious payment method requested",
  "Recently created listing account",
  "Pressure to act immediately",
  "No lease agreement mentioned",
  "Requests personal banking details upfront",
];

export async function scanListing(url: string): Promise<ScamResult> {
  // Simulate network delay for dramatic effect
  await new Promise((resolve) => setTimeout(resolve, 2500));

  let scamScore = Math.random() * 60;
  const flags: string[] = [];

  // Check for suspicious platforms
  if (suspiciousPatterns.some((p) => url.toLowerCase().includes(p))) {
    scamScore += 25;
    flags.push("Listing from higher-risk platform");
  }

  // Check for suspicious URL patterns
  if (url.includes("free") || url.includes("urgent") || url.includes("cheap")) {
    scamScore += 15;
    flags.push("Suspicious keywords in URL");
  }

  // Add random flags based on score
  const shuffled = [...redFlags].sort(() => Math.random() - 0.5);
  const numFlags = scamScore > 60 ? 4 : scamScore > 30 ? 2 : 1;
  for (let i = 0; i < numFlags && i < shuffled.length; i++) {
    if (!flags.includes(shuffled[i])) {
      flags.push(shuffled[i]);
    }
  }

  const finalScore = Math.min(Math.round(scamScore), 100);

  return {
    scamScore: finalScore,
    flags,
    isSafe: finalScore < 30,
    analysisDate: new Date(),
  };
}

export async function generateCoverLetter(
  profile: Partial<Profile>,
  propertyAddress: string,
  rentAmount: number
): Promise<string> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const name = profile.full_name || "Applicant";
  const employment = profile.employment_status || "employed individual";
  const income = profile.income_source || "regular employment";
  const monthlyIncome = profile.monthly_income || 0;

  let employmentDetail = "";
  if (
    employment.toLowerCase().includes("student")
  ) {
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

  return `Dear Property Manager,

I am writing to express my sincere interest in the property at ${propertyAddress}, listed at $${rentAmount} per week. I believe I would be an excellent tenant for this property.

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

