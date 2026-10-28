/* ------------------------------------------------------------------ */
/*  Países suportados, suas divisões administrativas e cidades         */
/*  Brasil usa a API do IBGE (todos os 5.570 municípios).              */
/*  Demais países usam listas curadas das principais cidades.          */
/* ------------------------------------------------------------------ */

export type CountryCode = "BR" | "US" | "GB" | "PT" | "IT";

export interface Country {
  code: CountryCode;
  name: string;
  flag: string;
  /** rótulo do primeiro seletor (estado / região / distrito) */
  regionLabel: string;
  /** código ISO alpha-2 em minúsculo para as APIs */
  iso: string;
  /** DDI para montar links wa.me */
  dial: string;
  /** idioma para as APIs */
  lang: string;
  /** usa a API do IBGE em vez de lista estática */
  dynamic?: boolean;
}

export const COUNTRIES: Country[] = [
  { code: "BR", name: "Brasil", flag: "🇧🇷", regionLabel: "Estado", iso: "br", dial: "55", lang: "pt", dynamic: true },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", regionLabel: "Estado", iso: "us", dial: "1", lang: "en" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", regionLabel: "Região", iso: "gb", dial: "44", lang: "en" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", regionLabel: "Distrito", iso: "pt", dial: "351", lang: "pt" },
  { code: "IT", name: "Itália", flag: "🇮🇹", regionLabel: "Região", iso: "it", dial: "39", lang: "it" },
];

export const getCountry = (code: CountryCode): Country =>
  COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];

/* ------------------------------------------------------------------ */
/*                       ESTADOS UNIDOS                                */
/* ------------------------------------------------------------------ */
const US: Record<string, string[]> = {
  "Alabama": ["Birmingham", "Montgomery", "Huntsville", "Mobile", "Tuscaloosa", "Auburn", "Dothan"],
  "Alaska": ["Anchorage", "Fairbanks", "Juneau", "Wasilla", "Sitka"],
  "Arizona": ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Glendale", "Gilbert", "Tempe", "Flagstaff"],
  "Arkansas": ["Little Rock", "Fayetteville", "Fort Smith", "Springdale", "Jonesboro", "Conway"],
  "California": ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim", "Santa Ana", "Riverside", "Irvine", "San Bernardino", "Pasadena"],
  "Colorado": ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Boulder", "Pueblo"],
  "Connecticut": ["Bridgeport", "New Haven", "Hartford", "Stamford", "Waterbury", "Norwalk"],
  "Delaware": ["Wilmington", "Dover", "Newark", "Middletown"],
  "District of Columbia": ["Washington"],
  "Florida": ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Fort Lauderdale", "Tallahassee", "Cape Coral", "Port St. Lucie", "Naples", "Sarasota"],
  "Georgia": ["Atlanta", "Augusta", "Columbus", "Savannah", "Athens", "Macon", "Roswell", "Albany"],
  "Hawaii": ["Honolulu", "Hilo", "Kailua", "Kapolei", "Pearl City"],
  "Idaho": ["Boise", "Meridian", "Nampa", "Idaho Falls", "Pocatello", "Coeur d'Alene"],
  "Illinois": ["Chicago", "Aurora", "Naperville", "Joliet", "Rockford", "Springfield", "Peoria", "Evanston"],
  "Indiana": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Bloomington"],
  "Iowa": ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City", "Ames"],
  "Kansas": ["Wichita", "Overland Park", "Kansas City", "Topeka", "Olathe", "Lawrence"],
  "Kentucky": ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington"],
  "Louisiana": ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles", "Metairie"],
  "Maine": ["Portland", "Lewiston", "Bangor", "Augusta", "South Portland"],
  "Maryland": ["Baltimore", "Columbia", "Germantown", "Silver Spring", "Annapolis", "Rockville", "Frederick"],
  "Massachusetts": ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "Brockton", "Quincy", "Somerville"],
  "Michigan": ["Detroit", "Grand Rapids", "Warren", "Ann Arbor", "Lansing", "Flint", "Dearborn", "Troy"],
  "Minnesota": ["Minneapolis", "Saint Paul", "Rochester", "Duluth", "Bloomington", "Plymouth"],
  "Mississippi": ["Jackson", "Gulfport", "Southaven", "Hattiesburg", "Biloxi", "Meridian"],
  "Missouri": ["Kansas City", "Saint Louis", "Springfield", "Columbia", "Independence", "Lee's Summit"],
  "Montana": ["Billings", "Missoula", "Great Falls", "Bozeman", "Helena", "Kalispell"],
  "Nebraska": ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney"],
  "Nevada": ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks", "Carson City"],
  "New Hampshire": ["Manchester", "Nashua", "Concord", "Derry", "Dover", "Portsmouth"],
  "New Jersey": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Trenton", "Edison", "Atlantic City", "Hoboken"],
  "New Mexico": ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell"],
  "New York": ["New York", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "Brooklyn", "Queens", "Bronx", "Staten Island", "White Plains"],
  "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "Asheville"],
  "North Dakota": ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo"],
  "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Canton", "Youngstown"],
  "Oklahoma": ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Edmond", "Lawton"],
  "Oregon": ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro", "Beaverton", "Bend"],
  "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton", "Bethlehem", "Lancaster"],
  "Rhode Island": ["Providence", "Warwick", "Cranston", "Pawtucket", "Newport"],
  "South Carolina": ["Charleston", "Columbia", "North Charleston", "Mount Pleasant", "Greenville", "Myrtle Beach"],
  "South Dakota": ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown"],
  "Tennessee": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Franklin"],
  "Texas": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo", "Lubbock", "Irving", "McAllen", "Frisco"],
  "Utah": ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "St. George", "Park City"],
  "Vermont": ["Burlington", "South Burlington", "Rutland", "Montpelier"],
  "Virginia": ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Arlington", "Alexandria", "Roanoke", "Charlottesville"],
  "Washington": ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Everett", "Kent", "Olympia", "Bellingham"],
  "West Virginia": ["Charleston", "Huntington", "Morgantown", "Parkersburg", "Wheeling"],
  "Wisconsin": ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton"],
  "Wyoming": ["Cheyenne", "Casper", "Laramie", "Gillette", "Jackson"],
};

