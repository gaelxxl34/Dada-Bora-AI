/**
 * Phone Number Location Detection for Dada Bora
 * 
 * Automatically determines user's country and region from their phone number.
 * This removes the need to ask users where they are from.
 */

import { parsePhoneNumber, CountryCode, getCountryCallingCode } from 'libphonenumber-js';

// Region mapping for cultural context
export type WorldRegion = 
  | 'africa-east'      // Kenya, Tanzania, Uganda, Rwanda, etc.
  | 'africa-west'      // Nigeria, Ghana, Senegal, etc.
  | 'africa-south'     // South Africa, Zimbabwe, Botswana, etc.
  | 'africa-north'     // Egypt, Morocco, etc.
  | 'africa-central'   // DRC, Cameroon, etc.
  | 'caribbean'        // Jamaica, Trinidad, Haiti, etc.
  | 'north-america'    // USA, Canada
  | 'south-america'    // Brazil, etc.
  | 'europe'           // UK, France, Germany, etc.
  | 'asia'             // India, etc.
  | 'oceania'          // Australia, etc.
  | 'unknown';

export interface PhoneLocationInfo {
  countryCode: string;        // "KE", "US", "NG"
  countryName: string;        // "Kenya", "United States", "Nigeria"
  callingCode: string;        // "+254", "+1", "+234"
  region: WorldRegion;        // "africa-east", "north-america"
  timezone?: string;          // Approximate timezone
  primaryLanguages: string[]; // ["english", "swahili"]
  currency?: string;          // "KES", "USD", "NGN"
}

