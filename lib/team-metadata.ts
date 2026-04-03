export const teamFlags: Record<string, string> = {
  // Group A
  Mexico: "🇲🇽",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Czechia: "🇨🇿",
  // Group B
  Canada: "🇨🇦",
  "Bosnia and Herzegovina": "🇧🇦",
  Qatar: "🇶🇦",
  Switzerland: "🇨🇭",
  // Group C
  Brazil: "🇧🇷",
  Morocco: "🇲🇦",
  Haiti: "🇭🇹",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  // Group D
  "United States": "🇺🇸",
  Paraguay: "🇵🇾",
  Australia: "🇦🇺",
  Türkiye: "🇹🇷",
  // Group E
  Germany: "🇩🇪",
  Curaçao: "🇨🇼",
  "Ivory Coast": "🇨🇮",
  Ecuador: "🇪🇨",
  // Group F
  Netherlands: "🇳🇱",
  Japan: "🇯🇵",
  Sweden: "🇸🇪",
  Tunisia: "🇹🇳",
  // Group G
  Belgium: "🇧🇪",
  Egypt: "🇪🇬",
  Iran: "🇮🇷",
  "New Zealand": "🇳🇿",
  // Group H
  Spain: "🇪🇸",
  "Cape Verde": "🇨🇻",
  "Saudi Arabia": "🇸🇦",
  Uruguay: "🇺🇾",
  // Group I
  France: "🇫🇷",
  Senegal: "🇸🇳",
  Iraq: "🇮🇶",
  Norway: "🇳🇴",
  // Group J
  Argentina: "🇦🇷",
  Algeria: "🇩🇿",
  Austria: "🇦🇹",
  Jordan: "🇯🇴",
  // Group K
  Portugal: "🇵🇹",
  "DR Congo": "🇨🇩",
  Uzbekistan: "🇺🇿",
  Colombia: "🇨🇴",
  // Group L
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Croatia: "🇭🇷",
  Ghana: "🇬🇭",
  Panama: "🇵🇦",
};

export const teamGroup: Record<string, string> = {
  Mexico: "A",
  "South Africa": "A",
  "South Korea": "A",
  Czechia: "A",
  Canada: "B",
  "Bosnia and Herzegovina": "B",
  Qatar: "B",
  Switzerland: "B",
  Brazil: "C",
  Morocco: "C",
  Haiti: "C",
  Scotland: "C",
  "United States": "D",
  Paraguay: "D",
  Australia: "D",
  Türkiye: "D",
  Germany: "E",
  Curaçao: "E",
  "Ivory Coast": "E",
  Ecuador: "E",
  Netherlands: "F",
  Japan: "F",
  Sweden: "F",
  Tunisia: "F",
  Belgium: "G",
  Egypt: "G",
  Iran: "G",
  "New Zealand": "G",
  Spain: "H",
  "Cape Verde": "H",
  "Saudi Arabia": "H",
  Uruguay: "H",
  France: "I",
  Senegal: "I",
  Iraq: "I",
  Norway: "I",
  Argentina: "J",
  Algeria: "J",
  Austria: "J",
  Jordan: "J",
  Portugal: "K",
  "DR Congo": "K",
  Uzbekistan: "K",
  Colombia: "K",
  England: "L",
  Croatia: "L",
  Ghana: "L",
  Panama: "L",
};

export function getFlag(teamName: string): string {
  return teamFlags[teamName] ?? "⚽";
}

export function getGroup(teamName: string): string {
  return teamGroup[teamName] ?? "?";
}
