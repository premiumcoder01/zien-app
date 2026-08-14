/**
 * Deterministic property data generator.
 * Same address always produces the same data (based on address hash).
 * Different addresses produce meaningfully different values.
 */

function hashAddress(address: string): number {
    let h = 0;
    for (let i = 0; i < address.length; i++) {
        h = ((h << 5) - h + address.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function pick<T>(arr: T[], hash: number, offset = 0): T {
    return arr[(hash + offset) % arr.length];
}

function inRange(hash: number, min: number, max: number, offset = 0): number {
    return min + ((hash + offset) % (max - min + 1));
}

function fmt(n: number): string {
    return n.toLocaleString('en-US');
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PropertyData {
    // Meta
    address: string;
    fullAddress: string;
    apn: string;
    type: string;
    subType: string;
    image: string;

    // Valuation
    estimatedValue: number;
    valuationRange: { low: number; high: number };
    pricePerSqft: number;
    estRentPerMonth: number;
    grossYield: number;
    avgDOM: number;
    sinceLastSalePct: string;
    confidence: 'High' | 'Medium' | 'Low';

    // Core Features
    beds: number;
    baths: string;
    sqft: number;
    yearBuilt: number;
    lotSqft: number;
    stories: number;
    garage: string;
    pool: boolean;
    zoning: string;

    // Construction
    roofType: string;
    exterior: string;
    basement: string;
    cooling: string;
    heating: string;
    waterSource: string;
    sewage: string;
    fireplaces: number;
    parkingSpaces: number;
    lastPermit: string;
    floodZone: string;
    schoolDistrict: string;

    // Ownership
    ownerName: string;
    ownerType: string;
    ownedSince: number;
    occupancy: string;
    annualTax: number;
    hoa: string;
    liens: string;

    // Walkability
    walkScore: number;
    transitScore: number;
    bikeScore: number;

    // Amenities
    amenities: string[];

    // Price Trend
    trend5y: number[];
    trend1y: number[];

    // Risk
    floodRisk: number;
    fireRisk: number;
    earthquakeRisk: number;
    crimeScore: number;
    crimeViolent: number;
    crimeProperty: number;

    // Broker
    brokerName: string;
    brokerTitle: string;
    brokerPhone: string;
    brokerEmail: string;
    brokerPhoto: string;
    brokerLicense: string;
    brokerYears: number;
    brokerSalesM: number;
    brokerDeals: number;
    brokerRating: string;

    // Images (gallery)
    images: string[];
}

const PROPERTY_TYPES = [
    { type: 'Single Family Residence', sub: 'SINGLE FAMILY' },
    { type: 'Luxury Estate', sub: 'LUXURY' },
    { type: 'Townhouse', sub: 'TOWNHOUSE' },
    { type: 'Modern Condo', sub: 'CONDO' },
    { type: 'Colonial Style', sub: 'SINGLE FAMILY' },
];

const ROOF_TYPES = ['Composition Shingle', 'Clay Tile', 'Metal Standing Seam', 'Flat TPO', 'Slate Tile'];
const EXTERIORS = ['Stucco', 'Brick Veneer', 'Fiber Cement', 'Wood Siding', 'Stone Facade'];
const BASEMENTS = ['None', 'Partial', 'Full – Unfinished', 'Full – Finished'];
const COOLINGS = ['Central AC', 'Mini-Split', 'Dual Zone AC', 'Evaporative Cooler'];
const HEATINGS = ['Forced Air – Gas', 'Radiant Floor', 'Heat Pump', 'Electric Baseboard'];
const WATER = ['Public', 'Public (City)', 'Well Water', 'City Utility'];
const SEWAGE = ['Public Sewer', 'Septic System', 'City Municipal'];
const ZONINGS = ['R1 – Single Family', 'R2 – Multi Family', 'R3 – Medium Density', 'PUD – Planned Unit', 'SFR – Residential'];
const FLOOD_ZONES = ['Zone X – Minimal Hazard', 'Zone AE – 100yr Floodplain', 'Zone A – High Risk', 'Zone X – Moderate Hazard'];

const OWNER_NAMES = ['Johnson Family Trust', 'Martinez Holdings LLC', 'Smith Revocable Trust', 'Williams Estate', 'Davis Living Trust'];
const OWNER_TYPES = ['Revocable Trust', 'LLC', 'Individual', 'Family Trust', 'Corporation'];
const OCCUPANCIES = ['Owner Occupied', 'Tenant Occupied', 'Vacant'];
const HOA = ['No HOA', '$180/mo – Community HOA', '$320/mo – Gated Community', '$95/mo – Association'];
const LIENS = ['None on Record', 'None Detected', 'Clear Title'];

const PERMITS = [
    'Kitchen Remodel – Mar 2022',
    'Roof Replacement – Sep 2021',
    'HVAC Upgrade – Jan 2023',
    'Addition 400sqft – Jun 2020',
    'Pool Installation – Apr 2019',
];

const SCHOOL_DISTRICTS = [
    'Los Angeles Unified School District',
    'Houston Independent School District',
    'Clark County School District',
    'Miami-Dade County Public Schools',
    'Dallas ISD',
];

const ALL_AMENITIES = [
    'Swimming Pool', 'Jacuzzi / Hot Tub', 'Outdoor Kitchen', 'Home Theater',
    'Smart Home System', 'Solar Panels', 'EV Charging Station', 'Security System',
    'Wine Cellar', 'Walk-in Closets', 'Sauna', 'Tennis Court', 'Basketball Hoop',
    'Vegetable Garden', 'Fire Pit', 'Guest Suite',
];

const BROKER_NAMES = [
    { name: 'Michael D. Sterling', title: 'Sterling Global Realty', photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { name: 'Sarah K. Williams', title: 'Apex Premier Properties', photo: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { name: 'James T. Crawford', title: 'Crawford & Associates', photo: 'https://randomuser.me/api/portraits/men/67.jpg' },
    { name: 'Priya Sharma', title: 'NextGen Real Estate', photo: 'https://randomuser.me/api/portraits/women/29.jpg' },
    { name: 'Robert L. Mason', title: 'Mason Luxury Group', photo: 'https://randomuser.me/api/portraits/men/81.jpg' },
];

const GARAGES = ['2-Car Attached', '1-Car Detached', '3-Car Garage', 'Carport Only', '2-Car Detached'];

const GALLERY_IMAGES = [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=800',
];

export function generatePropertyData(address: string): PropertyData {
    const hash = hashAddress(address);
    const h = hash;

    // Extract city from address for realism
    const parts = address.split(',');
    const cityState = parts.length > 1 ? parts.slice(1).join(',').trim() : 'Houston, TX';

    // Value: $680K–$2.8M
    const baseValue = 680000 + (h % 2120000);
    const valuePct = 0.07 + (h % 10) / 100;
    const lowVal = Math.round(baseValue * (1 - valuePct));
    const highVal = Math.round(baseValue * (1 + valuePct));

    // Property specifics
    const sqft = 1800 + (h % 3200);
    const pricePerSqft = Math.round(baseValue / sqft);
    const beds = 2 + (h % 5);
    const bathsNum = [1, 1.5, 2, 2.5, 3, 3.5, 4][h % 7];
    const lotSqft = 4000 + (h % 14000);
    const yearBuilt = 1960 + (h % 64);
    const stories = 1 + (h % 3);

    // Rent & yield
    const estRent = Math.round(baseValue * 0.004);
    const grossYield = parseFloat(((estRent * 12 / baseValue) * 100).toFixed(1));
    const avgDOM = 7 + (h % 58);

    // Appreciation since last sale
    const sinceLastSale = 10 + (h % 52);

    // Price trend 5y: realistic upward with some variation
    const base5y = Math.round(baseValue * 0.82);
    const trend5y = [
        base5y,
        Math.round(base5y * 1.04),
        Math.round(base5y * 1.08),
        Math.round(base5y * 1.12),
        Math.round(base5y * 1.18),
        baseValue,
    ];

    // 1y trend (quarterly)
    const q1 = Math.round(baseValue * 0.94);
    const trend1y = [q1, Math.round(q1 * 1.02), Math.round(q1 * 1.04), Math.round(q1 * 1.06), baseValue];

    // Walk scores
    const walkScore = 30 + (h % 65);
    const transitScore = 20 + ((h + 7) % 70);
    const bikeScore = 15 + ((h + 13) % 70);

    // Risk (out of 10)
    const floodRisk = 1 + (h % 8);
    const fireRisk = 1 + ((h + 5) % 7);
    const earthquakeRisk = 1 + ((h + 11) % 9);
    const crimeScore = 25 + (h % 55);
    const crimeViolent = 10 + ((h + 3) % 35);
    const crimeProperty = 30 + ((h + 7) % 50);

    // Confidence
    const conf: Array<'High' | 'Medium' | 'Low'> = ['High', 'High', 'Medium', 'Low', 'High'];
    const confidence = conf[h % 5];

    // Property type
    const propType = PROPERTY_TYPES[h % PROPERTY_TYPES.length];

    // Amenities (pick 6–10)
    const amenCount = 6 + (h % 5);
    const shuffled = [...ALL_AMENITIES].sort((_, __) => (h % 2 === 0 ? 1 : -1));
    const amenities = shuffled.slice(0, amenCount);

    // Broker
    const broker = BROKER_NAMES[h % BROKER_NAMES.length];

    // Gallery images (rotate 5 from pool based on hash)
    const imgStart = h % (GALLERY_IMAGES.length - 4);
    const images = GALLERY_IMAGES.slice(imgStart, imgStart + 5);

    // APN
    const apn = `${1000 + (h % 8999)}-${100 + ((h >> 4) % 900)}-${100 + ((h >> 8) % 900)}`;

    // Owner
    const ownedSince = 2005 + (h % 19);

    // Last permit
    const permitYears = ['2019', '2020', '2021', '2022', '2023', '2024'];
    const permitYear = permitYears[h % permitYears.length];
    const permitType = PERMITS[h % PERMITS.length].split(' – ')[0];

    return {
        address: parts[0]?.trim() || address,
        fullAddress: address,
        apn,
        type: propType.type,
        subType: propType.sub,
        image: images[0],
        images,

        estimatedValue: baseValue,
        valuationRange: { low: lowVal, high: highVal },
        pricePerSqft,
        estRentPerMonth: estRent,
        grossYield,
        avgDOM,
        sinceLastSalePct: `+${sinceLastSale}.${(h % 9)}%`,
        confidence,

        beds,
        baths: `${bathsNum}`,
        sqft,
        yearBuilt,
        lotSqft,
        stories,
        garage: GARAGES[h % GARAGES.length],
        pool: h % 3 !== 0,
        zoning: ZONINGS[h % ZONINGS.length],

        roofType: ROOF_TYPES[h % ROOF_TYPES.length],
        exterior: EXTERIORS[h % EXTERIORS.length],
        basement: BASEMENTS[h % BASEMENTS.length],
        cooling: COOLINGS[h % COOLINGS.length],
        heating: HEATINGS[h % HEATINGS.length],
        waterSource: WATER[h % WATER.length],
        sewage: SEWAGE[h % SEWAGE.length],
        fireplaces: h % 4,
        parkingSpaces: 2 + (h % 4),
        lastPermit: `${permitType} – ${pick(['Jan', 'Mar', 'Jun', 'Sep', 'Nov'], h)} ${permitYear}`,
        floodZone: FLOOD_ZONES[h % FLOOD_ZONES.length],
        schoolDistrict: SCHOOL_DISTRICTS[h % SCHOOL_DISTRICTS.length],

        ownerName: OWNER_NAMES[h % OWNER_NAMES.length],
        ownerType: OWNER_TYPES[h % OWNER_TYPES.length],
        ownedSince,
        occupancy: OCCUPANCIES[h % OCCUPANCIES.length],
        annualTax: 4000 + (h % 22000),
        hoa: HOA[h % HOA.length],
        liens: LIENS[h % LIENS.length],

        walkScore,
        transitScore,
        bikeScore,

        amenities,

        trend5y,
        trend1y,

        floodRisk,
        fireRisk,
        earthquakeRisk,
        crimeScore,
        crimeViolent,
        crimeProperty,

        brokerName: broker.name,
        brokerTitle: broker.title,
        brokerPhone: `+1310555${1000 + (h % 9000)}`,
        brokerEmail: `${broker.name.split(' ')[0].toLowerCase()}@${broker.title.replace(/\s+/g, '').toLowerCase()}.com`,
        brokerPhoto: broker.photo,
        brokerLicense: `CA DRE #0${1000000 + (h % 8999999)}`,
        brokerYears: 5 + (h % 25),
        brokerSalesM: 80 + (h % 520),
        brokerDeals: 40 + (h % 360),
        brokerRating: `${4}.${5 + (h % 5)}`,
    };
}

/** Format currency compactly: 1285000 → $1,285K */
export function fmtK(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    return `$${Math.round(value / 1000)}K`;
}

export function fmtFull(value: number): string {
    return `$${value.toLocaleString('en-US')}`;
}
