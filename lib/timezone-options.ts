/** IANA zones grouped for `<select>` (region labels are English). */
export const TIMEZONE_GROUPS: { region: string; zones: string[] }[] = [
  {
    region: "Americas",
    zones: [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Mexico_City",
      "America/Bogota",
      "America/Sao_Paulo",
      "America/Buenos_Aires",
      "America/Santiago",
    ],
  },
  {
    region: "Europe",
    zones: [
      "Europe/London",
      "Europe/Madrid",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Rome",
      "Europe/Lisbon",
    ],
  },
  {
    region: "Asia / Middle East",
    zones: ["Asia/Dubai", "Asia/Tokyo", "Asia/Seoul", "Asia/Shanghai", "Asia/Kolkata", "Asia/Riyadh"],
  },
  {
    region: "Africa",
    zones: ["Africa/Lagos", "Africa/Cairo", "Africa/Johannesburg", "Africa/Casablanca"],
  },
  {
    region: "Oceania",
    zones: ["Australia/Sydney", "Australia/Perth", "Pacific/Auckland"],
  },
];

export const ALL_TIMEZONE_IDS = TIMEZONE_GROUPS.flatMap((g) => g.zones);
