// Last updated: April 2026 — UPDATE when official squads are announced

export interface Player {
  name: string;
  team: string;
  position: "GK" | "DEF" | "MID" | "FWD";
}

export const players: Player[] = [
  // Group A - Mexico
  { name: "Raúl Jiménez", team: "Mexico", position: "FWD" },
  { name: "Hirving Lozano", team: "Mexico", position: "FWD" },
  { name: "Edson Álvarez", team: "Mexico", position: "MID" },
  { name: "Santiago Giménez", team: "Mexico", position: "FWD" },
  // Group A - South Africa
  { name: "Percy Tau", team: "South Africa", position: "FWD" },
  { name: "Themba Zwane", team: "South Africa", position: "MID" },
  // Group A - South Korea
  { name: "Son Heung-min", team: "South Korea", position: "FWD" },
  { name: "Lee Kang-in", team: "South Korea", position: "MID" },
  { name: "Kim Min-jae", team: "South Korea", position: "DEF" },
  // Group A - Czechia
  { name: "Patrik Schick", team: "Czechia", position: "FWD" },
  { name: "Adam Hložek", team: "Czechia", position: "FWD" },
  // Group B - Canada
  { name: "Alphonso Davies", team: "Canada", position: "DEF" },
  { name: "Jonathan David", team: "Canada", position: "FWD" },
  // Group B - Bosnia and Herzegovina
  { name: "Edin Džeko", team: "Bosnia and Herzegovina", position: "FWD" },
  { name: "Ermedin Demirović", team: "Bosnia and Herzegovina", position: "FWD" },
  // Group B - Qatar
  { name: "Akram Afif", team: "Qatar", position: "FWD" },
  { name: "Almoez Ali", team: "Qatar", position: "FWD" },
  // Group B - Switzerland
  { name: "Granit Xhaka", team: "Switzerland", position: "MID" },
  { name: "Breel Embolo", team: "Switzerland", position: "FWD" },
  { name: "Noah Okafor", team: "Switzerland", position: "FWD" },
  // Group C - Brazil
  { name: "Vinícius Jr.", team: "Brazil", position: "FWD" },
  { name: "Rodrygo", team: "Brazil", position: "FWD" },
  { name: "Endrick", team: "Brazil", position: "FWD" },
  { name: "Raphinha", team: "Brazil", position: "FWD" },
  { name: "Bruno Guimarães", team: "Brazil", position: "MID" },
  // Group C - Morocco
  { name: "Achraf Hakimi", team: "Morocco", position: "DEF" },
  { name: "Hakim Ziyech", team: "Morocco", position: "MID" },
  { name: "Youssef En-Nesyri", team: "Morocco", position: "FWD" },
  // Group C - Haiti
  { name: "Duckens Nazon", team: "Haiti", position: "FWD" },
  // Group C - Scotland
  { name: "John McGinn", team: "Scotland", position: "MID" },
  { name: "Che Adams", team: "Scotland", position: "FWD" },
  { name: "Scott McTominay", team: "Scotland", position: "MID" },
  // Group D - United States
  { name: "Christian Pulisic", team: "United States", position: "FWD" },
  { name: "Weston McKennie", team: "United States", position: "MID" },
  { name: "Gio Reyna", team: "United States", position: "MID" },
  { name: "Folarin Balogun", team: "United States", position: "FWD" },
  // Group D - Paraguay
  { name: "Miguel Almirón", team: "Paraguay", position: "FWD" },
  { name: "Julio Enciso", team: "Paraguay", position: "FWD" },
  // Group D - Australia
  { name: "Mathew Leckie", team: "Australia", position: "FWD" },
  { name: "Jackson Irvine", team: "Australia", position: "MID" },
  // Group D - Türkiye
  { name: "Hakan Çalhanoğlu", team: "Türkiye", position: "MID" },
  { name: "Arda Güler", team: "Türkiye", position: "MID" },
  { name: "Kerem Aktürkoğlu", team: "Türkiye", position: "FWD" },
  // Group E - Germany
  { name: "Jamal Musiala", team: "Germany", position: "MID" },
  { name: "Florian Wirtz", team: "Germany", position: "MID" },
  { name: "Kai Havertz", team: "Germany", position: "FWD" },
  { name: "Niclas Füllkrug", team: "Germany", position: "FWD" },
  // Group E - Curaçao
  { name: "Juninho Bacuna", team: "Curaçao", position: "MID" },
  // Group E - Ivory Coast
  { name: "Sébastien Haller", team: "Ivory Coast", position: "FWD" },
  { name: "Nicolas Pépé", team: "Ivory Coast", position: "FWD" },
  { name: "Franck Kessié", team: "Ivory Coast", position: "MID" },
  // Group E - Ecuador
  { name: "Moisés Caicedo", team: "Ecuador", position: "MID" },
  { name: "Enner Valencia", team: "Ecuador", position: "FWD" },
  // Group F - Netherlands
  { name: "Cody Gakpo", team: "Netherlands", position: "FWD" },
  { name: "Xavi Simons", team: "Netherlands", position: "MID" },
  { name: "Virgil van Dijk", team: "Netherlands", position: "DEF" },
  // Group F - Japan
  { name: "Takefusa Kubo", team: "Japan", position: "FWD" },
  { name: "Daichi Kamada", team: "Japan", position: "MID" },
  { name: "Kaoru Mitoma", team: "Japan", position: "FWD" },
  // Group F - Sweden
  { name: "Alexander Isak", team: "Sweden", position: "FWD" },
  { name: "Viktor Gyökeres", team: "Sweden", position: "FWD" },
  { name: "Dejan Kulusevski", team: "Sweden", position: "MID" },
  // Group F - Tunisia
  { name: "Youssef Msakni", team: "Tunisia", position: "FWD" },
  // Group G - Belgium
  { name: "Kevin De Bruyne", team: "Belgium", position: "MID" },
  { name: "Romelu Lukaku", team: "Belgium", position: "FWD" },
  { name: "Jérémy Doku", team: "Belgium", position: "FWD" },
  // Group G - Egypt
  { name: "Mohamed Salah", team: "Egypt", position: "FWD" },
  { name: "Omar Marmoush", team: "Egypt", position: "FWD" },
  // Group G - Iran
  { name: "Mehdi Taremi", team: "Iran", position: "FWD" },
  { name: "Sardar Azmoun", team: "Iran", position: "FWD" },
  // Group G - New Zealand
  { name: "Chris Wood", team: "New Zealand", position: "FWD" },
  // Group H - Spain
  { name: "Lamine Yamal", team: "Spain", position: "FWD" },
  { name: "Pedri", team: "Spain", position: "MID" },
  { name: "Nico Williams", team: "Spain", position: "FWD" },
  { name: "Álvaro Morata", team: "Spain", position: "FWD" },
  { name: "Dani Olmo", team: "Spain", position: "MID" },
  // Group H - Cape Verde
  { name: "Garry Rodrigues", team: "Cape Verde", position: "FWD" },
  // Group H - Saudi Arabia
  { name: "Salem Al-Dawsari", team: "Saudi Arabia", position: "FWD" },
  // Group H - Uruguay
  { name: "Darwin Núñez", team: "Uruguay", position: "FWD" },
  { name: "Federico Valverde", team: "Uruguay", position: "MID" },
  { name: "Luis Suárez", team: "Uruguay", position: "FWD" },
  // Group I - France
  { name: "Kylian Mbappé", team: "France", position: "FWD" },
  { name: "Antoine Griezmann", team: "France", position: "FWD" },
  { name: "Ousmane Dembélé", team: "France", position: "FWD" },
  { name: "Aurélien Tchouaméni", team: "France", position: "MID" },
  // Group I - Senegal
  { name: "Sadio Mané", team: "Senegal", position: "FWD" },
  { name: "Ismaïla Sarr", team: "Senegal", position: "FWD" },
  // Group I - Iraq
  { name: "Mohanad Ali", team: "Iraq", position: "FWD" },
  // Group I - Norway
  { name: "Erling Haaland", team: "Norway", position: "FWD" },
  { name: "Martin Ødegaard", team: "Norway", position: "MID" },
  // Group J - Argentina
  { name: "Lionel Messi", team: "Argentina", position: "FWD" },
  { name: "Julián Álvarez", team: "Argentina", position: "FWD" },
  { name: "Lautaro Martínez", team: "Argentina", position: "FWD" },
  // Group J - Algeria
  { name: "Riyad Mahrez", team: "Algeria", position: "FWD" },
  { name: "Islam Slimani", team: "Algeria", position: "FWD" },
  // Group J - Austria
  { name: "Marko Arnautović", team: "Austria", position: "FWD" },
  { name: "Marcel Sabitzer", team: "Austria", position: "MID" },
  // Group J - Jordan
  { name: "Musa Al-Taamari", team: "Jordan", position: "FWD" },
  // Group K - Portugal
  { name: "Cristiano Ronaldo", team: "Portugal", position: "FWD" },
  { name: "Bruno Fernandes", team: "Portugal", position: "MID" },
  { name: "Bernardo Silva", team: "Portugal", position: "MID" },
  { name: "Rafael Leão", team: "Portugal", position: "FWD" },
  // Group K - DR Congo
  { name: "Cédric Bakambu", team: "DR Congo", position: "FWD" },
  // Group K - Uzbekistan
  { name: "Eldor Shomurodov", team: "Uzbekistan", position: "FWD" },
  // Group K - Colombia
  { name: "Luis Díaz", team: "Colombia", position: "FWD" },
  { name: "James Rodríguez", team: "Colombia", position: "MID" },
  { name: "Jhon Arias", team: "Colombia", position: "FWD" },
  // Group L - England
  { name: "Harry Kane", team: "England", position: "FWD" },
  { name: "Jude Bellingham", team: "England", position: "MID" },
  { name: "Bukayo Saka", team: "England", position: "FWD" },
  { name: "Phil Foden", team: "England", position: "FWD" },
  // Group L - Croatia
  { name: "Luka Modrić", team: "Croatia", position: "MID" },
  { name: "Andrej Kramarić", team: "Croatia", position: "FWD" },
  // Group L - Ghana
  { name: "Mohammed Kudus", team: "Ghana", position: "MID" },
  { name: "Jordan Ayew", team: "Ghana", position: "FWD" },
  // Group L - Panama
  { name: "José Fajardo", team: "Panama", position: "FWD" },
];

