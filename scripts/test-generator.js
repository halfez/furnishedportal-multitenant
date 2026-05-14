/**
 * Test suite for generate-client.js
 * Run: node scripts/test-generator.js
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const SCRIPT = path.join(__dirname, 'generate-client.js');

// ── Colour helpers ─────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

let passed = 0, failed = 0;

function ok(label) {
  console.log(`  ${GREEN}✓${RESET} ${label}`);
  passed++;
}
function fail(label, detail) {
  console.log(`  ${RED}✗${RESET} ${label}`);
  if (detail) console.log(`    ${RED}→ ${detail}${RESET}`);
  failed++;
}
function section(title) {
  console.log(`\n${BOLD}${title}${RESET}`);
}

// ── Helpers ────────────────────────────────────────────────────────
function run(args) {
  // Returns { stdout, stderr, code }
  try {
    const stdout = execSync(`node "${SCRIPT}" ${args}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', code: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || e.message, code: e.status || 1 };
  }
}

function writeSubmission(name, obj) {
  const p = path.join(ROOT, `_test-submission-${name}.json`);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}

function cleanup(slug, subFile) {
  const dir = path.join(ROOT, 'clients', slug);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  if (subFile && fs.existsSync(subFile)) fs.unlinkSync(subFile);
}

function readConfig(slug) {
  const p = path.join(ROOT, 'clients', slug, 'config', 'property.ts');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}
function readNotes(slug) {
  const p = path.join(ROOT, 'clients', slug, 'INTAKE_NOTES.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}
function clientExists(slug) {
  return fs.existsSync(path.join(ROOT, 'clients', slug));
}

// ── FULL SUBMISSION object ─────────────────────────────────────────
const FULL = {
  submittedAt: '2026-04-22T12:00:00.000Z',
  owner:    { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '555-123-4567' },
  property: { name: 'Riverside Retreat', type: 'Single-family home', sqft: '1400',
               bedrooms: '2', bathrooms: '2', maxGuests: '4',
               description: 'A cozy home near downtown Bozeman.', highlights: 'Hospital nearby' },
  address:  { street: '123 Main St', city: 'Bozeman', state: 'MT', zip: '59715', country: 'United States' },
  amenities: ['WiFi', 'Washer', 'Parking', 'Kitchen', 'TV', 'Workspace'],
  media:     { videoLink: 'https://youtube.com/test', tourLink: '' },
  branding:  { colorTheme: 'Nature-inspired', notes: 'Earthy tones' },
  policies:  { checkinTime: '15:00', checkoutTime: '11:00',
               checkinMethod: 'Self-check-in (smart lock / keypad)',
               checkinNotes: 'Keypad on door', minStay: '1 month', maxStay: '6 months',
               pets: 'Case by case', petNotes: '$250 deposit',
               smoking: 'No smoking', parties: 'No parties',
               quietStart: '22:00', quietEnd: '08:00', extraRules: 'Remove shoes.' },
  pricing:   { monthlyRate: '$2,800 / month', securityDeposit: '$500',
               included: ['Utilities', 'WiFi'], cancellation: 'Moderate', cancellationDetails: '' },
  location:  { neighborhood: 'Quiet area', hospitals: 'Bozeman Health — 4 mi',
               employers: 'MSU', attractions: 'Bridger Bowl', parking: '2 spots',
               transit: 'Bus 15', airport: 'BZN — 15 min' },
  utilities: { wifiName: 'RiversideGuest', wifiSpeed: '500 Mbps',
               trash: 'Tuesdays', laundry: 'In-unit', emergency: 'Call Jane' },
  faqs: [
    { question: 'Is it furnished?', answer: 'Yes, fully.' },
    { question: 'Utilities included?', answer: 'Yes.' },
  ],
  extraNotes: 'Add a reviews section.',
  referenceUrls: 'https://airbnb.com',
};

// ═══════════════════════════════════════════════════════════════════
section('1 · Error handling');

// 1a. No args
{
  const r = run('');
  r.stderr.includes('Usage') || r.stdout.includes('Usage')
    ? ok('Prints usage when called with no arguments')
    : fail('Should print usage with no arguments', r.stderr || r.stdout);
}

// 1b. Missing submission file
{
  const r = run('nonexistent-file.json');
  r.code !== 0
    ? ok('Exits with error when submission file does not exist')
    : fail('Should exit non-zero for missing file');
}

// 1c. Duplicate output directory
{
  const slug = 'dup-test';
  const sub  = writeSubmission(slug, { ...FULL, property: { ...FULL.property, name: 'Dup Test' } });
  run(`"${sub}"`);  // first run creates clients/dup-test
  const r2 = run(`"${sub}"`);  // second run should refuse
  cleanup(slug, sub);
  r2.code !== 0
    ? ok('Refuses to overwrite an existing output directory')
    : fail('Should exit non-zero when output dir already exists');
}

// ═══════════════════════════════════════════════════════════════════
section('2 · Successful generation — basic structure');

const slug = 'riverside-retreat';
// Pre-clean in case a previous run left this directory behind
cleanup(slug, null);
const subFile = writeSubmission('full', FULL);
const r = run(`"${subFile}"`);
const cfg = readConfig(slug);
const notes = readNotes(slug);

r.code === 0
  ? ok('Generator exits with code 0')
  : fail('Generator should exit 0', r.stderr);

clientExists(slug)
  ? ok('clients/riverside-retreat/ directory created')
  : fail('Output directory was not created');

cfg !== null
  ? ok('config/property.ts written')
  : fail('config/property.ts missing');

notes !== null
  ? ok('INTAKE_NOTES.md written')
  : fail('INTAKE_NOTES.md missing');

fs.existsSync(path.join(ROOT, 'clients', slug, 'submission.json'))
  ? ok('submission.json saved alongside')
  : fail('submission.json not found');

// Key template files copied
for (const f of ['package.json', 'next.config.js', 'tailwind.config.ts', 'prisma/schema.prisma']) {
  fs.existsSync(path.join(ROOT, 'clients', slug, f))
    ? ok(`Template file copied: ${f}`)
    : fail(`Missing template file: ${f}`);
}

// node_modules excluded
!fs.existsSync(path.join(ROOT, 'clients', slug, 'node_modules'))
  ? ok('node_modules correctly excluded from copy')
  : fail('node_modules should not be copied');

// .next excluded
!fs.existsSync(path.join(ROOT, 'clients', slug, '.next'))
  ? ok('.next correctly excluded from copy')
  : fail('.next should not be copied');

// ═══════════════════════════════════════════════════════════════════
section('3 · config/property.ts — field mapping');

// Brand name
cfg.includes('"name": "Riverside Retreat"')
  ? ok('brand.name mapped correctly')
  : fail('brand.name wrong', cfg.match(/"name":[^\n]*/)?.[0]);

