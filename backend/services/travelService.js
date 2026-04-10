/**
 * travelService.js
 * Generates mock travel options between a source and destination.
 */

const TRAVEL_OPTIONS = {
  train: [
    { name: 'Express Train', duration: '4h 30m', price: 350, class: 'Sleeper' },
    { name: 'Superfast Train', duration: '3h 45m', price: 650, class: 'AC 3-Tier' },
    { name: 'Rajdhani Express', duration: '3h 00m', price: 1200, class: 'AC 2-Tier' },
  ],
  bus: [
    { name: 'TNSTC Deluxe', duration: '5h 00m', price: 200, type: 'State Bus' },
    { name: 'AC Sleeper Bus', duration: '5h 30m', price: 550, type: 'Private' },
    { name: 'Volvo Multi-Axle', duration: '4h 45m', price: 750, type: 'Private AC' },
  ],
  flight: [
    { name: 'IndiGo', duration: '1h 05m', price: 3500, class: 'Economy' },
    { name: 'Air India', duration: '1h 10m', price: 4200, class: 'Economy' },
    { name: 'SpiceJet', duration: '1h 00m', price: 3000, class: 'Economy' },
  ],
};

const POPULAR_ROUTES = {
  'Chennai-Madurai': { distance: 461, highlight: 'Meenakshi Amman Temple, Thirumalai Nayakkar Palace' },
  'Chennai-Coimbatore': { distance: 503, highlight: 'Palani, Ooty gateway' },
  'Chennai-Trichy': { distance: 323, highlight: 'Brihadeeswarar Temple, Rock Fort' },
  'Chennai-Ooty': { distance: 540, highlight: 'Nilgiri Hills, Tea Gardens, Botanical Garden' },
  'Madurai-Rameswaram': { distance: 163, highlight: 'Ramanathaswamy Temple, Pamban Bridge' },
  'Coimbatore-Ooty': { distance: 86, highlight: 'Nilgiri Mountain Railway, Rose Garden' },
  'Chennai-Kanyakumari': { distance: 691, highlight: 'Vivekananda Rock Memorial, Thiruvalluvar Statue' },
  'Trichy-Tanjore': { distance: 57, highlight: 'Brihadeeswarar Temple, Saraswathi Mahal Library' },
};

/**
 * Returns mock travel options for the given source and destination.
 * @param {string} source
 * @param {string} destination
 * @param {string|null} budget  - 'low', 'medium', 'high', or null
 * @returns {object}
 */
function getTravelOptions(source, destination, budget = null) {
  const routeKey = `${toTitle(source)}-${toTitle(destination)}`;
  const reverseKey = `${toTitle(destination)}-${toTitle(source)}`;
  const routeInfo = POPULAR_ROUTES[routeKey] || POPULAR_ROUTES[reverseKey] || null;

  let options = {
    train: [...TRAVEL_OPTIONS.train],
    bus: [...TRAVEL_OPTIONS.bus],
    flight: [...TRAVEL_OPTIONS.flight],
  };

  // Filter by budget
  if (budget === 'low') {
    options.train = options.train.filter(t => t.price <= 500);
    options.bus = options.bus.filter(b => b.price <= 300);
    options.flight = [];
  } else if (budget === 'medium') {
    options.train = options.train.filter(t => t.price <= 800);
    options.bus = options.bus.filter(b => b.price <= 600);
    options.flight = options.flight.filter(f => f.price <= 4000);
  }

  return {
    source: source || 'Unknown',
    destination: destination || 'Unknown',
    routeInfo,
    options,
  };
}

function toTitle(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

module.exports = { getTravelOptions };