export const goalkeepers: Player[] = [
  // Group A
  { name: "Guillermo Ochoa", team: "Mexico", position: "GK" },
  { name: "Ronwen Williams", team: "South Africa", position: "GK" },
  { name: "Kim Seung-gyu", team: "South Korea", position: "GK" },
  { name: "Jindřich Staněk", team: "Czechia", position: "GK" },
  // Group B
  { name: "Maxime Crépeau", team: "Canada", position: "GK" },
  { name: "Nikola Vasilj", team: "Bosnia and Herzegovina", position: "GK" },
  { name: "Meshaal Barsham", team: "Qatar", position: "GK" },
  { name: "Yann Sommer", team: "Switzerland", position: "GK" },
  // Group C
  { name: "Alisson", team: "Brazil", position: "GK" },
  { name: "Yassine Bounou", team: "Morocco", position: "GK" },
  { name: "Josué Duverger", team: "Haiti", position: "GK" },
  { name: "Angus Gunn", team: "Scotland", position: "GK" },
  // Group D
  { name: "Matt Turner", team: "United States", position: "GK" },
  { name: "Antony Silva", team: "Paraguay", position: "GK" },
  { name: "Mathew Ryan", team: "Australia", position: "GK" },
  { name: "Altay Bayındır", team: "Türkiye", position: "GK" },
  // Group E
  { name: "Manuel Neuer", team: "Germany", position: "GK" },
  { name: "Eloy Room", team: "Curaçao", position: "GK" },
  { name: "Badra Ali Sangaré", team: "Ivory Coast", position: "GK" },
  { name: "Hernán Galíndez", team: "Ecuador", position: "GK" },
  // Group F
  { name: "Bart Verbruggen", team: "Netherlands", position: "GK" },
  { name: "Zion Suzuki", team: "Japan", position: "GK" },
  { name: "Robin Olsen", team: "Sweden", position: "GK" },
  { name: "Aymen Dahmen", team: "Tunisia", position: "GK" },
  // Group G
  { name: "Koen Casteels", team: "Belgium", position: "GK" },
  { name: "Mohamed El-Shenawy", team: "Egypt", position: "GK" },
  { name: "Alireza Beiranvand", team: "Iran", position: "GK" },
  { name: "Stefan Marinovic", team: "New Zealand", position: "GK" },
  // Group H
  { name: "Unai Simón", team: "Spain", position: "GK" },
  { name: "Vozinha", team: "Cape Verde", position: "GK" },
  { name: "Mohammed Al-Owais", team: "Saudi Arabia", position: "GK" },
  { name: "Sergio Rochet", team: "Uruguay", position: "GK" },
  // Group I
  { name: "Mike Maignan", team: "France", position: "GK" },
  { name: "Édouard Mendy", team: "Senegal", position: "GK" },
  { name: "Jalal Hassan", team: "Iraq", position: "GK" },
  { name: "Ørjan Nyland", team: "Norway", position: "GK" },
  // Group J
  { name: "Emiliano Martínez", team: "Argentina", position: "GK" },
  { name: "Raïs M'Bolhi", team: "Algeria", position: "GK" },
  { name: "Patrick Pentz", team: "Austria", position: "GK" },
  { name: "Yazeed Abu Laila", team: "Jordan", position: "GK" },
  // Group K
  { name: "Diogo Costa", team: "Portugal", position: "GK" },
  { name: "Lionel Mpasi", team: "DR Congo", position: "GK" },
  { name: "Utkir Yusupov", team: "Uzbekistan", position: "GK" },
  { name: "Camilo Vargas", team: "Colombia", position: "GK" },
  // Group L
  { name: "Jordan Pickford", team: "England", position: "GK" },
  { name: "Dominik Livaković", team: "Croatia", position: "GK" },
  { name: "Lawrence Ati-Zigi", team: "Ghana", position: "GK" },
  { name: "Orlando Mosquera", team: "Panama", position: "GK" },
];
