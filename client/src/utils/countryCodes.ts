// Country codes and phone formatting rules
export interface Country {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  dialCode: string; // +1, +44, etc
  format: string; // Pattern for formatting
}

export const COUNTRIES: Country[] = [
  // United States at top
  { name: "United States", code: "US", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  
  // Rest alphabetically
  { name: "Afghanistan", code: "AF", dialCode: "+93", format: "XX XXX XXXX" },
  { name: "Albania", code: "AL", dialCode: "+355", format: "XXX XXX XXX" },
  { name: "Algeria", code: "DZ", dialCode: "+213", format: "XXX XXX XXX" },
  { name: "Andorra", code: "AD", dialCode: "+376", format: "XXX XXX" },
  { name: "Angola", code: "AO", dialCode: "+244", format: "XXX XXX XXX" },
  { name: "Argentina", code: "AR", dialCode: "+54", format: "XX XXXX-XXXX" },
  { name: "Armenia", code: "AM", dialCode: "+374", format: "XX XXX XXX" },
  { name: "Australia", code: "AU", dialCode: "+61", format: "X XXXX XXXX" },
  { name: "Austria", code: "AT", dialCode: "+43", format: "XXX XXXXXX" },
  { name: "Azerbaijan", code: "AZ", dialCode: "+994", format: "XX XXX XXXX" },
  { name: "Bahamas", code: "BS", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Bahrain", code: "BH", dialCode: "+973", format: "XXXX XXXX" },
  { name: "Bangladesh", code: "BD", dialCode: "+880", format: "XXX XXX XXXX" },
  { name: "Barbados", code: "BB", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Belarus", code: "BY", dialCode: "+375", format: "XX XXX-XX-XX" },
  { name: "Belgium", code: "BE", dialCode: "+32", format: "X XXX XX XX" },
  { name: "Belize", code: "BZ", dialCode: "+501", format: "XXX-XXXX" },
  { name: "Benin", code: "BJ", dialCode: "+229", format: "XX XXX XXX" },
  { name: "Bhutan", code: "BT", dialCode: "+975", format: "XX XXX XXX" },
  { name: "Bolivia", code: "BO", dialCode: "+591", format: "X XXX XXXX" },
  { name: "Bosnia and Herzegovina", code: "BA", dialCode: "+387", format: "XX XXX XXX" },
  { name: "Botswana", code: "BW", dialCode: "+267", format: "XX XXX XXX" },
  { name: "Brazil", code: "BR", dialCode: "+55", format: "(XX) XXXXX-XXXX" },
  { name: "Brunei", code: "BN", dialCode: "+673", format: "XXX XXXX" },
  { name: "Bulgaria", code: "BG", dialCode: "+359", format: "X XXX XXXX" },
  { name: "Burkina Faso", code: "BF", dialCode: "+226", format: "XX XX XX XX" },
  { name: "Burundi", code: "BI", dialCode: "+257", format: "XX XXX XXX" },
  { name: "Cambodia", code: "KH", dialCode: "+855", format: "XXX XXX XXX" },
  { name: "Cameroon", code: "CM", dialCode: "+237", format: "XXX XXX XXX" },
  { name: "Canada", code: "CA", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Cape Verde", code: "CV", dialCode: "+238", format: "XXX XX XX" },
  { name: "Central African Republic", code: "CF", dialCode: "+236", format: "XX XX XX XX" },
  { name: "Chad", code: "TD", dialCode: "+235", format: "XX XX XX XX" },
  { name: "Chile", code: "CL", dialCode: "+56", format: "X XXXX XXXX" },
  { name: "China", code: "CN", dialCode: "+86", format: "XXX XXXX XXXX" },
  { name: "Colombia", code: "CO", dialCode: "+57", format: "X XXX XXX XXXX" },
  { name: "Comoros", code: "KM", dialCode: "+269", format: "XXX XX XX" },
  { name: "Congo", code: "CG", dialCode: "+242", format: "XX XXX XXXX" },
  { name: "Costa Rica", code: "CR", dialCode: "+506", format: "XXXX XXXX" },
  { name: "Croatia", code: "HR", dialCode: "+385", format: "X XXX XXXX" },
  { name: "Cuba", code: "CU", dialCode: "+53", format: "X XXX XXXX" },
  { name: "Cyprus", code: "CY", dialCode: "+357", format: "XXXX XXXX" },
  { name: "Czech Republic", code: "CZ", dialCode: "+420", format: "XXX XXX XXX" },
  { name: "Denmark", code: "DK", dialCode: "+45", format: "XXXX XXXX" },
  { name: "Djibouti", code: "DJ", dialCode: "+253", format: "XX XX XX XX" },
  { name: "Dominica", code: "DM", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Dominican Republic", code: "DO", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Ecuador", code: "EC", dialCode: "+593", format: "X XXX XXXX" },
  { name: "Egypt", code: "EG", dialCode: "+20", format: "XXX XXX XXXX" },
  { name: "El Salvador", code: "SV", dialCode: "+503", format: "XXXX XXXX" },
  { name: "Equatorial Guinea", code: "GQ", dialCode: "+240", format: "XXX XXX XXX" },
  { name: "Eritrea", code: "ER", dialCode: "+291", format: "X XXX XXX" },
  { name: "Estonia", code: "EE", dialCode: "+372", format: "XXXX XXXX" },
  { name: "Ethiopia", code: "ET", dialCode: "+251", format: "XX XXX XXXX" },
  { name: "Fiji", code: "FJ", dialCode: "+679", format: "XXX XXXX" },
  { name: "Finland", code: "FI", dialCode: "+358", format: "XX XXX XXXX" },
  { name: "France", code: "FR", dialCode: "+33", format: "X XX XX XX XX" },
  { name: "Gabon", code: "GA", dialCode: "+241", format: "X XX XX XX" },
  { name: "Gambia", code: "GM", dialCode: "+220", format: "XXX XXXX" },
  { name: "Georgia", code: "GE", dialCode: "+995", format: "XXX XXX XXX" },
  { name: "Germany", code: "DE", dialCode: "+49", format: "XXX XXXXXXX" },
  { name: "Ghana", code: "GH", dialCode: "+233", format: "XX XXX XXXX" },
  { name: "Greece", code: "GR", dialCode: "+30", format: "XXX XXXX XXX" },
  { name: "Grenada", code: "GD", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Guatemala", code: "GT", dialCode: "+502", format: "XXXX XXXX" },
  { name: "Guinea", code: "GN", dialCode: "+224", format: "XXX XXX XXX" },
  { name: "Guinea-Bissau", code: "GW", dialCode: "+245", format: "XXX XXXX" },
  { name: "Guyana", code: "GY", dialCode: "+592", format: "XXX XXXX" },
  { name: "Haiti", code: "HT", dialCode: "+509", format: "XXX XXXX" },
  { name: "Honduras", code: "HN", dialCode: "+504", format: "XXXX XXXX" },
  { name: "Hong Kong", code: "HK", dialCode: "+852", format: "XXXX XXXX" },
  { name: "Hungary", code: "HU", dialCode: "+36", format: "X XXX XXXX" },
  { name: "Iceland", code: "IS", dialCode: "+354", format: "XXX XXXX" },
  { name: "India", code: "IN", dialCode: "+91", format: "XXXXX XXXXX" },
  { name: "Indonesia", code: "ID", dialCode: "+62", format: "XXX-XXXX-XXXX" },
  { name: "Iran", code: "IR", dialCode: "+98", format: "XXX XXXX XXXX" },
  { name: "Iraq", code: "IQ", dialCode: "+964", format: "XXX XXX XXXX" },
  { name: "Ireland", code: "IE", dialCode: "+353", format: "X XXXX XXXX" },
  { name: "Israel", code: "IL", dialCode: "+972", format: "X XXX XXXX" },
  { name: "Italy", code: "IT", dialCode: "+39", format: "XXX XXXX XXX" },
  { name: "Jamaica", code: "JM", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Japan", code: "JP", dialCode: "+81", format: "X-XXXX-XXXX" },
  { name: "Jordan", code: "JO", dialCode: "+962", format: "X XXXX XXXX" },
  { name: "Kazakhstan", code: "KZ", dialCode: "+7", format: "XXX XXX XX XX" },
  { name: "Kenya", code: "KE", dialCode: "+254", format: "XXX XXX XXX" },
  { name: "Kiribati", code: "KI", dialCode: "+686", format: "XXXX XXXX" },
  { name: "Kosovo", code: "XK", dialCode: "+383", format: "XXX XXX XXX" },
  { name: "Kuwait", code: "KW", dialCode: "+965", format: "XXXX XXXX" },
  { name: "Kyrgyzstan", code: "KG", dialCode: "+996", format: "XXX XX XX XX" },
  { name: "Laos", code: "LA", dialCode: "+856", format: "XXX XXX XXX" },
  { name: "Latvia", code: "LV", dialCode: "+371", format: "XXXX XXXX" },
  { name: "Lebanon", code: "LB", dialCode: "+961", format: "X XXXX XXXX" },
  { name: "Lesotho", code: "LS", dialCode: "+266", format: "XXXX XXXX" },
  { name: "Liberia", code: "LR", dialCode: "+231", format: "XX XXX XXXX" },
  { name: "Libya", code: "LY", dialCode: "+218", format: "XXX XXX XXX" },
  { name: "Liechtenstein", code: "LI", dialCode: "+423", format: "XXX XXXX" },
  { name: "Lithuania", code: "LT", dialCode: "+370", format: "XXX XXXXX" },
  { name: "Luxembourg", code: "LU", dialCode: "+352", format: "XXX XXX XXX" },
  { name: "Macao", code: "MO", dialCode: "+853", format: "XXXX XXXX" },
  { name: "Madagascar", code: "MG", dialCode: "+261", format: "XX XXX XXXX" },
  { name: "Malawi", code: "MW", dialCode: "+265", format: "X XXX XXXX" },
  { name: "Malaysia", code: "MY", dialCode: "+60", format: "X-XXXX XXXX" },
  { name: "Maldives", code: "MV", dialCode: "+960", format: "XXX XXXX" },
  { name: "Mali", code: "ML", dialCode: "+223", format: "XXXX XXXX" },
  { name: "Malta", code: "MT", dialCode: "+356", format: "XXXX XXXX" },
  { name: "Marshall Islands", code: "MH", dialCode: "+692", format: "XXX XXXX" },
  { name: "Mauritania", code: "MR", dialCode: "+222", format: "XX XX XX XX" },
  { name: "Mauritius", code: "MU", dialCode: "+230", format: "XXXX XXXX" },
  { name: "Mexico", code: "MX", dialCode: "+52", format: "XX XXXX XXXX" },
  { name: "Micronesia", code: "FM", dialCode: "+691", format: "XXX XXXX" },
  { name: "Moldova", code: "MD", dialCode: "+373", format: "XXX XXX XXX" },
  { name: "Monaco", code: "MC", dialCode: "+377", format: "X XXXX XXXX" },
  { name: "Mongolia", code: "MN", dialCode: "+976", format: "XX XXX XXX" },
  { name: "Montenegro", code: "ME", dialCode: "+382", format: "XX XXX XXX" },
  { name: "Morocco", code: "MA", dialCode: "+212", format: "X-XXXX-XXXX" },
  { name: "Mozambique", code: "MZ", dialCode: "+258", format: "XXX XXX XXX" },
  { name: "Myanmar", code: "MM", dialCode: "+95", format: "XXX XXX XXXX" },
  { name: "Namibia", code: "NA", dialCode: "+264", format: "XX XXX XXXX" },
  { name: "Nauru", code: "NR", dialCode: "+674", format: "XXX XXXX" },
  { name: "Nepal", code: "NP", dialCode: "+977", format: "XXXX XXX XXX" },
  { name: "Netherlands", code: "NL", dialCode: "+31", format: "X XXXX XXXX" },
  { name: "New Zealand", code: "NZ", dialCode: "+64", format: "X XXXX XXXX" },
  { name: "Nicaragua", code: "NI", dialCode: "+505", format: "XXXX XXXX" },
  { name: "Niger", code: "NE", dialCode: "+227", format: "XXXX XXXX" },
  { name: "Nigeria", code: "NG", dialCode: "+234", format: "XXX XXX XXXX" },
  { name: "North Korea", code: "KP", dialCode: "+850", format: "XX XXX XXXX" },
  { name: "North Macedonia", code: "MK", dialCode: "+389", format: "X XXX XXXX" },
  { name: "Norway", code: "NO", dialCode: "+47", format: "XXXX XXXX" },
  { name: "Oman", code: "OM", dialCode: "+968", format: "XXXX XXXX" },
  { name: "Pakistan", code: "PK", dialCode: "+92", format: "XXX XXXXXXX" },
  { name: "Palau", code: "PW", dialCode: "+680", format: "XXX XXXX" },
  { name: "Palestine", code: "PS", dialCode: "+970", format: "X XXXX XXXX" },
  { name: "Panama", code: "PA", dialCode: "+507", format: "XXXX XXXX" },
  { name: "Papua New Guinea", code: "PG", dialCode: "+675", format: "XXX XXXX" },
  { name: "Paraguay", code: "PY", dialCode: "+595", format: "X XXX XXXX" },
  { name: "Peru", code: "PE", dialCode: "+51", format: "X XXX XXXX" },
  { name: "Philippines", code: "PH", dialCode: "+63", format: "XXX XXX XXXX" },
  { name: "Poland", code: "PL", dialCode: "+48", format: "XX XXXX XXXX" },
  { name: "Portugal", code: "PT", dialCode: "+351", format: "XXX XXX XXX" },
  { name: "Qatar", code: "QA", dialCode: "+974", format: "XXXX XXXX" },
  { name: "Romania", code: "RO", dialCode: "+40", format: "X XX XXX XXXX" },
  { name: "Russia", code: "RU", dialCode: "+7", format: "XXX XXXX XXXX" },
  { name: "Rwanda", code: "RW", dialCode: "+250", format: "XXX XXX XXX" },
  { name: "Saint Kitts and Nevis", code: "KN", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Saint Lucia", code: "LC", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Saint Vincent and the Grenadines", code: "VC", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Samoa", code: "WS", dialCode: "+685", format: "XXXX XXXX" },
  { name: "San Marino", code: "SM", dialCode: "+378", format: "XXXX XXXXXX" },
  { name: "Sao Tome and Principe", code: "ST", dialCode: "+239", format: "XXX XXXX" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", format: "X XXXX XXXX" },
  { name: "Senegal", code: "SN", dialCode: "+221", format: "XX XXX XXXX" },
  { name: "Serbia", code: "RS", dialCode: "+381", format: "X XXXX XXXX" },
  { name: "Seychelles", code: "SC", dialCode: "+248", format: "XXX XXXX" },
  { name: "Sierra Leone", code: "SL", dialCode: "+232", format: "XX XXXXXX" },
  { name: "Singapore", code: "SG", dialCode: "+65", format: "XXXX XXXX" },
  { name: "Slovakia", code: "SK", dialCode: "+421", format: "X XXX XXXX" },
  { name: "Slovenia", code: "SI", dialCode: "+386", format: "X XXX XXXX" },
  { name: "Solomon Islands", code: "SB", dialCode: "+677", format: "XXXXXX" },
  { name: "Somalia", code: "SO", dialCode: "+252", format: "X XXX XXXX" },
  { name: "South Africa", code: "ZA", dialCode: "+27", format: "X XXXX XXXX" },
  { name: "South Korea", code: "KR", dialCode: "+82", format: "XX-XXXX-XXXX" },
  { name: "South Sudan", code: "SS", dialCode: "+211", format: "XXX XXX XXXX" },
  { name: "Spain", code: "ES", dialCode: "+34", format: "XXX XXX XXX" },
  { name: "Sri Lanka", code: "LK", dialCode: "+94", format: "XX XXX XXXX" },
  { name: "Sudan", code: "SD", dialCode: "+249", format: "XXX XXX XXXX" },
  { name: "Suriname", code: "SR", dialCode: "+597", format: "XXX XXXX" },
  { name: "Sweden", code: "SE", dialCode: "+46", format: "X XXXX XXXX" },
  { name: "Switzerland", code: "CH", dialCode: "+41", format: "X XXXX XXXX" },
  { name: "Syria", code: "SY", dialCode: "+963", format: "X XXXX XXXX" },
  { name: "Taiwan", code: "TW", dialCode: "+886", format: "X XXXX XXXX" },
  { name: "Tajikistan", code: "TJ", dialCode: "+992", format: "XX XXX XXXX" },
  { name: "Tanzania", code: "TZ", dialCode: "+255", format: "XXX XXX XXX" },
  { name: "Thailand", code: "TH", dialCode: "+66", format: "X XXXX XXXX" },
  { name: "Timor-Leste", code: "TL", dialCode: "+670", format: "XXXX XXXX" },
  { name: "Togo", code: "TG", dialCode: "+228", format: "XX XXX XXX" },
  { name: "Tonga", code: "TO", dialCode: "+676", format: "XXXXXX" },
  { name: "Trinidad and Tobago", code: "TT", dialCode: "+1", format: "(XXX) XXX-XXXX" },
  { name: "Tunisia", code: "TN", dialCode: "+216", format: "XXXX XXXX" },
  { name: "Turkey", code: "TR", dialCode: "+90", format: "XXX XXX XXXX" },
  { name: "Turkmenistan", code: "TM", dialCode: "+993", format: "X XXXX XXXX" },
  { name: "Tuvalu", code: "TV", dialCode: "+688", format: "XXXXXX" },
  { name: "Uganda", code: "UG", dialCode: "+256", format: "XXX XXX XXX" },
  { name: "Ukraine", code: "UA", dialCode: "+380", format: "XX XXXX XXXX" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", format: "X XXXX XXXX" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", format: "XXXX XXXXXX" },
  { name: "Uruguay", code: "UY", dialCode: "+598", format: "X XXXX XXXX" },
  { name: "Uzbekistan", code: "UZ", dialCode: "+998", format: "XX XXX XXXX" },
  { name: "Vanuatu", code: "VU", dialCode: "+678", format: "XXXXXX" },
  { name: "Vatican City", code: "VA", dialCode: "+379", format: "XXXX XXXX" },
  { name: "Venezuela", code: "VE", dialCode: "+58", format: "XXX-XXXX-XXXX" },
  { name: "Vietnam", code: "VN", dialCode: "+84", format: "X XXXX XXXX" },
  { name: "Yemen", code: "YE", dialCode: "+967", format: "XXX XXX XXXX" },
  { name: "Zambia", code: "ZM", dialCode: "+260", format: "X XXXX XXXX" },
  { name: "Zimbabwe", code: "ZW", dialCode: "+263", format: "X XXX XXXX" },
];

// Format phone number according to country rules
export const formatPhoneByCountry = (phoneNumber: string, country: Country | undefined): string => {
  if (!phoneNumber || !country) return phoneNumber;
  
  const digits = phoneNumber.replace(/\D/g, '');
  if (!digits) return '';
  
  // Remove leading 1 if it's US/Canada and they included it
  let cleanDigits = digits;
  if ((country.code === 'US' || country.code === 'CA') && digits.startsWith('1') && digits.length === 11) {
    cleanDigits = digits.slice(1);
  }
  
  // Apply country-specific formatting
  const format = country.format;
  let result = format;
  let digitIndex = 0;
  
  for (let i = 0; i < format.length && digitIndex < cleanDigits.length; i++) {
    if (format[i] === 'X') {
      result = result.substring(0, i) + cleanDigits[digitIndex] + result.substring(i + 1);
      digitIndex++;
    }
  }
  
  return result.substring(0, digitIndex + format.split('').filter((c, i) => {
    for (let j = 0; j <= i; j++) {
      if (format[j] === 'X') digitIndex++;
    }
    return format[i] !== 'X';
  }).length);
};

// Get country by dial code
export const getCountriesByCode = (dialCode: string): Country[] => {
  return COUNTRIES.filter(c => c.dialCode === dialCode);
};

// Filter countries by search term (name or code)
export const filterCountries = (searchTerm: string): Country[] => {
  const lower = searchTerm.toLowerCase();
  return COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(lower) || 
    c.dialCode.includes(lower)
  );
};

// Extract country code from stored value like "+1 (501) 282-5870"
export const extractCountryFromPhone = (phoneValue: string): Country | undefined => {
  if (!phoneValue) return undefined;
  
  // Try to find country by dial code at the start
  for (const country of COUNTRIES) {
    if (phoneValue.startsWith(country.dialCode)) {
      return country;
    }
  }
  
  return undefined;
};