/* ------------------------------------------------------------------ */
/*                        REINO UNIDO                                  */
/* ------------------------------------------------------------------ */
const GB: Record<string, string[]> = {
  "Greater London": ["London", "Croydon", "Bromley", "Ealing", "Enfield", "Wandsworth", "Camden", "Islington", "Hackney", "Greenwich", "Richmond", "Kingston upon Thames"],
  "South East England": ["Brighton", "Reading", "Southampton", "Portsmouth", "Oxford", "Milton Keynes", "Slough", "Basingstoke", "Canterbury", "Guildford", "Maidstone"],
  "South West England": ["Bristol", "Plymouth", "Bournemouth", "Exeter", "Gloucester", "Swindon", "Bath", "Cheltenham", "Torquay"],
  "East of England": ["Norwich", "Ipswich", "Cambridge", "Luton", "Peterborough", "Southend-on-Sea", "Colchester", "Chelmsford", "Watford"],
  "West Midlands": ["Birmingham", "Coventry", "Wolverhampton", "Stoke-on-Trent", "Solihull", "Walsall", "Dudley", "Worcester"],
  "East Midlands": ["Nottingham", "Leicester", "Derby", "Northampton", "Lincoln", "Chesterfield", "Mansfield"],
  "North West England": ["Manchester", "Liverpool", "Preston", "Blackpool", "Bolton", "Stockport", "Salford", "Warrington", "Oldham", "Chester"],
  "North East England": ["Newcastle upon Tyne", "Sunderland", "Middlesbrough", "Gateshead", "Durham", "Darlington"],
  "Yorkshire and the Humber": ["Leeds", "Sheffield", "Bradford", "Hull", "York", "Huddersfield", "Doncaster", "Wakefield", "Barnsley"],
  "Scotland": ["Glasgow", "Edinburgh", "Aberdeen", "Dundee", "Inverness", "Perth", "Stirling", "Paisley"],
  "Wales": ["Cardiff", "Swansea", "Newport", "Wrexham", "Bangor", "Barry", "Aberystwyth"],
  "Northern Ireland": ["Belfast", "Derry", "Lisburn", "Newry", "Bangor", "Craigavon"],
};