// Tagline (first line of description)
cfg.includes('"tagline": "A cozy home near downtown Bozeman."')
  ? ok('brand.tagline uses first line of description')
  : fail('brand.tagline wrong');

// Owner full name
cfg.includes('"fullName": "Jane Smith"')
  ? ok('owner.fullName concatenated correctly')
  : fail('owner.fullName wrong');

// Owner company derived
cfg.includes('"company": "Riverside Retreat LLC"')
  ? ok('owner.company derived from brand name')
  : fail('owner.company wrong');

// Email
cfg.includes('"email": "jane@example.com"')
  ? ok('owner.email set')
  : fail('owner.email wrong');

// Phone
cfg.includes('"phone": "555-123-4567"')
  ? ok('owner.phone set')
  : fail('owner.phone wrong');

// Monthly rent — money parsing from "$2,800 / month" → 2800
cfg.includes('"monthlyRent": 2800')
  ? ok('monthlyRent parsed from "$2,800 / month" → 2800')
  : fail('monthlyRent parsing failed', cfg.match(/"monthlyRent":[^\n]*/)?.[0]);

// Security deposit — "$500" → 500
cfg.includes('"securityDeposit": 500')
  ? ok('securityDeposit parsed from "$500" → 500')
  : fail('securityDeposit parsing failed', cfg.match(/"securityDeposit":[^\n]*/)?.[0]);