// Country data with Black diaspora context
const COUNTRY_DATA: Record<string, Omit<PhoneLocationInfo, 'countryCode' | 'callingCode'>> = {
  // ============ EAST AFRICA ============
  'KE': {
    countryName: 'Kenya',
    region: 'africa-east',
    timezone: 'Africa/Nairobi',
    primaryLanguages: ['english', 'swahili'],
    currency: 'KES',
  },
  'TZ': {
    countryName: 'Tanzania',
    region: 'africa-east',
    timezone: 'Africa/Dar_es_Salaam',
    primaryLanguages: ['swahili', 'english'],
    currency: 'TZS',
  },
  'UG': {
    countryName: 'Uganda',
    region: 'africa-east',
    timezone: 'Africa/Kampala',
    primaryLanguages: ['english', 'swahili'],
    currency: 'UGX',
  },
  'RW': {
    countryName: 'Rwanda',
    region: 'africa-east',
    timezone: 'Africa/Kigali',
    primaryLanguages: ['french', 'english', 'kinyarwanda'],
    currency: 'RWF',
  },
  'BI': {
    countryName: 'Burundi',
    region: 'africa-east',
    timezone: 'Africa/Bujumbura',
    primaryLanguages: ['french', 'kirundi'],
    currency: 'BIF',
  },
  'ET': {
    countryName: 'Ethiopia',
    region: 'africa-east',
    timezone: 'Africa/Addis_Ababa',
    primaryLanguages: ['amharic', 'english'],
    currency: 'ETB',
  },
  'SO': {
    countryName: 'Somalia',
    region: 'africa-east',
    timezone: 'Africa/Mogadishu',
    primaryLanguages: ['somali', 'arabic'],
    currency: 'SOS',
  },
  'SS': {
    countryName: 'South Sudan',
    region: 'africa-east',
    timezone: 'Africa/Juba',
    primaryLanguages: ['english', 'arabic'],
    currency: 'SSP',
  },
  'ER': {
    countryName: 'Eritrea',
    region: 'africa-east',
    timezone: 'Africa/Asmara',
    primaryLanguages: ['tigrinya', 'arabic', 'english'],
    currency: 'ERN',
  },
  'DJ': {
    countryName: 'Djibouti',
    region: 'africa-east',
    timezone: 'Africa/Djibouti',
    primaryLanguages: ['french', 'arabic'],
    currency: 'DJF',
  },

  // ============ WEST AFRICA ============
  'NG': {
    countryName: 'Nigeria',
    region: 'africa-west',
    timezone: 'Africa/Lagos',
    primaryLanguages: ['english', 'yoruba', 'igbo', 'hausa'],
    currency: 'NGN',
  },
  'GH': {
    countryName: 'Ghana',
    region: 'africa-west',
    timezone: 'Africa/Accra',
    primaryLanguages: ['english', 'twi'],
    currency: 'GHS',
  },
  'SN': {
    countryName: 'Senegal',
    region: 'africa-west',
    timezone: 'Africa/Dakar',
    primaryLanguages: ['french', 'wolof'],
    currency: 'XOF',
  },
  'CI': {
    countryName: 'Côte d\'Ivoire',
    region: 'africa-west',
    timezone: 'Africa/Abidjan',
    primaryLanguages: ['french'],
    currency: 'XOF',
  },
  'ML': {
    countryName: 'Mali',
    region: 'africa-west',
    timezone: 'Africa/Bamako',
    primaryLanguages: ['french', 'bambara'],
    currency: 'XOF',
  },
  'BF': {
    countryName: 'Burkina Faso',
    region: 'africa-west',
    timezone: 'Africa/Ouagadougou',
    primaryLanguages: ['french'],
    currency: 'XOF',
  },
  'NE': {
    countryName: 'Niger',
    region: 'africa-west',
    timezone: 'Africa/Niamey',
    primaryLanguages: ['french', 'hausa'],
    currency: 'XOF',
  },
  'GN': {
    countryName: 'Guinea',
    region: 'africa-west',
    timezone: 'Africa/Conakry',
    primaryLanguages: ['french'],
    currency: 'GNF',
  },
  'BJ': {
    countryName: 'Benin',
    region: 'africa-west',
    timezone: 'Africa/Porto-Novo',
    primaryLanguages: ['french'],
    currency: 'XOF',
  },
  'TG': {
    countryName: 'Togo',
    region: 'africa-west',
    timezone: 'Africa/Lome',
    primaryLanguages: ['french'],
    currency: 'XOF',
  },
  'SL': {
    countryName: 'Sierra Leone',
    region: 'africa-west',
    timezone: 'Africa/Freetown',
    primaryLanguages: ['english', 'krio'],
    currency: 'SLL',
  },
  'LR': {
    countryName: 'Liberia',
    region: 'africa-west',
    timezone: 'Africa/Monrovia',
    primaryLanguages: ['english'],
    currency: 'LRD',
  },
  'GM': {
    countryName: 'Gambia',
    region: 'africa-west',
    timezone: 'Africa/Banjul',
    primaryLanguages: ['english'],
    currency: 'GMD',
  },
  'GW': {
    countryName: 'Guinea-Bissau',
    region: 'africa-west',
    timezone: 'Africa/Bissau',
    primaryLanguages: ['portuguese'],
    currency: 'XOF',
  },
  'CV': {
    countryName: 'Cape Verde',
    region: 'africa-west',
    timezone: 'Atlantic/Cape_Verde',
    primaryLanguages: ['portuguese'],
    currency: 'CVE',
  },
  'MR': {
    countryName: 'Mauritania',
    region: 'africa-west',
    timezone: 'Africa/Nouakchott',
    primaryLanguages: ['arabic', 'french'],
    currency: 'MRU',
  },

  // ============ SOUTHERN AFRICA ============
  'ZA': {
    countryName: 'South Africa',
    region: 'africa-south',
    timezone: 'Africa/Johannesburg',
    primaryLanguages: ['english', 'zulu', 'xhosa', 'afrikaans'],
    currency: 'ZAR',
  },
  'ZW': {
    countryName: 'Zimbabwe',
    region: 'africa-south',
    timezone: 'Africa/Harare',
    primaryLanguages: ['english', 'shona', 'ndebele'],
    currency: 'ZWL',
  },
  'ZM': {
    countryName: 'Zambia',
    region: 'africa-south',
    timezone: 'Africa/Lusaka',
    primaryLanguages: ['english'],
    currency: 'ZMW',
  },
  'MW': {
    countryName: 'Malawi',
    region: 'africa-south',
    timezone: 'Africa/Blantyre',
    primaryLanguages: ['english', 'chichewa'],
    currency: 'MWK',
  },
  'MZ': {
    countryName: 'Mozambique',
    region: 'africa-south',
    timezone: 'Africa/Maputo',
    primaryLanguages: ['portuguese'],
    currency: 'MZN',
  },
  'BW': {
    countryName: 'Botswana',
    region: 'africa-south',
    timezone: 'Africa/Gaborone',
    primaryLanguages: ['english', 'setswana'],
    currency: 'BWP',
  },
  'NA': {
    countryName: 'Namibia',
    region: 'africa-south',
    timezone: 'Africa/Windhoek',
    primaryLanguages: ['english'],
    currency: 'NAD',
  },
  'SZ': {
    countryName: 'Eswatini',
    region: 'africa-south',
    timezone: 'Africa/Mbabane',
    primaryLanguages: ['english', 'siswati'],
    currency: 'SZL',
  },
  'LS': {
    countryName: 'Lesotho',
    region: 'africa-south',
    timezone: 'Africa/Maseru',
    primaryLanguages: ['english', 'sesotho'],
    currency: 'LSL',
  },
  'AO': {
    countryName: 'Angola',
    region: 'africa-south',
    timezone: 'Africa/Luanda',
    primaryLanguages: ['portuguese'],
    currency: 'AOA',
  },
  'MG': {
    countryName: 'Madagascar',
    region: 'africa-south',
    timezone: 'Indian/Antananarivo',
    primaryLanguages: ['french', 'malagasy'],
    currency: 'MGA',
  },
  'MU': {
    countryName: 'Mauritius',
    region: 'africa-south',
    timezone: 'Indian/Mauritius',
    primaryLanguages: ['english', 'french', 'creole'],
    currency: 'MUR',
  },
  'SC': {
    countryName: 'Seychelles',
    region: 'africa-south',
    timezone: 'Indian/Mahe',
    primaryLanguages: ['english', 'french', 'creole'],
    currency: 'SCR',
  },
  'KM': {
    countryName: 'Comoros',
    region: 'africa-south',
    timezone: 'Indian/Comoro',
    primaryLanguages: ['french', 'arabic'],
    currency: 'KMF',
  },
  'RE': {
    countryName: 'Réunion',
    region: 'africa-south',
    timezone: 'Indian/Reunion',
    primaryLanguages: ['french', 'creole'],
    currency: 'EUR',
  },

  // ============ CENTRAL AFRICA ============
  'CD': {
    countryName: 'Democratic Republic of the Congo',
    region: 'africa-central',
    timezone: 'Africa/Kinshasa',
    primaryLanguages: ['french', 'lingala', 'swahili'],
    currency: 'CDF',
  },
  'CG': {
    countryName: 'Republic of the Congo',
    region: 'africa-central',
    timezone: 'Africa/Brazzaville',
    primaryLanguages: ['french'],
    currency: 'XAF',
  },
  'CM': {
    countryName: 'Cameroon',
    region: 'africa-central',
    timezone: 'Africa/Douala',
    primaryLanguages: ['french', 'english'],
    currency: 'XAF',
  },
  'GA': {
    countryName: 'Gabon',
    region: 'africa-central',
    timezone: 'Africa/Libreville',
    primaryLanguages: ['french'],
    currency: 'XAF',
  },
  'GQ': {
    countryName: 'Equatorial Guinea',
    region: 'africa-central',
    timezone: 'Africa/Malabo',
    primaryLanguages: ['spanish', 'french'],
    currency: 'XAF',
  },
  'CF': {
    countryName: 'Central African Republic',
    region: 'africa-central',
    timezone: 'Africa/Bangui',
    primaryLanguages: ['french', 'sango'],
    currency: 'XAF',
  },
  'TD': {
    countryName: 'Chad',
    region: 'africa-central',
    timezone: 'Africa/Ndjamena',
    primaryLanguages: ['french', 'arabic'],
    currency: 'XAF',
  },
  'ST': {
    countryName: 'São Tomé and Príncipe',
    region: 'africa-central',
    timezone: 'Africa/Sao_Tome',
    primaryLanguages: ['portuguese'],
    currency: 'STN',
  },

  // ============ NORTH AFRICA ============
  'EG': {
    countryName: 'Egypt',
    region: 'africa-north',
    timezone: 'Africa/Cairo',
    primaryLanguages: ['arabic', 'english'],
    currency: 'EGP',
  },
  'MA': {
    countryName: 'Morocco',
    region: 'africa-north',
    timezone: 'Africa/Casablanca',
    primaryLanguages: ['arabic', 'french'],
    currency: 'MAD',
  },
  'DZ': {
    countryName: 'Algeria',
    region: 'africa-north',
    timezone: 'Africa/Algiers',
    primaryLanguages: ['arabic', 'french'],
    currency: 'DZD',
  },
  'TN': {
    countryName: 'Tunisia',
    region: 'africa-north',
    timezone: 'Africa/Tunis',
    primaryLanguages: ['arabic', 'french'],
    currency: 'TND',
  },
  'LY': {
    countryName: 'Libya',
    region: 'africa-north',
    timezone: 'Africa/Tripoli',
    primaryLanguages: ['arabic'],
    currency: 'LYD',
  },
  'SD': {
    countryName: 'Sudan',
    region: 'africa-north',
    timezone: 'Africa/Khartoum',
    primaryLanguages: ['arabic', 'english'],
    currency: 'SDG',
  },

  // ============ CARIBBEAN ============
  'JM': {
    countryName: 'Jamaica',
    region: 'caribbean',
    timezone: 'America/Jamaica',
    primaryLanguages: ['english', 'patois'],
    currency: 'JMD',
  },
  'TT': {
    countryName: 'Trinidad and Tobago',
    region: 'caribbean',
    timezone: 'America/Port_of_Spain',
    primaryLanguages: ['english'],
    currency: 'TTD',
  },
  'BB': {
    countryName: 'Barbados',
    region: 'caribbean',
    timezone: 'America/Barbados',
    primaryLanguages: ['english'],
    currency: 'BBD',
  },
  'BS': {
    countryName: 'Bahamas',
    region: 'caribbean',
    timezone: 'America/Nassau',
    primaryLanguages: ['english'],
    currency: 'BSD',
  },
  'HT': {
    countryName: 'Haiti',
    region: 'caribbean',
    timezone: 'America/Port-au-Prince',
    primaryLanguages: ['french', 'creole'],
    currency: 'HTG',
  },
  'DO': {
    countryName: 'Dominican Republic',
    region: 'caribbean',
    timezone: 'America/Santo_Domingo',
    primaryLanguages: ['spanish'],
    currency: 'DOP',
  },
  'CU': {
    countryName: 'Cuba',
    region: 'caribbean',
    timezone: 'America/Havana',
    primaryLanguages: ['spanish'],
    currency: 'CUP',
  },
  'PR': {
    countryName: 'Puerto Rico',
    region: 'caribbean',
    timezone: 'America/Puerto_Rico',
    primaryLanguages: ['spanish', 'english'],
    currency: 'USD',
  },
  'GP': {
    countryName: 'Guadeloupe',
    region: 'caribbean',
    timezone: 'America/Guadeloupe',
    primaryLanguages: ['french', 'creole'],
    currency: 'EUR',
  },
  'MQ': {
    countryName: 'Martinique',
    region: 'caribbean',
    timezone: 'America/Martinique',
    primaryLanguages: ['french', 'creole'],
    currency: 'EUR',
  },
  'GF': {
    countryName: 'French Guiana',
    region: 'caribbean',
    timezone: 'America/Cayenne',
    primaryLanguages: ['french'],
    currency: 'EUR',
  },
  'AG': {
    countryName: 'Antigua and Barbuda',
    region: 'caribbean',
    timezone: 'America/Antigua',
    primaryLanguages: ['english'],
    currency: 'XCD',
  },
  'LC': {
    countryName: 'Saint Lucia',
    region: 'caribbean',
    timezone: 'America/St_Lucia',
    primaryLanguages: ['english'],
    currency: 'XCD',
  },
  'VC': {
    countryName: 'Saint Vincent and the Grenadines',
    region: 'caribbean',
    timezone: 'America/St_Vincent',
    primaryLanguages: ['english'],
    currency: 'XCD',
  },
  'GD': {
    countryName: 'Grenada',
    region: 'caribbean',
    timezone: 'America/Grenada',
    primaryLanguages: ['english'],
    currency: 'XCD',
  },
  'DM': {
    countryName: 'Dominica',
    region: 'caribbean',
    timezone: 'America/Dominica',
    primaryLanguages: ['english'],
    currency: 'XCD',
  },
  'KN': {
    countryName: 'Saint Kitts and Nevis',
    region: 'caribbean',
    timezone: 'America/St_Kitts',
    primaryLanguages: ['english'],
    currency: 'XCD',
  },
  'VI': {
    countryName: 'U.S. Virgin Islands',
    region: 'caribbean',
    timezone: 'America/Virgin',
    primaryLanguages: ['english'],
    currency: 'USD',
  },
  'VG': {
    countryName: 'British Virgin Islands',
    region: 'caribbean',
    timezone: 'America/Tortola',
    primaryLanguages: ['english'],
    currency: 'USD',
  },
  'CW': {
    countryName: 'Curaçao',
    region: 'caribbean',
    timezone: 'America/Curacao',
    primaryLanguages: ['dutch', 'papiamento'],
    currency: 'ANG',
  },
  'AW': {
    countryName: 'Aruba',
    region: 'caribbean',
    timezone: 'America/Aruba',
    primaryLanguages: ['dutch', 'papiamento'],
    currency: 'AWG',
  },
  'BM': {
    countryName: 'Bermuda',
    region: 'caribbean',
    timezone: 'Atlantic/Bermuda',
    primaryLanguages: ['english'],
    currency: 'BMD',
  },

  // ============ NORTH AMERICA ============
  'US': {
    countryName: 'United States',
    region: 'north-america',
    timezone: 'America/New_York',
    primaryLanguages: ['english', 'spanish'],
    currency: 'USD',
  },
  'CA': {
    countryName: 'Canada',
    region: 'north-america',
    timezone: 'America/Toronto',
    primaryLanguages: ['english', 'french'],
    currency: 'CAD',
  },
  'MX': {
    countryName: 'Mexico',
    region: 'north-america',
    timezone: 'America/Mexico_City',
    primaryLanguages: ['spanish'],
    currency: 'MXN',
  },

  // ============ SOUTH AMERICA ============
  'BR': {
    countryName: 'Brazil',
    region: 'south-america',
    timezone: 'America/Sao_Paulo',
    primaryLanguages: ['portuguese'],
    currency: 'BRL',
  },
  'CO': {
    countryName: 'Colombia',
    region: 'south-america',
    timezone: 'America/Bogota',
    primaryLanguages: ['spanish'],
    currency: 'COP',
  },
  'VE': {
    countryName: 'Venezuela',
    region: 'south-america',
    timezone: 'America/Caracas',
    primaryLanguages: ['spanish'],
    currency: 'VES',
  },
  'EC': {
    countryName: 'Ecuador',
    region: 'south-america',
    timezone: 'America/Guayaquil',
    primaryLanguages: ['spanish'],
    currency: 'USD',
  },
  'PE': {
    countryName: 'Peru',
    region: 'south-america',
    timezone: 'America/Lima',
    primaryLanguages: ['spanish'],
    currency: 'PEN',
  },
  'SR': {
    countryName: 'Suriname',
    region: 'south-america',
    timezone: 'America/Paramaribo',
    primaryLanguages: ['dutch'],
    currency: 'SRD',
  },
  'GY': {
    countryName: 'Guyana',
    region: 'south-america',
    timezone: 'America/Guyana',
    primaryLanguages: ['english'],
    currency: 'GYD',
  },

  // ============ EUROPE ============
  'GB': {
    countryName: 'United Kingdom',
    region: 'europe',
    timezone: 'Europe/London',
    primaryLanguages: ['english'],
    currency: 'GBP',
  },
  'FR': {
    countryName: 'France',
    region: 'europe',
    timezone: 'Europe/Paris',
    primaryLanguages: ['french'],
    currency: 'EUR',
  },
  'DE': {
    countryName: 'Germany',
    region: 'europe',
    timezone: 'Europe/Berlin',
    primaryLanguages: ['german'],
    currency: 'EUR',
  },
  'IT': {
    countryName: 'Italy',
    region: 'europe',
    timezone: 'Europe/Rome',
    primaryLanguages: ['italian'],
    currency: 'EUR',
  },
  'ES': {
    countryName: 'Spain',
    region: 'europe',
    timezone: 'Europe/Madrid',
    primaryLanguages: ['spanish'],
    currency: 'EUR',
  },
  'PT': {
    countryName: 'Portugal',
    region: 'europe',
    timezone: 'Europe/Lisbon',
    primaryLanguages: ['portuguese'],
    currency: 'EUR',
  },
  'NL': {
    countryName: 'Netherlands',
    region: 'europe',
    timezone: 'Europe/Amsterdam',
    primaryLanguages: ['dutch', 'english'],
    currency: 'EUR',
  },
  'BE': {
    countryName: 'Belgium',
    region: 'europe',
    timezone: 'Europe/Brussels',
    primaryLanguages: ['french', 'dutch'],
    currency: 'EUR',
  },
  'CH': {
    countryName: 'Switzerland',
    region: 'europe',
    timezone: 'Europe/Zurich',
    primaryLanguages: ['german', 'french', 'italian'],
    currency: 'CHF',
  },
  'SE': {
    countryName: 'Sweden',
    region: 'europe',
    timezone: 'Europe/Stockholm',
    primaryLanguages: ['swedish', 'english'],
    currency: 'SEK',
  },
  'NO': {
    countryName: 'Norway',
    region: 'europe',
    timezone: 'Europe/Oslo',
    primaryLanguages: ['norwegian', 'english'],
    currency: 'NOK',
  },
  'DK': {
    countryName: 'Denmark',
    region: 'europe',
    timezone: 'Europe/Copenhagen',
    primaryLanguages: ['danish', 'english'],
    currency: 'DKK',
  },
  'IE': {
    countryName: 'Ireland',
    region: 'europe',
    timezone: 'Europe/Dublin',
    primaryLanguages: ['english', 'irish'],
    currency: 'EUR',
  },
  'AT': {
    countryName: 'Austria',
    region: 'europe',
    timezone: 'Europe/Vienna',
    primaryLanguages: ['german'],
    currency: 'EUR',
  },

  // ============ ASIA ============
  'IN': {
    countryName: 'India',
    region: 'asia',
    timezone: 'Asia/Kolkata',
    primaryLanguages: ['hindi', 'english'],
    currency: 'INR',
  },
  'AE': {
    countryName: 'United Arab Emirates',
    region: 'asia',
    timezone: 'Asia/Dubai',
    primaryLanguages: ['arabic', 'english'],
    currency: 'AED',
  },
  'SA': {
    countryName: 'Saudi Arabia',
    region: 'asia',
    timezone: 'Asia/Riyadh',
    primaryLanguages: ['arabic'],
    currency: 'SAR',
  },
  'QA': {
    countryName: 'Qatar',
    region: 'asia',
    timezone: 'Asia/Qatar',
    primaryLanguages: ['arabic', 'english'],
    currency: 'QAR',
  },
  'KW': {
    countryName: 'Kuwait',
    region: 'asia',
    timezone: 'Asia/Kuwait',
    primaryLanguages: ['arabic'],
    currency: 'KWD',
  },
  'MY': {
    countryName: 'Malaysia',
    region: 'asia',
    timezone: 'Asia/Kuala_Lumpur',
    primaryLanguages: ['malay', 'english'],
    currency: 'MYR',
  },
  'SG': {
    countryName: 'Singapore',
    region: 'asia',
    timezone: 'Asia/Singapore',
    primaryLanguages: ['english', 'mandarin', 'malay'],
    currency: 'SGD',
  },
  'PH': {
    countryName: 'Philippines',
    region: 'asia',
    timezone: 'Asia/Manila',
    primaryLanguages: ['filipino', 'english'],
    currency: 'PHP',
  },

  // ============ OCEANIA ============
  'AU': {
    countryName: 'Australia',
    region: 'oceania',
    timezone: 'Australia/Sydney',
    primaryLanguages: ['english'],
    currency: 'AUD',
  },
  'NZ': {
    countryName: 'New Zealand',
    region: 'oceania',
    timezone: 'Pacific/Auckland',
    primaryLanguages: ['english', 'maori'],
    currency: 'NZD',
  },
  'FJ': {
    countryName: 'Fiji',
    region: 'oceania',
    timezone: 'Pacific/Fiji',
    primaryLanguages: ['english', 'fijian'],
    currency: 'FJD',
  },
  'PG': {
    countryName: 'Papua New Guinea',
    region: 'oceania',
    timezone: 'Pacific/Port_Moresby',
    primaryLanguages: ['english', 'tok pisin'],
    currency: 'PGK',
  },
};

