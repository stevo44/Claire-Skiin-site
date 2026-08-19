/**
 * seed-products.mjs
 * ------------------
 * Inserts 30 cosmetic products into the `products` table:
 *   • 10 Skincare   (badges: Best Seller, New, Premium, Limited, Sale, None)
 *   • 10 Lip Care   (same badge variety)
 *   • 10 Hair Care  (same badge variety)
 *
 * Usage:
 *   node seed-products.mjs
 *
 * Requires: DATABASE_URL in your .env  (same file your Express server uses)
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ── Load .env from project root ──────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Product Data ─────────────────────────────────────────────────────────────

const products = [

  // ─────────────────────── SKINCARE (10) ───────────────────────
  {
    name: 'Radiance Vitamin C Serum',
    description: 'A brightening serum powered by stabilised Vitamin C and African botanicals to even skin tone and boost natural luminosity.',
    price: 12500,
    category: 'Skincare',
    stock_quantity: 80,
    image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
    metadata: { badge: 'Best Seller', subtitle: 'Brighten & Even Skin Tone', ingredients: ['Vitamin C', 'Niacinamide', 'Aloe Vera'], benefits: ['Brightens skin', 'Reduces dark spots', 'Antioxidant protection'] },
  },
  {
    name: 'Shea Glow Moisturiser',
    description: 'Rich daily moisturiser infused with pure Shea butter and Jojoba oil for deep hydration that lasts all day.',
    price: 8500,
    category: 'Skincare',
    stock_quantity: 120,
    image_url: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
    metadata: { badge: 'New', subtitle: 'Deep 24-Hour Hydration', ingredients: ['Shea Butter', 'Jojoba Oil', 'Hyaluronic Acid'], benefits: ['Deep hydration', 'Soft skin', 'Non-greasy finish'] },
  },
  {
    name: 'Black Soap Purifying Cleanser',
    description: 'Gentle foaming cleanser formulated with authentic African black soap to remove impurities without stripping natural oils.',
    price: 5500,
    category: 'Skincare',
    stock_quantity: 150,
    image_url: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400',
    metadata: { badge: 'None', subtitle: 'Deep Cleanse & Purify', ingredients: ['African Black Soap', 'Tea Tree', 'Glycerin'], benefits: ['Removes impurities', 'Controls oil', 'Calms breakouts'] },
  },
  {
    name: 'Gold Luxe Face Oil',
    description: 'A decadent facial oil blended with 24k gold particles, Marula oil, and Frankincense to rejuvenate ageing skin.',
    price: 24900,
    category: 'Skincare',
    stock_quantity: 30,
    image_url: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400',
    metadata: { badge: 'Premium', subtitle: 'Anti-Ageing Luxury Treatment', ingredients: ['24k Gold', 'Marula Oil', 'Frankincense'], benefits: ['Reduces fine lines', 'Firms skin', 'Radiant glow'] },
  },
  {
    name: 'Baobab Glow Toner',
    description: 'Alcohol-free hydrating toner with Baobab extract and Rose water to balance skin pH and prep skin for serums.',
    price: 6800,
    category: 'Skincare',
    stock_quantity: 95,
    image_url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400',
    metadata: { badge: 'Sale', subtitle: 'Balance & Prep Your Skin', ingredients: ['Baobab Extract', 'Rose Water', 'Witch Hazel'], benefits: ['Balances pH', 'Tightens pores', 'Refreshing feel'] },
  },
  {
    name: 'SPF 50 Matte Sunscreen',
    description: 'Broad-spectrum SPF 50 sunscreen with a matte finish. No white cast, suitable for all African skin tones.',
    price: 9200,
    category: 'Skincare',
    stock_quantity: 200,
    image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    metadata: { badge: 'Best Seller', subtitle: 'No White Cast Sun Protection', ingredients: ['Zinc Oxide', 'Titanium Dioxide', 'Niacinamide'], benefits: ['SPF 50 protection', 'Matte finish', 'No white cast'] },
  },
  {
    name: 'Turmeric Even-Tone Mask',
    description: 'Brightening clay mask infused with Cameroonian turmeric and Kaolin clay to visibly even skin tone in minutes.',
    price: 7400,
    category: 'Skincare',
    stock_quantity: 60,
    image_url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
    metadata: { badge: 'Limited', subtitle: 'Visible Brightening in 10 Minutes', ingredients: ['Turmeric', 'Kaolin Clay', 'Honey'], benefits: ['Brightens complexion', 'Deep cleansing', 'Glowing skin'] },
  },
  {
    name: 'Retinol Night Renewal Cream',
    description: 'Powerful overnight treatment with encapsulated Retinol and Peptides to visibly reduce wrinkles while you sleep.',
    price: 18700,
    category: 'Skincare',
    stock_quantity: 45,
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
    metadata: { badge: 'Premium', subtitle: 'Overnight Anti-Wrinkle Treatment', ingredients: ['Retinol', 'Peptides', 'Ceramides'], benefits: ['Reduces wrinkles', 'Firms skin', 'Cell renewal'] },
  },
  {
    name: 'Aloe Vera Soothing Gel',
    description: 'Pure 95% Aloe Vera gel enriched with Cucumber extract to calm irritated skin and reduce redness instantly.',
    price: 4200,
    category: 'Skincare',
    stock_quantity: 180,
    image_url: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=400',
    metadata: { badge: 'New', subtitle: 'Instant Calm & Soothing Relief', ingredients: ['Aloe Vera 95%', 'Cucumber Extract', 'Green Tea'], benefits: ['Soothes irritation', 'Reduces redness', 'Lightweight hydration'] },
  },
  {
    name: 'Eye Bright Caffeine Serum',
    description: 'Targeted under-eye serum with Caffeine and Vitamin K to depuff, brighten dark circles and smooth fine lines.',
    price: 11300,
    category: 'Skincare',
    stock_quantity: 70,
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    metadata: { badge: 'Sale', subtitle: 'Depuff & Brighten Dark Circles', ingredients: ['Caffeine', 'Vitamin K', 'Hyaluronic Acid'], benefits: ['Reduces puffiness', 'Brightens dark circles', 'Smooths fine lines'] },
  },

  // ─────────────────────── LIP CARE (10) ───────────────────────
  {
    name: 'Kokum Butter Lip Balm',
    description: 'Intensive lip treatment with Kokum butter and Beeswax to heal dry, cracked lips and restore softness.',
    price: 2800,
    category: 'Lip Care',
    stock_quantity: 250,
    image_url: 'https://images.unsplash.com/photo-1586495777744-4e6232bf2f7d?w=400',
    metadata: { badge: 'Best Seller', subtitle: 'Heal & Restore Dry Lips', ingredients: ['Kokum Butter', 'Beeswax', 'Vitamin E'], benefits: ['Heals cracked lips', 'Long-lasting moisture', 'Smooth finish'] },
  },
  {
    name: 'Rosehip Tinted Gloss',
    description: 'Natural tinted gloss enriched with Rosehip oil for plump, hydrated lips with a gorgeous sheer colour payoff.',
    price: 5500,
    category: 'Lip Care',
    stock_quantity: 130,
    image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    metadata: { badge: 'New', subtitle: 'Plump & Shine with Natural Colour', ingredients: ['Rosehip Oil', 'Castor Oil', 'Vitamin E'], benefits: ['Plumps lips', 'Sheer colour', 'Glossy finish'] },
  },
  {
    name: 'Matte Velvet Lip Cream',
    description: 'Long-wear liquid matte lip cream in deep berry shades. Transfer-proof formula that keeps lips moisturised.',
    price: 7200,
    category: 'Lip Care',
    stock_quantity: 90,
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
    metadata: { badge: 'Premium', subtitle: '16-Hour Transfer-Proof Matte', ingredients: ['Jojoba Oil', 'Carnauba Wax', 'Hyaluronic Acid'], benefits: ['Long wear', 'Moisturises lips', 'Intense colour'] },
  },
  {
    name: 'Sugar Lip Scrub',
    description: 'Exfoliating brown sugar lip scrub with raw honey and coconut oil to buff away dead skin and reveal smoother lips.',
    price: 3600,
    category: 'Lip Care',
    stock_quantity: 175,
    image_url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400',
    metadata: { badge: 'Sale', subtitle: 'Buff & Smooth for Kissable Lips', ingredients: ['Brown Sugar', 'Raw Honey', 'Coconut Oil'], benefits: ['Exfoliates dead skin', 'Smooths lips', 'Adds moisture'] },
  },
  {
    name: 'Peptide Plumping Serum',
    description: 'Clinically-tested lip serum with Hyaluronic acid and Peptides for visible plumping and definition of lip borders.',
    price: 14500,
    category: 'Lip Care',
    stock_quantity: 40,
    image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
    metadata: { badge: 'Limited', subtitle: 'Clinically Proven Volume & Plump', ingredients: ['Peptides', 'Hyaluronic Acid', 'Collagen Booster'], benefits: ['Visible plumping', 'Defines lip border', 'Long-lasting hydration'] },
  },
  {
    name: 'Shea Tinted Lip Butter',
    description: 'Luxurious tinted lip butter with raw Shea and Mango butter for full coverage colour that conditions all day.',
    price: 4900,
    category: 'Lip Care',
    stock_quantity: 160,
    image_url: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400',
    metadata: { badge: 'Best Seller', subtitle: 'Colour + Conditioning All Day', ingredients: ['Shea Butter', 'Mango Butter', 'Natural Pigment'], benefits: ['Full coverage', 'Deep conditioning', 'Rich colour'] },
  },
  {
    name: 'Peppermint Cooling Gloss',
    description: 'Cooling peppermint lip gloss that visually plumps lips with a tingling sensation and ultra-shiny finish.',
    price: 4200,
    category: 'Lip Care',
    stock_quantity: 110,
    image_url: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=400',
    metadata: { badge: 'New', subtitle: 'Tingle, Plump & Ultra Shine', ingredients: ['Peppermint Oil', 'Castor Oil', 'Vitamin C'], benefits: ['Cooling sensation', 'Plumps lips', 'Mirror shine'] },
  },
  {
    name: 'Overnight Lip Mask',
    description: 'Sleep-in lip mask with Ceramides and Honey extract to deeply repair and restore extremely dry or flaky lips overnight.',
    price: 6100,
    category: 'Lip Care',
    stock_quantity: 85,
    image_url: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400',
    metadata: { badge: 'Premium', subtitle: 'Wake Up to Perfectly Soft Lips', ingredients: ['Ceramides', 'Honey Extract', 'Shea Butter'], benefits: ['Repairs overnight', 'Intensely nourishing', 'No transfer formula'] },
  },
  {
    name: 'Coconut Lip Oil',
    description: 'Lightweight nourishing lip oil with Virgin coconut and Argan oil for a glossy, hydrated pout with zero stickiness.',
    price: 3900,
    category: 'Lip Care',
    stock_quantity: 200,
    image_url: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400',
    metadata: { badge: 'Sale', subtitle: 'Non-Sticky Gloss & Nourishment', ingredients: ['Virgin Coconut Oil', 'Argan Oil', 'Vitamin E'], benefits: ['Non-sticky', 'Glossy finish', 'Lightweight hydration'] },
  },
  {
    name: 'Berry Stain Lip Tint',
    description: 'Buildable berry lip tint that gives a natural flushed-lip look. Long-lasting water-based formula, perfect for daily wear.',
    price: 5800,
    category: 'Lip Care',
    stock_quantity: 95,
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    metadata: { badge: 'Limited', subtitle: 'Natural Flushed Lip Look', ingredients: ['Natural Berry Extract', 'Aloe Vera', 'Glycerin'], benefits: ['Buildable coverage', 'Natural look', 'Long-wearing tint'] },
  },

  // ─────────────────────── HAIR CARE (10) ───────────────────────
  {
    name: 'Argan Repair Hair Mask',
    description: 'Intensive weekly hair mask with pure Moroccan Argan oil and Keratin to restore shine and eliminate frizz.',
    price: 9800,
    category: 'Hair Care',
    stock_quantity: 70,
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
    metadata: { badge: 'Best Seller', subtitle: 'Restore Shine & Eliminate Frizz', ingredients: ['Argan Oil', 'Keratin', 'Silk Proteins'], benefits: ['Eliminates frizz', 'Restores shine', 'Strengthens hair'] },
  },
  {
    name: 'Black Castor Growth Oil',
    description: 'Jamaican black castor oil blend with Rosemary and Peppermint for stimulating scalp circulation and promoting hair growth.',
    price: 7600,
    category: 'Hair Care',
    stock_quantity: 100,
    image_url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
    metadata: { badge: 'Best Seller', subtitle: 'Stimulate Growth & Strengthen Roots', ingredients: ['Black Castor Oil', 'Rosemary', 'Peppermint'], benefits: ['Promotes growth', 'Strengthens roots', 'Reduces breakage'] },
  },
  {
    name: 'Curl Define Cream',
    description: 'Curl-defining styling cream for natural and relaxed hair textures. Eliminates frizz and enhances curl pattern for defined bouncy coils.',
    price: 8200,
    category: 'Hair Care',
    stock_quantity: 85,
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    metadata: { badge: 'New', subtitle: 'Define Bouncy Frizz-Free Curls', ingredients: ['Shea Butter', 'Flaxseed Gel', 'Glycerin'], benefits: ['Defines curls', 'Reduces frizz', 'Moisturises hair'] },
  },
  {
    name: 'Scalp Nourish Serum',
    description: 'Targeted scalp serum with African black seed oil and Biotin to nourish hair follicles and reduce scalp dryness.',
    price: 11200,
    category: 'Hair Care',
    stock_quantity: 55,
    image_url: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=400',
    metadata: { badge: 'Premium', subtitle: 'Nourish Follicles & Combat Dryness', ingredients: ['Black Seed Oil', 'Biotin', 'Tea Tree'], benefits: ['Nourishes follicles', 'Reduces dandruff', 'Promotes growth'] },
  },
  {
    name: 'Protein Bond Strengthener',
    description: 'Bond-building protein treatment that repairs damage from heat, colour, and chemical processing from the inside out.',
    price: 15900,
    category: 'Hair Care',
    stock_quantity: 35,
    image_url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400',
    metadata: { badge: 'Limited', subtitle: 'Repair Damage from the Inside Out', ingredients: ['Hydrolysed Keratin', 'Amino Acids', 'Panthenol'], benefits: ['Repairs damage', 'Strengthens bonds', 'Reduces breakage'] },
  },
  {
    name: 'Moisture Surge Shampoo',
    description: 'Sulfate-free moisturising shampoo with Baobab protein and Aloe Vera to cleanse without stripping natural oils.',
    price: 6500,
    category: 'Hair Care',
    stock_quantity: 140,
    image_url: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400',
    metadata: { badge: 'Sale', subtitle: 'Sulfate-Free Gentle Deep Cleanse', ingredients: ['Baobab Protein', 'Aloe Vera', 'Coconut Derived Surfactants'], benefits: ['Gentle cleanse', 'Retains moisture', 'Adds shine'] },
  },
  {
    name: 'Deep Condition Leave-In',
    description: 'Lightweight leave-in conditioner that detangles, adds slip and provides 72-hour moisture retention for all hair types.',
    price: 7100,
    category: 'Hair Care',
    stock_quantity: 120,
    image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    metadata: { badge: 'New', subtitle: '72-Hour Moisture & Detangle', ingredients: ['Shea Butter', 'Avocado Oil', 'Marshmallow Root'], benefits: ['Detangles knots', 'Long-lasting moisture', 'Reduces breakage'] },
  },
  {
    name: 'Heat Protect Spray',
    description: 'Lightweight thermal protectant spray shielding hair up to 230°C. Adds shine and smooths cuticles for sleek styled looks.',
    price: 8900,
    category: 'Hair Care',
    stock_quantity: 90,
    image_url: 'https://images.unsplash.com/photo-1586495777744-4e6232bf2f7d?w=400',
    metadata: { badge: 'None', subtitle: 'Shield Hair Up to 230°C', ingredients: ['Cyclomethicone', 'Argan Oil', 'Provitamin B5'], benefits: ['Heat protection', 'Adds shine', 'Smooths cuticles'] },
  },
  {
    name: 'Bamboo Volumising Mousse',
    description: 'Whipped volumising mousse with bamboo extract for root lift and all-day volume without crunchy or sticky residue.',
    price: 6800,
    category: 'Hair Care',
    stock_quantity: 75,
    image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    metadata: { badge: 'Sale', subtitle: 'Root Lift & All-Day Volume', ingredients: ['Bamboo Extract', 'Hydrolysed Wheat Protein', 'Panthenol'], benefits: ['Adds volume', 'Root lift', 'No sticky residue'] },
  },
  {
    name: 'Marula Scalp Detox',
    description: 'Exfoliating scalp scrub with Marula oil and Salicylic acid to remove product build-up and flakes for a clean healthy scalp.',
    price: 10400,
    category: 'Hair Care',
    stock_quantity: 50,
    image_url: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400',
    metadata: { badge: 'Premium', subtitle: 'Exfoliate & Refresh Your Scalp', ingredients: ['Marula Oil', 'Salicylic Acid', 'Zinc PCA'], benefits: ['Removes build-up', 'Reduces flakes', 'Balances scalp oil'] },
  },
];

// ── Seed Function ─────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting product seed...\n');

  let inserted = 0;
  let skipped  = 0;

  for (const p of products) {
    try {
      // Check for duplicate name to make script re-runnable
      const existing = await pool.query('SELECT id FROM products WHERE name = $1', [p.name]);
      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipped (already exists): ${p.name}`);
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO products (name, description, price, category, stock_quantity, image_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          p.name,
          p.description,
          p.price,
          p.category,
          p.stock_quantity,
          p.image_url,
          JSON.stringify(p.metadata),
        ]
      );

      console.log(`✅ Inserted [${p.category}] ${p.name} — ${p.price.toLocaleString()} XAF  [${p.metadata.badge}]`);
      inserted++;
    } catch (err) {
      console.error(`❌ Failed to insert "${p.name}":`, err.message);
    }
  }

  console.log(`\n🎉 Done! ${inserted} products inserted, ${skipped} skipped.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
