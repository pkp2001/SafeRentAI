export interface CrimeStats {
  suburb: string;
  state: string;
  postcode: string;
  totalCrimes: number;
  crimeRate: number; // per 100,000 residents
  violentCrimeRate: number;
  propertyCrimeRate: number;
  safetyScore: number; // 0-100 (higher = safer)
  trend: "increasing" | "decreasing" | "stable";
  lastUpdated: string;
  dataSource: string;
}

export interface SafetyLevel {
  level: "very-safe" | "safe" | "moderate" | "caution" | "high-risk";
  color: string;
  darkColor: string;
  bgColor: string;
  darkBgColor: string;
  label: string;
  range: string;
}

// Mock data based on real NSW BOCSAR crime statistics
// In production, this would fetch from NSW Data.NSW API or AU Crime Tracker
export const sydneyCrimeData: Record<string, CrimeStats> = {
  "Bella Vista": {
    suburb: "Bella Vista",
    state: "NSW",
    postcode: "2153",
    totalCrimes: 245,
    crimeRate: 3200,
    violentCrimeRate: 180,
    propertyCrimeRate: 2100,
    safetyScore: 78,
    trend: "decreasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Parramatta: {
    suburb: "Parramatta",
    state: "NSW",
    postcode: "2150",
    totalCrimes: 892,
    crimeRate: 8500,
    violentCrimeRate: 450,
    propertyCrimeRate: 4200,
    safetyScore: 52,
    trend: "stable",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  "Sydney CBD": {
    suburb: "Sydney",
    state: "NSW",
    postcode: "2000",
    totalCrimes: 1456,
    crimeRate: 17792,
    violentCrimeRate: 890,
    propertyCrimeRate: 6500,
    safetyScore: 35,
    trend: "increasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  "Castle Hill": {
    suburb: "Castle Hill",
    state: "NSW",
    postcode: "2154",
    totalCrimes: 198,
    crimeRate: 2800,
    violentCrimeRate: 120,
    propertyCrimeRate: 1650,
    safetyScore: 85,
    trend: "decreasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Bondi: {
    suburb: "Bondi",
    state: "NSW",
    postcode: "2026",
    totalCrimes: 567,
    crimeRate: 6200,
    violentCrimeRate: 320,
    propertyCrimeRate: 3100,
    safetyScore: 58,
    trend: "stable",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Bankstown: {
    suburb: "Bankstown",
    state: "NSW",
    postcode: "2200",
    totalCrimes: 743,
    crimeRate: 9200,
    violentCrimeRate: 520,
    propertyCrimeRate: 4800,
    safetyScore: 42,
    trend: "increasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Manly: {
    suburb: "Manly",
    state: "NSW",
    postcode: "2095",
    totalCrimes: 234,
    crimeRate: 3500,
    violentCrimeRate: 165,
    propertyCrimeRate: 1890,
    safetyScore: 75,
    trend: "decreasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Blacktown: {
    suburb: "Blacktown",
    state: "NSW",
    postcode: "2148",
    totalCrimes: 821,
    crimeRate: 8900,
    violentCrimeRate: 480,
    propertyCrimeRate: 4500,
    safetyScore: 45,
    trend: "stable",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Chatswood: {
    suburb: "Chatswood",
    state: "NSW",
    postcode: "2067",
    totalCrimes: 312,
    crimeRate: 4100,
    violentCrimeRate: 210,
    propertyCrimeRate: 2400,
    safetyScore: 72,
    trend: "decreasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Penrith: {
    suburb: "Penrith",
    state: "NSW",
    postcode: "2750",
    totalCrimes: 698,
    crimeRate: 7800,
    violentCrimeRate: 410,
    propertyCrimeRate: 3900,
    safetyScore: 48,
    trend: "stable",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  "Surry Hills": {
    suburb: "Surry Hills",
    state: "NSW",
    postcode: "2010",
    totalCrimes: 623,
    crimeRate: 7100,
    violentCrimeRate: 380,
    propertyCrimeRate: 3400,
    safetyScore: 50,
    trend: "stable",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Newtown: {
    suburb: "Newtown",
    state: "NSW",
    postcode: "2042",
    totalCrimes: 412,
    crimeRate: 5200,
    violentCrimeRate: 280,
    propertyCrimeRate: 2800,
    safetyScore: 62,
    trend: "decreasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Mosman: {
    suburb: "Mosman",
    state: "NSW",
    postcode: "2088",
    totalCrimes: 156,
    crimeRate: 2400,
    violentCrimeRate: 95,
    propertyCrimeRate: 1200,
    safetyScore: 88,
    trend: "decreasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Burwood: {
    suburb: "Burwood",
    state: "NSW",
    postcode: "2134",
    totalCrimes: 378,
    crimeRate: 5500,
    violentCrimeRate: 260,
    propertyCrimeRate: 2900,
    safetyScore: 60,
    trend: "stable",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Kensington: {
    suburb: "Kensington",
    state: "NSW",
    postcode: "2033",
    totalCrimes: 289,
    crimeRate: 4300,
    violentCrimeRate: 220,
    propertyCrimeRate: 2300,
    safetyScore: 68,
    trend: "stable",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Liverpool: {
    suburb: "Liverpool",
    state: "NSW",
    postcode: "2170",
    totalCrimes: 812,
    crimeRate: 9100,
    violentCrimeRate: 510,
    propertyCrimeRate: 4600,
    safetyScore: 40,
    trend: "increasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  "Darling Harbour": {
    suburb: "Darling Harbour",
    state: "NSW",
    postcode: "2000",
    totalCrimes: 534,
    crimeRate: 9800,
    violentCrimeRate: 420,
    propertyCrimeRate: 3800,
    safetyScore: 46,
    trend: "stable",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Hornsby: {
    suburb: "Hornsby",
    state: "NSW",
    postcode: "2077",
    totalCrimes: 267,
    crimeRate: 3800,
    violentCrimeRate: 190,
    propertyCrimeRate: 2050,
    safetyScore: 74,
    trend: "decreasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
  Eastwood: {
    suburb: "Eastwood",
    state: "NSW",
    postcode: "2122",
    totalCrimes: 213,
    crimeRate: 3100,
    violentCrimeRate: 150,
    propertyCrimeRate: 1750,
    safetyScore: 80,
    trend: "decreasing",
    lastUpdated: "December 2025",
    dataSource: "NSW BOCSAR",
  },
};

export const getCrimeStats = (suburbOrAddress: string): CrimeStats | null => {
  // Try the suburb field directly first (exact match)
  if (sydneyCrimeData[suburbOrAddress]) {
    return sydneyCrimeData[suburbOrAddress];
  }

  // Normalize: strip state + postcode suffix
  const normalizedSuburb = suburbOrAddress
    .replace(/,?\s*(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\s*\d*/gi, "")
    .trim();

  if (sydneyCrimeData[normalizedSuburb]) {
    return sydneyCrimeData[normalizedSuburb];
  }

  // Case-insensitive exact match
  const keyExact = Object.keys(sydneyCrimeData).find(
    (k) => k.toLowerCase() === normalizedSuburb.toLowerCase()
  );
  if (keyExact) return sydneyCrimeData[keyExact];

  // Partial match: check if any key is contained within the address string
  const keyPartial = Object.keys(sydneyCrimeData).find((k) =>
    suburbOrAddress.toLowerCase().includes(k.toLowerCase())
  );
  if (keyPartial) return sydneyCrimeData[keyPartial];

  // "Bondi Beach" → match "Bondi"
  const keyWord = Object.keys(sydneyCrimeData).find((k) =>
    normalizedSuburb.toLowerCase().includes(k.toLowerCase())
  );
  return keyWord ? sydneyCrimeData[keyWord] : null;
};

export const getSafetyLevel = (safetyScore: number): SafetyLevel => {
  if (safetyScore >= 80) {
    return {
      level: "very-safe",
      color: "#10B981",
      darkColor: "#3FB950",
      bgColor: "#ECFDF5",
      darkBgColor: "#064E3B",
      label: "Very Safe",
      range: "80-100",
    };
  }
  if (safetyScore >= 65) {
    return {
      level: "safe",
      color: "#22C55E",
      darkColor: "#4ADE80",
      bgColor: "#F0FDF4",
      darkBgColor: "#14532D",
      label: "Safe",
      range: "65-79",
    };
  }
  if (safetyScore >= 50) {
    return {
      level: "moderate",
      color: "#F59E0B",
      darkColor: "#FCD34D",
      bgColor: "#FFFBEB",
      darkBgColor: "#78350F",
      label: "Moderate",
      range: "50-64",
    };
  }
  if (safetyScore >= 35) {
    return {
      level: "caution",
      color: "#FB923C",
      darkColor: "#FDBA74",
      bgColor: "#FFF7ED",
      darkBgColor: "#7C2D12",
      label: "Use Caution",
      range: "35-49",
    };
  }
  return {
    level: "high-risk",
    color: "#EF4444",
    darkColor: "#F87171",
    bgColor: "#FEF2F2",
    darkBgColor: "#7F1D1D",
    label: "High Risk",
    range: "0-34",
  };
};

export const getTrendIcon = (
  trend: "increasing" | "decreasing" | "stable"
) => {
  switch (trend) {
    case "decreasing":
      return { icon: "↓", color: "#10B981", label: "Decreasing" };
    case "increasing":
      return { icon: "↑", color: "#EF4444", label: "Increasing" };
    case "stable":
      return { icon: "→", color: "#64748B", label: "Stable" };
  }
};

export const safetyLevels: SafetyLevel[] = [
  getSafetyLevel(90),
  getSafetyLevel(70),
  getSafetyLevel(55),
  getSafetyLevel(40),
  getSafetyLevel(20),
];