// Region display names
export const REGION_NAMES: Record<WorldRegion, string> = {
  'africa-east': 'East Africa',
  'africa-west': 'West Africa',
  'africa-south': 'Southern Africa',
  'africa-north': 'North Africa',
  'africa-central': 'Central Africa',
  'caribbean': 'Caribbean',
  'north-america': 'North America',
  'south-america': 'South America',
  'europe': 'Europe',
  'asia': 'Asia & Middle East',
  'oceania': 'Oceania',
  'unknown': 'Unknown',
};

/**
 * Parse phone number and extract location information
 */
export function getLocationFromPhone(phoneNumber: string): PhoneLocationInfo | null {
  try {
    // Ensure phone number has + prefix
    const normalizedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    const parsed = parsePhoneNumber(normalizedNumber);
    
    if (!parsed || !parsed.country) {
      console.log(`Could not parse phone number: ${phoneNumber}`);
      return null;
    }
    
    const countryCode = parsed.country;
    const countryData = COUNTRY_DATA[countryCode];
    
    if (!countryData) {
      // Return basic info even if country is not in our detailed list
      return {
        countryCode,
        countryName: countryCode, // Just use code as name
        callingCode: `+${parsed.countryCallingCode}`,
        region: 'unknown',
        primaryLanguages: ['english'],
      };
    }
    
    return {
      countryCode,
      callingCode: `+${parsed.countryCallingCode}`,
      ...countryData,
    };
  } catch (error) {
    console.error('Error parsing phone number:', error);
    return null;
  }
}