/* ------------------------------------------------------------------ */
/*                          PORTUGAL                                   */
/* ------------------------------------------------------------------ */
const PT: Record<string, string[]> = {
  "Lisboa": ["Lisboa", "Sintra", "Cascais", "Loures", "Amadora", "Oeiras", "Odivelas", "Vila Franca de Xira", "Mafra", "Torres Vedras"],
  "Porto": ["Porto", "Vila Nova de Gaia", "Matosinhos", "Gondomar", "Maia", "Valongo", "Póvoa de Varzim", "Santo Tirso", "Paredes", "Penafiel"],
  "Braga": ["Braga", "Guimarães", "Vila Nova de Famalicão", "Barcelos", "Esposende", "Fafe", "Vizela"],
  "Setúbal": ["Setúbal", "Almada", "Seixal", "Barreiro", "Montijo", "Palmela", "Sesimbra", "Santiago do Cacém"],
  "Aveiro": ["Aveiro", "Santa Maria da Feira", "Ovar", "Águeda", "Ílhavo", "Oliveira de Azeméis", "Estarreja"],
  "Faro": ["Faro", "Portimão", "Loulé", "Albufeira", "Lagos", "Olhão", "Tavira", "Silves"],
  "Coimbra": ["Coimbra", "Figueira da Foz", "Cantanhede", "Montemor-o-Velho", "Lousã"],
  "Leiria": ["Leiria", "Caldas da Rainha", "Marinha Grande", "Pombal", "Alcobaça", "Nazaré", "Peniche"],
  "Santarém": ["Santarém", "Tomar", "Torres Novas", "Abrantes", "Ourém", "Cartaxo"],
  "Viseu": ["Viseu", "Lamego", "Tondela", "Mangualde", "São Pedro do Sul"],
  "Viana do Castelo": ["Viana do Castelo", "Ponte de Lima", "Caminha", "Valença", "Arcos de Valdevez"],
  "Vila Real": ["Vila Real", "Chaves", "Peso da Régua", "Montalegre"],
  "Castelo Branco": ["Castelo Branco", "Covilhã", "Fundão", "Sertã"],
  "Guarda": ["Guarda", "Seia", "Gouveia", "Trancoso"],
  "Évora": ["Évora", "Montemor-o-Novo", "Estremoz", "Reguengos de Monsaraz"],
  "Beja": ["Beja", "Moura", "Serpa", "Odemira"],
  "Portalegre": ["Portalegre", "Elvas", "Ponte de Sor", "Campo Maior"],
  "Bragança": ["Bragança", "Mirandela", "Macedo de Cavaleiros", "Miranda do Douro"],
  "Madeira": ["Funchal", "Câmara de Lobos", "Machico", "Santa Cruz", "Ribeira Brava"],
  "Açores": ["Ponta Delgada", "Angra do Heroísmo", "Horta", "Ribeira Grande", "Praia da Vitória"],
};

