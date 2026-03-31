export const teamFlags: Record<string, string> = {
  Mexico: "🇲🇽",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  "UEFA Playoff D Winner": "🏳️",

  Canada: "🇨🇦",
  Qatar: "🇶🇦",
  Switzerland: "🇨🇭",
  "UEFA Playoff A Winner": "🏳️",

  "United States": "🇺🇸",
  Paraguay: "🇵🇾",
  Australia: "🇦🇺",
  "UEFA Playoff C Winner": "🏳️",

  Brazil: "🇧🇷",
  Morocco: "🇲🇦",
  Haiti: "🇭🇹",
  Scotland: "🏴",

  Germany: "🇩🇪",
  Curacao: "🇨🇼",
  Ecuador: "🇪🇨",
  "Ivory Coast": "🇨🇮",

  Netherlands: "🇳🇱",
  Japan: "🇯🇵",
  Tunisia: "🇹🇳",
  "UEFA Playoff B Winner": "🏳️",

  Spain: "🇪🇸",
  "Cape Verde": "🇨🇻",
  "Saudi Arabia": "🇸🇦",
  Uruguay: "🇺🇾",

  Belgium: "🇧🇪",
  Egypt: "🇪🇬",
  Iran: "🇮🇷",
  "New Zealand": "🇳🇿",

  France: "🇫🇷",
  Senegal: "🇸🇳",
  Norway: "🇳🇴",
  "FIFA Playoff 2 Winner": "🏳️",

  Argentina: "🇦🇷",
  Algeria: "🇩🇿",
  Austria: "🇦🇹",
  Jordan: "🇯🇴",

  Portugal: "🇵🇹",
  Uzbekistan: "🇺🇿",
  Colombia: "🇨🇴",
  "FIFA Playoff 1 Winner": "🏳️",

  England: "🏴",
  Croatia: "🇭🇷",
  Ghana: "🇬🇭",
  Panama: "🇵🇦",
};

export const teamGroup: Record<string, string> = {
  Mexico: "A",
  "South Africa": "A",
  "South Korea": "A",
  "UEFA Playoff D Winner": "A",

  Canada: "B",
  Qatar: "B",
  Switzerland: "B",
  "UEFA Playoff A Winner": "B",

  "United States": "C",
  Paraguay: "C",
  Australia: "C",
  "UEFA Playoff C Winner": "C",

  Brazil: "D",
  Morocco: "D",
  Haiti: "D",
  Scotland: "D",

  Germany: "E",
  Curacao: "E",
  Ecuador: "E",
  "Ivory Coast": "E",

  Netherlands: "F",
  Japan: "F",
  Tunisia: "F",
  "UEFA Playoff B Winner": "F",

  Spain: "G",
  "Cape Verde": "G",
  "Saudi Arabia": "G",
  Uruguay: "G",

  Belgium: "H",
  Egypt: "H",
  Iran: "H",
  "New Zealand": "H",

  France: "I",
  Senegal: "I",
  Norway: "I",
  "FIFA Playoff 2 Winner": "I",

  Argentina: "J",
  Algeria: "J",
  Austria: "J",
  Jordan: "J",

  Portugal: "K",
  Uzbekistan: "K",
  Colombia: "K",
  "FIFA Playoff 1 Winner": "K",

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

