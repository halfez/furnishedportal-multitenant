#!/usr/bin/env node
/**
 * MTR SaaS — Client Site Generator
 *
 * Reads a submission.json produced by client-onboarding-questionnaire.html
 * and generates a ready-to-deploy copy of the template in clients/<slug>/.
 *
 * Usage:
 *   node scripts/generate-client.js <submission.json> [--slug <slug>] [--out <dir>]
 *
 * Example:
 *   node scripts/generate-client.js submission-sunset-suites.json
 */

const fs = require('fs');
const path = require('path');

// ── Args ─────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { slug: null, out: null, submission: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--slug') args.slug = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (!a.startsWith('--')) args.submission = a;
  }
  return args;
}

function slugify(s) {
  return (s || 'client')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'client';
}

// ── Directory copy ───────────────────────────────────────────────
const EXCLUDE = new Set([
  'node_modules',
  '.next',
  '.git',
  '.turbo',
  'tsconfig.tsbuildinfo',
]);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(s), d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// ── Value helpers ────────────────────────────────────────────────
function parseMoney(s) {
  if (!s) return 0;
  const m = String(s).match(/[\d,]+(\.\d+)?/);
  return m ? Number(m[0].replace(/,/g, '')) : 0;
}

function toNumber(s, fallback = 0) {
  const n = Number(String(s || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ── Submission → CONFIG ──────────────────────────────────────────
const AMENITY_LABELS = {
  WiFi: 'High-Speed WiFi',
  Washer: 'Washer & Dryer',
  Parking: 'Free Parking',
  AC: 'Air Conditioning',
  Heating: 'Heating',
  Kitchen: 'Full Kitchen',
  Dishwasher: 'Dishwasher',
  TV: 'Smart TV + Streaming',
  Workspace: 'Dedicated Workspace',
  Gym: 'Gym Access',
  Pool: 'Pool',
  Backyard: 'Backyard / Patio',
  BBQ: 'BBQ / Grill',
  EV: 'EV Charger',
  Security: 'Smart Lock / Security',
};

function buildConfig(sub) {
  const owner = sub.owner || {};
  const prop = sub.property || {};
  const addr = sub.address || {};
  const pricing = sub.pricing || {};

  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'Property Owner';
  const brandName = prop.name || 'Your MTR';
  const stateAbbr = (addr.state || '').slice(0, 2).toUpperCase() || 'TX';
  const cityLine = addr.city ? ` in ${addr.city}` : '';

  const amenities = (sub.amenities || []).map(a => AMENITY_LABELS[a] || a);
  const description = prop.description || '';
  const tagline = (description.split('\n')[0] || `Furnished midterm rentals${cityLine}.`).trim();

  return {
    brand: {
      name: brandName,
      tagline,
      logoPath: '/images/logo.png',
      ogImagePath: '/og-image.png',
    },
    owner: {
      fullName,
      company: `${brandName} LLC`,
      email: owner.email || '',
      adminEmail: owner.email || '',
      phone: owner.phone || '',
    },
    units: [
      {
        id: 'unit-a',
        label: prop.type || brandName,
        address: addr.street || '',
        city: addr.city || '',
        state: stateAbbr,
        zip: addr.zip || '',
        monthlyRent: parseMoney(pricing.monthlyRate),
        sqft: toNumber(prop.sqft, 0),
        bedrooms: toNumber(prop.bedrooms, 1),
        bathrooms: toNumber(prop.bathrooms, 1),
        description,
        heroImage: '/images/unit1-hero.jpg',
      },
    ],
    amenities,
    reviews: [],
    about: {
      ownerPhoto: '/images/owner-photo.jpg',
      bio: `Hi, I'm ${owner.firstName || 'your host'}! Welcome to ${brandName}.`,
    },
    lease: {
      governingState: addr.state || 'Texas',
      governingStateAbbr: stateAbbr,
      securityDeposit: parseMoney(pricing.securityDeposit),
      applicationFee: 50,
      cleaningFee: 150,
      petFeePerMonth: 25,
      inventory: {
        kitchen: 'Microwave, Fridge, Toaster, Coffeemaker, Kettle, Pots/Pans, Dishes, Glassware, Utensils, Cleaning supplies',
        bathroom: 'Shower, Tub, Towels, Trash Can, Bath Rug',
        bedroom: 'Bedding sets, Blanket, Pillows',
        livingRoom: 'Smart TV, Shoe Rack, Coat Rack',
        laundry: (sub.utilities && sub.utilities.laundry) || 'Washer & Dryer',
        office: 'Desk & Chair',
      },
    },
    chatbot: {
      greeting: `Welcome to ${brandName}! 👋 I'm here to help you book your stay${cityLine}. Ask me anything about the unit, pricing, amenities, or availability!`,
      suggestions: [
        'What amenities are included?',
        'How do I book?',
        'Tell me about the location',
      ],
    },
    meta: {
      titleTemplate: `%s | ${brandName}`,
      defaultTitle: `${brandName} | Furnished Rentals${cityLine}`,
      description: description.slice(0, 160) || `Fully furnished midterm rentals${cityLine}.`,
    },
  };
}

function renderConfigFile(cfg) {
  const body = JSON.stringify(cfg, null, 2);
  return `// ================================================================
//  MTR SAAS — PROPERTY CONFIGURATION
//  Auto-generated from client intake questionnaire.
//  Edit freely — this is the ONLY file you need to change for branding,
//  contact info, unit details, fees, and legal content.
// ================================================================

export const CONFIG = ${body};

// ── Derived helpers (no need to edit below this line) ────────────
export const RENT_MAP: Record<string, number> = Object.fromEntries(
  CONFIG.units.map((u) => [u.id, u.monthlyRent])
);
`;
}

// ── Human-readable notes for fields not in CONFIG ────────────────
function renderIntakeNotes(sub) {
  const L = [];
  const push = (...xs) => L.push(...xs);
  const section = (title, obj) => {
    push(`## ${title}`, '');
    let any = false;
    for (const [k, v] of Object.entries(obj || {})) {
      const val = Array.isArray(v) ? v.join(', ') : v;
      if (val && String(val).trim()) {
        push(`- **${k}:** ${val}`);
        any = true;
      }
    }
    if (!any) push('_(none provided)_');
    push('');
  };

  push('# Client Intake Notes', '');
  push(`_Submitted: ${sub.submittedAt || 'unknown'}_`, '');
  push('These are fields from the onboarding questionnaire that are **not** captured in `config/property.ts`. Use this as a reference when customizing the site further (e.g. adding sections, seeding FAQs, writing a policies page).', '');

  section('Policies', sub.policies);
  section('Media Links', sub.media);
  section('Branding Preferences', sub.branding);
  section('Location Info', sub.location);
  section('Utilities & Practical Info', sub.utilities);

  push('## Pricing Extras', '');
  if (sub.pricing && sub.pricing.included && sub.pricing.included.length)
    push(`- Included in rent: ${sub.pricing.included.join(', ')}`);
  if (sub.pricing && sub.pricing.cancellation)
    push(`- Cancellation policy: ${sub.pricing.cancellation}`);
  if (sub.pricing && sub.pricing.cancellationDetails)
    push(`- Cancellation details: ${sub.pricing.cancellationDetails}`);
  push('');

  push('## FAQs (seed these into the database)', '');
  if (sub.faqs && sub.faqs.length) {
    sub.faqs.forEach((f, i) => {
      push(`${i + 1}. **Q:** ${f.question}`);
      push(`   **A:** ${f.answer}`, '');
    });
  } else {
    push('_(none provided)_', '');
  }

  if (sub.extraNotes) {
    push('## Extra Notes from Client', '', sub.extraNotes, '');
  }
  if (sub.referenceUrls) {
    push('## Reference URLs', '', sub.referenceUrls, '');
  }

  return L.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.submission) {
    console.error('Usage: node scripts/generate-client.js <submission.json> [--slug <slug>] [--out <dir>]');
    process.exit(1);
  }

  const submissionPath = path.resolve(args.submission);
  if (!fs.existsSync(submissionPath)) {
    console.error('Submission file not found:', submissionPath);
    process.exit(1);
  }
  const sub = JSON.parse(fs.readFileSync(submissionPath, 'utf8'));

  const rootDir = path.resolve(__dirname, '..');
  const templateDir = path.join(rootDir, 'template');
  const slug = args.slug ? slugify(args.slug) : slugify(sub.property && sub.property.name);
  const outDir = args.out ? path.resolve(args.out) : path.join(rootDir, 'clients', slug);

  if (!fs.existsSync(templateDir)) {
    console.error('Template directory not found:', templateDir);
    process.exit(1);
  }
  if (fs.existsSync(outDir)) {
    console.error('Output directory already exists:', outDir);
    console.error('Remove it first, or pass --out <different-path>.');
    process.exit(1);
  }

  console.log(`→ Copying template to clients/${slug}/ (this can take a minute)…`);
  copyDir(templateDir, outDir);

  console.log('→ Writing config/property.ts…');
  const cfg = buildConfig(sub);
  fs.writeFileSync(path.join(outDir, 'config', 'property.ts'), renderConfigFile(cfg));

  console.log('→ Writing INTAKE_NOTES.md…');
  fs.writeFileSync(path.join(outDir, 'INTAKE_NOTES.md'), renderIntakeNotes(sub));

  console.log('→ Saving raw submission.json…');
  fs.writeFileSync(path.join(outDir, 'submission.json'), JSON.stringify(sub, null, 2));

  console.log('');
  console.log(`✓ Client site generated at: clients/${slug}/`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. cd clients/${slug}`);
  console.log('  2. npm install');
  console.log('  3. cp .env.example .env   (fill in DATABASE_URL, Stripe keys, etc.)');
  console.log('  4. Drop client photos into public/images/');
  console.log('  5. Review config/property.ts and INTAKE_NOTES.md');
  console.log('  6. npm run dev   (preview at http://localhost:3000)');
  console.log('  7. Deploy to Vercel as a new project and point their domain at it.');
}

main();