/**
 * Get just the country code from a phone number
 */
export function getCountryCodeFromPhone(phoneNumber: string): string | null {
  const location = getLocationFromPhone(phoneNumber);
  return location?.countryCode || null;
}

/**
 * Get region from phone number
 */
export function getRegionFromPhone(phoneNumber: string): WorldRegion {
  const location = getLocationFromPhone(phoneNumber);
  return location?.region || 'unknown';
}

/**
 * Check if a phone number is from Africa
 */
export function isAfricanNumber(phoneNumber: string): boolean {
  const region = getRegionFromPhone(phoneNumber);
  return region.startsWith('africa-');
}

/**
 * Check if a phone number is from the Black diaspora regions
 */
export function isDiasporaNumber(phoneNumber: string): boolean {
  const region = getRegionFromPhone(phoneNumber);
  return ['caribbean', 'north-america', 'south-america', 'europe'].includes(region);
}

/**
 * Get greeting language preference based on location
 */
export function getPreferredLanguage(phoneNumber: string): string {
  const location = getLocationFromPhone(phoneNumber);
  
  if (!location) return 'english';
  
  // If French is primary, prefer French
  if (location.primaryLanguages[0] === 'french') {
    return 'french';
  }
  
  // If Swahili is primary or secondary in East Africa
  if (location.region === 'africa-east' && location.primaryLanguages.includes('swahili')) {
    return 'swahili';
  }
  
  return 'english';
}