/* ------------------------------------------------------------------ */
/*                            ITÁLIA                                   */
/* ------------------------------------------------------------------ */
const IT: Record<string, string[]> = {
  "Lombardia": ["Milano", "Brescia", "Bergamo", "Monza", "Como", "Varese", "Pavia", "Cremona", "Mantova", "Lecco"],
  "Lazio": ["Roma", "Latina", "Guidonia Montecelio", "Fiumicino", "Aprilia", "Viterbo", "Frosinone", "Tivoli"],
  "Campania": ["Napoli", "Salerno", "Giugliano in Campania", "Torre del Greco", "Caserta", "Benevento", "Avellino", "Pozzuoli"],
  "Sicilia": ["Palermo", "Catania", "Messina", "Siracusa", "Marsala", "Gela", "Ragusa", "Trapani", "Agrigento"],
  "Veneto": ["Venezia", "Verona", "Padova", "Vicenza", "Treviso", "Rovigo", "Belluno", "Bassano del Grappa"],
  "Emilia-Romagna": ["Bologna", "Parma", "Modena", "Reggio Emilia", "Ravenna", "Rimini", "Ferrara", "Forlì", "Piacenza"],
  "Piemonte": ["Torino", "Novara", "Alessandria", "Asti", "Cuneo", "Vercelli", "Biella", "Moncalieri"],
  "Puglia": ["Bari", "Taranto", "Foggia", "Lecce", "Andria", "Brindisi", "Barletta", "Altamura"],
  "Toscana": ["Firenze", "Prato", "Livorno", "Arezzo", "Pisa", "Pistoia", "Lucca", "Grosseto", "Siena"],
  "Calabria": ["Reggio Calabria", "Catanzaro", "Cosenza", "Lamezia Terme", "Crotone", "Vibo Valentia"],
  "Sardegna": ["Cagliari", "Sassari", "Quartu Sant'Elena", "Olbia", "Alghero", "Nuoro", "Oristano"],
  "Liguria": ["Genova", "La Spezia", "Savona", "Sanremo", "Imperia", "Rapallo"],
  "Marche": ["Ancona", "Pesaro", "Fano", "Ascoli Piceno", "Macerata", "Fermo"],
  "Abruzzo": ["Pescara", "L'Aquila", "Teramo", "Chieti", "Montesilvano", "Avezzano"],
  "Friuli-Venezia Giulia": ["Trieste", "Udine", "Pordenone", "Gorizia", "Monfalcone"],
  "Trentino-Alto Adige": ["Trento", "Bolzano", "Merano", "Rovereto", "Bressanone"],
  "Umbria": ["Perugia", "Terni", "Foligno", "Città di Castello", "Spoleto", "Assisi"],
  "Basilicata": ["Potenza", "Matera", "Melfi", "Policoro"],
  "Molise": ["Campobasso", "Termoli", "Isernia"],
  "Valle d'Aosta": ["Aosta", "Saint-Vincent", "Courmayeur"],
};

const DATA: Partial<Record<CountryCode, Record<string, string[]>>> = { US, GB, PT, IT };