// sqft as number
cfg.includes('"sqft": 1400')
  ? ok('sqft coerced to number')
  : fail('sqft should be number 1400');

// bedrooms/bathrooms as numbers
cfg.includes('"bedrooms": 2') && cfg.includes('"bathrooms": 2')
  ? ok('bedrooms and bathrooms coerced to numbers')
  : fail('bedrooms/bathrooms should be numbers');

// State abbreviation
cfg.includes('"state": "MT"')
  ? ok('state abbreviation preserved')
  : fail('state wrong');

// City
cfg.includes('"city": "Bozeman"')
  ? ok('city set')
  : fail('city wrong');

// Amenities — codes expanded to labels
const expectedAmenities = [
  '"High-Speed WiFi"',
  '"Washer & Dryer"',
  '"Free Parking"',
  '"Full Kitchen"',
  '"Smart TV + Streaming"',
  '"Dedicated Workspace"',
];
const allAmenities = expectedAmenities.every(a => cfg.includes(a));
allAmenities
  ? ok('All 6 amenity codes expanded to readable labels')
  : fail('Amenity label expansion failed', expectedAmenities.filter(a => !cfg.includes(a)).join(', '));

// Chatbot greeting personalised
cfg.includes('Welcome to Riverside Retreat') && cfg.includes('Bozeman')
  ? ok('Chatbot greeting personalised with brand name and city')
  : fail('Chatbot greeting not personalised');

// Meta title
cfg.includes('"Riverside Retreat | Furnished Rentals in Bozeman"')
  ? ok('meta.defaultTitle includes brand and city')
  : fail('meta.defaultTitle wrong', cfg.match(/"defaultTitle":[^\n]*/)?.[0]);

// RENT_MAP export present
cfg.includes('export const RENT_MAP')
  ? ok('RENT_MAP export present')
  : fail('RENT_MAP missing from generated config');

// No "as const" (caused TS issues in some template setups)
!cfg.includes('as const')
  ? ok('No "as const" (matches original template style)')
  : fail('"as const" should not be in generated config');

// ═══════════════════════════════════════════════════════════════════
section('4 · INTAKE_NOTES.md — unmapped fields preserved');

notes.includes('## Policies')
  ? ok('Policies section present')
  : fail('Policies section missing');

notes.includes('checkinMethod') && notes.includes('Self-check-in')
  ? ok('Check-in method preserved')
  : fail('Check-in method missing from notes');

notes.includes('## Location Info')
  ? ok('Location section present')
  : fail('Location section missing');

notes.includes('Bozeman Health') && notes.includes('Bridger Bowl')
  ? ok('Hospital and attraction info preserved')
  : fail('Location details missing');

notes.includes('## FAQs')
  ? ok('FAQ section present')
  : fail('FAQ section missing');

notes.includes('Is it furnished?') && notes.includes('Yes, fully.')
  ? ok('FAQ questions and answers preserved')
  : fail('FAQ content missing');

notes.includes('## Branding Preferences')
  ? ok('Branding section present')
  : fail('Branding section missing');

notes.includes('## Utilities & Practical Info')
  ? ok('Utilities section present')
  : fail('Utilities section missing');

notes.includes('RiversideGuest') && notes.includes('500 Mbps')
  ? ok('WiFi details preserved in notes')
  : fail('WiFi details missing');

notes.includes('Add a reviews section.')
  ? ok('Extra notes from client preserved')
  : fail('Extra notes missing');

notes.includes('https://airbnb.com')
  ? ok('Reference URLs preserved')
  : fail('Reference URLs missing');

// ═══════════════════════════════════════════════════════════════════
section('5 · Edge cases');

// 5a. --slug override
{
  const sub2 = writeSubmission('slug-test', FULL);
  const r2 = run(`"${sub2}" --slug custom-slug-here`);
  const slugOk = r2.code === 0 && clientExists('custom-slug-here');
  cleanup('custom-slug-here', sub2);
  slugOk
    ? ok('--slug flag overrides auto-generated slug')
    : fail('--slug flag not working', r2.stderr);
}

