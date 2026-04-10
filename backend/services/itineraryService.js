/**
 * itineraryService.js
 * Generates Tamil-language itinerary text templates based on intent and entities.
 */

const DAY_PLANS = {
  'Chennai': [
    'காலை: மெரினா கடற்கரையில் உலாவுங்கள்',
    'பகல்: கபாலீஸ்வரர் கோவில் வருகை',
    'மாலை: டி நகர் ஷாப்பிங்',
    'இரவு: ஹோட்டலில் தங்குங்கள்',
  ],
  'Madurai': [
    'காலை: மீனாட்சி அம்மன் கோவில் வருகை',
    'பகல்: திருமலை நாயக்கர் அரண்மனை',
    'மாலை: கண்டிமர்க்கட் ஷாப்பிங்',
    'இரவு: ஹோட்டலில் தங்குங்கள்',
  ],
  'Ooty': [
    'காலை: நீலகிரி மலை ரயில் பயணம்',
    'பகல்: ரோஜா தோட்டம் மற்றும் தேயிலை தோட்டம்',
    'மாலை: டோடாபேட்டா சிகரம்',
    'இரவு: ஹோட்டலில் தங்குங்கள்',
  ],
  'Rameswaram': [
    'காலை: ராமநாதசுவாமி கோவில் வருகை',
    'பகல்: பம்பன் பாலத்தில் நடைப்பயணம்',
    'மாலை: தனுஷ்கோடி கடற்கரை',
    'இரவு: ஹோட்டலில் தங்குங்கள்',
  ],
  'Kanyakumari': [
    'காலை: விவேகானந்த ராக் மெமோரியல் வருகை',
    'பகல்: திருவள்ளுவர் சிலை',
    'மாலை: சூரிய அஸ்தமனம் காணுங்கள்',
    'இரவு: ஹோட்டலில் தங்குங்கள்',
  ],
  'Coimbatore': [
    'காலை: மருதமலை முருகன் கோவில்',
    'பகல்: ஈரோடு மற்றும் கைலாஷ்நகர் சுற்றுலா',
    'மாலை: RS புரம் ஷாப்பிங்',
    'இரவு: ஹோட்டலில் தங்குங்கள்',
  ],
  'Trichy': [
    'காலை: பிரஹதீஸ்வரர் கோவில் வருகை',
    'பகல்: ராக் ஃபோர்ட் கோவில்',
    'மாலை: ஸ்ரீரங்கம் ரங்கநாதர் கோவில்',
    'இரவு: ஹோட்டலில் தங்குங்கள்',
  ],
  'Tanjore': [
    'காலை: பிரஹதீஸ்வரர் கோவில் (UNESCO Heritage)',
    'பகல்: சரஸ்வதி மஹால் நூலகம்',
    'மாலை: தஞ்சாவூர் கலை மற்றும் கைத்தறி',
    'இரவு: ஹோட்டலில் தங்குங்கள்',
  ],
};

const DEFAULT_DAY_PLAN = [
  'காலை: உள்ளூர் சிறப்பு இடங்களை சுற்றிப் பாருங்கள்',
  'பகல்: உள்ளூர் உணவகத்தில் சாப்பிடுங்கள்',
  'மாலை: மார்க்கெட் மற்றும் கடைகளை பாருங்கள்',
  'இரவு: ஹோட்டலில் தங்குங்கள்',
];

const INTENT_HEADERS = {
  plan_trip: '✈️ உங்கள் பயண திட்டம்',
  get_routes: '🗺️ பயண வழிகள்',
  get_budget_trip: '💰 பட்ஜெட் பயண திட்டம்',
  get_places: '📍 சிறந்த இடங்கள்',
};

/**
 * Generates a Tamil itinerary text based on NLP result and travel options.
 * @param {object} nlpResult - { intent, entities }
 * @param {object} travelOptions - from travelService
 * @returns {string}
 */
function generateItinerary(nlpResult, travelOptions) {
  const { intent, entities } = nlpResult;
  const { source, destination, date, budget } = entities || {};

  const header = INTENT_HEADERS[intent] || '✈️ உங்கள் பயண திட்டம்';

  let lines = [];
  lines.push(header);
  lines.push('');

  if (source && destination) {
    lines.push(`📍 புறப்படும் இடம்: ${source}`);
    lines.push(`🏁 சேரும் இடம்: ${destination}`);
  } else if (destination) {
    lines.push(`🏁 சேரும் இடம்: ${destination}`);
  }

  if (date) {
    lines.push(`📅 தேதி: ${date}`);
  }

  if (budget) {
    lines.push(`💵 பட்ஜெட்: ${budget}`);
  }

  lines.push('');

  // Travel options summary
  if (travelOptions && travelOptions.options) {
    lines.push('🚌 பயண வசதிகள்:');

    const cheapestTrain = travelOptions.options.train[0];
    if (cheapestTrain) {
      lines.push(`  • ரயில்: ${cheapestTrain.name} - ₹${cheapestTrain.price} (${cheapestTrain.duration})`);
    }

    const cheapestBus = travelOptions.options.bus[0];
    if (cheapestBus) {
      lines.push(`  • பேருந்து: ${cheapestBus.name} - ₹${cheapestBus.price} (${cheapestBus.duration})`);
    }

    const cheapestFlight = travelOptions.options.flight[0];
    if (cheapestFlight) {
      lines.push(`  • விமானம்: ${cheapestFlight.name} - ₹${cheapestFlight.price} (${cheapestFlight.duration})`);
    }

    lines.push('');
  }

  // Day plan for destination
  if (destination) {
    const destKey = Object.keys(DAY_PLANS).find(k =>
      destination.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(destination.toLowerCase())
    );
    const dayPlan = destKey ? DAY_PLANS[destKey] : DEFAULT_DAY_PLAN;

    lines.push('📋 ஒரு நாள் திட்டம்:');
    dayPlan.forEach(item => lines.push(`  ${item}`));
    lines.push('');
  }

  // Route highlight
  if (travelOptions && travelOptions.routeInfo) {
    lines.push(`🌟 சிறப்பு இடங்கள்: ${travelOptions.routeInfo.highlight}`);
    lines.push('');
  }

  lines.push('இனிய பயணம்! 🙏');

  return lines.join('\n');
}

module.exports = { generateItinerary };