/* ------------------------------------------------------------------ */
/*  Cidades-polo usadas na busca "País inteiro"                        */
/*  O motor percorre esta lista até atingir a quantidade pedida.       */
/* ------------------------------------------------------------------ */
export const MAJOR_CITIES: Record<CountryCode, string[]> = {
  BR: [
    "São Paulo, São Paulo", "Rio de Janeiro, Rio de Janeiro", "Belo Horizonte, Minas Gerais",
    "Brasília, Distrito Federal", "Curitiba, Paraná", "Porto Alegre, Rio Grande do Sul",
    "Salvador, Bahia", "Fortaleza, Ceará", "Recife, Pernambuco", "Goiânia, Goiás",
    "Campinas, São Paulo", "Manaus, Amazonas", "Belém, Pará", "Vitória, Espírito Santo",
    "Florianópolis, Santa Catarina", "Natal, Rio Grande do Norte", "João Pessoa, Paraíba",
    "Cuiabá, Mato Grosso", "Campo Grande, Mato Grosso do Sul", "Maceió, Alagoas",
    "Teresina, Piauí", "São Luís, Maranhão", "Aracaju, Sergipe", "Londrina, Paraná",
    "Ribeirão Preto, São Paulo", "Uberlândia, Minas Gerais", "Sorocaba, São Paulo",
    "Joinville, Santa Catarina", "Niterói, Rio de Janeiro", "Santos, São Paulo",
  ],
  US: [
    "New York, New York", "Los Angeles, California", "Chicago, Illinois", "Houston, Texas",
    "Phoenix, Arizona", "Philadelphia, Pennsylvania", "San Antonio, Texas", "San Diego, California",
    "Dallas, Texas", "Austin, Texas", "Jacksonville, Florida", "San Jose, California",
    "Columbus, Ohio", "Charlotte, North Carolina", "Indianapolis, Indiana", "Seattle, Washington",
    "Denver, Colorado", "Boston, Massachusetts", "Nashville, Tennessee", "Portland, Oregon",
    "Las Vegas, Nevada", "Miami, Florida", "Atlanta, Georgia", "Minneapolis, Minnesota",
    "Tampa, Florida", "Orlando, Florida", "Pittsburgh, Pennsylvania", "Sacramento, California",
    "Kansas City, Missouri", "St. Louis, Missouri",
  ],
  GB: [
    "London", "Birmingham", "Manchester", "Leeds", "Glasgow", "Liverpool", "Sheffield",
    "Edinburgh", "Bristol", "Cardiff", "Belfast", "Leicester", "Nottingham", "Newcastle upon Tyne",
    "Southampton", "Brighton", "Coventry", "Reading", "Oxford", "Cambridge", "York",
    "Aberdeen", "Plymouth", "Norwich", "Swansea", "Bournemouth", "Milton Keynes", "Derby",
  ],
  PT: [
    "Lisboa", "Porto", "Vila Nova de Gaia", "Braga", "Amadora", "Coimbra", "Funchal",
    "Setúbal", "Almada", "Agualva-Cacém", "Queluz", "Guimarães", "Aveiro", "Faro",
    "Leiria", "Viseu", "Matosinhos", "Évora", "Portimão", "Viana do Castelo",
    "Figueira da Foz", "Santarém", "Cascais", "Sintra", "Barreiro", "Ponta Delgada",
  ],
  IT: [
    "Roma", "Milano", "Napoli", "Torino", "Palermo", "Genova", "Bologna", "Firenze",
    "Bari", "Catania", "Venezia", "Verona", "Messina", "Padova", "Trieste", "Brescia",
    "Parma", "Taranto", "Prato", "Modena", "Reggio Calabria", "Reggio Emilia", "Perugia",
    "Livorno", "Cagliari", "Foggia", "Rimini", "Salerno", "Ferrara", "Latina",
  ],
};

/** valor especial usado no seletor de cidade para varrer o país inteiro */
export const WHOLE_COUNTRY = "__ALL__";

/** lista de regiões (estados/distritos) de um país estático */
export function getRegions(code: CountryCode): string[] {
  return Object.keys(DATA[code] ?? {}).sort((a, b) => a.localeCompare(b));
}

/** lista de cidades de uma região */
export function getCities(code: CountryCode, region: string): string[] {
  return [...(DATA[code]?.[region] ?? [])].sort((a, b) => a.localeCompare(b));
}

/* ------------------------------------------------------------------ */
/*         detecção de celular / WhatsApp por país                     */
/* ------------------------------------------------------------------ */

/**
 * Retorna true se o número parece ser de celular (logo, provável WhatsApp).
 * `digits` são apenas os dígitos nacionais (sem DDI).
 */
export function isMobileNumber(code: CountryCode, digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  switch (code) {
    case "BR":
      // DDD + 9 dígitos começando com 9 (ou formatos antigos 9/8/7)
      return (d.length === 11 && d[2] === "9") || (d.length === 10 && ["9", "8", "7"].includes(d[2]));
    case "PT":
      // telemóveis começam por 9
      return d.length === 9 && d[0] === "9";
    case "IT":
      // cellulari começam por 3
      return d.length >= 9 && d[0] === "3";
    case "GB":
      // mobiles começam por 07 (ou 7 sem o zero)
      return (d.length === 11 && d.startsWith("07")) || (d.length === 10 && d[0] === "7");
    case "US":
      // EUA não distingue fixo/celular pelo prefixo — assumimos possível
      return d.length === 10 || (d.length === 11 && d[0] === "1");
    default:
      return false;
  }
}