// 5b. Minimal submission (most fields empty)
{
  const min = {
    owner:    { firstName: '', lastName: '', email: '', phone: '' },
    property: { name: 'Bare Minimum', type: '', sqft: '', bedrooms: '', bathrooms: '',
                maxGuests: '', description: '', highlights: '' },
    address:  { street: '', city: '', state: '', zip: '', country: '' },
    amenities: [],
    media: {}, branding: {}, policies: {}, pricing: {}, location: {}, utilities: {},
    faqs: [], extraNotes: '', referenceUrls: '',
  };
  const sub3 = writeSubmission('minimal', min);
  const r3 = run(`"${sub3}"`);
  const cfg3 = readConfig('bare-minimum');
  cleanup('bare-minimum', sub3);

  r3.code === 0
    ? ok('Handles minimal/empty submission without crashing')
    : fail('Crashed on minimal submission', r3.stderr.slice(0, 200));

  if (cfg3) {
    cfg3.includes('"name": "Bare Minimum"')
      ? ok('brand.name set even in minimal submission')
      : fail('brand.name wrong in minimal submission');

    cfg3.includes('"monthlyRent": 0')
      ? ok('monthlyRent defaults to 0 when no price given')
      : fail('monthlyRent should default to 0');
  }
}

// 5c. Currency parsing variants
{
  const cases = [
    ['$3000',             3000],
    ['$3,000',            3000],
    ['$3,000/month',      3000],
    ['3000',              3000],
    ['$1,500 per month',  1500],
    ['',                  0   ],
  ];
  let allOk = true;
  // We test the parseMoney function indirectly via submissions
  // Pull it out by eval-ing just that piece
  const scriptSrc = fs.readFileSync(SCRIPT, 'utf8');
  const match = scriptSrc.match(/function parseMoney[\s\S]*?\n\}/);
  if (match) {
    // Use new Function to avoid name collision with outer scope
    const parseMoney = new Function(`${match[0]}; return parseMoney;`)();
    for (const [input, expected] of cases) {
      if (parseMoney(input) !== expected) { allOk = false; break; }
    }
    allOk
      ? ok('parseMoney handles $3000, $3,000, $3,000/month, bare 3000, empty → 0')
      : fail('parseMoney failed on one or more formats', cases.map(([i,e]) => `${i}→${parseMoney(i)} (expected ${e})`).join(', '));
  } else {
    fail('Could not extract parseMoney function for unit test');
  }
}

// 5d. Slugification
{
  const slugCases = [
    ['Sunset Suites',       'sunset-suites'],
    ['Jane\'s Cozy Home!',  'jane-s-cozy-home'],
    ['123 Main LLC',        '123-main-llc'],
    ['',                    'client'],
  ];
  const scriptSrc = fs.readFileSync(SCRIPT, 'utf8');
  const match2 = scriptSrc.match(/function slugify[\s\S]*?\n\}/);
  let allOk2 = true;
  if (match2) {
    const slugify = new Function(`${match2[0]}; return slugify;`)();
    for (const [input, expected] of slugCases) {
      if (slugify(input) !== expected) { allOk2 = false; break; }
    }
    allOk2
      ? ok('slugify handles spaces, special chars, empty string')
      : fail('slugify failed', slugCases.map(([i,e]) => `"${i}"→"${slugify(i)}" (expected "${e}")`).join(', '));
  } else {
    fail('Could not extract slugify function for unit test');
  }
}

// ═══════════════════════════════════════════════════════════════════
// Cleanup
cleanup(slug, subFile);
const clientsDir = path.join(ROOT, 'clients');
if (fs.existsSync(clientsDir)) {
  const remaining = fs.readdirSync(clientsDir);
  if (remaining.length === 0) fs.rmdirSync(clientsDir);
}

// ═══════════════════════════════════════════════════════════════════
section('Results');
const total = passed + failed;
console.log(`\n  ${passed}/${total} tests passed`);
if (failed > 0) {
  console.log(`  ${RED}${failed} failed${RESET}`);
  process.exit(1);
} else {
  console.log(`  ${GREEN}All tests passed ✓${RESET}\n`);
}