/**
 * Generate cultural greeting based on location
 */
export function getCulturalGreeting(phoneNumber: string): string {
  const location = getLocationFromPhone(phoneNumber);
  
  if (!location) return 'Hey sis! 💜';
  
  const greetings: Record<WorldRegion, string[]> = {
    'africa-east': ['Habari dada! 💜', 'Sasa sis! 💜', 'Hey dada! 💜'],
    'africa-west': ['Hey sis! 💜', 'Hello beautiful! 💜', 'Hey queen! 💜'],
    'africa-south': ['Hey sis! 💜', 'Hello lovely! 💜', 'Hey queen! 💜'],
    'africa-north': ['Hey sis! 💜', 'Hello beautiful! 💜'],
    'africa-central': ['Mbote sis! 💜', 'Hey dada! 💜', 'Salut ma sœur! 💜'],
    'caribbean': ['Hey sis! 💜', 'What\'s good queen! 💜', 'Hey beautiful! 💜'],
    'north-america': ['Hey sis! 💜', 'What\'s up queen! 💜', 'Hey girl! 💜'],
    'south-america': ['Hey sis! 💜', 'Oi linda! 💜', 'Hey queen! 💜'],
    'europe': ['Hey sis! 💜', 'Hello lovely! 💜', 'Hey queen! 💜'],
    'asia': ['Hey sis! 💜', 'Hello beautiful! 💜'],
    'oceania': ['Hey sis! 💜', 'Hello lovely! 💜'],
    'unknown': ['Hey sis! 💜'],
  };
  
  const regionGreetings = greetings[location.region];
  return regionGreetings[Math.floor(Math.random() * regionGreetings.length)];
}

/**
 * Get all supported countries for a region
 */
export function getCountriesByRegion(region: WorldRegion): Array<{ code: string; name: string }> {
  return Object.entries(COUNTRY_DATA)
    .filter(([_, data]) => data.region === region)
    .map(([code, data]) => ({ code, name: data.countryName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all regions with country counts
 */
export function getRegionStats(): Array<{ region: WorldRegion; name: string; countryCount: number }> {
  const stats: Record<WorldRegion, number> = {
    'africa-east': 0,
    'africa-west': 0,
    'africa-south': 0,
    'africa-north': 0,
    'africa-central': 0,
    'caribbean': 0,
    'north-america': 0,
    'south-america': 0,
    'europe': 0,
    'asia': 0,
    'oceania': 0,
    'unknown': 0,
  };
  
  Object.values(COUNTRY_DATA).forEach(data => {
    stats[data.region]++;
  });
  
  return Object.entries(stats)
    .filter(([_, count]) => count > 0)
    .map(([region, count]) => ({
      region: region as WorldRegion,
      name: REGION_NAMES[region as WorldRegion],
      countryCount: count,
    }))
    .sort((a, b) => b.countryCount - a.countryCount);
}
